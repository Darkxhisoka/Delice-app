import Dexie, { Table } from 'dexie';

/**
 * Interface definitions for Dexie IndexedDB tables
 */
export interface DexieProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  costPrice?: number;
  currentStock: number;
  minStockAlert: number;
  storeId: string;
  storeName?: string;
  barcode?: string;
  isActive: boolean;
  updatedAt: string;
}

export interface DexieRawMaterial {
  id: string;
  code?: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit?: number;
  currentStock: number;
  minStockAlert?: number;
  storeId?: string;
  isActive?: boolean;
  updatedAt: string;
}

export interface DexieCartItem {
  id: string; // Unique cart line item ID
  productId: string;
  storeId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount: number;
  total: number;
  notes?: string;
  addedAt: string;
}

export interface DexieSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface DexieSale {
  id: string;
  transactionNumber: string;
  storeId: string;
  storeName: string;
  cashierName: string;
  items: DexieSaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'CHECK' | 'DEBT' | 'SPLIT' | 'OTHER';
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  syncedAt?: string | null;
  timestamp: string;
}

export interface DexieAppSetting {
  key: string;
  value: any;
  updatedAt: string;
}

export interface DexieProductionOrder {
  id: string;
  ofCode: string;
  bakerName: string;
  productId: string;
  productName: string;
  productCode?: string;
  batchCount: number;
  baseBatchYield?: number;
  totalYield: number;
  yieldUnit?: string;
  specialInstructions?: string;
  deductedIngredients: Array<{
    rawMaterialId: string;
    materialName: string;
    dosagePerBatch: number;
    totalCalculated: number;
    unit: string;
    stockBefore: number;
    stockAfter: number;
  }>;
  status: 'completed' | 'in_progress' | 'cancelled';
  createdAt: string;
}

export interface StoragePersistStatus {
  isPersisted: boolean;
  persistenceSupported: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  usagePercentage?: number;
  detailsMessage: string;
}

/**
 * Dexie.js Database Instance for Délice POS
 */
export class DeliceDatabase extends Dexie {
  products!: Table<DexieProduct, string>;
  raw_materials!: Table<DexieRawMaterial, string>;
  requisitions!: Table<any, string>;
  production_orders!: Table<DexieProductionOrder, string>;
  cart!: Table<DexieCartItem, string>;
  sales!: Table<DexieSale, string>;
  settings!: Table<DexieAppSetting, string>;

  constructor() {
    super('DelicePOSDatabase');

    // Schema Version 1
    this.version(1).stores({
      products: 'id, code, name, category, storeId, barcode, isActive, updatedAt',
      cart: 'id, productId, storeId, addedAt',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp',
      settings: 'key, updatedAt'
    });

    // Schema Version 2: Added raw_materials table for unified catalog requisitions
    this.version(2).stores({
      products: 'id, code, name, category, storeId, barcode, isActive, updatedAt',
      raw_materials: 'id, code, name, category, unit, currentStock, updatedAt',
      cart: 'id, productId, storeId, addedAt',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp',
      settings: 'key, updatedAt'
    });

    // Schema Version 3: Added requisitions table for lab dispatcher sync
    this.version(3).stores({
      products: 'id, code, name, category, storeId, barcode, isActive, updatedAt',
      raw_materials: 'id, code, name, category, unit, currentStock, updatedAt',
      requisitions: 'id, requisitionNumber, storeId, status, dateRequested',
      cart: 'id, productId, storeId, addedAt',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp',
      settings: 'key, updatedAt'
    });

    // Schema Version 4: Added production_orders table for active OF baker workflow
    this.version(4).stores({
      products: 'id, code, name, category, storeId, barcode, isActive, updatedAt',
      raw_materials: 'id, code, name, category, unit, currentStock, updatedAt',
      requisitions: 'id, requisitionNumber, storeId, status, dateRequested',
      production_orders: 'id, ofCode, productId, bakerName, status, createdAt',
      cart: 'id, productId, storeId, addedAt',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp',
      settings: 'key, updatedAt'
    });
  }
}

// Export singleton database instance
export const db = new DeliceDatabase();

/**
 * Automatically requests durable persistent storage from the Web/WebView Storage API.
 * Prevents Android OS WebView eviction/cache purges under low disk pressure.
 */
export async function initPersistentStorage(): Promise<StoragePersistStatus> {
  const result: StoragePersistStatus = {
    isPersisted: false,
    persistenceSupported: false,
    detailsMessage: 'Storage API unavailable in this environment'
  };

  try {
    if (typeof navigator !== 'undefined' && navigator.storage) {
      result.persistenceSupported = true;

      // Check if already persisted
      if (typeof navigator.storage.persisted === 'function') {
        const alreadyPersisted = await navigator.storage.persisted();
        result.isPersisted = alreadyPersisted;
      }

      // If not yet persisted, request persistent storage from browser/Android WebView
      if (!result.isPersisted && typeof navigator.storage.persist === 'function') {
        const granted = await navigator.storage.persist();
        result.isPersisted = granted;
      }

      // Check storage estimate quota & usage
      if (typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        result.quotaBytes = estimate.quota;
        result.usageBytes = estimate.usage;
        if (estimate.quota && estimate.usage) {
          result.usagePercentage = Math.round((estimate.usage / estimate.quota) * 1000) / 10;
        }
      }

      result.detailsMessage = result.isPersisted
        ? 'Stockage persistant durable activé (Protégé contre la purge Android).'
        : 'Stockage standard (Non persistant).';
    }
  } catch (err) {
    console.warn('Storage persistence request error:', err);
    result.detailsMessage = `Erreur lors de la demande de persistance: ${err instanceof Error ? err.message : String(err)}`;
  }

  return result;
}

/**
 * Helper Database Operations for Dexie
 */

// Products
export async function dbGetAllProducts(storeId?: string): Promise<DexieProduct[]> {
  if (storeId) {
    return await db.products.where('storeId').equals(storeId).toArray();
  }
  return await db.products.toArray();
}

export async function dbUpsertProduct(product: DexieProduct): Promise<string> {
  return await db.products.put(product);
}

export async function dbBulkUpsertProducts(products: DexieProduct[]): Promise<void> {
  await db.products.bulkPut(products);
}

// Raw Materials
export async function dbGetAllRawMaterials(): Promise<DexieRawMaterial[]> {
  return await db.raw_materials.toArray();
}

export async function dbUpsertRawMaterial(material: DexieRawMaterial): Promise<string> {
  return await db.raw_materials.put(material);
}

export async function dbBulkUpsertRawMaterials(materials: DexieRawMaterial[]): Promise<void> {
  await db.raw_materials.bulkPut(materials);
}

// Cart Items
export async function dbGetCartItems(storeId?: string): Promise<DexieCartItem[]> {
  if (storeId) {
    return await db.cart.where('storeId').equals(storeId).toArray();
  }
  return await db.cart.toArray();
}

export async function dbAddCartItem(item: DexieCartItem): Promise<string> {
  return await db.cart.put(item);
}

export async function dbRemoveCartItem(id: string): Promise<void> {
  await db.cart.delete(id);
}

export async function dbClearCart(storeId?: string): Promise<void> {
  if (storeId) {
    await db.cart.where('storeId').equals(storeId).delete();
  } else {
    await db.cart.clear();
  }
}

// Sales Transactions
export async function dbSaveSale(sale: DexieSale): Promise<string> {
  return await db.sales.put(sale);
}

export async function dbGetAllSales(storeId?: string): Promise<DexieSale[]> {
  if (storeId) {
    return await db.sales.where('storeId').equals(storeId).reverse().sortBy('timestamp');
  }
  return await db.sales.orderBy('timestamp').reverse().toArray();
}

export async function dbGetPendingSales(): Promise<DexieSale[]> {
  return await db.sales.where('syncStatus').equals('PENDING').toArray();
}

export async function dbMarkSaleSynced(id: string): Promise<void> {
  await db.sales.update(id, {
    syncStatus: 'SYNCED',
    syncedAt: new Date().toISOString()
  });
}

// App Settings & Flags
export async function dbSetSetting(key: string, value: any): Promise<string> {
  return await db.settings.put({
    key,
    value,
    updatedAt: new Date().toISOString()
  });
}

export async function dbGetSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  const record = await db.settings.get(key);
  if (record) {
    return record.value as T;
  }
  return defaultValue;
}

// ============================================================================
// Store Requisitions & Dispatcher Operations
// ============================================================================

export async function dbGetRequisitions(): Promise<any[]> {
  try {
    if (db.requisitions) {
      return await db.requisitions.toArray();
    }
  } catch (err) {
    console.warn('[dbGetRequisitions] Dexie read warning:', err);
  }
  return [];
}

export async function dbSaveRequisition(req: any): Promise<string> {
  return await db.requisitions.put(req);
}

export async function dbBulkUpsertRequisitions(reqs: any[]): Promise<void> {
  if (!reqs || reqs.length === 0) return;
  await db.requisitions.bulkPut(reqs);
}

/**
 * Standardized Requisition Approval in Dexie.js
 * Explicitly writes status: 'approved' (lowercase) and approvedAt timestamp.
 */
export async function dbApproveRequisition(id: string, requisitionData?: any): Promise<void> {
  const approvedAt = new Date().toISOString();
  try {
    const updatedCount = await db.requisitions.update(id, {
      status: 'approved',
      approvedAt,
      updatedAt: approvedAt
    });

    if (updatedCount === 0 && requisitionData) {
      await db.requisitions.put({
        ...requisitionData,
        id,
        status: 'approved',
        approvedAt,
        updatedAt: approvedAt
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('requisition-updated', {
        detail: { id, status: 'approved', approvedAt }
      }));
    }
  } catch (err) {
    console.warn('[dbApproveRequisition] notice:', err);
    if (requisitionData) {
      await db.requisitions.put({
        ...requisitionData,
        id,
        status: 'approved',
        approvedAt
      }).catch((e) => console.error('[dbApproveRequisition] put fallback error:', e));
    }
  }
}

/**
 * MIGRATION & REPAIR SCRIPT ON STARTUP
 * Scans Dexie.js and localStorage for existing requisitions and repairs
 * inconsistent status strings ('Approved', 'APPROVED', 'approuvé', 'VALIDATED', etc.)
 * directly to canonical lowercase 'approved'.
 */
export async function repairRequisitionStatuses(): Promise<{ updatedCount: number; totalCount: number }> {
  let updatedCount = 0;
  let totalCount = 0;

  const approvedAliases = ['approved', 'approuvé', 'approuve', 'validated', 'valide', 'validé'];

  try {
    // 1. Repair and sync in Dexie.js
    if (db.requisitions) {
      let dexieReqs = await db.requisitions.toArray();

      // If Dexie table is empty, attempt to hydrate from localStorage
      if (dexieReqs.length === 0 && typeof window !== 'undefined') {
        const rawLocal = localStorage.getItem('pastry_app_requisitions');
        if (rawLocal) {
          try {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await db.requisitions.bulkPut(parsed);
              dexieReqs = parsed;
            }
          } catch {
            // ignore JSON error
          }
        }
      }

      totalCount = dexieReqs.length;

      for (const req of dexieReqs) {
        const currentStatus = String(req.status || '').toLowerCase().trim();
        if (approvedAliases.includes(currentStatus) && req.status !== 'approved') {
          await db.requisitions.update(req.id, {
            status: 'approved',
            approvedAt: req.approvedAt || new Date().toISOString()
          });
          updatedCount++;
        }
      }
    }

    // 2. Repair in LocalStorage ('pastry_app_requisitions')
    if (typeof window !== 'undefined') {
      const rawLocal = localStorage.getItem('pastry_app_requisitions');
      if (rawLocal) {
        try {
          const list = JSON.parse(rawLocal);
          if (Array.isArray(list)) {
            let changed = false;
            const fixed = list.map((item: any) => {
              const currentStatus = String(item.status || '').toLowerCase().trim();
              if (approvedAliases.includes(currentStatus) && item.status !== 'approved') {
                changed = true;
                return {
                  ...item,
                  status: 'approved',
                  approvedAt: item.approvedAt || new Date().toISOString()
                };
              }
              return item;
            });

            if (changed) {
              localStorage.setItem('pastry_app_requisitions', JSON.stringify(fixed));
            }
          }
        } catch {
          // ignore
        }
      }
    }

    console.log(`[repairRequisitionStatuses] ✅ Repaired ${updatedCount} / ${totalCount} requisitions to canonical 'approved'.`);
  } catch (err) {
    console.warn('[repairRequisitionStatuses] Repair script notice:', err);
  }

  return { updatedCount, totalCount };
}

// Run automatic repair on load if client-side
if (typeof window !== 'undefined') {
  setTimeout(() => {
    repairRequisitionStatuses().catch(() => {});
  }, 300);
}
