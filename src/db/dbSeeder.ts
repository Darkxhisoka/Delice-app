import { db, DexieRawMaterial, DexieProduct, DexieProductIngredient } from './database';
import { getRawMaterials, saveRawMaterials } from '../services/storage';

/**
 * Professional Sample Raw Materials for Délice Commercial Bakery & Central Lab
 * Configured with realistic units, categories, stock, and PAMP (Prix d'Achat Moyen Pondéré) in DZD.
 */
export const SAMPLE_RAW_MATERIALS: DexieRawMaterial[] = [
  {
    id: 'rm_farine_t45',
    code: 'MP-FAR-01',
    name: 'Farine de Gruau T45 Spéciale Feuilletage',
    category: 'Farines & Céréales',
    unit: 'kg',
    unitCost: 85,
    costPerUnit: 85,
    currentAvgCost: 85,
    pamp: 85,
    currentStock: 450,
    minStockAlert: 80,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_beurre_tourage_84',
    code: 'MP-BGR-01',
    name: 'Beurre de Feuilletage & Tourage 84% MG',
    category: 'Matières Grasses',
    unit: 'kg',
    unitCost: 1250,
    costPerUnit: 1250,
    currentAvgCost: 1250,
    pamp: 1250,
    currentStock: 220,
    minStockAlert: 40,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias for compatibility with older recipe references
  {
    id: 'rm_beurre_tourage',
    code: 'MP-BGR-01-ALT',
    name: 'Beurre de Tourage Extra-Sec 84%',
    category: 'Matières Grasses',
    unit: 'kg',
    unitCost: 1250,
    costPerUnit: 1250,
    currentAvgCost: 1250,
    pamp: 1250,
    currentStock: 180,
    minStockAlert: 30,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_beurre_doux_82',
    code: 'MP-BGR-02',
    name: 'Beurre Doux Gastronomique 82% MG',
    category: 'Matières Grasses',
    unit: 'kg',
    unitCost: 1150,
    costPerUnit: 1150,
    currentAvgCost: 1150,
    pamp: 1150,
    currentStock: 140,
    minStockAlert: 25,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_sucre_cristal',
    code: 'MP-SUC-01',
    name: 'Sucre Cristal Extra Blanc Pur Canne',
    category: 'Sucres',
    unit: 'kg',
    unitCost: 110,
    costPerUnit: 110,
    currentAvgCost: 110,
    pamp: 110,
    currentStock: 500,
    minStockAlert: 100,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias for older recipe schemas
  {
    id: 'rm_sucre_cristallise',
    code: 'MP-SUC-01-ALT',
    name: 'Sucre Cristallisé Extra Blanc',
    category: 'Sucres',
    unit: 'kg',
    unitCost: 110,
    costPerUnit: 110,
    currentAvgCost: 110,
    pamp: 110,
    currentStock: 350,
    minStockAlert: 75,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_oeufs_frais',
    code: 'MP-OEU-01',
    name: 'Œufs Frais Entiers Calibre Gros',
    category: 'Œufs & Ovoproduits',
    unit: 'pièces',
    unitCost: 22,
    costPerUnit: 22,
    currentAvgCost: 22,
    pamp: 22,
    currentStock: 1200,
    minStockAlert: 200,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_lait_entier_uht',
    code: 'MP-LAI-01',
    name: 'Lait Entier UHT Pasteurisé 3.2% MG',
    category: 'Produits Laitiers',
    unit: 'L',
    unitCost: 95,
    costPerUnit: 95,
    currentAvgCost: 95,
    pamp: 95,
    currentStock: 320,
    minStockAlert: 50,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias for older recipe schemas
  {
    id: 'rm_lait_entier',
    code: 'MP-LAI-01-ALT',
    name: 'Lait Entier Pasteurisé',
    category: 'Produits Laitiers',
    unit: 'L',
    unitCost: 95,
    costPerUnit: 95,
    currentAvgCost: 95,
    pamp: 95,
    currentStock: 250,
    minStockAlert: 40,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_chocolat_noir_55',
    code: 'MP-CHO-01',
    name: 'Chocolat Noir de Couverture 55% Cacao Pur Beurre',
    category: 'Chocolats & Cacao',
    unit: 'kg',
    unitCost: 1850,
    costPerUnit: 1850,
    currentAvgCost: 1850,
    pamp: 1850,
    currentStock: 120,
    minStockAlert: 25,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias for older references
  {
    id: 'rm_chocolat_noir',
    code: 'MP-CHO-01-ALT',
    name: 'Chocolat de Couverture Noir 64%',
    category: 'Chocolats & Cacao',
    unit: 'kg',
    unitCost: 1850,
    costPerUnit: 1850,
    currentAvgCost: 1850,
    pamp: 1850,
    currentStock: 80,
    minStockAlert: 15,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_sel_fin',
    code: 'MP-EPI-01',
    name: 'Sel Fin de Mer Pur Raffiné',
    category: 'Épicerie & Sel',
    unit: 'kg',
    unitCost: 45,
    costPerUnit: 45,
    currentAvgCost: 45,
    pamp: 45,
    currentStock: 150,
    minStockAlert: 30,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_gousse_vanille_bourbon',
    code: 'MP-VAN-01',
    name: 'Gousses de Vanille Bourbon Madagascar Extra',
    category: 'Épices & Arômes',
    unit: 'pièces',
    unitCost: 380,
    costPerUnit: 380,
    currentAvgCost: 380,
    pamp: 380,
    currentStock: 90,
    minStockAlert: 20,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias
  {
    id: 'rm_gousse_vanille',
    code: 'MP-VAN-01-ALT',
    name: 'Gousses de Vanille Bourbon Madagascar',
    category: 'Épices & Arômes',
    unit: 'pièces',
    unitCost: 380,
    costPerUnit: 380,
    currentAvgCost: 380,
    pamp: 380,
    currentStock: 60,
    minStockAlert: 15,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_creme_liquide_35',
    code: 'MP-CRM-01',
    name: 'Crème Liquide Fleurette 35% MG',
    category: 'Produits Laitiers',
    unit: 'L',
    unitCost: 780,
    costPerUnit: 780,
    currentAvgCost: 780,
    pamp: 780,
    currentStock: 140,
    minStockAlert: 30,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  // Alias
  {
    id: 'rm_creme_liquide',
    code: 'MP-CRM-01-ALT',
    name: 'Crème Liquide 35% MG',
    category: 'Produits Laitiers',
    unit: 'L',
    unitCost: 780,
    costPerUnit: 780,
    currentAvgCost: 780,
    pamp: 780,
    currentStock: 95,
    minStockAlert: 20,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_levure_fraiche',
    code: 'MP-LEV-01',
    name: 'Levure Boulangère Fraîche en Pain',
    category: 'Levures & Ferments',
    unit: 'kg',
    unitCost: 180,
    costPerUnit: 180,
    currentAvgCost: 180,
    pamp: 180,
    currentStock: 45,
    minStockAlert: 12,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_poudre_creme',
    code: 'MP-POU-01',
    name: 'Poudre à Crème Vanillée Extra (Fécule / Amidon)',
    category: 'Poudres & Texturants',
    unit: 'kg',
    unitCost: 480,
    costPerUnit: 480,
    currentAvgCost: 480,
    pamp: 480,
    currentStock: 75,
    minStockAlert: 18,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_fondant_blanc',
    code: 'MP-NAP-01',
    name: 'Fondant Pâtissier Blanc Extra',
    category: 'Nappages & Glaçages',
    unit: 'kg',
    unitCost: 360,
    costPerUnit: 360,
    currentAvgCost: 360,
    pamp: 360,
    currentStock: 95,
    minStockAlert: 25,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rm_poudre_amande',
    code: 'MP-SEC-01',
    name: 'Poudre d’Amande Blanche Extra-Fine',
    category: 'Fruits Secs',
    unit: 'kg',
    unitCost: 2400,
    costPerUnit: 2400,
    currentAvgCost: 2400,
    pamp: 2400,
    currentStock: 60,
    minStockAlert: 15,
    storeId: 'lab_central',
    isActive: true,
    updatedAt: new Date().toISOString()
  }
];

/**
 * Helper to compute exact COGS metrics from an array of ingredients and batch yield.
 */
function calculateRecipeCogs(
  ingredients: DexieProductIngredient[],
  yieldPerBatch: number,
  sellingPrice: number
) {
  const totalBatchCost = ingredients.reduce((sum, ing) => {
    const qty = Number(ing.quantityPerBatch) || 0;
    const cost = Number(ing.unitCost) || 0;
    return sum + qty * cost;
  }, 0);

  const safeYield = Math.max(0.001, yieldPerBatch);
  const unitCost = totalBatchCost / safeYield;
  const marginAmount = sellingPrice - unitCost;
  const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;

  return {
    totalBatchCost: Number(totalBatchCost.toFixed(2)),
    unitCost: Number(unitCost.toFixed(2)),
    marginAmount: Number(marginAmount.toFixed(2)),
    marginPercentage: Number(marginPercentage.toFixed(2))
  };
}

// --------------------------------------------------------------------------
// Sample Recipe Definitions
// --------------------------------------------------------------------------

const MILLE_FEUILLE_VANILLE_INGREDIENTS: DexieProductIngredient[] = [
  { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 2.200, unit: 'kg', category: 'Farines & Céréales', unitCost: 85, totalCost: 187 },
  { rawMaterialId: 'rm_beurre_tourage_84', name: 'Beurre de Feuilletage & Tourage 84% MG', quantityPerBatch: 1.800, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 2250 },
  { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 3.500, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 332.5 },
  { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Entiers Calibre Gros', quantityPerBatch: 18, unit: 'pièces', category: 'Œufs & Ovoproduits', unitCost: 22, totalCost: 396 },
  { rawMaterialId: 'rm_sucre_cristal', name: 'Sucre Cristal Extra Blanc Pur Canne', quantityPerBatch: 0.900, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 99 },
  { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée Extra (Fécule / Amidon)', quantityPerBatch: 0.320, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 153.6 },
  { rawMaterialId: 'rm_gousse_vanille_bourbon', name: 'Gousses de Vanille Bourbon Madagascar Extra', quantityPerBatch: 4, unit: 'pièces', category: 'Épices & Arômes', unitCost: 380, totalCost: 1520 },
  { rawMaterialId: 'rm_creme_liquide_35', name: 'Crème Liquide Fleurette 35% MG', quantityPerBatch: 1.200, unit: 'L', category: 'Produits Laitiers', unitCost: 780, totalCost: 936 },
  { rawMaterialId: 'rm_fondant_blanc', name: 'Fondant Pâtissier Blanc Extra', quantityPerBatch: 1.500, unit: 'kg', category: 'Nappages & Glaçages', unitCost: 360, totalCost: 540 }
];

const CROISSANT_PUR_BEURRE_INGREDIENTS: DexieProductIngredient[] = [
  { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 2.500, unit: 'kg', category: 'Farines & Céréales', unitCost: 85, totalCost: 212.5 },
  { rawMaterialId: 'rm_beurre_tourage_84', name: 'Beurre de Feuilletage & Tourage 84% MG', quantityPerBatch: 1.250, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 1562.5 },
  { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 0.750, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 71.25 },
  { rawMaterialId: 'rm_sucre_cristal', name: 'Sucre Cristal Extra Blanc Pur Canne', quantityPerBatch: 0.300, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 33 },
  { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin de Mer Pur Raffiné', quantityPerBatch: 0.050, unit: 'kg', category: 'Épicerie & Sel', unitCost: 45, totalCost: 2.25 },
  { rawMaterialId: 'rm_levure_fraiche', name: 'Levure Boulangère Fraîche en Pain', quantityPerBatch: 0.100, unit: 'kg', category: 'Levures & Ferments', unitCost: 180, totalCost: 18 },
  { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais (pour dorure artisanale)', quantityPerBatch: 3, unit: 'pièces', category: 'Œufs & Ovoproduits', unitCost: 22, totalCost: 66 }
];

const ECLAIR_CHOCOLAT_INGREDIENTS: DexieProductIngredient[] = [
  { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 0.750, unit: 'kg', category: 'Farines & Céréales', unitCost: 85, totalCost: 63.75 },
  { rawMaterialId: 'rm_beurre_doux_82', name: 'Beurre Doux Gastronomique 82% MG', quantityPerBatch: 0.600, unit: 'kg', category: 'Matières Grasses', unitCost: 1150, totalCost: 690 },
  { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Entiers Calibre Gros', quantityPerBatch: 20, unit: 'pièces', category: 'Œufs & Ovoproduits', unitCost: 22, totalCost: 440 },
  { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 2.200, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 209 },
  { rawMaterialId: 'rm_chocolat_noir_55', name: 'Chocolat Noir de Couverture 55% Cacao Pur Beurre', quantityPerBatch: 1.100, unit: 'kg', category: 'Chocolats & Cacao', unitCost: 1850, totalCost: 2035 },
  { rawMaterialId: 'rm_sucre_cristal', name: 'Sucre Cristal Extra Blanc Pur Canne', quantityPerBatch: 0.500, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 55 },
  { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée Extra (Fécule / Amidon)', quantityPerBatch: 0.200, unit: 'kg', category: 'Poudres & Texturants', unitCost: 480, totalCost: 96 }
];

const PAIN_AU_CHOCOLAT_INGREDIENTS: DexieProductIngredient[] = [
  { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 2.200, unit: 'kg', category: 'Farines & Céréales', unitCost: 85, totalCost: 187 },
  { rawMaterialId: 'rm_beurre_tourage_84', name: 'Beurre de Feuilletage & Tourage 84% MG', quantityPerBatch: 1.100, unit: 'kg', category: 'Matières Grasses', unitCost: 1250, totalCost: 1375 },
  { rawMaterialId: 'rm_chocolat_noir_55', name: 'Bâtons de Chocolat Noir 55% Boulanger', quantityPerBatch: 0.800, unit: 'kg', category: 'Chocolats & Cacao', unitCost: 1850, totalCost: 1480 },
  { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 0.600, unit: 'L', category: 'Produits Laitiers', unitCost: 95, totalCost: 57 },
  { rawMaterialId: 'rm_sucre_cristal', name: 'Sucre Cristal Extra Blanc Pur Canne', quantityPerBatch: 0.280, unit: 'kg', category: 'Sucres', unitCost: 110, totalCost: 30.8 },
  { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin de Mer Pur Raffiné', quantityPerBatch: 0.045, unit: 'kg', category: 'Épicerie & Sel', unitCost: 45, totalCost: 2.03 },
  { rawMaterialId: 'rm_levure_fraiche', name: 'Levure Boulangère Fraîche en Pain', quantityPerBatch: 0.090, unit: 'kg', category: 'Levures & Ferments', unitCost: 180, totalCost: 16.2 }
];

// Precompute COGS for Sample Finished Goods
const mfCogs = calculateRecipeCogs(MILLE_FEUILLE_VANILLE_INGREDIENTS, 50, 450);
const crCogs = calculateRecipeCogs(CROISSANT_PUR_BEURRE_INGREDIENTS, 60, 130);
const ecCogs = calculateRecipeCogs(ECLAIR_CHOCOLAT_INGREDIENTS, 45, 320);
const pcCogs = calculateRecipeCogs(PAIN_AU_CHOCOLAT_INGREDIENTS, 50, 150);

/**
 * Standard Commercial Bakery Finished Goods with Complete Fiches Techniques
 */
export const SAMPLE_FINISHED_GOODS: DexieProduct[] = [
  {
    id: 'prod_mille_feuille_vanille',
    code: 'PF-MF-01',
    name: 'Mille-Feuille Vanille Bourbon de Madagascar',
    category: 'Mille-Feuille',
    type: 'finished_good',
    roomId: 'mille_feuille',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 50,
    price: 450,
    sellingPrice: 450,
    costPrice: mfCogs.unitCost,
    unitCost: mfCogs.unitCost,
    cogsUnitCost: mfCogs.unitCost,
    totalBatchCost: mfCogs.totalBatchCost,
    marginAmount: mfCogs.marginAmount,
    marginPercentage: mfCogs.marginPercentage,
    currentStock: 35,
    minStockAlert: 10,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001001',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Feuilletage inversé croustillant caramélisé sous grille, crème diplomate légère infusée à la vanille bourbon de Madagascar et glaçage fondant marbré traditionnel.',
    instructions: '1. Abaisser le pâton de feuilletage inversé à 2.5 mm. 2. Piquer et cuire à 180°C pendant 32 min sous grille avec caramélisation au sucre glace à 210°C. 3. Pocher la crème diplomate à la douille unie n°12. 4. Dresser en 3 couches superposées. 5. Masquer au fondant blanc tempéré à 35°C et marbrer au chocolat.',
    ingredients: MILLE_FEUILLE_VANILLE_INGREDIENTS,
    ficheTechnique: MILLE_FEUILLE_VANILLE_INGREDIENTS
  },
  {
    id: 'prod_croissant_pur_beurre',
    code: 'PF-VN-01',
    name: 'Croissant Pur Beurre Traditionnel',
    category: 'Viennoiserie & Briocherie',
    type: 'finished_good',
    roomId: 'viennoiserie',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 60,
    price: 130,
    sellingPrice: 130,
    costPrice: crCogs.unitCost,
    unitCost: crCogs.unitCost,
    cogsUnitCost: crCogs.unitCost,
    totalBatchCost: crCogs.totalBatchCost,
    marginAmount: crCogs.marginAmount,
    marginPercentage: crCogs.marginPercentage,
    currentStock: 50,
    minStockAlert: 20,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001002',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Croissant feuilleté pur beurre alvéolé, doré et croustillant, élaboré selon la méthode artisanale française avec fermentation lente.',
    instructions: '1. Pétrir la détrempe 4 min en 1ère vitesse puis 6 min en 2ème vitesse. Pointage 30 min à 24°C puis blocage froid à +2°C pendant 12h. 2. Tourage : 1 tour double + 1 tour simple avec beurre de tourage à 14°C. 3. Façonnage et pousse 2h15 à 26°C (80% HR). 4. Dorure double et cuisson à 175°C pendant 16 min.',
    ingredients: CROISSANT_PUR_BEURRE_INGREDIENTS,
    ficheTechnique: CROISSANT_PUR_BEURRE_INGREDIENTS
  },
  {
    id: 'prod_eclair_chocolat_noir',
    code: 'PF-PF-01',
    name: 'Éclair Chocolat Noir 55% Grand Arôme',
    category: 'Pâtisseries Fines',
    type: 'finished_good',
    roomId: 'patisserie_fine',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 45,
    price: 320,
    sellingPrice: 320,
    costPrice: ecCogs.unitCost,
    unitCost: ecCogs.unitCost,
    cogsUnitCost: ecCogs.unitCost,
    totalBatchCost: ecCogs.totalBatchCost,
    marginAmount: ecCogs.marginAmount,
    marginPercentage: ecCogs.marginPercentage,
    currentStock: 30,
    minStockAlert: 10,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001003',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Pâte à choux pur beurre dressée à la poche, garnie d’une crème pâtissière onctueuse au chocolat noir 55% et glacée au fondant chocolat miroir.',
    instructions: '1. Dessécher la panade sur feu moyen. 2. Incorporer les œufs un à un au batteur feuille. 3. Dresser des éclairs de 13 cm. 4. Cuisson au four à sole 170°C clé ouverte pendant 35 min. 5. Garnir de 75g de crème au chocolat noir 55% puis glacer au fondant tempéré à 34°C.',
    ingredients: ECLAIR_CHOCOLAT_INGREDIENTS,
    ficheTechnique: ECLAIR_CHOCOLAT_INGREDIENTS
  },
  {
    id: 'prod_pain_au_chocolat',
    code: 'PF-VN-02',
    name: 'Pain au Chocolat Pur Beurre (Chocolatine)',
    category: 'Viennoiserie & Briocherie',
    type: 'finished_good',
    roomId: 'viennoiserie',
    unit: 'pièces',
    batchUnit: 'pièces',
    yieldPerBatch: 50,
    price: 150,
    sellingPrice: 150,
    costPrice: pcCogs.unitCost,
    unitCost: pcCogs.unitCost,
    cogsUnitCost: pcCogs.unitCost,
    totalBatchCost: pcCogs.totalBatchCost,
    marginAmount: pcCogs.marginAmount,
    marginPercentage: pcCogs.marginPercentage,
    currentStock: 40,
    minStockAlert: 15,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    barcode: '6130001004',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Feuilletage levé croustillant pur beurre garni de deux généreux bâtons de chocolat noir 55% cacao.',
    instructions: '1. Même détrempe viennoiserie. Tourage à froid. 2. Découper des rectangles de 8x12 cm. 3. Insérer deux barres de chocolat espacées. 4. Pousse 2h à 26°C. 5. Dorer et cuire 16 min à 180°C.',
    ingredients: PAIN_AU_CHOCOLAT_INGREDIENTS,
    ficheTechnique: PAIN_AU_CHOCOLAT_INGREDIENTS
  }
];

// --------------------------------------------------------------------------
// Sample Semi-Finished Goods (Bases de Pâtisserie & Sous-Recettes de Laboratoire)
// --------------------------------------------------------------------------
export const SAMPLE_SEMI_FINISHED_GOODS: DexieProduct[] = [
  {
    id: 'sf_creme_patissiere_vanille',
    code: 'SF-CRM-01',
    name: 'Crème Pâtissière Vanille Bourbon',
    category: 'Crèmes & Garnitures',
    type: 'semi_finished',
    roomId: 'patisserie_fine',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 10,
    price: 0,
    sellingPrice: 0,
    costPrice: 450,
    unitCost: 450,
    cogsUnitCost: 450,
    totalBatchCost: 4500,
    currentStock: 25,
    minStockAlert: 5,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Crème pâtissière onctueuse cuite infusée aux gousses de vanille Bourbon.',
    ingredients: [
      { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 6, unit: 'L', unitCost: 95 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Entiers Calibre Gros', quantityPerBatch: 30, unit: 'pièces', unitCost: 22 },
      { rawMaterialId: 'rm_sucre_cristal', name: 'Sucre Cristal Extra Blanc Pur Canne', quantityPerBatch: 1.5, unit: 'kg', unitCost: 110 },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Vanillée Extra (Fécule / Amidon)', quantityPerBatch: 0.8, unit: 'kg', unitCost: 480 },
      { rawMaterialId: 'rm_gousse_vanille_bourbon', name: 'Gousses de Vanille Bourbon Madagascar Extra', quantityPerBatch: 2, unit: 'pièces', unitCost: 380 }
    ]
  },
  {
    id: 'sf_ganache_chocolat_noir',
    code: 'SF-GNC-01',
    name: 'Ganache Chocolat Noir 55% Pur Beurre',
    category: 'Chocolaterie & Ganaches',
    type: 'semi_finished',
    roomId: 'chocolaterie',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 8,
    price: 0,
    sellingPrice: 0,
    costPrice: 980,
    unitCost: 980,
    cogsUnitCost: 980,
    totalBatchCost: 7840,
    currentStock: 15,
    minStockAlert: 4,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Ganache fondante au chocolat de couverture 55% et crème fleurette.',
    ingredients: [
      { rawMaterialId: 'rm_chocolat_noir_55', name: 'Chocolat Noir de Couverture 55% Cacao Pur Beurre', quantityPerBatch: 4, unit: 'kg', unitCost: 1850 },
      { rawMaterialId: 'rm_creme_liquide_35', name: 'Crème Liquide Fleurette 35% MG', quantityPerBatch: 3.5, unit: 'L', unitCost: 780 },
      { rawMaterialId: 'rm_beurre_doux_82', name: 'Beurre Doux Gastronomique 82% MG', quantityPerBatch: 0.5, unit: 'kg', unitCost: 1150 }
    ]
  },
  {
    id: 'sf_feuilletage_inverse',
    code: 'SF-PAT-01',
    name: 'Feuilletage Inversé Touré Beurre 84% (Pâton)',
    category: 'Pâtes & Tourage',
    type: 'semi_finished',
    roomId: 'viennoiserie',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 15,
    price: 0,
    sellingPrice: 0,
    costPrice: 520,
    unitCost: 520,
    cogsUnitCost: 520,
    totalBatchCost: 7800,
    currentStock: 35,
    minStockAlert: 10,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Pâton de pâte feuilletée inversée croustillante au beurre de tourage.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 8, unit: 'kg', unitCost: 85 },
      { rawMaterialId: 'rm_beurre_tourage_84', name: 'Beurre de Feuilletage & Tourage 84% MG', quantityPerBatch: 4.5, unit: 'kg', unitCost: 1250 },
      { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin de Mer Pur Raffiné', quantityPerBatch: 0.2, unit: 'kg', unitCost: 45 }
    ]
  },
  {
    id: 'sf_frangipane_amande',
    code: 'SF-CRM-02',
    name: 'Crème Frangipane aux Amandes Extra',
    category: 'Crèmes & Garnitures',
    type: 'semi_finished',
    roomId: 'patisserie_fine',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 6,
    price: 0,
    sellingPrice: 0,
    costPrice: 850,
    unitCost: 850,
    cogsUnitCost: 850,
    totalBatchCost: 5100,
    currentStock: 12,
    minStockAlert: 3,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Crème frangipane riche (mélange crème d’amande et crème pâtissière).',
    ingredients: [
      { rawMaterialId: 'rm_poudre_amande', name: 'Poudre d’Amande Blanche Extra-Fine', quantityPerBatch: 2.5, unit: 'kg', unitCost: 2400 },
      { rawMaterialId: 'rm_sucre_glace', name: 'Sucre Glace Amylacé Spécial Pâtisserie', quantityPerBatch: 1.5, unit: 'kg', unitCost: 140 },
      { rawMaterialId: 'rm_beurre_doux_82', name: 'Beurre Doux Gastronomique 82% MG', quantityPerBatch: 1.2, unit: 'kg', unitCost: 1150 }
    ]
  },
  {
    id: 'sf_pate_a_choux',
    code: 'SF-PAT-02',
    name: 'Pâte à Choux Pâtissière Prête à Dresser',
    category: 'Pâtes & Tourage',
    type: 'semi_finished',
    roomId: 'patisserie_fine',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 5,
    price: 0,
    sellingPrice: 0,
    costPrice: 280,
    unitCost: 280,
    cogsUnitCost: 280,
    totalBatchCost: 1400,
    currentStock: 18,
    minStockAlert: 4,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Pâte à choux pur beurre pour éclairs, choux et religieuses.',
    ingredients: [
      { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 2, unit: 'L', unitCost: 95 },
      { rawMaterialId: 'rm_beurre_doux_82', name: 'Beurre Doux Gastronomique 82% MG', quantityPerBatch: 0.8, unit: 'kg', unitCost: 1150 },
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45 Spéciale Feuilletage', quantityPerBatch: 1, unit: 'kg', unitCost: 85 },
      { rawMaterialId: 'rm_oeufs_frais', name: 'Œufs Frais Entiers Calibre Gros', quantityPerBatch: 16, unit: 'pièces', unitCost: 22 }
    ]
  },
  {
    id: 'sf_creme_diplomate',
    code: 'SF-CRM-03',
    name: 'Crème Diplomate Légère Vanillée',
    category: 'Crèmes & Garnitures',
    type: 'semi_finished',
    roomId: 'patisserie_fine',
    unit: 'kg',
    batchUnit: 'kg',
    yieldPerBatch: 8,
    price: 0,
    sellingPrice: 0,
    costPrice: 620,
    unitCost: 620,
    cogsUnitCost: 620,
    totalBatchCost: 4960,
    currentStock: 20,
    minStockAlert: 5,
    storeId: 'lab_central',
    storeName: 'Laboratoire Central',
    isActive: true,
    updatedAt: new Date().toISOString(),
    description: 'Crème diplomate aérée, assemblage de crème pâtissière vanillée et crème fouettée.',
    ingredients: [
      { rawMaterialId: 'rm_lait_entier_uht', name: 'Lait Entier UHT Pasteurisé 3.2% MG', quantityPerBatch: 4, unit: 'L', unitCost: 95 },
      { rawMaterialId: 'rm_creme_liquide_35', name: 'Crème Liquide Fleurette 35% MG', quantityPerBatch: 2.5, unit: 'L', unitCost: 780 },
      { rawMaterialId: 'rm_gousse_vanille_bourbon', name: 'Gousses de Vanille Bourbon Madagascar Extra', quantityPerBatch: 2, unit: 'pièces', unitCost: 380 }
    ]
  }
];

// Singleton in-flight promise to prevent concurrent seeding in React StrictMode
let seedingPromise: Promise<{ rawMaterialsSeeded: number; productsSeeded: number; semiFinishedSeeded: number }> | null = null;

export interface InitializeDatabaseOptions {
  /** Force re-seeding even if tables are non-empty */
  force?: boolean;
  /** Silence verbose console logs */
  silent?: boolean;
}

/**
 * Initializes and seeds the Dexie.js database for the Délice Commercial Bakery ERP.
 * Checks if `db.raw_materials` and `db.products` are empty on startup, and automatically
 * populates them with professional commercial bakery data.
 *
 * @returns Result object with counts of raw materials and products seeded
 */
export async function initializeDatabase(options: InitializeDatabaseOptions = {}): Promise<{
  rawMaterialsSeeded: number;
  productsSeeded: number;
  semiFinishedSeeded: number;
}> {
  // If an initialization is already in progress, return the existing promise
  if (seedingPromise) {
    return seedingPromise;
  }

  seedingPromise = (async () => {
    const { force = false, silent = false } = options;
    const log = (msg: string, ...args: any[]) => {
      if (!silent) {
        console.log(`[dbSeeder] ${msg}`, ...args);
      }
    };

    log('🔍 Vérification de l’état de la base de données Dexie.js (Délice ERP)...');

    let rawMaterialsSeeded = 0;
    let productsSeeded = 0;
    let semiFinishedSeeded = 0;

    try {
      // ----------------------------------------------------------------------
      // 1. Raw Materials Seeder (db.raw_materials)
      // ----------------------------------------------------------------------
      const rawCount = await db.raw_materials.count();
      log(`📊 État table 'raw_materials': ${rawCount} enregistrement(s).`);

      if (rawCount === 0 || force) {
        log(`🌾 Table 'raw_materials' vide ou réinitialisation forcée. Ensemencement de ${SAMPLE_RAW_MATERIALS.length} matières premières...`);
        await db.raw_materials.bulkPut(SAMPLE_RAW_MATERIALS);
        rawMaterialsSeeded = SAMPLE_RAW_MATERIALS.length;
        log(`✅ Matières premières enregistrées avec succès (${rawMaterialsSeeded} articles avec PAMP).`);
      } else {
        log(`ℹ️ Matières premières déjà présentes (${rawCount} éléments). Ensemencement ignoré.`);
      }

      // Synchronize with local storage if storage is empty or contains legacy English mocks
      try {
        const storedMats = getRawMaterials();
        if (storedMats.length === 0 || storedMats.some(m => m.id === 'rm-1' || m.name.includes('High-Protein Bread Flour'))) {
          const currentDexie = await db.raw_materials.toArray();
          if (currentDexie.length > 0) {
            saveRawMaterials(currentDexie.map((m) => ({
              id: m.id,
              sku: m.code || `MP-${m.id}`,
              name: m.name,
              category: m.category as any,
              unit: m.unit as any,
              currentStock: m.currentStock ?? m.stockQuantity ?? 0,
              currentAvgCost: m.currentAvgCost ?? m.unitCost ?? m.costPerUnit ?? m.pamp ?? 0,
              reorderLevel: m.minStockAlert ?? 10,
              min_reorder_level: m.minStockAlert ?? 10,
              totalPurchasedQty: m.currentStock ?? m.stockQuantity ?? 0,
              lastUpdated: m.updatedAt || new Date().toISOString()
            })));
            log(`🔄 Synchronisation réussie des matières premières vers le cache local.`);
          }
        }
      } catch (syncErr) {
        console.warn('Storage sync check note:', syncErr);
      }

      // ----------------------------------------------------------------------
      // 2. Finished Products & Fiches Techniques Seeder (db.products)
      // ----------------------------------------------------------------------
      const productCount = await db.products.count();
      log(`📊 État table 'products': ${productCount} enregistrement(s).`);

      if (productCount === 0 || force) {
        log(`🥐 Table 'products' vide ou réinitialisation forcée. Ensemencement de ${SAMPLE_FINISHED_GOODS.length} produits finis avec fiches techniques & COGS...`);
        await db.products.bulkPut(SAMPLE_FINISHED_GOODS);
        productsSeeded = SAMPLE_FINISHED_GOODS.length;
        log(`✅ Produits finis et fiches techniques enregistrés avec succès (${productsSeeded} fiches complètes).`);
      } else {
        log(`ℹ️ Produits déjà présents (${productCount} éléments). Ensemencement ignoré.`);
      }

      // ----------------------------------------------------------------------
      // 3. Semi-Finished Products Seeder (db.products type: 'semi_finished')
      // ----------------------------------------------------------------------
      const allProducts = await db.products.toArray();
      const existingSfCount = allProducts.filter(p => p.type === 'semi_finished' || p.type === 'semi_fini').length;
      log(`📊 Produits semi-finis (bases) existants: ${existingSfCount} enregistrement(s).`);

      if (existingSfCount === 0 || force) {
        log(`⚡ Ensemencement de ${SAMPLE_SEMI_FINISHED_GOODS.length} produits semi-finis (bases de laboratoire)...`);
        await db.products.bulkPut(SAMPLE_SEMI_FINISHED_GOODS);
        semiFinishedSeeded = SAMPLE_SEMI_FINISHED_GOODS.length;
        log(`✅ Produits semi-finis enregistrés avec succès (${semiFinishedSeeded} bases).`);
      } else {
        log(`ℹ️ Produits semi-finis déjà présents (${existingSfCount} bases).`);
      }

      log(`🚀 Initialisation terminée. (Matières premières: ${rawMaterialsSeeded}, Produits finis: ${productsSeeded}, Semi-finis: ${semiFinishedSeeded})`);

      return { rawMaterialsSeeded, productsSeeded, semiFinishedSeeded };
    } catch (err) {
      console.error('[dbSeeder] ❌ Erreur critique lors de l’ensemencement de la base de données:', err);
      throw err;
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

/**
 * Réinitialisation d'urgence / purge et réensemencement des matières premières du laboratoire.
 * Nettoie complètement la table `raw_materials` et insère les 10 matières premières pures de laboratoire.
 * Peut être exécuté directement dans la console du navigateur via `window.resetAndSeedRawMaterials()`
 * ou via un bouton dans l'interface.
 */
export async function resetAndSeedRawMaterials(): Promise<void> {
  console.log("🧹 [db] Purge en cours de la table raw_materials...");
  // 1. Vider complètement la table des matières premières
  await db.raw_materials.clear();

  // 2. Insérer les matières premières de référence du laboratoire
  const defaultMaterials: DexieRawMaterial[] = [
    {
      id: "rm_farine_t45",
      code: "MP-001",
      name: "Farine T45",
      category: "Farines & Céréales",
      unit: "kg",
      stockQuantity: 100,
      currentStock: 100,
      unitCost: 120,
      costPerUnit: 120,
      pamp: 120,
      currentAvgCost: 120,
      minStockAlert: 20,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_beurre_tourage_84",
      code: "MP-002",
      name: "Beurre de Feuilletage 84%",
      category: "Matières Grasses",
      unit: "kg",
      stockQuantity: 50,
      currentStock: 50,
      unitCost: 900,
      costPerUnit: 900,
      pamp: 900,
      currentAvgCost: 900,
      minStockAlert: 15,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_sucre_cristal",
      code: "MP-003",
      name: "Sucre Cristal",
      category: "Sucres",
      unit: "kg",
      stockQuantity: 80,
      currentStock: 80,
      unitCost: 100,
      costPerUnit: 100,
      pamp: 100,
      currentAvgCost: 100,
      minStockAlert: 20,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_sucre_glace",
      code: "MP-004",
      name: "Sucre Glace",
      category: "Sucres",
      unit: "kg",
      stockQuantity: 30,
      currentStock: 30,
      unitCost: 140,
      costPerUnit: 140,
      pamp: 140,
      currentAvgCost: 140,
      minStockAlert: 10,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_oeufs_frais",
      code: "MP-005",
      name: "Œufs Frais",
      category: "Œufs & Produits Frais",
      unit: "pièces",
      stockQuantity: 300,
      currentStock: 300,
      unitCost: 25,
      costPerUnit: 25,
      pamp: 25,
      currentAvgCost: 25,
      minStockAlert: 50,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_lait_entier_uht",
      code: "MP-006",
      name: "Lait Entier UHT",
      category: "Produits Laitiers & Liquides",
      unit: "L",
      stockQuantity: 60,
      currentStock: 60,
      unitCost: 150,
      costPerUnit: 150,
      pamp: 150,
      currentAvgCost: 150,
      minStockAlert: 15,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_chocolat_noir_55",
      code: "MP-007",
      name: "Chocolat Noir 55%",
      category: "Chocolaterie & Cacao",
      unit: "kg",
      stockQuantity: 30,
      currentStock: 30,
      unitCost: 1800,
      costPerUnit: 1800,
      pamp: 1800,
      currentAvgCost: 1800,
      minStockAlert: 10,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_amandes_poudre",
      code: "MP-008",
      name: "Amandes Poudre",
      category: "Fruits Secs",
      unit: "kg",
      stockQuantity: 25,
      currentStock: 25,
      unitCost: 2200,
      costPerUnit: 2200,
      pamp: 2200,
      currentAvgCost: 2200,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_sel_fin",
      code: "MP-009",
      name: "Sel Fin",
      category: "Épicerie & Additifs",
      unit: "kg",
      stockQuantity: 25,
      currentStock: 25,
      unitCost: 80,
      costPerUnit: 80,
      pamp: 80,
      currentAvgCost: 80,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_levure_boulangere",
      code: "MP-010",
      name: "Levure Boulangère",
      category: "Levures & Additifs",
      unit: "kg",
      stockQuantity: 15,
      currentStock: 15,
      unitCost: 600,
      costPerUnit: 600,
      pamp: 600,
      currentAvgCost: 600,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    // Aliases ensuring instant linking with any existing fiches techniques
    {
      id: "rm_beurre_de_feuilletage_84_",
      code: "MP-002-ALT",
      name: "Beurre de Feuilletage 84% (Tourage)",
      category: "Matières Grasses",
      unit: "kg",
      stockQuantity: 50,
      currentStock: 50,
      unitCost: 900,
      costPerUnit: 900,
      pamp: 900,
      currentAvgCost: 900,
      minStockAlert: 15,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_levure_fraiche",
      code: "MP-010-ALT",
      name: "Levure Boulangère Fraîche",
      category: "Levures & Additifs",
      unit: "kg",
      stockQuantity: 15,
      currentStock: 15,
      unitCost: 600,
      costPerUnit: 600,
      pamp: 600,
      currentAvgCost: 600,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_poudre_amande",
      code: "MP-008-ALT",
      name: "Poudre d'Amande",
      category: "Fruits Secs",
      unit: "kg",
      stockQuantity: 25,
      currentStock: 25,
      unitCost: 2200,
      costPerUnit: 2200,
      pamp: 2200,
      currentAvgCost: 2200,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_creme_liquide_35",
      code: "MP-011",
      name: "Crème Liquide 35% MG",
      category: "Produits Laitiers & Liquides",
      unit: "L",
      stockQuantity: 40,
      currentStock: 40,
      unitCost: 780,
      costPerUnit: 780,
      pamp: 780,
      currentAvgCost: 780,
      minStockAlert: 10,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_poudre_creme",
      code: "MP-012",
      name: "Poudre à Crème Vanillée",
      category: "Poudres & Texturants",
      unit: "kg",
      stockQuantity: 20,
      currentStock: 20,
      unitCost: 480,
      costPerUnit: 480,
      pamp: 480,
      currentAvgCost: 480,
      minStockAlert: 5,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_gousse_vanille_bourbon",
      code: "MP-013",
      name: "Gousses de Vanille Bourbon",
      category: "Épices & Arômes",
      unit: "pièces",
      stockQuantity: 100,
      currentStock: 100,
      unitCost: 380,
      costPerUnit: 380,
      pamp: 380,
      currentAvgCost: 380,
      minStockAlert: 20,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: "rm_fondant_blanc",
      code: "MP-014",
      name: "Fondant Pâtissier Blanc",
      category: "Nappages & Glaçages",
      unit: "kg",
      stockQuantity: 40,
      currentStock: 40,
      unitCost: 360,
      costPerUnit: 360,
      pamp: 360,
      currentAvgCost: 360,
      minStockAlert: 10,
      storeId: 'lab_central',
      isActive: true,
      updatedAt: new Date().toISOString()
    }
  ];

  await db.raw_materials.bulkAdd(defaultMaterials);

  // Synchroniser avec localStorage pour que l'affichage inventaire soit immédiat
  saveRawMaterials(defaultMaterials.map((item) => ({
    id: item.id,
    sku: item.code || `MP-${item.id}`,
    name: item.name,
    category: item.category as any,
    unit: item.unit as any,
    currentStock: item.currentStock ?? item.stockQuantity ?? 0,
    currentAvgCost: item.unitCost ?? item.pamp ?? 0,
    reorderLevel: item.minStockAlert ?? 10,
    min_reorder_level: item.minStockAlert ?? 10,
    totalPurchasedQty: item.currentStock ?? item.stockQuantity ?? 0,
    lastUpdated: item.updatedAt || new Date().toISOString()
  })));

  console.log("✅ Table raw_materials nettoyée et réinitialisée avec succès !");
  if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
    window.dispatchEvent(new CustomEvent('delice:raw-materials-reset', { detail: { count: defaultMaterials.length } }));
  }
}

// Expose on global window object for immediate browser console execution as requested
if (typeof window !== 'undefined') {
  (window as any).resetAndSeedRawMaterials = resetAndSeedRawMaterials;
}

export default initializeDatabase;
