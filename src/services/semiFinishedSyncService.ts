import { db, DexieProduct, DexieProductIngredient } from '../db/database';
import {
  getSemiFinishedStock,
  saveSemiFinishedStock,
  getRecipes,
  saveRecipe,
  getRawMaterials,
  getRecipeUnitCost,
} from './storage';
import { SemiFinishedStockItem, Recipe } from '../types';
import { SAMPLE_SEMI_FINISHED_GOODS } from '../db/dbSeeder';

/**
 * Normalizes string for comparison
 */
function norm(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Comprehensive bidirectional synchronization between Semi-Finished Stock
 * (storage.ts / localStorage) and Dexie db.products (type: 'semi_finished').
 *
 * This ensures that:
 * 1. Any semi-finished product added, edited or produced in stock immediately
 *    appears in the Fiche Technique composition dropdown.
 * 2. Any semi-finished product in db.products exists in Stock with accurate quantity and costs.
 */
export async function syncAllSemiFinishedStockAndProducts(): Promise<{
  dexieCount: number;
  stockCount: number;
  synced: boolean;
}> {
  try {
    // 1. Fetch live semi-finished products from Dexie db.products
    let dexieSf = await db.products
      .filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini')
      .toArray();

    // If Dexie db.products has zero semi-finished products, seed SAMPLE_SEMI_FINISHED_GOODS
    if (dexieSf.length === 0) {
      console.log('[SemiFinishedSync] Seeding SAMPLE_SEMI_FINISHED_GOODS into db.products...');
      await db.products.bulkPut(SAMPLE_SEMI_FINISHED_GOODS);
      dexieSf = await db.products
        .filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini')
        .toArray();
    }

    // 2. Fetch current semi-finished stock & recipes from storage
    const stockItems = getSemiFinishedStock();
    const recipes = getRecipes();
    const rawMaterials = getRawMaterials();

    let stockModified = false;
    const productsToUpsert: DexieProduct[] = [];

    // Map existing stock items by id and normalized name
    const stockMapById = new Map<string, SemiFinishedStockItem>();
    const stockMapByName = new Map<string, SemiFinishedStockItem>();
    stockItems.forEach((item) => {
      stockMapById.set(item.id, item);
      if (item.recipeId) stockMapById.set(item.recipeId, item);
      stockMapByName.set(norm(item.recipeName), item);
    });

    // Map existing Dexie products by id and normalized name
    const dexieMapById = new Map<string, DexieProduct>();
    const dexieMapByName = new Map<string, DexieProduct>();
    dexieSf.forEach((p) => {
      dexieMapById.set(p.id, p);
      dexieMapByName.set(norm(p.name), p);
    });

    // 3. Sync Dexie products -> Semi-Finished Stock (storage.ts)
    for (const p of dexieSf) {
      let matchedStock = stockMapById.get(p.id) || dexieMapByName.get(norm(p.name)) ? stockMapByName.get(norm(p.name)) : undefined;

      const unitCost = p.cogsUnitCost || p.costPrice || p.unitCost || 0;

      if (!matchedStock) {
        // Create stock item for this Dexie product
        const newStockItem: SemiFinishedStockItem = {
          id: p.id,
          recipeId: p.id,
          recipeName: p.name,
          category: p.category || 'Bases & Semi-Finis',
          currentStock: p.currentStock ?? 0,
          unit: p.unit || p.batchUnit || 'kg',
          minStockLevel: p.minStockAlert ?? 5,
          lastUpdated: p.updatedAt ? p.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        };
        stockItems.push(newStockItem);
        stockMapById.set(newStockItem.id, newStockItem);
        stockMapByName.set(norm(newStockItem.recipeName), newStockItem);
        stockModified = true;

        // Also ensure recipe exists
        const hasRecipe = recipes.some((r) => r.id === p.id || norm(r.name) === norm(p.name));
        if (!hasRecipe) {
          const newRecipe: Recipe = {
            id: p.id,
            name: p.name,
            category: p.category || 'Composants & Bases',
            recipeType: 'SEMI_FINISHED',
            yieldUnits: p.yieldPerBatch || 1,
            unitName: p.unit || p.batchUnit || 'kg',
            prepTimeMinutes: 30,
            ingredients: (p.ingredients || p.ficheTechnique || []).map((ing) => ({
              type: ing.type === 'SEMI_FINISHED' ? 'SEMI_FINISHED' : 'RAW_MATERIAL',
              rawMaterialId: ing.rawMaterialId,
              quantity: ing.quantityPerBatch || 1,
              unit: ing.unit || 'kg',
            })),
          };
          saveRecipe(newRecipe);
        }
      } else {
        // Sync attributes if different
        let itemChanged = false;
        if (matchedStock.currentStock !== (p.currentStock ?? 0)) {
          matchedStock.currentStock = p.currentStock ?? 0;
          itemChanged = true;
        }
        if (p.unit && matchedStock.unit !== p.unit) {
          matchedStock.unit = p.unit;
          itemChanged = true;
        }
        if (p.category && matchedStock.category !== p.category) {
          matchedStock.category = p.category;
          itemChanged = true;
        }
        if (itemChanged) {
          stockModified = true;
        }
      }
    }

    // 4. Sync Semi-Finished Stock (storage.ts) -> Dexie db.products
    for (const sf of stockItems) {
      let matchedDexie = dexieMapById.get(sf.id) || dexieMapById.get(sf.recipeId) || dexieMapByName.get(norm(sf.recipeName));

      const matchingRecipe = recipes.find((r) => r.id === sf.recipeId || norm(r.name) === norm(sf.recipeName));
      const calculatedCost = matchingRecipe
        ? getRecipeUnitCost(matchingRecipe, recipes, rawMaterials)
        : 0;

      if (!matchedDexie) {
        // Convert recipe ingredients to Dexie ingredients format
        const dexieIngredients: DexieProductIngredient[] = (matchingRecipe?.ingredients || []).map((ing) => {
          const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
          const cost = rm ? rm.currentAvgCost ?? 0 : 0;
          return {
            rawMaterialId: ing.rawMaterialId || '',
            name: rm?.name || 'Ingrédient',
            quantityPerBatch: ing.quantity,
            unit: ing.unit || 'kg',
            category: rm?.category || 'Matières Premières',
            unitCost: cost,
            totalCost: Number((ing.quantity * cost).toFixed(2)),
            type: ing.type === 'SEMI_FINISHED' ? 'SEMI_FINISHED' : 'RAW_MATERIAL',
          };
        });

        const newProd: DexieProduct = {
          id: sf.id,
          code: `SF-${Math.floor(100 + Math.random() * 900)}`,
          name: sf.recipeName,
          category: sf.category || 'Bases & Semi-Finis',
          unit: sf.unit || 'kg',
          batchUnit: sf.unit || 'kg',
          price: 0,
          costPrice: Number(calculatedCost.toFixed(2)),
          cogsUnitCost: Number(calculatedCost.toFixed(2)),
          unitCost: Number(calculatedCost.toFixed(2)),
          totalBatchCost: Number((calculatedCost * (matchingRecipe?.yieldUnits || 1)).toFixed(2)),
          currentStock: Math.max(0, sf.currentStock),
          minStockAlert: Math.max(0, sf.minStockLevel),
          storeId: 'lab_central',
          storeName: 'Laboratoire Central',
          isActive: true,
          updatedAt: new Date().toISOString(),
          type: 'semi_finished',
          yieldPerBatch: matchingRecipe?.yieldUnits || 1,
          ingredients: dexieIngredients,
          ficheTechnique: dexieIngredients,
        };

        productsToUpsert.push(newProd);
        dexieMapById.set(newProd.id, newProd);
        dexieMapByName.set(norm(newProd.name), newProd);
      } else {
        // If stock or cost has changed, update Dexie product
        let needsUpdate = false;
        const updatedProd: DexieProduct = { ...matchedDexie };

        if (matchedDexie.currentStock !== sf.currentStock) {
          updatedProd.currentStock = sf.currentStock;
          needsUpdate = true;
        }
        if (sf.unit && matchedDexie.unit !== sf.unit) {
          updatedProd.unit = sf.unit;
          updatedProd.batchUnit = sf.unit;
          needsUpdate = true;
        }
        if (sf.minStockLevel && matchedDexie.minStockAlert !== sf.minStockLevel) {
          updatedProd.minStockAlert = sf.minStockLevel;
          needsUpdate = true;
        }
        if (calculatedCost > 0 && Math.abs((matchedDexie.cogsUnitCost || 0) - calculatedCost) > 0.05) {
          updatedProd.cogsUnitCost = Number(calculatedCost.toFixed(2));
          updatedProd.unitCost = Number(calculatedCost.toFixed(2));
          updatedProd.costPrice = Number(calculatedCost.toFixed(2));
          needsUpdate = true;
        }

        if (needsUpdate) {
          updatedProd.updatedAt = new Date().toISOString();
          productsToUpsert.push(updatedProd);
        }
      }
    }

    // Persist updates
    if (productsToUpsert.length > 0) {
      await db.products.bulkPut(productsToUpsert);
      console.log(`[SemiFinishedSync] Upserted ${productsToUpsert.length} semi-finished products into db.products.`);
    }

    if (stockModified) {
      saveSemiFinishedStock(stockItems);
      console.log(`[SemiFinishedSync] Updated semi-finished stock list in storage.ts (${stockItems.length} items).`);
    }

    const finalDexie = await db.products
      .filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini')
      .toArray();

    return {
      dexieCount: finalDexie.length,
      stockCount: stockItems.length,
      synced: true,
    };
  } catch (err) {
    console.error('[SemiFinishedSync] Error during bidirectional sync:', err);
    return { dexieCount: 0, stockCount: 0, synced: false };
  }
}

/**
 * Upserts a newly added or modified semi-finished stock item into db.products
 */
export async function syncSingleSemiFinishedToDexie(
  sfItem: SemiFinishedStockItem,
  recipe?: Recipe,
  calculatedCost: number = 0,
  dexieIngredients: DexieProductIngredient[] = []
): Promise<void> {
  try {
    const existing = await db.products
      .filter(
        (p) =>
          (p.type === 'semi_finished' || p.type === 'semi_fini') &&
          (p.id === sfItem.id ||
            p.id === sfItem.recipeId ||
            norm(p.name) === norm(sfItem.recipeName))
      )
      .first();

    const unitCost = calculatedCost > 0 ? calculatedCost : existing?.cogsUnitCost || existing?.costPrice || 0;
    const yieldUnits = recipe?.yieldUnits || existing?.yieldPerBatch || 1;

    const prodToSave: DexieProduct = {
      ...(existing || {}),
      id: existing?.id || sfItem.id,
      code: existing?.code || `SF-${Math.floor(100 + Math.random() * 900)}`,
      name: sfItem.recipeName.trim(),
      category: sfItem.category || existing?.category || 'Bases & Semi-Finis',
      unit: sfItem.unit || existing?.unit || 'kg',
      batchUnit: sfItem.unit || existing?.batchUnit || 'kg',
      price: 0,
      costPrice: Number(unitCost.toFixed(2)),
      cogsUnitCost: Number(unitCost.toFixed(2)),
      unitCost: Number(unitCost.toFixed(2)),
      totalBatchCost: Number((unitCost * yieldUnits).toFixed(2)),
      currentStock: Math.max(0, sfItem.currentStock),
      minStockAlert: Math.max(0, sfItem.minStockLevel),
      storeId: 'lab_central',
      storeName: 'Laboratoire Central',
      isActive: true,
      updatedAt: new Date().toISOString(),
      type: 'semi_finished',
      yieldPerBatch: yieldUnits,
      ingredients: dexieIngredients.length > 0 ? dexieIngredients : existing?.ingredients || [],
      ficheTechnique: dexieIngredients.length > 0 ? dexieIngredients : existing?.ficheTechnique || [],
    };

    await db.products.put(prodToSave);
    console.log(`[SemiFinishedSync] Synced single semi-finished "${prodToSave.name}" to db.products (stock: ${prodToSave.currentStock}).`);
  } catch (err) {
    console.error('[SemiFinishedSync] Error syncing single SF to Dexie:', err);
  }
}

/**
 * Updates stock quantity for a semi-finished product in db.products
 */
export async function syncUpdateSemiFinishedStockInDexie(
  idOrRecipeId: string,
  newStock: number
): Promise<void> {
  try {
    const matches = await db.products
      .filter(
        (p) =>
          (p.type === 'semi_finished' || p.type === 'semi_fini') &&
          (p.id === idOrRecipeId || p.code === idOrRecipeId)
      )
      .toArray();

    for (const m of matches) {
      await db.products.update(m.id, {
        currentStock: Math.max(0, newStock),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[SemiFinishedSync] Error updating SF stock in Dexie:', err);
  }
}

/**
 * Deletes a semi-finished product from db.products
 */
export async function syncDeleteSemiFinishedFromDexie(
  id: string,
  recipeId?: string,
  name?: string
): Promise<void> {
  try {
    const matches = await db.products
      .filter(
        (p) =>
          (p.type === 'semi_finished' || p.type === 'semi_fini') &&
          (p.id === id ||
            (recipeId && p.id === recipeId) ||
            (name && norm(p.name) === norm(name)))
      )
      .toArray();

    for (const m of matches) {
      await db.products.delete(m.id);
    }
    console.log(`[SemiFinishedSync] Deleted SF from db.products: ${matches.map((m) => m.name).join(', ')}`);
  } catch (err) {
    console.error('[SemiFinishedSync] Error deleting SF from Dexie:', err);
  }
}
