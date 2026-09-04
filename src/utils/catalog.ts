import { db, DexieProduct, DexieRawMaterial } from '../db/database';
import { MASTER_PRODUCT_CATALOG, getProductRoomId } from './orderAggregator';
import { INITIAL_RAW_MATERIALS } from '../data/mockData';
import { getRawMaterials, getRetailProducts } from '../services/storage';
import { OrderLine, RequisitionItem } from '../types';

export type CatalogFilterType = 'ALL' | 'FINISHED' | 'RAW';

export interface UnifiedCatalogItem {
  itemId: string;
  itemType: 'finished_product' | 'raw_material';
  itemTitle: string;
  category: string;
  roomId: string;
  unit: string;
  unitEstimatedCost: number;
  currentStock?: number;
  code?: string;
  description?: string;
}

/**
 * Ensures Dexie db.products and db.raw_materials tables are seeded
 * with fallback master catalog and raw materials if currently empty.
 */
export async function ensureCatalogDatabaseSeeded(): Promise<void> {
  try {
    // 1. Seed Products if empty
    const productCount = await db.products.count();
    if (productCount === 0) {
      const retailProducts = getRetailProducts();
      const productsToSeed: DexieProduct[] = MASTER_PRODUCT_CATALOG.map((p, idx) => {
        const retailMatch = retailProducts.find(
          (rp) => rp.name.toLowerCase() === p.name.toLowerCase() || rp.id === p.id
        );
        return {
          id: p.id || `prod-seed-${idx + 1}`,
          code: p.sku || `SKU-${idx + 100}`,
          name: p.name,
          category: p.category,
          unit: p.unit || 'pcs',
          price: p.sellingPrice || retailMatch?.price || 2.0,
          costPrice: p.unitEstimatedCost || 1.0,
          currentStock: 50,
          minStockAlert: 10,
          storeId: 'store-1',
          isActive: true,
          updatedAt: new Date().toISOString(),
        };
      });

      if (productsToSeed.length > 0) {
        await db.products.bulkPut(productsToSeed);
      }
    }

    // 2. Seed Raw Materials if empty
    const rawCount = await db.raw_materials.count();
    if (rawCount === 0) {
      const storageMats = getRawMaterials();
      const matsSource = storageMats.length > 0 ? storageMats : INITIAL_RAW_MATERIALS;
      const matsToSeed: DexieRawMaterial[] = matsSource.map((rm, idx) => ({
        id: rm.id || `rm-seed-${idx + 1}`,
        code: rm.sku || `RM-${idx + 100}`,
        name: rm.name,
        category: rm.category || 'Matières Premières',
        unit: rm.unit || 'kg',
        costPerUnit: (rm as any).currentAvgCost || (rm as any).costPerUnit || 1.5,
        currentStock: rm.currentStock ?? 100,
        minStockAlert: (rm as any).reorderLevel || 20,
        storeId: 'store-1',
        isActive: true,
        updatedAt: new Date().toISOString(),
      }));

      if (matsToSeed.length > 0) {
        await db.raw_materials.bulkPut(matsToSeed);
      }
    }
  } catch (err) {
    console.warn('[Catalog] Notice while seeding Dexie catalog tables:', err);
  }
}

/**
 * Fetches unified pool of catalog items from db.products and db.raw_materials.
 * Formats each with discriminator field itemType: 'finished_product' | 'raw_material'.
 */
export async function fetchUnifiedCatalog(): Promise<UnifiedCatalogItem[]> {
  await ensureCatalogDatabaseSeeded();

  const [rawProducts, rawMaterials] = await Promise.all([
    db.products.toArray().catch((err) => {
      console.warn('[Catalog] Error fetching db.products:', err);
      return [] as DexieProduct[];
    }),
    db.raw_materials.toArray().catch((err) => {
      console.warn('[Catalog] Error fetching db.raw_materials:', err);
      return [] as DexieRawMaterial[];
    }),
  ]);

  const finishedItems: UnifiedCatalogItem[] = rawProducts.map((p) => {
    const assignedRoomId = getProductRoomId(p.name, p.category);
    return {
      itemId: p.id,
      itemType: 'finished_product',
      itemTitle: p.name,
      category: p.category || 'Viennoiserie & Brioche',
      roomId: assignedRoomId,
      unit: p.unit || 'pcs',
      unitEstimatedCost: p.costPrice || (p.price ? Math.round(p.price * 0.6 * 100) / 100 : 1.0),
      currentStock: p.currentStock,
      code: p.code,
    };
  });

  const materialItems: UnifiedCatalogItem[] = rawMaterials.map((rm) => {
    return {
      itemId: rm.id,
      itemType: 'raw_material',
      itemTitle: rm.name,
      category: rm.category || 'Matières Premières',
      roomId: 'storage_lab',
      unit: rm.unit || 'kg',
      unitEstimatedCost: rm.costPerUnit || 1.5,
      currentStock: rm.currentStock,
      code: rm.code,
    };
  });

  return [...finishedItems, ...materialItems];
}

/**
 * Filter catalog items by type and optional search query
 */
export function filterCatalogItems(
  items: UnifiedCatalogItem[],
  filter: CatalogFilterType,
  searchQuery: string = ''
): UnifiedCatalogItem[] {
  let filtered = items;

  if (filter === 'FINISHED') {
    filtered = filtered.filter((i) => i.itemType === 'finished_product');
  } else if (filter === 'RAW') {
    filtered = filtered.filter((i) => i.itemType === 'raw_material');
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.itemTitle.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.code && i.code.toLowerCase().includes(q))
    );
  }

  return filtered;
}

/**
 * Converts an OrderLine into a RequisitionItem for backend persistence
 */
export function orderLineToRequisitionItem(line: OrderLine, index: number): RequisitionItem {
  return {
    id: `rqi-${Date.now()}-${index}`,
    productName: line.itemTitle,
    category: line.category,
    quantityRequested: line.requestedQty,
    unit: line.unit,
    unitEstimatedCost: line.unitEstimatedCost || 1.0,
    roomId: line.roomId as any,
    itemId: line.itemId,
    itemType: line.itemType,
  };
}
