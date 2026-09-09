import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, DexieRawMaterial, DexieProduct, DexieProductionOrder } from '../../db/database';
import {
  ChefHat,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Layers,
  Boxes,
  Calendar,
  User,
  Clock,
  Sparkles,
  History,
  Eye,
  Search,
  Package,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Info,
  X,
  FileDown
} from 'lucide-react';

// ============================================================================
// Core Architecture Interfaces
// ============================================================================

export interface RecipeIngredient {
  rawMaterialId: string;
  name: string;
  dosagePerBatch: number; // Base quantity required for 1 standard batch
  unit: string;
  category?: string;
  notes?: string;
}

export interface ProductWithRecipe {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  baseBatchYield: number; // Standard yield per 1 batch (e.g., 50 pieces or 20 portions)
  ingredients: RecipeIngredient[];
  instructions?: string;
  currentStock?: number;
}

export interface DeductedIngredientSnapshot {
  rawMaterialId: string;
  materialName: string;
  dosagePerBatch: number;
  totalCalculated: number;
  unit: string;
  stockBefore: number;
  stockAfter: number;
}

export interface ProductionOrder {
  id: string;
  ofCode: string;
  bakerName: string;
  productId: string;
  productName: string;
  productCode?: string;
  batchCount: number;
  baseBatchYield: number;
  totalYield: number;
  yieldUnit: string;
  specialInstructions?: string;
  deductedIngredients: DeductedIngredientSnapshot[];
  status: 'completed' | 'draft' | 'cancelled';
  createdAt: string;
}

export interface IngredientCalculationRow {
  rawMaterialId: string;
  name: string;
  category: string;
  dosagePerBatch: number;
  totalCalculated: number;
  unit: string;
  availableStock: number;
  isSufficient: boolean;
  shortfall: number;
}

// ============================================================================
// Fallback & Master Bakery Recipe Catalog with Ingredients
// ============================================================================

const DEFAULT_BAKERY_RECIPES: ProductWithRecipe[] = [
  {
    id: 'prod-rec-millefeuille',
    code: 'PAT-MIL-001',
    name: 'Mille-Feuille Croustillant Vanille Bourbon',
    category: 'Pâtisserie Fine',
    unit: 'portions',
    baseBatchYield: 50, // 1 batch yields 50 individual portions
    instructions:
      'Cuisson feuilletage caramélisé sous grille à 190°C (30 min). Pocher 3 étages réguliers de crème diplomate à la vanille Bourbon de Madagascar. Poudrage fin au sucre glace et glaçage marbré au cornet.',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Pâtissière T45 / T55', dosagePerBatch: 4.5, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-3', name: 'Beurre de Tourage AOP 84%', dosagePerBatch: 3.2, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 2.1, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm-9', name: 'Œufs Frais Entiers (Calibre M/L)', dosagePerBatch: 24, unit: 'pcs', category: 'Produits Frais' },
      { rawMaterialId: 'rm-10', name: 'Lait Entier Pasteurisé 3.5%', dosagePerBatch: 5.0, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm-11', name: 'Gousses de Vanille Bourbon', dosagePerBatch: 0.15, unit: 'kg', category: 'Arômes & Épices' },
    ],
  },
  {
    id: 'prod-rec-croissant',
    code: 'VIE-CRO-001',
    name: 'Croissant Feuilleté Pur Beurre AOP',
    category: 'Viennoiserie',
    unit: 'pièces',
    baseBatchYield: 80, // 1 batch yields 80 croissants
    instructions:
      'Pétrissage pâte levée feuilletée (12 min). Pointage 1h puis bloc froid 4°C. Tourage 1 tour double + 1 tour simple avec beurre 84%. Détaillage triangles 75g. Apprêt 2h15 à 27°C, 80% humidité. Dorure double et cuisson 185°C ventilé (17 min).',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Gruau T45 Haute Tenue', dosagePerBatch: 5.0, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-3', name: 'Beurre de Tourage AOP 84%', dosagePerBatch: 2.5, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 0.6, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm-5', name: 'Levure Fraîche de Boulangerie', dosagePerBatch: 0.22, unit: 'kg', category: 'Levures' },
      { rawMaterialId: 'rm-10', name: 'Lait Entier Pasteurisé 3.5%', dosagePerBatch: 2.8, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm-9', name: 'Œufs Frais pour Dorure', dosagePerBatch: 8, unit: 'pcs', category: 'Produits Frais' },
    ],
  },
  {
    id: 'prod-rec-painchoc',
    code: 'VIE-PNC-002',
    name: 'Pain au Chocolat Bâtons Pur Beurre',
    category: 'Viennoiserie',
    unit: 'pièces',
    baseBatchYield: 70, // 1 batch yields 70 pains au chocolat
    instructions:
      'Laminage pâte à croissant 3.5mm. Roulage avec 2 barres de chocolat noir 55% par unité. Pousse douce et cuisson 185°C (16 min).',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Gruau T45 Haute Tenue', dosagePerBatch: 4.8, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-3', name: 'Beurre de Tourage AOP 84%', dosagePerBatch: 2.4, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-6', name: 'Bâtons Chocolat Noir 55%', dosagePerBatch: 2.1, unit: 'kg', category: 'Chocolats' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 0.55, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm-5', name: 'Levure Fraîche de Boulangerie', dosagePerBatch: 0.2, unit: 'kg', category: 'Levures' },
      { rawMaterialId: 'rm-10', name: 'Lait Entier Pasteurisé 3.5%', dosagePerBatch: 2.6, unit: 'L', category: 'Produits Laitiers' },
    ],
  },
  {
    id: 'prod-rec-eclair',
    code: 'PAT-ECL-003',
    name: 'Éclair au Chocolat Grand Cru Guanaja',
    category: 'Pâtisserie Fine',
    unit: 'pièces',
    baseBatchYield: 60, // 1 batch yields 60 éclairs
    instructions:
      'Dessécher panade à la casserole. Incorporer œufs tièdes au batteur. Dresser à la douille cannelée 14cm. Cuisson sur sole avec buée 180°C. Garnir crémeux Guanaja 70%, glacer au fondant tempéré.',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Pâtissière T45 / T55', dosagePerBatch: 1.2, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-4', name: 'Beurre Doux Extra-Fin', dosagePerBatch: 1.1, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-9', name: 'Œufs Frais Entiers (Calibre M/L)', dosagePerBatch: 20, unit: 'pcs', category: 'Produits Frais' },
      { rawMaterialId: 'rm-10', name: 'Lait Entier Pasteurisé 3.5%', dosagePerBatch: 3.5, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm-6', name: 'Chocolat Couverture Guanaja 70%', dosagePerBatch: 1.8, unit: 'kg', category: 'Chocolats' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 0.9, unit: 'kg', category: 'Sucres' },
    ],
  },
  {
    id: 'prod-rec-tartecitron',
    code: 'PAT-TAR-004',
    name: 'Tartelette Citron Jaune & Meringue Italienne',
    category: 'Tartes & Entremets',
    unit: 'pièces',
    baseBatchYield: 40, // 1 batch yields 40 tarts
    instructions:
      'Foncer cercles inox pâte sablée amande, cuire à blanc 160°C. Crémeux citron monté au beurre froid à 40°C. Pochage meringue italienne serrée et coloration au chalumeau.',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Pâtissière T45 / T55', dosagePerBatch: 1.6, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-4', name: 'Beurre Doux Extra-Fin', dosagePerBatch: 1.8, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 1.5, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm-9', name: 'Œufs Frais Entiers (Calibre M/L)', dosagePerBatch: 16, unit: 'pcs', category: 'Produits Frais' },
      { rawMaterialId: 'rm-12', name: 'Poudre d’Amande Blanche Extra-Fine', dosagePerBatch: 0.8, unit: 'kg', category: 'Fruits Secs' },
      { rawMaterialId: 'rm-14', name: 'Jus de Citron Pur Non Traité', dosagePerBatch: 1.4, unit: 'L', category: 'Fruits' },
    ],
  },
  {
    id: 'prod-rec-brioche',
    code: 'VIE-BRI-005',
    name: 'Brioche Parisienne Pur Beurre AOP',
    category: 'Viennoiserie',
    unit: 'pièces',
    baseBatchYield: 30, // 1 batch yields 30 brioches
    instructions:
      'Pétrir à vitesse lente puis incorporer beurre très froid en cubes. Fermentation lente au froid (12h). Façonnage en têtes ou tresses. Dorure et cuisson douce 175°C.',
    ingredients: [
      { rawMaterialId: 'rm-1', name: 'Farine Gruau T45 Haute Tenue', dosagePerBatch: 3.0, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm-4', name: 'Beurre Doux Extra-Fin', dosagePerBatch: 1.6, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm-9', name: 'Œufs Frais Entiers (Calibre M/L)', dosagePerBatch: 22, unit: 'pcs', category: 'Produits Frais' },
      { rawMaterialId: 'rm-8', name: 'Sucre Semoule Supérieur', dosagePerBatch: 0.45, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm-5', name: 'Levure Fraîche de Boulangerie', dosagePerBatch: 0.12, unit: 'kg', category: 'Levures' },
    ],
  },
];

// Baseline Raw Materials to ensure Dexie stock is robust and testable
const BASELINE_RAW_MATERIALS: DexieRawMaterial[] = [
  { id: 'rm-1', code: 'RM-FLR-01', name: 'Farine Gruau T45 Haute Tenue', category: 'Farines', unit: 'kg', currentStock: 120, minStockAlert: 30, updatedAt: new Date().toISOString() },
  { id: 'rm-3', code: 'RM-BTR-01', name: 'Beurre de Tourage AOP 84%', category: 'Matières Grasses', unit: 'kg', currentStock: 65, minStockAlert: 20, updatedAt: new Date().toISOString() },
  { id: 'rm-4', code: 'RM-BTR-02', name: 'Beurre Doux Extra-Fin', category: 'Matières Grasses', unit: 'kg', currentStock: 50, minStockAlert: 15, updatedAt: new Date().toISOString() },
  { id: 'rm-5', code: 'RM-YST-01', name: 'Levure Fraîche de Boulangerie', category: 'Levures', unit: 'kg', currentStock: 12, minStockAlert: 4, updatedAt: new Date().toISOString() },
  { id: 'rm-6', code: 'RM-CHO-01', name: 'Chocolat Couverture Guanaja 70%', category: 'Chocolats', unit: 'kg', currentStock: 40, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm-8', code: 'RM-SUG-01', name: 'Sucre Semoule Supérieur', category: 'Sucres', unit: 'kg', currentStock: 85, minStockAlert: 25, updatedAt: new Date().toISOString() },
  { id: 'rm-9', code: 'RM-EGG-01', name: 'Œufs Frais Entiers (Calibre M/L)', category: 'Produits Frais', unit: 'pcs', currentStock: 240, minStockAlert: 60, updatedAt: new Date().toISOString() },
  { id: 'rm-10', code: 'RM-MLK-01', name: 'Lait Entier Pasteurisé 3.5%', category: 'Produits Laitiers', unit: 'L', currentStock: 55, minStockAlert: 15, updatedAt: new Date().toISOString() },
  { id: 'rm-11', code: 'RM-VAN-01', name: 'Gousses de Vanille Bourbon', category: 'Arômes & Épices', unit: 'kg', currentStock: 3.5, minStockAlert: 0.5, updatedAt: new Date().toISOString() },
  { id: 'rm-12', code: 'RM-ALM-01', name: 'Poudre d’Amande Blanche Extra-Fine', category: 'Fruits Secs', unit: 'kg', currentStock: 28, minStockAlert: 8, updatedAt: new Date().toISOString() },
  { id: 'rm-14', code: 'RM-CIT-01', name: 'Jus de Citron Pur Non Traité', category: 'Fruits', unit: 'L', currentStock: 22, minStockAlert: 6, updatedAt: new Date().toISOString() },
];

export function BakerProductionWorkflow() {
  // State: Baker & Product Form
  const [bakerName, setBakerName] = useState<string>(() => {
    return localStorage.getItem('delice_last_baker_name') || 'Chef Pâtissier Karim';
  });
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-rec-millefeuille');
  const [batchCount, setBatchCount] = useState<number>(2.5); // Default requested e.g. 2.5 batches
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    'Contrôler la température du beurre de tourage (14°C - 16°C). Peser rigoureusement chaque ingrédient.'
  );

  // State: Data loaded from Dexie
  const [products, setProducts] = useState<ProductWithRecipe[]>(DEFAULT_BAKERY_RECIPES);
  const [rawMaterials, setRawMaterials] = useState<DexieRawMaterial[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State: Feedback & Alerts
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State: Active Printed Order (or preview of submitted order)
  const [activeOrderForPrint, setActiveOrderForPrint] = useState<ProductionOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'NEW_OF' | 'HISTORY'>('NEW_OF');

  // Search filter for products
  const [productSearch, setProductSearch] = useState<string>('');

  // --------------------------------------------------------------------------
  // 1. Synchronization & Seeding with Dexie IndexedDB
  // --------------------------------------------------------------------------
  const loadDexieData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Ensure raw_materials table is populated
      const existingMats = await db.raw_materials.toArray();
      if (existingMats.length === 0) {
        await db.raw_materials.bulkPut(BASELINE_RAW_MATERIALS);
        setRawMaterials(BASELINE_RAW_MATERIALS);
      } else {
        // Supplement missing essential materials if needed
        const missing = BASELINE_RAW_MATERIALS.filter(
          (bm) => !existingMats.some((em) => em.id === bm.id)
        );
        if (missing.length > 0) {
          await db.raw_materials.bulkPut(missing);
        }
        const refreshed = await db.raw_materials.toArray();
        setRawMaterials(refreshed);
      }

      // 2. Ensure products table includes recipe information
      const existingProducts = await db.products.toArray();
      const mergedProducts: ProductWithRecipe[] = [];

      // Add default recipes with verified ingredient definitions
      DEFAULT_BAKERY_RECIPES.forEach((rec) => {
        mergedProducts.push(rec);
      });

      // Also ingest any products from db.products that have recipe metadata
      existingProducts.forEach((p: any) => {
        if (
          p.ingredients &&
          Array.isArray(p.ingredients) &&
          p.ingredients.length > 0 &&
          !mergedProducts.some((mp) => mp.id === p.id)
        ) {
          mergedProducts.push({
            id: p.id,
            code: p.code || 'PROD',
            name: p.name,
            category: p.category || 'Pâtisserie',
            unit: p.unit || 'pièces',
            baseBatchYield: p.baseBatchYield || 50,
            ingredients: p.ingredients,
            instructions: p.instructions || '',
            currentStock: p.currentStock || 0,
          });
        }
      });

      setProducts(mergedProducts);

      // If selected product not found, fallback to first
      if (!mergedProducts.some((p) => p.id === selectedProductId) && mergedProducts.length > 0) {
        setSelectedProductId(mergedProducts[0].id);
      }

      // 3. Load historical production orders from db.production_orders
      if (db.production_orders) {
        const orders = await db.production_orders.orderBy('createdAt').reverse().toArray();
        setProductionOrders(orders as unknown as ProductionOrder[]);
      }
    } catch (err) {
      console.error('[BakerProductionWorkflow] Failed to load Dexie data:', err);
      setAlertError('Erreur lors de la lecture des données Dexie.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadDexieData();
  }, [loadDexieData]);

  // Persist baker name preference
  useEffect(() => {
    if (bakerName) {
      localStorage.setItem('delice_last_baker_name', bakerName);
    }
  }, [bakerName]);

  // Currently selected product
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // --------------------------------------------------------------------------
  // 2. Dynamic Recipe Calculation & Stock Requirements
  // --------------------------------------------------------------------------
  const calculatedYield = useMemo(() => {
    if (!selectedProduct) return 0;
    const count = Number(batchCount) || 0;
    return Math.round(selectedProduct.baseBatchYield * count);
  }, [selectedProduct, batchCount]);

  const ingredientCalculationRows: IngredientCalculationRow[] = useMemo(() => {
    if (!selectedProduct || !selectedProduct.ingredients) return [];
    const count = Number(batchCount) || 0;

    return selectedProduct.ingredients.map((ing) => {
      const totalCalculated = Number((ing.dosagePerBatch * count).toFixed(3));
      const mat = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
      const availableStock = mat ? Number(mat.currentStock.toFixed(3)) : 0;
      const isSufficient = availableStock >= totalCalculated;
      const shortfall = isSufficient ? 0 : Number((totalCalculated - availableStock).toFixed(3));

      return {
        rawMaterialId: ing.rawMaterialId,
        name: ing.name,
        category: ing.category || mat?.category || 'Matière Première',
        dosagePerBatch: ing.dosagePerBatch,
        totalCalculated,
        unit: ing.unit,
        availableStock,
        isSufficient,
        shortfall,
      };
    });
  }, [selectedProduct, batchCount, rawMaterials]);

  // Low Stock Safety Check: Is any ingredient lacking sufficient stock?
  const insufficientIngredients = useMemo(() => {
    return ingredientCalculationRows.filter((r) => !r.isSufficient);
  }, [ingredientCalculationRows]);

  const hasInsufficientStock = insufficientIngredients.length > 0;

  // Generate next sequential OF code
  const generatedOFCode = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const existingCount = productionOrders.length + 1;
    const sequence = String(existingCount).padStart(3, '0');
    return `OF-${year}-${month}-${sequence}`;
  }, [productionOrders.length]);

  // --------------------------------------------------------------------------
  // 3. Atomic Dexie Inventory Deduction & Persistence
  // --------------------------------------------------------------------------
  const handleValidateAndPrintOF = async () => {
    if (!selectedProduct) return;
    if (batchCount <= 0) {
      setAlertError('Veuillez indiquer un nombre de lots strictement positif.');
      return;
    }
    if (!bakerName.trim()) {
      setAlertError('Veuillez renseigner le nom ou matricule du pâtissier.');
      return;
    }

    setAlertError(null);
    setAlertSuccess(null);
    setIsSubmitting(true);

    try {
      let createdOrder: ProductionOrder | null = null;

      // ATOMIC DEXIE TRANSACTION
      // Executes on db.raw_materials and db.production_orders
      await db.transaction('rw', [db.raw_materials, db.production_orders], async () => {
        // STEP 1: Strict Stock Verification
        for (const row of ingredientCalculationRows) {
          const mat = await db.raw_materials.get(row.rawMaterialId);
          if (!mat) {
            throw new Error(
              `Matière première introuvable en base Dexie: ${row.name} (Code: ${row.rawMaterialId})`
            );
          }
          if (mat.currentStock < row.totalCalculated) {
            const missing = (row.totalCalculated - mat.currentStock).toFixed(3);
            throw new Error(
              `Stock insuffisant pour "${mat.name}". Requis: ${row.totalCalculated} ${mat.unit}, Disponible: ${mat.currentStock} ${mat.unit} (Manque: ${missing} ${mat.unit})`
            );
          }
        }

        // STEP 2: Atomic Stock Deduction
        const deductedSnapshots: DeductedIngredientSnapshot[] = [];
        for (const row of ingredientCalculationRows) {
          const mat = await db.raw_materials.get(row.rawMaterialId);
          if (!mat) continue;

          const stockBefore = Number(mat.currentStock.toFixed(3));
          const stockAfter = Math.max(0, Number((stockBefore - row.totalCalculated).toFixed(3)));

          await db.raw_materials.update(row.rawMaterialId, {
            currentStock: stockAfter,
            updatedAt: new Date().toISOString(),
          });

          deductedSnapshots.push({
            rawMaterialId: row.rawMaterialId,
            materialName: row.name,
            dosagePerBatch: row.dosagePerBatch,
            totalCalculated: row.totalCalculated,
            unit: row.unit,
            stockBefore,
            stockAfter,
          });
        }

        // STEP 3: Order Logging in db.production_orders
        const newRecord: ProductionOrder = {
          id: `of-${Date.now()}`,
          ofCode: generatedOFCode,
          bakerName: bakerName.trim(),
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productCode: selectedProduct.code,
          batchCount,
          baseBatchYield: selectedProduct.baseBatchYield,
          totalYield: calculatedYield,
          yieldUnit: selectedProduct.unit,
          specialInstructions: specialInstructions.trim(),
          deductedIngredients: deductedSnapshots,
          status: 'completed',
          createdAt: new Date().toISOString(),
        };

        await db.production_orders.put(newRecord as unknown as DexieProductionOrder);
        createdOrder = newRecord;
      });

      // Refresh in-memory Dexie state
      await loadDexieData();

      if (createdOrder) {
        setActiveOrderForPrint(createdOrder);
        setAlertSuccess(
          `OF "${(createdOrder as ProductionOrder).ofCode}" validé avec succès ! Stocks déduits et ordre enregistré.`
        );

        // Auto-trigger browser print dialog after DOM updates
        setTimeout(() => {
          window.print();
        }, 400);
      }
    } catch (err: any) {
      console.error('[handleValidateAndPrintOF] Transaction Aborted:', err);
      setAlertError(err?.message || 'Erreur lors de la transaction Dexie. Déstockage annulé.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to re-print a past OF
  const handlePrintPastOrder = (order: ProductionOrder) => {
    setActiveOrderForPrint(order);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Helper to quickly restock a raw material in Dexie for testing
  const handleQuickRestock = async (materialId: string, addQty: number) => {
    try {
      const mat = await db.raw_materials.get(materialId);
      if (mat) {
        const newStock = Number((mat.currentStock + addQty).toFixed(3));
        await db.raw_materials.update(materialId, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });
        await loadDexieData();
        setAlertSuccess(`Stock de ${mat.name} augmenté de +${addQty} ${mat.unit}`);
      }
    } catch (e) {
      console.error('Quick restock error:', e);
    }
  };

  // Current order to display in the printable A4 sheet
  const activePrintDoc = activeOrderForPrint || {
    id: 'preview',
    ofCode: generatedOFCode,
    bakerName: bakerName || 'Pâtissier Responsable',
    productId: selectedProduct?.id || '',
    productName: selectedProduct?.name || '',
    productCode: selectedProduct?.code || '',
    batchCount,
    baseBatchYield: selectedProduct?.baseBatchYield || 50,
    totalYield: calculatedYield,
    yieldUnit: selectedProduct?.unit || 'pièces',
    specialInstructions,
    deductedIngredients: ingredientCalculationRows.map((r) => ({
      rawMaterialId: r.rawMaterialId,
      materialName: r.name,
      dosagePerBatch: r.dosagePerBatch,
      totalCalculated: r.totalCalculated,
      unit: r.unit,
      stockBefore: r.availableStock,
      stockAfter: Math.max(0, r.availableStock - r.totalCalculated),
    })),
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
  };

  // Filter products for selector
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-6 lg:p-8 font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* SCREEN-ONLY CONTROLS & HEADER (Hidden during @media print)         */}
      {/* ------------------------------------------------------------------ */}
      <div className="print:hidden max-w-7xl mx-auto space-y-6">
        {/* Top Navigation & Status Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl shadow-inner">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-black text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Laboratoire Central • ERP Délice
                </span>
                <span className="text-xs font-mono text-slate-400">v4.0 Dexie Active OF</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1">
                Ordre de Fabrication & Pesée (Workflow Pâtissier)
              </h1>
              <p className="text-sm text-slate-400">
                Calcul dynamique des recettes, contrôle rigoureux des stocks et déstockage atomique.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex p-1 bg-slate-900/80 border border-slate-700 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('NEW_OF')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'NEW_OF'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                Nouveau Lancement OF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'HISTORY'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Historique des OF ({productionOrders.length})
              </button>
            </div>

            <button
              type="button"
              onClick={loadDexieData}
              title="Actualiser les données Dexie"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {alertError && (
          <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-200 p-4 rounded-xl shadow-lg flex items-start justify-between gap-3 animate-shake">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-100 text-sm">Action bloquée : Transaction rejetée</h4>
                <p className="text-xs text-rose-200 mt-0.5">{alertError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlertError(null)}
              className="text-rose-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {alertSuccess && (
          <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-200 p-4 rounded-xl shadow-lg flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-100 text-sm">Succès</h4>
                <p className="text-xs text-emerald-200 mt-0.5">{alertSuccess}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAlertSuccess(null)}
              className="text-emerald-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* VIEW 1: NEW PRODUCTION ORDER FORM & CALCULATION (ACTIVE TAB)     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'NEW_OF' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: Baker Declaration & Configuration (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card: Baker Declaration Form */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
                  <User className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">1. Déclaration Pâtissier</h2>
                </div>

                {/* Baker Identity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Nom du Pâtissier / Chef de Partie</span>
                    <span className="text-[10px] text-amber-400 font-normal">Requis pour l'audit</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bakerName}
                      onChange={(e) => setBakerName(e.target.value)}
                      placeholder="Ex: Chef Karim, Pâtissier Amine..."
                      className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-medium"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* Product Selection with Instant Search */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Produit Cible à Fabriquer</span>
                    <span className="text-[10px] text-slate-400">Depuis Dexie (db.products)</span>
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Rechercher recette..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {filteredProducts.map((prod) => {
                      const isSelected = prod.id === selectedProductId;
                      return (
                        <button
                          type="button"
                          key={prod.id}
                          onClick={() => setSelectedProductId(prod.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-white shadow-sm'
                              : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                isSelected ? 'bg-amber-400' : 'bg-slate-600'
                              }`}
                            />
                            <div>
                              <div className="text-xs font-black tracking-wide">{prod.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {prod.code} • Réf {prod.category}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              {prod.baseBatchYield} {prod.unit}
                            </span>
                            <div className="text-[9px] text-slate-400">/ lot base</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Batch Count Stepper & Presets */}
                <div className="space-y-2 pt-2 border-t border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Nombre de Lots Déclarés (Batches)
                    </label>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/30">
                      {batchCount} lot{batchCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Stepper Input */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBatchCount((prev) => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                      className="w-12 h-11 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-xl font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="50"
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-900 border-2 border-amber-500/60 rounded-xl px-4 py-2 text-center text-xl font-mono font-black text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[10px] text-slate-400 absolute right-3 top-3 font-semibold uppercase">
                        lots
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBatchCount((prev) => Number((prev + 0.5).toFixed(1)))}
                      className="w-12 h-11 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-xl font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 1.5, 2, 2.5, 3, 5].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setBatchCount(preset)}
                        className={`flex-1 py-1 text-xs font-bold font-mono rounded-lg border transition cursor-pointer ${
                          batchCount === preset
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Special Instructions & Notes */}
                <div className="space-y-1.5 pt-2 border-t border-slate-700/80">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Instructions Particulières & Consignes Labo</span>
                    <span className="text-[10px] text-slate-400">Imprimées sur l'OF</span>
                  </label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Consignes de température, temps de pointage, tourage..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none font-medium"
                  />
                </div>
              </div>

              {/* Live Yield Summary Banner */}
              {selectedProduct && (
                <div className="bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-slate-800 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Rendement Prévu (Yield Calculation)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Formule : {selectedProduct.baseBatchYield} × {batchCount}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono text-white tracking-tight">
                      {calculatedYield}
                    </span>
                    <span className="text-lg font-bold text-amber-300 uppercase">
                      {selectedProduct.unit}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Fabrication programmée de <strong>{selectedProduct.name}</strong> pour un total de{' '}
                      <strong>{calculatedYield} {selectedProduct.unit}</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Live Recipe Calculation Table & Validation (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">2. Calcul Recette & Besoins Matières</h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Code OF : <strong className="text-amber-400">{generatedOFCode}</strong>
                  </span>
                </div>

                {/* Status Callout if low stock */}
                {hasInsufficientStock ? (
                  <div className="bg-rose-950/80 border-2 border-rose-500/90 rounded-xl p-4 flex items-start gap-3 text-rose-200 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-rose-100 text-sm">
                        Alerte Stock Bloquant : {insufficientIngredients.length} ingrédient(s) insuffisant(s) !
                      </div>
                      <p>
                        Le stock en base Dexie (<code>db.raw_materials</code>) ne permet pas de couvrir la
                        fabrication de <strong>{batchCount} lots</strong>. La validation atomique est désactivée.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3.5 flex items-center gap-3 text-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="text-emerald-100">Tous les stocks sont suffisants.</strong> La
                      transaction atomique Dexie peut être exécutée en toute sécurité.
                    </div>
                  </div>
                )}

                {/* Pre-Production Calculation Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-700">
                        <th className="p-3">Ingrédient / Matière</th>
                        <th className="p-3 text-right">Dosage (1 Lot)</th>
                        <th className="p-3 text-right text-amber-400 font-black">
                          Requis ({batchCount}x)
                        </th>
                        <th className="p-3 text-right">Stock Dexie</th>
                        <th className="p-3 text-center">Disponibilité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/70 bg-slate-900/40 font-medium">
                      {ingredientCalculationRows.map((row) => {
                        const isShort = !row.isSufficient;
                        return (
                          <tr
                            key={row.rawMaterialId}
                            className={`transition-colors ${
                              isShort
                                ? 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-200'
                                : 'hover:bg-slate-800/60 text-slate-200'
                            }`}
                          >
                            <td className="p-3">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {isShort && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                )}
                                <span>{row.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{row.category}</span>
                            </td>

                            <td className="p-3 text-right font-mono text-slate-400">
                              {row.dosagePerBatch} {row.unit}
                            </td>

                            <td className="p-3 text-right font-mono font-black text-sm">
                              <span className={isShort ? 'text-rose-400' : 'text-amber-300'}>
                                {row.totalCalculated} {row.unit}
                              </span>
                            </td>

                            <td className="p-3 text-right font-mono">
                              <span
                                className={`font-bold ${
                                  isShort ? 'text-rose-400' : 'text-slate-300'
                                }`}
                              >
                                {row.availableStock} {row.unit}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              {isShort ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    Manque {row.shortfall} {row.unit}
                                  </span>
                                  {/* Quick Restock Action for rapid testing/fixing in dev */}
                                  <button
                                    type="button"
                                    onClick={() => handleQuickRestock(row.rawMaterialId, Math.max(10, row.shortfall * 2))}
                                    className="text-[9px] text-amber-400 underline hover:text-amber-300 mt-1 cursor-pointer"
                                    title="Réapprovisionner automatiquement dans Dexie pour débloquer"
                                  >
                                    + Réappro.
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Conforme
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Validation & Print Button with Safety Lock */}
                <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-400">
                    <div>
                      Code : <strong className="text-white">{generatedOFCode}</strong> • Statut :{' '}
                      <span className="text-amber-400 font-bold">En attente de pesée</span>
                    </div>
                    <div>Déstockage automatique après signature électronique.</div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Preview Print Sheet Without Submitting */}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-3 rounded-xl border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      title="Imprimer un aperçu sans déstocker"
                    >
                      <Printer className="w-4 h-4 text-slate-400" />
                      Aperçu A4
                    </button>

                    {/* Master Action: Atomic Deduction + OF Persistence + Print */}
                    <button
                      type="button"
                      disabled={hasInsufficientStock || isSubmitting || !selectedProduct}
                      onClick={handleValidateAndPrintOF}
                      className={`flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                        hasInsufficientStock
                          ? 'bg-slate-700 text-slate-500 border border-slate-600 cursor-not-allowed opacity-60'
                          : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-900/40 hover:shadow-emerald-900/60'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Validation Dexie en cours...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>Valider & Imprimer l'OF</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recipe Process Card */}
              {selectedProduct?.instructions && (
                <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 text-xs text-slate-300 space-y-2">
                  <div className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Instructions Techniques du Chef Pâtissier :</span>
                  </div>
                  <p className="leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-200">
                    {selectedProduct.instructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* VIEW 2: HISTORICAL PRODUCTION ORDERS LOG (ACTIVE TAB)            */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === 'HISTORY' && (
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  Historique Permanent des Ordres de Fabrication (db.production_orders)
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {productionOrders.length} OF enregistrés
              </span>
            </div>

            {productionOrders.length === 0 ? (
              <div className="text-center py-12 space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
                <Boxes className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="text-slate-400 font-bold">Aucun ordre de fabrication validé pour l'instant.</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Utilisez l'onglet "Nouveau Lancement OF" pour calculer et valider une production.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 uppercase tracking-wider font-bold border-b border-slate-700">
                      <th className="p-3">Code OF</th>
                      <th className="p-3">Date & Heure</th>
                      <th className="p-3">Pâtissier</th>
                      <th className="p-3">Produit Fabriqué</th>
                      <th className="p-3 text-right">Lots</th>
                      <th className="p-3 text-right">Rendement Obtenu</th>
                      <th className="p-3">Matières Déstockées</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/70 bg-slate-900/30">
                    {productionOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 font-mono font-black text-amber-400">
                          {order.ofCode}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 font-bold text-white">{order.bakerName}</td>
                        <td className="p-3 font-bold text-slate-200">{order.productName}</td>
                        <td className="p-3 text-right font-mono font-bold text-amber-300">
                          {order.batchCount} lots
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-400">
                          {order.totalYield} {order.yieldUnit}
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">
                          {order.deductedIngredients?.length || 0} ingrédients déduits
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintPastOrder(order)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] transition cursor-pointer border border-slate-600 shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Réimprimer A4
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. PRINTABLE A4 SHEET FOR KITCHEN STAFF (@media print)             */}
      {/* Visible only when printing or embedded in print frame              */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden print:block bg-white text-black p-8 max-w-[210mm] mx-auto font-sans min-h-[297mm]">
        {/* Official Header */}
        <div className="border-b-2 border-black pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="text-xl font-black tracking-tight uppercase">
              DÉLICE PÂTISSERIE — Laboratoire de Production
            </div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-0.5">
              Ordre de Fabrication & Fiche de Pesée Atelier
            </div>
          </div>
          <div className="text-right font-mono">
            <div className="text-base font-black text-black border border-black px-2 py-0.5 rounded">
              {activePrintDoc.ofCode}
            </div>
            <div className="text-[10px] text-slate-600 mt-1">
              Date : {new Date(activePrintDoc.createdAt).toLocaleString('fr-FR')}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="border border-black rounded p-3 mb-5 grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-600 uppercase text-[10px] block">Pâtissier Déclarant :</span>
            <span className="font-black text-sm">{activePrintDoc.bakerName}</span>
          </div>

          <div>
            <span className="font-bold text-slate-600 uppercase text-[10px] block">Produit Cible :</span>
            <span className="font-black text-sm">{activePrintDoc.productName}</span>
            <span className="text-[10px] text-slate-500 block">Réf : {activePrintDoc.productCode}</span>
          </div>

          <div>
            <span className="font-bold text-slate-600 uppercase text-[10px] block">Volume à Fabriquer :</span>
            <span className="font-black text-sm font-mono">
              {activePrintDoc.batchCount} lot{activePrintDoc.batchCount > 1 ? 's' : ''} (Rendement :{' '}
              {activePrintDoc.totalYield} {activePrintDoc.yieldUnit})
            </span>
          </div>

          {activePrintDoc.specialInstructions && (
            <div className="col-span-3 border-t border-slate-300 pt-2 mt-1">
              <span className="font-bold text-slate-600 uppercase text-[10px] block">
                Consignes & Instructions Techniques :
              </span>
              <span className="italic text-slate-800 text-[11px]">
                {activePrintDoc.specialInstructions}
              </span>
            </div>
          )}
        </div>

        {/* Calculated Recipe Table for Kitchen Weighing */}
        <div className="mb-6">
          <div className="text-xs font-black uppercase tracking-wider mb-2 border-b border-black pb-1">
            Tableau de Pesée & Dosage Multiplié (Recette active)
          </div>

          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-slate-100 text-black uppercase font-bold border-b border-black text-[10px]">
                <th className="border border-black p-2 w-10 text-center">N°</th>
                <th className="border border-black p-2">Matière Première / Ingrédient</th>
                <th className="border border-black p-2 w-28 text-right">Dosage Base (1 Lot)</th>
                <th className="border border-black p-2 w-36 text-right font-black">
                  Quantité Totale à Peser
                </th>
                <th className="border border-black p-2 w-28 text-center">Contrôle Pesée</th>
              </tr>
            </thead>
            <tbody>
              {activePrintDoc.deductedIngredients.map((ing, idx) => (
                <tr key={ing.rawMaterialId} className="border-b border-slate-300">
                  <td className="border border-black p-2 text-center font-mono font-bold">
                    {String(idx + 1).padStart(2, '0')}
                  </td>
                  <td className="border border-black p-2 font-bold">{ing.materialName}</td>
                  <td className="border border-black p-2 text-right font-mono">
                    {ing.dosagePerBatch} {ing.unit}
                  </td>
                  <td className="border border-black p-2 text-right font-mono font-black text-sm">
                    {ing.totalCalculated} {ing.unit}
                  </td>
                  <td className="border border-black p-2 text-center">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="inline-block w-4 h-4 border-2 border-black rounded-xs" />
                      <span>Conforme</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-xs border-t-2 border-black">
                <td colSpan={2} className="border border-black p-2 uppercase">
                  Total Lignes Ingrédients : {activePrintDoc.deductedIngredients.length}
                </td>
                <td colSpan={3} className="border border-black p-2 text-right uppercase">
                  Déstockage Automatique Dexie : <strong className="font-mono">VALIDÉ</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Physical Signatures & Lab Approval Block */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-black mt-8 text-xs">
          <div className="border border-black rounded p-3 h-28 flex flex-col justify-between">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700">
              Signature & Paraphe du Pâtissier :
            </div>
            <div className="text-[10px] text-slate-500 italic">
              "Je certifie avoir scrupuleusement pesé les ingrédients ci-dessus."
            </div>
            <div className="border-t border-dashed border-slate-400 pt-1 text-[9px] text-slate-400">
              Nom & Émargement
            </div>
          </div>

          <div className="border border-black rounded p-3 h-28 flex flex-col justify-between">
            <div className="font-bold uppercase tracking-wider text-[10px] text-slate-700">
              Visa du Responsable Laboratoire :
            </div>
            <div className="text-[10px] text-slate-500 italic">
              "Bon pour cuisson, finition et conditionnement boutique."
            </div>
            <div className="border-t border-dashed border-slate-400 pt-1 text-[9px] text-slate-400">
              Signature & Cachet Labo
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[9px] text-slate-500 mt-6 pt-2 border-t border-slate-200">
          Système ERP Délice • Fiche générée automatiquement pour le laboratoire de production • Document interne
        </div>
      </div>
    </div>
  );
}
export default BakerProductionWorkflow;
