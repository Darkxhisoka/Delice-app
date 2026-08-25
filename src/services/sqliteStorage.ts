/**
 * SQLite & IndexedDB Offline Storage Service for Patisserie Delice
 * Integrates @capacitor-community/sqlite with universal IndexedDB fallback.
 * 
 * Provides durable local storage for:
 * 1. Cart transactions (POS sales, orders, tickets)
 * 2. Inventory adjustments (destocking, stock corrections, waste)
 * 3. Receipts (raw material receipts, supplier deliveries, receiving notes)
 * 
 * Automatically synchronizes with backend Firestore & Supabase when connection is restored.
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection
} from '@capacitor-community/sqlite';
import {
  SaleTransaction,
  InventoryAdjustment,
  Receipt
} from '../types';
import { calculatePayloadChecksum } from './indexedDbQueue';

const SQLITE_DB_NAME = 'delice_pos_offline_db';
const DB_VERSION = 1;

let sqliteConnection: SQLiteConnection | null = null;
let sqliteDb: SQLiteDBConnection | null = null;
let isNativeSqliteReady = false;
let initPromise: Promise<boolean> | null = null;

// IndexedDB Fallback Configuration
const IDB_NAME = 'DeliceSqliteIndexedDBFallback';
const IDB_STORES = {
  CART_TRANSACTIONS: 'cart_transactions',
  INVENTORY_ADJUSTMENTS: 'inventory_adjustments',
  RECEIPTS: 'receipts',
  SQLITE_METADATA: 'sqlite_metadata'
} as const;

/**
 * Open or initialize IndexedDB fallback database
 */
function openFallbackIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this runtime environment.'));
      return;
    }

    const request = window.indexedDB.open(IDB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Cart Transactions Table
      if (!db.objectStoreNames.contains(IDB_STORES.CART_TRANSACTIONS)) {
        const cartStore = db.createObjectStore(IDB_STORES.CART_TRANSACTIONS, { keyPath: 'id' });
        cartStore.createIndex('by_storeId', 'storeId', { unique: false });
        cartStore.createIndex('by_status', 'syncStatus', { unique: false });
        cartStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // 2. Inventory Adjustments Table
      if (!db.objectStoreNames.contains(IDB_STORES.INVENTORY_ADJUSTMENTS)) {
        const adjStore = db.createObjectStore(IDB_STORES.INVENTORY_ADJUSTMENTS, { keyPath: 'id' });
        adjStore.createIndex('by_materialId', 'raw_material_id', { unique: false });
        adjStore.createIndex('by_status', 'syncStatus', { unique: false });
        adjStore.createIndex('by_date', 'created_at', { unique: false });
      }

      // 3. Receipts Table
      if (!db.objectStoreNames.contains(IDB_STORES.RECEIPTS)) {
        const receiptStore = db.createObjectStore(IDB_STORES.RECEIPTS, { keyPath: 'id' });
        receiptStore.createIndex('by_supplierId', 'supplierId', { unique: false });
        receiptStore.createIndex('by_status', 'syncStatus', { unique: false });
        receiptStore.createIndex('by_date', 'recordedAt', { unique: false });
      }

      // 4. Metadata Store
      if (!db.objectStoreNames.contains(IDB_STORES.SQLITE_METADATA)) {
        db.createObjectStore(IDB_STORES.SQLITE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open fallback IndexedDB'));
  });
}

/**
 * Helper to run an IndexedDB fallback transaction
 */
async function withFallbackIDB<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openFallbackIDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      let result: any;
      Promise.resolve(callback(store))
        .then((res) => {
          result = res;
        })
        .catch(reject);

      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error(`IndexedDB transaction failed on ${storeName}`));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Initialize SQLite Engine (Native Capacitor + Web IndexedDB fallback)
 */
export async function initSqliteStorage(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        sqliteConnection = new SQLiteConnection(CapacitorSQLite);
        const isConn = await sqliteConnection.isConnection(SQLITE_DB_NAME, false);

        if (isConn.result) {
          sqliteDb = await sqliteConnection.retrieveConnection(SQLITE_DB_NAME, false);
        } else {
          sqliteDb = await sqliteConnection.createConnection(
            SQLITE_DB_NAME,
            false,
            'no-encryption',
            1,
            false
          );
        }

        await sqliteDb.open();

        // Create Schema Tables in SQLite
        const schemaSQL = `
          CREATE TABLE IF NOT EXISTS cart_transactions (
            id TEXT PRIMARY KEY,
            transaction_number TEXT NOT NULL,
            store_id TEXT NOT NULL,
            store_name TEXT NOT NULL,
            cashier_name TEXT,
            total_amount REAL NOT NULL,
            subtotal REAL NOT NULL,
            discount REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            payment_method TEXT NOT NULL,
            items_json TEXT NOT NULL,
            notes TEXT,
            checksum TEXT,
            sync_status TEXT DEFAULT 'PENDING',
            created_at TEXT NOT NULL,
            synced_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_cart_store ON cart_transactions(store_id);
          CREATE INDEX IF NOT EXISTS idx_cart_status ON cart_transactions(sync_status);

          CREATE TABLE IF NOT EXISTS inventory_adjustments (
            id TEXT PRIMARY KEY,
            raw_material_id TEXT NOT NULL,
            raw_material_name TEXT NOT NULL,
            unit TEXT NOT NULL,
            quantity_removed REAL NOT NULL,
            unit_cost_at_time REAL NOT NULL,
            total_loss_value REAL NOT NULL,
            reason_category TEXT NOT NULL,
            notes TEXT,
            created_by TEXT,
            checksum TEXT,
            sync_status TEXT DEFAULT 'PENDING',
            created_at TEXT NOT NULL,
            synced_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_adj_material ON inventory_adjustments(raw_material_id);
          CREATE INDEX IF NOT EXISTS idx_adj_status ON inventory_adjustments(sync_status);

          CREATE TABLE IF NOT EXISTS receipts (
            id TEXT PRIMARY KEY,
            receipt_number TEXT NOT NULL,
            supplier_id TEXT,
            supplier_name TEXT NOT NULL,
            invoice_number TEXT,
            items_json TEXT NOT NULL,
            total_amount REAL NOT NULL,
            recorded_by TEXT,
            notes TEXT,
            checksum TEXT,
            sync_status TEXT DEFAULT 'PENDING',
            recorded_at TEXT NOT NULL,
            synced_at TEXT
          );

          CREATE INDEX IF NOT EXISTS idx_receipt_status ON receipts(sync_status);
        `;

        await sqliteDb.execute(schemaSQL);
        isNativeSqliteReady = true;
        console.log('Capacitor Native SQLite Database Initialized Successfully.');
        return true;
      } else {
        // Initialize Fallback IndexedDB
        await openFallbackIDB();
        console.log('Universal IndexedDB Storage Engine Initialized for Web/PWA mode.');
        return true;
      }
    } catch (err) {
      console.warn('Native SQLite init fell back to IndexedDB:', err);
      try {
        await openFallbackIDB();
        return true;
      } catch (idbErr) {
        console.error('Failed to init offline storage:', idbErr);
        return false;
      }
    }
  })();

  return initPromise;
}

/**
 * 1. CART TRANSACTIONS OFFLINE STORAGE
 */
export async function saveCartTransactionOffline(
  sale: SaleTransaction,
  syncStatus: 'PENDING' | 'SYNCED' = 'PENDING'
): Promise<void> {
  await initSqliteStorage();
  const checksum = calculatePayloadChecksum(sale);
  const now = new Date().toISOString();

  const recordWithStatus = {
    ...sale,
    checksum,
    syncStatus,
    savedAt: now,
    syncedAt: syncStatus === 'SYNCED' ? now : null
  };

  // 1. Try Native SQLite
  if (isNativeSqliteReady && sqliteDb) {
    try {
      const sql = `
        INSERT OR REPLACE INTO cart_transactions (
          id, transaction_number, store_id, store_name, cashier_name,
          total_amount, subtotal, discount, tax, payment_method,
          items_json, notes, checksum, sync_status, created_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const values = [
        sale.id,
        sale.transactionNumber,
        sale.storeId,
        sale.storeName,
        sale.cashierName || 'Cashier',
        sale.totalAmount,
        sale.subtotal,
        sale.discount || 0,
        sale.tax || 0,
        sale.paymentMethod,
        JSON.stringify(sale.items),
        sale.notes || '',
        checksum,
        syncStatus,
        sale.timestamp,
        syncStatus === 'SYNCED' ? now : null
      ];
      await sqliteDb.run(sql, values);
    } catch (err) {
      console.warn('Native SQLite cart insert error, writing to IndexedDB:', err);
    }
  }

  // 2. Always persist to IndexedDB fallback for immediate responsive queries
  try {
    await withFallbackIDB(IDB_STORES.CART_TRANSACTIONS, 'readwrite', (store) => {
      store.put(recordWithStatus);
    });
  } catch (err) {
    console.error('Failed to save cart transaction in IndexedDB:', err);
  }
}

export async function getOfflineCartTransactions(storeId?: string): Promise<SaleTransaction[]> {
  await initSqliteStorage();

  if (isNativeSqliteReady && sqliteDb) {
    try {
      let query = 'SELECT * FROM cart_transactions';
      const params: any[] = [];
      if (storeId) {
        query += ' WHERE store_id = ?';
        params.push(storeId);
      }
      query += ' ORDER BY created_at DESC';
      const res = await sqliteDb.query(query, params);
      if (res.values && res.values.length > 0) {
        return res.values.map((row: any) => ({
          id: row.id,
          transactionNumber: row.transaction_number,
          storeId: row.store_id,
          storeName: row.store_name,
          cashierName: row.cashier_name,
          totalAmount: row.total_amount,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          paymentMethod: row.payment_method,
          items: JSON.parse(row.items_json || '[]'),
          notes: row.notes,
          timestamp: row.created_at
        }));
      }
    } catch (err) {
      console.warn('Native SQLite cart query fallback to IndexedDB:', err);
    }
  }

  // Fallback to IndexedDB
  try {
    return await withFallbackIDB(IDB_STORES.CART_TRANSACTIONS, 'readonly', (store) => {
      return new Promise<SaleTransaction[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          let list = (req.result || []) as any[];
          if (storeId) {
            list = list.filter((item) => item.storeId === storeId);
          }
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return [];
  }
}

/**
 * 2. INVENTORY ADJUSTMENTS OFFLINE STORAGE
 */
export async function saveInventoryAdjustmentOffline(
  adj: InventoryAdjustment,
  syncStatus: 'PENDING' | 'SYNCED' = 'PENDING'
): Promise<void> {
  await initSqliteStorage();
  const checksum = calculatePayloadChecksum(adj);
  const now = new Date().toISOString();

  const recordWithStatus = {
    ...adj,
    checksum,
    syncStatus,
    savedAt: now,
    syncedAt: syncStatus === 'SYNCED' ? now : null
  };

  // 1. Native SQLite
  if (isNativeSqliteReady && sqliteDb) {
    try {
      const sql = `
        INSERT OR REPLACE INTO inventory_adjustments (
          id, raw_material_id, raw_material_name, unit, quantity_removed,
          unit_cost_at_time, total_loss_value, reason_category, notes,
          created_by, checksum, sync_status, created_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const values = [
        adj.id,
        adj.raw_material_id,
        adj.raw_material_name,
        adj.unit,
        adj.quantity_removed,
        adj.unit_cost_at_time,
        adj.total_loss_value,
        adj.reason_category,
        adj.notes || '',
        adj.created_by,
        checksum,
        syncStatus,
        adj.created_at,
        syncStatus === 'SYNCED' ? now : null
      ];
      await sqliteDb.run(sql, values);
    } catch (err) {
      console.warn('Native SQLite adjustment insert error, fallback to IndexedDB:', err);
    }
  }

  // 2. IndexedDB
  try {
    await withFallbackIDB(IDB_STORES.INVENTORY_ADJUSTMENTS, 'readwrite', (store) => {
      store.put(recordWithStatus);
    });
  } catch (err) {
    console.error('Failed to save adjustment in IndexedDB:', err);
  }
}

export async function getOfflineInventoryAdjustments(): Promise<InventoryAdjustment[]> {
  await initSqliteStorage();

  if (isNativeSqliteReady && sqliteDb) {
    try {
      const res = await sqliteDb.query('SELECT * FROM inventory_adjustments ORDER BY created_at DESC');
      if (res.values && res.values.length > 0) {
        return res.values.map((row: any) => ({
          id: row.id,
          raw_material_id: row.raw_material_id,
          raw_material_name: row.raw_material_name,
          unit: row.unit,
          quantity_removed: row.quantity_removed,
          unit_cost_at_time: row.unit_cost_at_time,
          total_loss_value: row.total_loss_value,
          reason_category: row.reason_category,
          notes: row.notes,
          created_by: row.created_by,
          created_at: row.created_at
        }));
      }
    } catch (err) {
      console.warn('Native SQLite adjustment query fallback to IndexedDB:', err);
    }
  }

  try {
    return await withFallbackIDB(IDB_STORES.INVENTORY_ADJUSTMENTS, 'readonly', (store) => {
      return new Promise<InventoryAdjustment[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as InventoryAdjustment[];
          list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return [];
  }
}

/**
 * 3. RECEIPTS OFFLINE STORAGE
 */
export async function saveReceiptOffline(
  receipt: Receipt,
  syncStatus: 'PENDING' | 'SYNCED' = 'PENDING'
): Promise<void> {
  await initSqliteStorage();
  const checksum = calculatePayloadChecksum(receipt);
  const now = new Date().toISOString();

  const recordWithStatus = {
    ...receipt,
    checksum,
    syncStatus,
    savedAt: now,
    syncedAt: syncStatus === 'SYNCED' ? now : null
  };

  // 1. Native SQLite
  if (isNativeSqliteReady && sqliteDb) {
    try {
      const sql = `
        INSERT OR REPLACE INTO receipts (
          id, receipt_number, supplier_id, supplier_name, invoice_number,
          items_json, total_amount, recorded_by, notes, checksum,
          sync_status, recorded_at, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const values = [
        receipt.id,
        receipt.receiptNumber,
        receipt.supplierId || '',
        receipt.supplierName,
        receipt.invoiceNumber || '',
        JSON.stringify(receipt.items),
        receipt.totalAmount,
        receipt.recordedBy,
        receipt.notes || '',
        checksum,
        syncStatus,
        receipt.recordedAt,
        syncStatus === 'SYNCED' ? now : null
      ];
      await sqliteDb.run(sql, values);
    } catch (err) {
      console.warn('Native SQLite receipt insert error, fallback to IndexedDB:', err);
    }
  }

  // 2. IndexedDB
  try {
    await withFallbackIDB(IDB_STORES.RECEIPTS, 'readwrite', (store) => {
      store.put(recordWithStatus);
    });
  } catch (err) {
    console.error('Failed to save receipt in IndexedDB:', err);
  }
}

export async function getOfflineReceipts(): Promise<Receipt[]> {
  await initSqliteStorage();

  if (isNativeSqliteReady && sqliteDb) {
    try {
      const res = await sqliteDb.query('SELECT * FROM receipts ORDER BY recorded_at DESC');
      if (res.values && res.values.length > 0) {
        return res.values.map((row: any) => ({
          id: row.id,
          receiptNumber: row.receipt_number,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          invoiceNumber: row.invoice_number,
          purchaseDate: row.recorded_at ? row.recorded_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          recordedAt: row.recorded_at,
          items: JSON.parse(row.items_json || '[]'),
          totalAmount: row.total_amount,
          recordedBy: row.recorded_by,
          notes: row.notes
        }));
      }
    } catch (err) {
      console.warn('Native SQLite receipts query fallback to IndexedDB:', err);
    }
  }

  try {
    return await withFallbackIDB(IDB_STORES.RECEIPTS, 'readonly', (store) => {
      return new Promise<Receipt[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result || []) as Receipt[];
          list.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return [];
  }
}

/**
 * Mark record as synced in SQLite and IndexedDB
 */
export async function markOfflineRecordSynced(
  tableName: 'cart_transactions' | 'inventory_adjustments' | 'receipts',
  id: string
): Promise<void> {
  const now = new Date().toISOString();

  if (isNativeSqliteReady && sqliteDb) {
    try {
      await sqliteDb.run(
        `UPDATE ${tableName} SET sync_status = 'SYNCED', synced_at = ? WHERE id = ?;`,
        [now, id]
      );
    } catch (err) {
      console.warn(`SQLite update sync_status failed for ${tableName}:${id}`, err);
    }
  }

  try {
    const storeKey = tableName === 'cart_transactions' 
      ? IDB_STORES.CART_TRANSACTIONS
      : tableName === 'inventory_adjustments'
      ? IDB_STORES.INVENTORY_ADJUSTMENTS
      : IDB_STORES.RECEIPTS;

    await withFallbackIDB(storeKey, 'readwrite', (store) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (item) {
          item.syncStatus = 'SYNCED';
          item.syncedAt = now;
          store.put(item);
        }
      };
    });
  } catch (err) {
    console.warn(`IndexedDB update sync_status failed for ${tableName}:${id}`, err);
  }
}

/**
 * Storage Health and Telemetry Information
 */
export interface StorageHealthInfo {
  storageEngine: 'CAPACITOR_SQLITE' | 'INDEXEDDB_UNIVERSAL';
  isNativePlatform: boolean;
  totalCartTransactions: number;
  totalInventoryAdjustments: number;
  totalReceipts: number;
  pendingSyncCart: number;
  pendingSyncAdjustments: number;
  pendingSyncReceipts: number;
  totalPendingSync: number;
  lastChecked: string;
}

export async function getStorageHealthInfo(): Promise<StorageHealthInfo> {
  await initSqliteStorage();

  const [carts, adjs, receipts] = await Promise.all([
    withFallbackIDB(IDB_STORES.CART_TRANSACTIONS, 'readonly', (store) => {
      return new Promise<any[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }),
    withFallbackIDB(IDB_STORES.INVENTORY_ADJUSTMENTS, 'readonly', (store) => {
      return new Promise<any[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    }),
    withFallbackIDB(IDB_STORES.RECEIPTS, 'readonly', (store) => {
      return new Promise<any[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    })
  ]);

  const pendingCart = carts.filter((c) => c.syncStatus !== 'SYNCED').length;
  const pendingAdj = adjs.filter((a) => a.syncStatus !== 'SYNCED').length;
  const pendingRec = receipts.filter((r) => r.syncStatus !== 'SYNCED').length;

  return {
    storageEngine: isNativeSqliteReady ? 'CAPACITOR_SQLITE' : 'INDEXEDDB_UNIVERSAL',
    isNativePlatform: Capacitor.isNativePlatform(),
    totalCartTransactions: carts.length,
    totalInventoryAdjustments: adjs.length,
    totalReceipts: receipts.length,
    pendingSyncCart: pendingCart,
    pendingSyncAdjustments: pendingAdj,
    pendingSyncReceipts: pendingRec,
    totalPendingSync: pendingCart + pendingAdj + pendingRec,
    lastChecked: new Date().toISOString()
  };
}
