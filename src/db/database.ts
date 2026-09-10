import Dexie, { Table } from 'dexie';

/**
 * Interface definitions for Dexie IndexedDB tables
 */
export interface DexieProductIngredient {
  rawMaterialId: string;
  name: string;
  quantityPerBatch: number;
  unit: string;
  category?: string;
  unitCost?: number;
  totalCost?: number;
}

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
  // Finished Good & Technical Sheet (Fiche Technique) fields
  type?: 'finished_good' | 'produit_fini' | 'raw_material' | string;
  roomId?: string;
  yieldPerBatch?: number;
  batchUnit?: string;
  ficheTechnique?: DexieProductIngredient[];
  ingredients?: DexieProductIngredient[];
  // COGS & Financial fields (Single Source of Truth)
  totalBatchCost?: number;
  cogsUnitCost?: number;
  sellingPrice?: number;
  marginAmount?: number;
  marginPercentage?: number;
  instructions?: string;
  description?: string;
}

export interface DexieRawMaterial {
  id: string;
  code?: string;
  name: string;
  category: string;
  unit: string;
  costPerUnit?: number;
  unitCost?: number;
  currentAvgCost?: number;
  pamp?: number;
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
  batchUnit?: string;
  specialInstructions?: string;
  notes?: string;
  roomId?: string;
  deductedIngredients: Array<{
    rawMaterialId: string;
    materialName: string;
    dosagePerBatch: number;
    totalCalculated: number;
    unit: string;
    stockBefore: number;
    stockAfter: number;
  }>;
  ingredients?: Array<{
    rawMaterialId: string;
    name?: string;
    materialName?: string;
    quantityPerBatch?: number;
    dosagePerBatch?: number;
    totalCalculated?: number;
    unit: string;
    stockBefore?: number;
    stockAfter?: number;
  }>;
  status: 'completed' | 'in_progress' | 'cancelled';
  completedAt?: string;
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

    // Schema Version 5: Single Source of Truth for Finished Goods, Fiches Techniques & COGS
    this.version(5).stores({
      products: 'id, code, name, category, type, roomId, storeId, barcode, isActive, updatedAt',
      raw_materials: 'id, code, name, category, unit, currentStock, updatedAt',
      requisitions: 'id, requisitionNumber, storeId, status, dateRequested',
      production_orders: 'id, ofCode, productId, bakerName, status, createdAt',
      cart: 'id, productId, storeId, addedAt',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp',
      settings: 'key, updatedAt'
    });

    // Schema Version 6: High-Performance Compound Indexes for Reactive Queries & Live Filtering
    this.version(6).stores({
      products: 'id, code, name, category, type, roomId, storeId, barcode, isActive, updatedAt, [type+roomId], [storeId+isActive]',
      raw_materials: 'id, code, name, category, unit, currentStock, updatedAt, [category+name]',
      requisitions: 'id, requisitionNumber, storeId, status, dateRequested, [storeId+status]',
      production_orders: 'id, ofCode, productId, bakerName, status, createdAt, [status+createdAt], [productId+status]',
      cart: 'id, productId, storeId, addedAt, [storeId+productId]',
      sales: 'id, transactionNumber, storeId, paymentMethod, syncStatus, timestamp, [storeId+timestamp], [syncStatus+timestamp]',
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

// Products & Recipes Operations
export async function dbGetAllProducts(storeId?: string): Promise<DexieProduct[]> {
  if (storeId) {
    return await db.products.where('storeId').equals(storeId).toArray();
  }
  return await db.products.toArray();
}

export async function dbGetProductById(id: string): Promise<DexieProduct | undefined> {
  return await db.products.get(id);
}

export async function dbGetFinishedGoods(roomId?: string): Promise<DexieProduct[]> {
  const all = await db.products.toArray();
  return all.filter((p: any) => {
    const isFinished = p.type === 'finished_good' || p.type === 'produit_fini' || !!p.roomId;
    if (!isFinished) return false;
    if (roomId && p.roomId && p.roomId.toLowerCase() !== roomId.toLowerCase()) return false;
    return true;
  });
}

export async function dbUpsertProduct(product: DexieProduct): Promise<string> {
  return await db.products.put(product);
}

export async function dbBulkUpsertProducts(products: DexieProduct[]): Promise<void> {
  await db.products.bulkPut(products);
}

export async function dbDeleteProduct(id: string): Promise<void> {
  await db.products.delete(id);
}

// Raw Materials Operations
export async function dbGetAllRawMaterials(): Promise<DexieRawMaterial[]> {
  return await db.raw_materials.toArray();
}

export async function dbGetRawMaterialById(id: string): Promise<DexieRawMaterial | undefined> {
  return await db.raw_materials.get(id);
}

export async function dbUpsertRawMaterial(material: DexieRawMaterial): Promise<string> {
  return await db.raw_materials.put(material);
}

export async function dbBulkUpsertRawMaterials(materials: DexieRawMaterial[]): Promise<void> {
  await db.raw_materials.bulkPut(materials);
}

export async function dbAdjustRawMaterialStock(id: string, deltaQty: number): Promise<void> {
  const item = await db.raw_materials.get(id);
  if (item) {
    const newStock = Math.max(0, (item.currentStock || 0) + deltaQty);
    await db.raw_materials.update(id, {
      currentStock: Math.round(newStock * 1000) / 1000,
      updatedAt: new Date().toISOString()
    });
  }
}

// Production Orders (Ordres de Fabrication) Operations
export async function dbGetProductionOrders(status?: string): Promise<DexieProductionOrder[]> {
  if (status) {
    return await db.production_orders.where('status').equals(status).toArray();
  }
  return await db.production_orders.orderBy('createdAt').reverse().toArray();
}

export async function dbGetProductionOrderById(id: string): Promise<DexieProductionOrder | undefined> {
  return await db.production_orders.get(id);
}

export async function dbSaveProductionOrder(order: DexieProductionOrder): Promise<string> {
  return await db.production_orders.put(order);
}

export async function dbBulkUpsertProductionOrders(orders: DexieProductionOrder[]): Promise<void> {
  if (!orders || orders.length === 0) return;
  await db.production_orders.bulkPut(orders);
}

export async function dbUpdateProductionOrderStatus(
  id: string,
  status: DexieProductionOrder['status'],
  notes?: string
): Promise<void> {
  const patch: Partial<DexieProductionOrder> = { status };
  if (status === 'completed') {
    patch.completedAt = new Date().toISOString();
  }
  if (notes) {
    patch.notes = notes;
  }
  await db.production_orders.update(id, patch);
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

/**
 * DEFAULT SEED FINISHED PRODUCTS WITH DETAILED FICHES TECHNIQUES & COGS
 * Standardized data for Délice Central Lab production rooms.
 */
export const SEED_FINISHED_GOODS_CATALOG: DexieProduct[] = [
  {
    id: 'prod_mille_feuille_varsovie',
    code: 'PF-MF-01',
    name: 'Mille-Feuille Varsovie (Vanille Bourbon)',
    category: 'Mille-Feuille',
    type: 'finished_good',
    roomId: 'mille_feuille',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 50,
    price: 450,
    sellingPrice: 450,
    costPrice: 198.50,
    cogsUnitCost: 198.50,
    totalBatchCost: 9925,
    marginAmount: 251.50,
    marginPercentage: 55.89,
    currentStock: 25,
    minStockAlert: 10,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001001',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Feuilletage inversé caramélisé croustillant, crème diplomate onctueuse à la vanille bourbon de Madagascar et glaçage fondant marbré traditionnel.',
    instructions: '1. Abaisser le pâton de feuilletage inversé à 2.5 mm d’épaisseur. 2. Piquer régulièrement et cuire à 180°C pendant 32 min sous grille avec saupoudrage de sucre glace à 210°C pour caramélisation. 3. Pocher la crème diplomate à la douille unie n°12. 4. Dresser en 3 couches superposées. 5. Masquer au fondant tempéré à 35°C et marbrer au chocolat.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 2.200, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 187 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre de Tourage Extra-Sec 84%', quantityPerBatch: 1.800, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 2250 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 3.500, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 332.5 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 18, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 396 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.900, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 99 },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée Impériale', quantityPerBatch: 0.320, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 153.6 },
      { rawMaterialId: 'rm_gousse_vanille', name: 'Gousses de Vanille Bourbon Madagascar', quantityPerBatch: 4, unit: 'pièces', category: 'Épices & Arômes', unitCost: 380, totalCost: 1520 },
      { rawMaterialId: 'rm_creme_liquide', name: 'Crème Liquide 35% MG', quantityPerBatch: 1.200, unit: 'L', category: 'Produits Laitiers', unitCost: 780, totalCost: 936 },
      { rawMaterialId: 'rm_fondant_blanc', name: 'Fondant Pâtissier Blanc', quantityPerBatch: 1.500, unit: 'kg', category: 'Nappages & Glaçages', unitCost: 360, totalCost: 540 }
    ],
    ficheTechnique: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 2.200, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 187 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre de Tourage Extra-Sec 84%', quantityPerBatch: 1.800, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 2250 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 3.500, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 332.5 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 18, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 396 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.900, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 99 },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée Impériale', quantityPerBatch: 0.320, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 153.6 },
      { rawMaterialId: 'rm_gousse_vanille', name: 'Gousses de Vanille Bourbon Madagascar', quantityPerBatch: 4, unit: 'pièces', category: 'Épices & Arômes', unitCost: 380, totalCost: 1520 },
      { rawMaterialId: 'rm_creme_liquide', name: 'Crème Liquide 35% MG', quantityPerBatch: 1.200, unit: 'L', category: 'Produits Laitiers', unitCost: 780, totalCost: 936 },
      { rawMaterialId: 'rm_fondant_blanc', name: 'Fondant Pâtissier Blanc', quantityPerBatch: 1.500, unit: 'kg', category: 'Nappages & Glaçages', unitCost: 360, totalCost: 540 }
    ]
  },
  {
    id: 'prod_croissant_beurre',
    code: 'PF-VN-02',
    name: 'Croissant Feuilleté Pur Beurre AOP',
    category: 'Viennoiserie & Briocherie',
    type: 'finished_good',
    roomId: 'viennoiserie',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 60,
    price: 130,
    sellingPrice: 130,
    costPrice: 48.20,
    cogsUnitCost: 48.20,
    totalBatchCost: 2892,
    marginAmount: 81.80,
    marginPercentage: 62.92,
    currentStock: 40,
    minStockAlert: 20,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001002',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Croissant traditionnel au feuilletage alvéolé croustillant, pur beurre AOP avec note subtile de fermentation au levain doux.',
    instructions: '1. Pétrissage de la détrempe 4 min en 1ère vitesse puis 6 min en 2ème vitesse. Pointage 30 min à 24°C puis blocage à +2°C pendant 12h. 2. Tourage : 1 tour double + 1 tour simple avec beurre à 14°C. 3. Façonnage et pousse 2h15 à 26°C / 80% humidité. 4. Dorure double et cuisson à 175°C pendant 16 min.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 2.500, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 212.5 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre de Tourage Extra-Sec 84%', quantityPerBatch: 1.250, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 1562.5 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 0.750, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 71.25 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.300, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 33 },
      { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin de Mer Pur', quantityPerBatch: 0.050, unit: 'kg', category: 'Épicerie', unitCost: 45, totalCost: 2.25 },
      { rawMaterialId: 'rm_levure_fraiche', name: 'Levure Fraîche Boulangère', quantityPerBatch: 0.100, unit: 'kg', category: 'Levures', unitCost: 180, totalCost: 18 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais (pour dorure)', quantityPerBatch: 3, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 66 }
    ],
    ficheTechnique: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 2.500, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 212.5 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre de Tourage Extra-Sec 84%', quantityPerBatch: 1.250, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 1562.5 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 0.750, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 71.25 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.300, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 33 },
      { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin de Mer Pur', quantityPerBatch: 0.050, unit: 'kg', category: 'Épicerie', unitCost: 45, totalCost: 2.25 },
      { rawMaterialId: 'rm_levure_fraiche', name: 'Levure Fraîche Boulangère', quantityPerBatch: 0.100, unit: 'kg', category: 'Levures', unitCost: 180, totalCost: 18 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais (pour dorure)', quantityPerBatch: 3, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 66 }
    ]
  },
  {
    id: 'prod_tartelette_citron',
    code: 'PF-PF-03',
    name: 'Tartelette Citron Jaune Meringuée',
    category: 'Pâtisseries Fines',
    type: 'finished_good',
    roomId: 'patisserie_fine',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 40,
    price: 380,
    sellingPrice: 380,
    costPrice: 142.50,
    cogsUnitCost: 142.50,
    totalBatchCost: 5700,
    marginAmount: 237.50,
    marginPercentage: 62.50,
    currentStock: 20,
    minStockAlert: 8,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001003',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Fond de pâte sablée noisette croustillant, crème onctueuse aux citrons jaunes pressés et meringue italienne dorée au chalumeau.',
    instructions: '1. Foncer les cercles inox perforés de 8 cm avec pâte sucrée à 2 mm. 2. Cuisson à blanc 160°C pendant 20 min. 3. Confectionner le crémeux citron émulsionné au beurre froid à 45°C. 4. Couler dans les fonds refroidis. 5. Pocher la meringue italienne au sucre cuit à 118°C et flamber délicatement.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 1.000, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 85 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre Fin Doux 82%', quantityPerBatch: 0.850, unit: 'kg', category: 'Matières Grasses', unitCost: 1150, totalCost: 977.5 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 1.100, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 121 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 22, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 484 },
      { rawMaterialId: 'rm_jus_citron', name: 'Jus Pur Citron Frais Pressé', quantityPerBatch: 1.200, unit: 'L', category: 'Fruits & Jus', unitCost: 260, totalCost: 312 },
      { rawMaterialId: 'rm_poudre_amande', name: 'Poudre d’Amande Blanche Extra-Fine', quantityPerBatch: 0.350, unit: 'kg', category: 'Fruits Secs', unitCost: 2400, totalCost: 840 }
    ],
    ficheTechnique: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 1.000, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 85 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre Fin Doux 82%', quantityPerBatch: 0.850, unit: 'kg', category: 'Matières Grasses', unitCost: 1150, totalCost: 977.5 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 1.100, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 121 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 22, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 484 },
      { rawMaterialId: 'rm_jus_citron', name: 'Jus Pur Citron Frais Pressé', quantityPerBatch: 1.200, unit: 'L', category: 'Fruits & Jus', unitCost: 260, totalCost: 312 },
      { rawMaterialId: 'rm_poudre_amande', name: 'Poudre d’Amande Blanche Extra-Fine', quantityPerBatch: 0.350, unit: 'kg', category: 'Fruits Secs', unitCost: 2400, totalCost: 840 }
    ]
  },
  {
    id: 'prod_eclair_chocolat',
    code: 'PF-PF-04',
    name: 'Éclair Chocolat Noir 64% Guanaja',
    category: 'Pâtisseries Fines',
    type: 'finished_good',
    roomId: 'patisserie_fine',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 45,
    price: 320,
    sellingPrice: 320,
    costPrice: 115.00,
    cogsUnitCost: 115.00,
    totalBatchCost: 5175,
    marginAmount: 205.00,
    marginPercentage: 64.06,
    currentStock: 30,
    minStockAlert: 10,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001004',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Pâte à choux dressée à la perfection, garnie de crème pâtissière dense au grand cru chocolat noir 64% et glaçage brillant miroir.',
    instructions: '1. Dessécher la panade à feu moyen jusqu’à détachement complet. 2. Incorporer les œufs un à un au batteur feuille. 3. Dresser des éclairs de 13 cm. 4. Cuisson au four à sole 170°C clé ouverte 35 min. 5. Garnir de 75g de crème au chocolat 64% puis glacer au fondant noir tempéré à 34°C.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 0.750, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 63.75 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre Fin Doux 82%', quantityPerBatch: 0.600, unit: 'kg', category: 'Matières Grasses', unitCost: 1150, totalCost: 690 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 20, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 440 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 2.200, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 209 },
      { rawMaterialId: 'rm_chocolat_noir', name: 'Chocolat de Couverture Noir 64%', quantityPerBatch: 1.100, unit: 'kg', category: 'Chocolats & Cacao', unitCost: 1850, totalCost: 2035 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.500, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 55 },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée', quantityPerBatch: 0.200, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 96 }
    ],
    ficheTechnique: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 0.750, unit: 'kg', category: 'Farines', unitCost: 85, totalCost: 63.75 },
      { rawMaterialId: 'rm_beurre_tourage', name: 'Beurre Fin Doux 82%', quantityPerBatch: 0.600, unit: 'kg', category: 'Matières Grasses', unitCost: 1150, totalCost: 690 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Calibre Gros', quantityPerBatch: 20, unit: 'pièces', category: 'Œufs', unitCost: 22, totalCost: 440 },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 2.200, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 209 },
      { rawMaterialId: 'rm_chocolat_noir', name: 'Chocolat de Couverture Noir 64%', quantityPerBatch: 1.100, unit: 'kg', category: 'Chocolats & Cacao', unitCost: 1850, totalCost: 2035 },
      { rawMaterialId: 'rm_sucre_cristallise', name: 'Sucre Cristallisé Extra Blanc', quantityPerBatch: 0.500, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 55 },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée', quantityPerBatch: 0.200, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 96 }
    ]
  }
];

/**
 * MIGRATION HELPER: Unifies Fiches Techniques, Produits Finis, and COGS into `db.products`
 * Resolves data fragmentation by consolidating all legacy stores into `db.products`
 * as the SINGLE source of truth across Baker Workflow, COGS calculator, and Lab Dispatcher.
 */
export async function migrateLegacyFichesAndFinishedGoodsToProducts(): Promise<{
  migratedCount: number;
  updatedCount: number;
  totalFinishedGoods: number;
}> {
  let migratedCount = 0;
  let updatedCount = 0;

  try {
    // 1. Ensure Raw Materials in db.raw_materials have valid unit costs (PAMP)
    const existingRawMaterials = await db.raw_materials.toArray();
    const rawCostMap = new Map<string, number>();

    // Baseline fallback costs per kg/L/unit in DZD if missing
    const DEFAULT_COSTS: Record<string, number> = {
      farine: 85,
      beurre: 1250,
      lait: 95,
      oeuf: 22,
      sucre: 110,
      chocolat: 1850,
      amande: 2400,
      vanille: 380,
      creme: 780,
      fondant: 360,
      levure: 180,
      sel: 45,
      citron: 260
    };

    const getFallbackCost = (name: string): number => {
      const lower = name.toLowerCase();
      for (const [key, cost] of Object.entries(DEFAULT_COSTS)) {
        if (lower.includes(key)) return cost;
      }
      return 150;
    };

    // Update raw materials if costs are undefined or 0
    for (const rm of existingRawMaterials) {
      const cost = rm.costPerUnit || rm.unitCost || rm.currentAvgCost || rm.pamp || getFallbackCost(rm.name);
      rawCostMap.set(rm.id, cost);
      rawCostMap.set(rm.name.toLowerCase().trim(), cost);

      if (!rm.costPerUnit || !rm.currentAvgCost || !rm.unitCost) {
        await db.raw_materials.update(rm.id, {
          costPerUnit: cost,
          unitCost: cost,
          currentAvgCost: cost,
          pamp: cost,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // 2. Fetch all products currently in db.products
    const currentProducts = await db.products.toArray();
    const productMap = new Map<string, DexieProduct>();
    for (const p of currentProducts) {
      productMap.set(p.id, p);
      productMap.set(p.name.toLowerCase().trim(), p);
    }

    // 3. Scan legacy localStorage keys for orphaned fiches / finished goods
    const legacyKeys = [
      'pastry_app_recipes',
      'delice_fiches_techniques',
      'delice_finished_goods',
      'fiches_techniques',
      'finished_goods'
    ];

    const legacyItems: any[] = [];
    if (typeof window !== 'undefined') {
      for (const key of legacyKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              legacyItems.push(...parsed);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // 4. Combine catalog seeds and legacy items
    const candidates = [...SEED_FINISHED_GOODS_CATALOG, ...legacyItems];

    for (const candidate of candidates) {
      if (!candidate || !candidate.name) continue;

      const normName = String(candidate.name).toLowerCase().trim();
      const existing = productMap.get(candidate.id) || productMap.get(normName);

      // Extract and normalize ingredients
      const rawIngs = candidate.ingredients || candidate.ficheTechnique || candidate.recipeIngredients || [];
      const normalizedIngredients: DexieProductIngredient[] = [];

      let totalBatchCost = 0;
      for (const ing of rawIngs) {
        const ingName = ing.name || ing.materialName || 'Ingrédient';
        const rawMatId = ing.rawMaterialId || ing.id || `rm_${ingName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const qty = Number(ing.quantityPerBatch ?? ing.dosagePerBatch ?? ing.quantity ?? 1);
        const unit = ing.unit || 'kg';
        const unitCost = Number(
          ing.unitCost ??
          rawCostMap.get(rawMatId) ??
          rawCostMap.get(ingName.toLowerCase().trim()) ??
          getFallbackCost(ingName)
        );
        const totalCost = Number((qty * unitCost).toFixed(2));
        totalBatchCost += totalCost;

        normalizedIngredients.push({
          rawMaterialId: rawMatId,
          name: ingName,
          quantityPerBatch: qty,
          unit,
          category: ing.category || 'Matières Premières',
          unitCost,
          totalCost
        });
      }

      const yieldPerBatch = Number(candidate.yieldPerBatch || candidate.yieldUnits || 50);
      const batchUnit = candidate.batchUnit || candidate.unitName || candidate.unit || 'pièces';
      const cogsUnitCost = yieldPerBatch > 0 ? Number((totalBatchCost / yieldPerBatch).toFixed(2)) : 0;
      const sellingPrice = Number(candidate.sellingPrice || candidate.price || candidate.suggestedSellingPrice || (cogsUnitCost * 2.2));
      const marginAmount = Number((sellingPrice - cogsUnitCost).toFixed(2));
      const marginPercentage = sellingPrice > 0 ? Number(((marginAmount / sellingPrice) * 100).toFixed(2)) : 0;

      if (!existing) {
        // Create new unified finished good in db.products
        const newProduct: DexieProduct = {
          id: candidate.id || `prod_${normName.replace(/[^a-z0-9]/g, '_')}`,
          code: candidate.code || `PF-${Math.floor(100 + Math.random() * 900)}`,
          name: candidate.name,
          category: candidate.category || 'Pâtisseries Fines',
          type: 'finished_good',
          roomId: candidate.roomId || 'patisserie_fine',
          unit: batchUnit,
          batchUnit,
          yieldPerBatch,
          price: sellingPrice,
          sellingPrice,
          costPrice: cogsUnitCost,
          cogsUnitCost,
          totalBatchCost: Number(totalBatchCost.toFixed(2)),
          marginAmount,
          marginPercentage,
          currentStock: candidate.currentStock ?? 20,
          minStockAlert: candidate.minStockAlert ?? 5,
          storeId: candidate.storeId || 'lab_central',
          storeName: candidate.storeName || 'Laboratoire Central',
          barcode: candidate.barcode || `613000${Math.floor(1000 + Math.random() * 9000)}`,
          isActive: true,
          updatedAt: new Date().toISOString(),
          description: candidate.description || '',
          instructions: candidate.instructions || '',
          ingredients: normalizedIngredients,
          ficheTechnique: normalizedIngredients
        };

        await db.products.put(newProduct);
        productMap.set(newProduct.id, newProduct);
        productMap.set(normName, newProduct);
        migratedCount++;
      } else {
        // Enrich existing product if missing ingredients or COGS fields
        const needsUpdate =
          !existing.ingredients ||
          existing.ingredients.length === 0 ||
          existing.type !== 'finished_good' ||
          !existing.totalBatchCost ||
          !existing.cogsUnitCost;

        if (needsUpdate) {
          const updatedProduct: DexieProduct = {
            ...existing,
            type: 'finished_good',
            roomId: existing.roomId || candidate.roomId || 'patisserie_fine',
            batchUnit: existing.batchUnit || batchUnit,
            yieldPerBatch: existing.yieldPerBatch || yieldPerBatch,
            sellingPrice: existing.sellingPrice || existing.price || sellingPrice,
            price: existing.sellingPrice || existing.price || sellingPrice,
            totalBatchCost: Number(totalBatchCost.toFixed(2)),
            cogsUnitCost,
            costPrice: cogsUnitCost,
            marginAmount,
            marginPercentage,
            instructions: existing.instructions || candidate.instructions || '',
            ingredients: normalizedIngredients.length > 0 ? normalizedIngredients : (existing.ingredients || []),
            ficheTechnique: normalizedIngredients.length > 0 ? normalizedIngredients : (existing.ficheTechnique || []),
            updatedAt: new Date().toISOString()
          };

          await db.products.put(updatedProduct);
          productMap.set(updatedProduct.id, updatedProduct);
          updatedCount++;
        }
      }
    }

    const totalFinishedGoods = (await db.products.where('type').equals('finished_good').toArray()).length;
    console.log(`[migrateLegacyFichesAndFinishedGoodsToProducts] ✅ Unified db.products: ${migratedCount} migrated, ${updatedCount} updated, ${totalFinishedGoods} total finished goods.`);

    return { migratedCount, updatedCount, totalFinishedGoods };
  } catch (err) {
    console.warn('[migrateLegacyFichesAndFinishedGoodsToProducts] migration notice:', err);
    return { migratedCount, updatedCount, totalFinishedGoods: 0 };
  }
}

// Run automatic repair and migration on load if client-side
if (typeof window !== 'undefined') {
  setTimeout(() => {
    repairRequisitionStatuses().catch(() => {});
    migrateLegacyFichesAndFinishedGoodsToProducts().catch(() => {});
  }, 250);
}
