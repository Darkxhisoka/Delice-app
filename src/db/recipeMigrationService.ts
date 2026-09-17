import { db, DexieProduct, DexieRawMaterial, DexieProductIngredient } from './database';
import { saveRawMaterials } from '../services/storage';

export interface CleanAndSyncResult {
  totalProductsProcessed: number;
  totalIngredientsAnalyzed: number;
  ingredientsAlreadyValid: number;
  ingredientsRepaired: number;
  rawMaterialsCreated: number;
  productsUpdated: number;
  details: Array<{
    productId: string;
    productName: string;
    action: 'REPAIRED' | 'CREATED_RAW_MATERIAL' | 'UNCHANGED';
    ingredientName: string;
    oldRawId: string;
    resolvedRawId: string;
    unitCost: number;
  }>;
}

/**
 * Normalizes string for fuzzy/case-insensitive comparisons.
 * Removes diacritics, lowercase, trims.
 */
function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Creates a clean safe slug from a string.
 */
function createSafeSlug(name: string): string {
  return normalizeString(name)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/**
 * Migration & Data Consistency Engine:
 * Iterates through all finished products in `db.products`.
 * Checks each recipe ingredient against `db.raw_materials` (matching by ID or case-insensitive name).
 * If an ingredient is missing from `db.raw_materials`, it either maps it to an existing raw material
 * or automatically creates a new valid `db.raw_materials` entry with default stock/cost values.
 * Saves the cleaned, synchronized recipe array back to `db.products` and recalculates COGS.
 */
export async function cleanAndSyncRecipeIngredients(): Promise<CleanAndSyncResult> {
  const result: CleanAndSyncResult = {
    totalProductsProcessed: 0,
    totalIngredientsAnalyzed: 0,
    ingredientsAlreadyValid: 0,
    ingredientsRepaired: 0,
    rawMaterialsCreated: 0,
    productsUpdated: 0,
    details: [],
  };

  // 1. Fetch current live datasets
  const allProducts = await db.products.toArray();
  const allRawMaterials = await db.raw_materials.toArray();

  // 2. Build fast lookup indexes for raw materials
  const rawById = new Map<string, DexieRawMaterial>();
  const rawByNormalizedName = new Map<string, DexieRawMaterial>();

  allRawMaterials.forEach((rm) => {
    rawById.set(rm.id, rm);
    const norm = normalizeString(rm.name);
    if (norm) {
      rawByNormalizedName.set(norm, rm);
    }
  });

  const newlyCreatedMaterials: DexieRawMaterial[] = [];
  const updatedProducts: DexieProduct[] = [];

  // Helper to retrieve live PAMP unit cost
  const getPamp = (rm: DexieRawMaterial): number => {
    return rm.unitCost ?? rm.costPerUnit ?? rm.currentAvgCost ?? rm.pamp ?? 0;
  };

  // 3. Process every product in db.products
  for (const product of allProducts) {
    result.totalProductsProcessed++;

    const currentIngredients: DexieProductIngredient[] =
      product.ingredients || product.ficheTechnique || [];

    if (currentIngredients.length === 0) {
      continue;
    }

    let hasProductModifications = false;
    const synchronizedIngredients: DexieProductIngredient[] = [];
    let totalBatchCost = 0;

    for (let i = 0; i < currentIngredients.length; i++) {
      const ing = currentIngredients[i];
      result.totalIngredientsAnalyzed++;

      const rawId = (ing.rawMaterialId || '').toString().trim();
      const rawName = (ing.name || '').trim();
      const normName = normalizeString(rawName);

      // Check if this ingredient is a semi-finished component (from db.products where type is semi_finished)
      const matchedSf = allProducts.find(
        (p) =>
          (p.type === 'semi_finished' || p.type === 'semi_fini') &&
          (p.id === rawId || (normName && normalizeString(p.name) === normName))
      );

      if (matchedSf || ing.type === 'SEMI_FINISHED' || ing.type === 'semi_fini') {
        const sfCost = matchedSf?.cogsUnitCost || matchedSf?.costPrice || matchedSf?.unitCost || ing.unitCost || 0;
        const sfUnit = matchedSf?.batchUnit || matchedSf?.unit || ing.unit || 'kg';
        const quantity = Math.max(0, ing.quantityPerBatch || 0);
        const lineCost = Number((quantity * sfCost).toFixed(2));
        totalBatchCost += lineCost;

        synchronizedIngredients.push({
          rawMaterialId: matchedSf?.id || rawId,
          name: matchedSf?.name || ing.name,
          quantityPerBatch: quantity,
          unit: sfUnit,
          category: matchedSf?.category || ing.category || 'Bases & Semi-Finis',
          unitCost: sfCost,
          totalCost: lineCost,
          type: 'SEMI_FINISHED',
        });
        result.ingredientsAlreadyValid++;
        continue;
      }

      // Check direct ID match
      let matched = rawById.get(rawId);

      // If no ID match, try normalized exact name match
      if (!matched && normName) {
        matched = rawByNormalizedName.get(normName);
      }

      // If still not matched, try fuzzy substring match in known materials
      if (!matched && normName) {
        const fuzzy = allRawMaterials.find((rm) => {
          const rmNorm = normalizeString(rm.name);
          return (
            rmNorm.includes(normName) ||
            normName.includes(rmNorm) ||
            rm.id.toLowerCase().includes(normName.replace(/[^a-z0-9]/g, '_'))
          );
        });
        if (fuzzy) {
          matched = fuzzy;
        }
      }

      // Case A: Missing completely from db.raw_materials -> Auto-create master entry
      if (!matched) {
        const slug = createSafeSlug(rawName || 'matiere_premiere');
        const generatedId =
          rawId && rawId.startsWith('rm_')
            ? rawId
            : `rm_${slug || Date.now().toString().slice(-6)}`;

        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const code = `MP-SYNC-${randomSuffix}`;
        const fallbackCost = ing.unitCost && ing.unitCost > 0 ? ing.unitCost : 100;
        const fallbackUnit = ing.unit || 'kg';

        const newRawMat: DexieRawMaterial = {
          id: generatedId,
          code,
          name: rawName || `Matière Première (${generatedId})`,
          category: ing.category || 'Matières Premières',
          unit: fallbackUnit,
          currentStock: 50,
          stockQuantity: 50,
          unitCost: fallbackCost,
          costPerUnit: fallbackCost,
          pamp: fallbackCost,
          currentAvgCost: fallbackCost,
          minStockAlert: 10,
          storeId: 'lab_central',
          isActive: true,
          updatedAt: new Date().toISOString(),
        };

        // Register in runtime lookups
        allRawMaterials.push(newRawMat);
        newlyCreatedMaterials.push(newRawMat);
        rawById.set(newRawMat.id, newRawMat);
        rawByNormalizedName.set(normalizeString(newRawMat.name), newRawMat);

        matched = newRawMat;
        result.rawMaterialsCreated++;
        hasProductModifications = true;

        result.details.push({
          productId: product.id,
          productName: product.name,
          action: 'CREATED_RAW_MATERIAL',
          ingredientName: newRawMat.name,
          oldRawId: rawId,
          resolvedRawId: newRawMat.id,
          unitCost: fallbackCost,
        });
      }

      // Case B: Existing or newly-registered matched material
      const livePampCost = getPamp(matched);
      const targetUnit = matched.unit || ing.unit || 'kg';
      const quantity = Math.max(0, ing.quantityPerBatch || 0);
      const lineCost = Number((quantity * livePampCost).toFixed(2));
      totalBatchCost += lineCost;

      const isDifferentId = rawId !== matched.id;
      const isDifferentName = ing.name !== matched.name;
      const isDifferentCost = Math.abs((ing.unitCost || 0) - livePampCost) > 0.001;

      if (isDifferentId || isDifferentName || isDifferentCost || ing.type !== 'RAW_MATERIAL') {
        hasProductModifications = true;
        result.ingredientsRepaired++;

        result.details.push({
          productId: product.id,
          productName: product.name,
          action: 'REPAIRED',
          ingredientName: matched.name,
          oldRawId: rawId,
          resolvedRawId: matched.id,
          unitCost: livePampCost,
        });
      } else {
        result.ingredientsAlreadyValid++;
      }

      synchronizedIngredients.push({
        rawMaterialId: matched.id,
        name: matched.name,
        quantityPerBatch: quantity,
        unit: targetUnit,
        category: matched.category || ing.category,
        unitCost: livePampCost,
        totalCost: lineCost,
        type: 'RAW_MATERIAL',
      });
    }

    if (hasProductModifications) {
      const yieldPerBatch = product.yieldPerBatch && product.yieldPerBatch > 0 ? product.yieldPerBatch : 1;
      const cogsUnitCost = Number((totalBatchCost / yieldPerBatch).toFixed(2));
      const sellingPrice = product.sellingPrice || product.price || cogsUnitCost * 2.2;
      const marginAmount = Number((sellingPrice - cogsUnitCost).toFixed(2));
      const marginPercentage =
        sellingPrice > 0 ? Number(((marginAmount / sellingPrice) * 100).toFixed(2)) : 0;

      const updatedProd: DexieProduct = {
        ...product,
        ingredients: synchronizedIngredients,
        ficheTechnique: synchronizedIngredients,
        totalBatchCost: Number(totalBatchCost.toFixed(2)),
        cogsUnitCost,
        costPrice: cogsUnitCost,
        unitCost: cogsUnitCost,
        price: sellingPrice,
        sellingPrice,
        marginAmount,
        marginPercentage,
        updatedAt: new Date().toISOString(),
      };

      updatedProducts.push(updatedProd);
      result.productsUpdated++;
    }
  }

  // 4. Atomic persistence using Dexie transaction
  await db.transaction('rw', [db.raw_materials, db.products], async () => {
    if (newlyCreatedMaterials.length > 0) {
      await db.raw_materials.bulkPut(newlyCreatedMaterials);
    }
    if (updatedProducts.length > 0) {
      await db.products.bulkPut(updatedProducts);
    }
  });

  // 5. Update local storage cache if new raw materials were introduced
  if (newlyCreatedMaterials.length > 0) {
    try {
      const refreshedRawMaterials = await db.raw_materials.toArray();
      saveRawMaterials(
        refreshedRawMaterials.map((m) => ({
          id: m.id,
          sku: m.code || `MP-${m.id}`,
          name: m.name,
          category: m.category as any,
          unit: m.unit as any,
          currentStock: m.currentStock ?? m.stockQuantity ?? 0,
          currentAvgCost: m.unitCost ?? m.pamp ?? 0,
          reorderLevel: m.minStockAlert ?? 10,
          min_reorder_level: m.minStockAlert ?? 10,
          totalPurchasedQty: m.currentStock ?? m.stockQuantity ?? 0,
          lastUpdated: m.updatedAt || new Date().toISOString(),
        }))
      );
    } catch (e) {
      console.warn('[cleanAndSyncRecipeIngredients] LocalStorage cache sync warning:', e);
    }
  }

  return result;
}

/**
 * Validates a recipe ingredients array against live raw materials table and semi-finished products.
 * Returns valid status and any validation error messages.
 */
export function validateRecipeIngredients(
  ingredients: DexieProductIngredient[],
  liveRawMaterials: DexieRawMaterial[],
  liveSemiFinished: DexieProduct[] = []
): { isValid: boolean; errors: string[]; invalidIndexes: number[] } {
  const errors: string[] = [];
  const invalidIndexes: number[] = [];

  if (!ingredients || ingredients.length === 0) {
    return {
      isValid: false,
      errors: ['La recette doit contenir au moins un ingrédient.'],
      invalidIndexes: [],
    };
  }

  const rawIdSet = new Set(liveRawMaterials.map((rm) => rm.id));
  const sfIdSet = new Set((liveSemiFinished || []).map((sf) => sf.id));
  const sfNameSet = new Set((liveSemiFinished || []).map((sf) => normalizeString(sf.name)));

  ingredients.forEach((ing, index) => {
    const rawId = (ing.rawMaterialId || '').toString().trim();
    if (!rawId) {
      errors.push(`Ligne #${index + 1}: Aucun identifiant d'ingrédient spécifié.`);
      invalidIndexes.push(index);
      return;
    }

    const isRaw = rawIdSet.has(rawId);
    const isSf =
      sfIdSet.has(rawId) ||
      ing.type === 'SEMI_FINISHED' ||
      ing.type === 'semi_fini' ||
      sfNameSet.has(normalizeString(ing.name || ''));

    if (!isRaw && !isSf) {
      errors.push(
        `Ligne #${index + 1} ("${ing.name || 'Sans nom'}"): L'ID "${rawId}" n'existe ni dans le stock des matières premières ni dans les produits semi-finis.`
      );
      invalidIndexes.push(index);
      return;
    }

    if (ing.quantityPerBatch === undefined || ing.quantityPerBatch === null || ing.quantityPerBatch <= 0) {
      errors.push(
        `Ligne #${index + 1} ("${ing.name}"): Le dosage doit être strictement supérieur à 0.`
      );
      invalidIndexes.push(index);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    invalidIndexes,
  };
}
