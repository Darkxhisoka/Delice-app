import Dexie, { Table } from 'dexie';
import type { ProductionRoomId, FinishedProductCategory } from '../types';

/**
 * Maps each finished-product category to its production room ID.
 */
export const CATEGORY_TO_ROOM_MAP: Record<FinishedProductCategory, ProductionRoomId> = {
  'G\u00e2teaux Secs': 'gateaux_secs',
  'G\u00e2teaux Orientaux': 'gateaux_orientaux',
  'Mille-Feuille & Feuilletage': 'mille_feuille',
  'Viennoiserie & Briocherie': 'viennoiserie',
  'P\u00e2tisseries Fines': 'patisserie_fine',
  'Pi\u00e8ces Mont\u00e9es': 'piece_montee',
  'Trompe-l\u2019\u0153il': 'trompe_oeil',
};

/**
 * Interface definitions for Dexie IndexedDB tables
 */
export interface DexieProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  roomId?: ProductionRoomId;
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

    // Schema Version 2 — add roomId index to products
    this.version(2).stores({
      products: 'id, code, name, category, roomId, storeId, barcode, isActive, updatedAt',
    }).upgrade(async (tx) => {
      return tx.table('products').toCollection().modify((product) => {
        if (!product.roomId && product.category) {
          const mapped = CATEGORY_TO_ROOM_MAP[product.category as FinishedProductCategory];
          if (mapped) {
            product.roomId = mapped;
          }
        }
      });
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

/**
 * Scans all products in IndexedDB and fills missing roomId values
 * using CATEGORY_TO_ROOM_MAP, falling back to keyword-based getProductRoomId().
 */
export async function migrateProductRoomIds(): Promise<{ updated: number }> {
  let updatedCount = 0;

  const allProducts = await db.products.toArray();
  const { getProductRoomId } = await import('../utils/orderAggregator');

  for (const product of allProducts) {
    if (product.roomId || !product.category) continue;

    const mapped = CATEGORY_TO_ROOM_MAP[product.category as FinishedProductCategory];
    const resolved = mapped || getProductRoomId(product.name, product.category);

    if (resolved) {
      await db.products.update(product.id, { roomId: resolved });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`[DB Migration] Assigned roomId to ${updatedCount} product(s).`);
  }

  return { updated: updatedCount };
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
