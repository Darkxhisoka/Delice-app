import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  DexieProduct,
  DexieRawMaterial,
  DexieProductionOrder,
  migrateLegacyFichesAndFinishedGoodsToProducts
} from '../../db/database';
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
  Boxes,
  Calendar,
  User,
  Clock,
  Sparkles,
  History,
  Eye,
  EyeOff,
  Search,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  Info,
  X,
  Sliders,
  ChevronDown,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FicheTechniqueIngredient {
  rawMaterialId: string;
  name: string;
  quantityPerBatch: number; // Base dosage for 1 nominal batch ("tour")
  unit: string;
  category?: string;
}

export interface FinishedProductWithFiche {
  id: string;
  code?: string;
  name: string;
  category: string;
  type: 'finished_good' | 'produit_fini' | string;
  roomId: string;
  yieldPerBatch: number; // Standard yield per 1 batch (e.g. 50 pieces)
  batchUnit: string; // e.g. "pièces", "portions", "tartes", "sablés"
  ingredients: FicheTechniqueIngredient[];
  instructions?: string;
  description?: string;
  currentStock?: number;
}

export interface CalculatedIngredientRow {
  rawMaterialId: string;
  name: string;
  category: string;
  quantityPerBatch: number;
  calculatedQuantity: number;
  unit: string;
  availableStock: number;
  isSufficient: boolean;
  shortfall: number;
  isWeighed?: boolean;
}

// ============================================================================
// Master Catalog Seeding Data (Finished Goods with Complete Fiches Techniques)
// ============================================================================

const SEED_FINISHED_GOODS: FinishedProductWithFiche[] = [
  {
    id: 'prod_mille_feuille_varsovie',
    code: 'PAT-MIL-001',
    name: 'Mille-Feuille Varsovie',
    category: 'mille_feuille',
    type: 'finished_good',
    roomId: 'mille_feuille',
    yieldPerBatch: 50,
    batchUnit: 'pièces',
    instructions:
      'Cuisson feuilletage caramélisé sous grille 190°C (30 min). Pochage crème diplomate vanille Bourbon de Madagascar. Fondant marbré au cornet chocolat.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 2.2, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm_beurre_tourage_aop', name: 'Beurre de Tourage AOP 84% M.G.', quantityPerBatch: 1.8, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_eau_purifiee', name: 'Eau Purifiée Tempérée', quantityPerBatch: 0.95, unit: 'L', category: 'Liquides' },
      { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin Raffiné', quantityPerBatch: 0.04, unit: 'kg', category: 'Épicerie' },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 4.0, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm_sucre_semoule', name: 'Sucre Semoule Cristallisé', quantityPerBatch: 0.8, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm_jaunes_oeufs', name: "Jaunes d'Œufs Frais", quantityPerBatch: 0.4, unit: 'kg', category: 'Produits Frais' },
      { rawMaterialId: 'rm_poudre_creme', name: 'Poudre à Crème Pâtissière', quantityPerBatch: 0.35, unit: 'kg', category: 'Poudres' },
      { rawMaterialId: 'rm_beurre_doux', name: 'Beurre Doux Extra-Fin 82%', quantityPerBatch: 0.3, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_vanille_bourbon', name: 'Gousses de Vanille Bourbon de Madagascar', quantityPerBatch: 6, unit: 'pièces', category: 'Arômes & Épices' },
      { rawMaterialId: 'rm_fondant_patissier', name: 'Fondant Blanc Pâtissier', quantityPerBatch: 1.2, unit: 'kg', category: 'Décors & Glaçages' },
      { rawMaterialId: 'rm_chocolat_noir_64', name: 'Chocolat Noir de Couverture 64%', quantityPerBatch: 0.15, unit: 'kg', category: 'Chocolats' },
    ],
  },
  {
    id: 'prod_croissant_beurre_aop',
    code: 'VIE-CRO-001',
    name: 'Croissant Feuilleté Pur Beurre AOP',
    category: 'viennoiserie',
    type: 'finished_good',
    roomId: 'viennoiserie',
    yieldPerBatch: 80,
    batchUnit: 'pièces',
    instructions:
      'Pétrissage pâte levée feuilletée (12 min). Pointage 1h puis bloc froid 4°C. Tourage 1 tour double + 1 tour simple avec beurre 84%. Détaillage triangles 75g. Apprêt 2h15 à 27°C, 80% humidité. Dorure double et cuisson 185°C ventilé (17 min).',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 5.0, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm_beurre_tourage_aop', name: 'Beurre de Tourage AOP 84% M.G.', quantityPerBatch: 2.5, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_sucre_semoule', name: 'Sucre Semoule Cristallisé', quantityPerBatch: 0.6, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm_levure_boulangere', name: 'Levure Fraîche de Boulangerie', quantityPerBatch: 0.22, unit: 'kg', category: 'Levures' },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 2.8, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm_oeufs_entiers', name: 'Œufs Frais Entiers Calibre M', quantityPerBatch: 8, unit: 'pièces', category: 'Produits Frais' },
      { rawMaterialId: 'rm_sel_fin', name: 'Sel Fin Raffiné', quantityPerBatch: 0.09, unit: 'kg', category: 'Épicerie' },
    ],
  },
  {
    id: 'prod_pain_chocolat_valrhona',
    code: 'VIE-PNC-002',
    name: 'Pain au Chocolat Bâtons Pur Beurre',
    category: 'viennoiserie',
    type: 'finished_good',
    roomId: 'viennoiserie',
    yieldPerBatch: 70,
    batchUnit: 'pièces',
    instructions:
      'Laminage pâte à croissant 3.5mm. Roulage régulier avec 2 barres de chocolat noir 55% par unité. Pousse douce et cuisson 185°C (16 min).',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 4.8, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm_beurre_tourage_aop', name: 'Beurre de Tourage AOP 84% M.G.', quantityPerBatch: 2.4, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_batons_chocolat', name: 'Bâtons Chocolat Noir Pâtissier 55%', quantityPerBatch: 2.1, unit: 'kg', category: 'Chocolats' },
      { rawMaterialId: 'rm_sucre_semoule', name: 'Sucre Semoule Cristallisé', quantityPerBatch: 0.55, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm_levure_boulangere', name: 'Levure Fraîche de Boulangerie', quantityPerBatch: 0.2, unit: 'kg', category: 'Levures' },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 2.5, unit: 'L', category: 'Produits Laitiers' },
    ],
  },
  {
    id: 'prod_tarte_citron_meringuee',
    code: 'PAT-TAR-003',
    name: 'Tartelette Citron Meringue Italienne',
    category: 'patisseries_fines',
    type: 'finished_good',
    roomId: 'patisserie_fine',
    yieldPerBatch: 40,
    batchUnit: 'pièces',
    instructions:
      'Foncer cercles inox pâte sablée amande, cuire à blanc 160°C. Crémeux citron monté au beurre froid à 40°C. Pochage meringue italienne serrée et coloration au chalumeau.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 1.6, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm_beurre_doux', name: 'Beurre Doux Extra-Fin 82%', quantityPerBatch: 1.8, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_sucre_semoule', name: 'Sucre Semoule Cristallisé', quantityPerBatch: 1.5, unit: 'kg', category: 'Sucres' },
      { rawMaterialId: 'rm_oeufs_entiers', name: 'Œufs Frais Entiers Calibre M', quantityPerBatch: 16, unit: 'pièces', category: 'Produits Frais' },
      { rawMaterialId: 'rm_poudre_amande', name: 'Poudre d’Amande Blanche Extra-Fine', quantityPerBatch: 0.8, unit: 'kg', category: 'Fruits Secs' },
      { rawMaterialId: 'rm_jus_citron', name: 'Jus de Citron Pur Non Traité', quantityPerBatch: 1.4, unit: 'L', category: 'Fruits' },
    ],
  },
  {
    id: 'prod_eclair_chocolat_guanaja',
    code: 'PAT-ECL-004',
    name: 'Éclair Chocolat Noir Grand Cru 70%',
    category: 'patisseries_fines',
    type: 'finished_good',
    roomId: 'patisserie_fine',
    yieldPerBatch: 60,
    batchUnit: 'pièces',
    instructions:
      'Dessécher panade à la casserole. Incorporer œufs tièdes au batteur. Dresser à la douille cannelée 14cm. Cuisson sur sole 180°C. Garnir crémeux chocolat noir 70%, glacer au fondant tempéré.',
    ingredients: [
      { rawMaterialId: 'rm_farine_t45', name: 'Farine de Gruau T45', quantityPerBatch: 1.2, unit: 'kg', category: 'Farines' },
      { rawMaterialId: 'rm_beurre_doux', name: 'Beurre Doux Extra-Fin 82%', quantityPerBatch: 1.1, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_oeufs_entiers', name: 'Œufs Frais Entiers Calibre M', quantityPerBatch: 20, unit: 'pièces', category: 'Produits Frais' },
      { rawMaterialId: 'rm_lait_entier', name: 'Lait Entier Pasteurisé', quantityPerBatch: 3.5, unit: 'L', category: 'Produits Laitiers' },
      { rawMaterialId: 'rm_chocolat_noir_64', name: 'Chocolat Noir de Couverture 64%', quantityPerBatch: 1.8, unit: 'kg', category: 'Chocolats' },
      { rawMaterialId: 'rm_sucre_semoule', name: 'Sucre Semoule Cristallisé', quantityPerBatch: 0.9, unit: 'kg', category: 'Sucres' },
    ],
  },
  {
    id: 'prod_makroudh_royal_amande',
    code: 'ORI-MAK-005',
    name: 'Makroudh Royal aux Amandes & Miel Pur',
    category: 'gateaux_orientaux',
    type: 'finished_good',
    roomId: 'gateaux_orientaux',
    yieldPerBatch: 120,
    batchUnit: 'pièces',
    instructions:
      'Pétrissage semoule moyenne avec smen pur et eau de fleur d’oranger. Farce amandes moulues parfumée à la cannelle. Friture dorée puis double trempage au miel d’oranger.',
    ingredients: [
      { rawMaterialId: 'rm_semoule_moyenne', name: 'Semoule Moyenne de Blé Dur', quantityPerBatch: 3.5, unit: 'kg', category: 'Semoules' },
      { rawMaterialId: 'rm_smen_pur', name: 'Beurre Clarifié Traditionnel (Smen)', quantityPerBatch: 1.2, unit: 'kg', category: 'Matières Grasses' },
      { rawMaterialId: 'rm_poudre_amande', name: 'Poudre d’Amande Blanche Extra-Fine', quantityPerBatch: 1.8, unit: 'kg', category: 'Fruits Secs' },
      { rawMaterialId: 'rm_miel_fleur_oranger', name: 'Miel Pur de Fleurs d’Oranger', quantityPerBatch: 2.5, unit: 'kg', category: 'Sucres & Miels' },
      { rawMaterialId: 'rm_eau_fleur_oranger', name: 'Eau de Fleur d’Oranger Distillée', quantityPerBatch: 0.6, unit: 'L', category: 'Arômes & Épices' },
    ],
  },
];

// Baseline Raw Materials for initial Dexie state
const SEED_RAW_MATERIALS: DexieRawMaterial[] = [
  { id: 'rm_farine_t45', code: 'RM-FLR-01', name: 'Farine de Gruau T45', category: 'Farines', unit: 'kg', currentStock: 140, minStockAlert: 40, updatedAt: new Date().toISOString() },
  { id: 'rm_beurre_tourage_aop', code: 'RM-BTR-01', name: 'Beurre de Tourage AOP 84% M.G.', category: 'Matières Grasses', unit: 'kg', currentStock: 80, minStockAlert: 25, updatedAt: new Date().toISOString() },
  { id: 'rm_beurre_doux', code: 'RM-BTR-02', name: 'Beurre Doux Extra-Fin 82%', category: 'Matières Grasses', unit: 'kg', currentStock: 60, minStockAlert: 20, updatedAt: new Date().toISOString() },
  { id: 'rm_eau_purifiee', code: 'RM-WAT-01', name: 'Eau Purifiée Tempérée', category: 'Liquides', unit: 'L', currentStock: 250, minStockAlert: 50, updatedAt: new Date().toISOString() },
  { id: 'rm_sel_fin', code: 'RM-SLT-01', name: 'Sel Fin Raffiné', category: 'Épicerie', unit: 'kg', currentStock: 35, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm_lait_entier', code: 'RM-MLK-01', name: 'Lait Entier Pasteurisé', category: 'Produits Laitiers', unit: 'L', currentStock: 75, minStockAlert: 20, updatedAt: new Date().toISOString() },
  { id: 'rm_sucre_semoule', code: 'RM-SUG-01', name: 'Sucre Semoule Cristallisé', category: 'Sucres', unit: 'kg', currentStock: 95, minStockAlert: 30, updatedAt: new Date().toISOString() },
  { id: 'rm_jaunes_oeufs', code: 'RM-EGG-YOLK', name: "Jaunes d'Œufs Frais", category: 'Produits Frais', unit: 'kg', currentStock: 18, minStockAlert: 5, updatedAt: new Date().toISOString() },
  { id: 'rm_oeufs_entiers', code: 'RM-EGG-01', name: 'Œufs Frais Entiers Calibre M', category: 'Produits Frais', unit: 'pièces', currentStock: 280, minStockAlert: 70, updatedAt: new Date().toISOString() },
  { id: 'rm_poudre_creme', code: 'RM-CRM-01', name: 'Poudre à Crème Pâtissière', category: 'Poudres', unit: 'kg', currentStock: 25, minStockAlert: 6, updatedAt: new Date().toISOString() },
  { id: 'rm_vanille_bourbon', code: 'RM-VAN-01', name: 'Gousses de Vanille Bourbon de Madagascar', category: 'Arômes & Épices', unit: 'pièces', currentStock: 45, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm_fondant_patissier', code: 'RM-FND-01', name: 'Fondant Blanc Pâtissier', category: 'Décors & Glaçages', unit: 'kg', currentStock: 40, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm_chocolat_noir_64', code: 'RM-CHO-64', name: 'Chocolat Noir de Couverture 64%', category: 'Chocolats', unit: 'kg', currentStock: 50, minStockAlert: 15, updatedAt: new Date().toISOString() },
  { id: 'rm_batons_chocolat', code: 'RM-CHO-BAT', name: 'Bâtons Chocolat Noir Pâtissier 55%', category: 'Chocolats', unit: 'kg', currentStock: 35, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm_levure_boulangere', code: 'RM-YST-01', name: 'Levure Fraîche de Boulangerie', category: 'Levures', unit: 'kg', currentStock: 15, minStockAlert: 4, updatedAt: new Date().toISOString() },
  { id: 'rm_poudre_amande', code: 'RM-ALM-01', name: 'Poudre d’Amande Blanche Extra-Fine', category: 'Fruits Secs', unit: 'kg', currentStock: 30, minStockAlert: 8, updatedAt: new Date().toISOString() },
  { id: 'rm_jus_citron', code: 'RM-CIT-01', name: 'Jus de Citron Pur Non Traité', category: 'Fruits', unit: 'L', currentStock: 22, minStockAlert: 6, updatedAt: new Date().toISOString() },
  { id: 'rm_semoule_moyenne', code: 'RM-SEM-01', name: 'Semoule Moyenne de Blé Dur', category: 'Semoules', unit: 'kg', currentStock: 80, minStockAlert: 20, updatedAt: new Date().toISOString() },
  { id: 'rm_smen_pur', code: 'RM-SMN-01', name: 'Beurre Clarifié Traditionnel (Smen)', category: 'Matières Grasses', unit: 'kg', currentStock: 25, minStockAlert: 6, updatedAt: new Date().toISOString() },
  { id: 'rm_miel_fleur_oranger', code: 'RM-HON-01', name: 'Miel Pur de Fleurs d’Oranger', category: 'Sucres & Miels', unit: 'kg', currentStock: 35, minStockAlert: 10, updatedAt: new Date().toISOString() },
  { id: 'rm_eau_fleur_oranger', code: 'RM-ORW-01', name: 'Eau de Fleur d’Oranger Distillée', category: 'Arômes & Épices', unit: 'L', currentStock: 18, minStockAlert: 5, updatedAt: new Date().toISOString() },
];

const PRESET_BAKERS = [
  'Chef Karim Meziane',
  'Chef Amine Benali',
  'Pâtissier Yacine B.',
  'Pâtissière Sarah L.',
  'Second de Cuisine Sofiane',
];

const BATCH_SHORTCUTS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

interface BakerProductionOrderWorkflowProps {
  initialProductId?: string;
  onNavigateToFicheTechnique?: (productId: string) => void;
}

// ============================================================================
// Main Component: BakerProductionOrderWorkflow
// ============================================================================

export function BakerProductionOrderWorkflow({
  initialProductId,
  onNavigateToFicheTechnique
}: BakerProductionOrderWorkflowProps = {}) {
  // Form State
  const [bakerName, setBakerName] = useState<string>(() => {
    return localStorage.getItem('delice_last_baker_name') || 'Chef Karim Meziane';
  });
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || 'prod_mille_feuille_varsovie'
  );
  const [batchCount, setBatchCount] = useState<number>(2.5); // Default 2.5 batches
  const [notes, setNotes] = useState<string>(
    'Contrôle impératif de la température de tourage (14°C - 16°C). Respecter scrupuleusement la pesée au gramme près.'
  );

  // UI state
  const [activeTab, setActiveTab] = useState<'NEW_OF' | 'HISTORY'>('NEW_OF');
  const [showA4Preview, setShowA4Preview] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [activeOrderForPrint, setActiveOrderForPrint] = useState<DexieProductionOrder | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Dynamic code generation for OF
  const [currentOfCode, setCurrentOfCode] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `OF-${today}-${rand}`;
  });

  // --------------------------------------------------------------------------
  // 1. Live Queries via Dexie.js (dexie-react-hooks)
  // --------------------------------------------------------------------------
  const rawProducts = useLiveQuery(async () => {
    return await db.products.toArray();
  }, []);

  const rawMaterials = useLiveQuery(async () => {
    return await db.raw_materials.toArray();
  }, []);

  const productionOrders = useLiveQuery(async () => {
    return await db.production_orders.orderBy('createdAt').reverse().limit(40).toArray();
  }, []);

  // --------------------------------------------------------------------------
  // 2. Initial Seeding / Bootstrapping of Finished Goods & Raw Materials
  // --------------------------------------------------------------------------
  useEffect(() => {
    const bootstrapCatalog = async () => {
      try {
        // Ensure raw materials table has baseline materials
        const existingMats = await db.raw_materials.toArray();
        if (existingMats.length === 0) {
          await db.raw_materials.bulkPut(SEED_RAW_MATERIALS);
        } else {
          // Add any missing seeds
          const missingMats = SEED_RAW_MATERIALS.filter(
            (sm) => !existingMats.some((em) => em.id === sm.id)
          );
          if (missingMats.length > 0) {
            await db.raw_materials.bulkPut(missingMats);
          }
        }

        // Migrate or ensure products table has finished goods with technical sheets
        await migrateLegacyFichesAndFinishedGoodsToProducts();
      } catch (err) {
        console.warn('[BakerProductionOrderWorkflow] Bootstrap warning:', err);
      }
    };

    bootstrapCatalog();
  }, []);

  // Save baker name to localStorage for workflow persistence
  useEffect(() => {
    if (bakerName) {
      localStorage.setItem('delice_last_baker_name', bakerName);
    }
  }, [bakerName]);

  // --------------------------------------------------------------------------
  // 3. Normalized Finished Products Catalog with Fiches Techniques
  // --------------------------------------------------------------------------
  const finishedProducts: FinishedProductWithFiche[] = useMemo(() => {
    const list: FinishedProductWithFiche[] = [];

    // First, process products directly from db.products via useLiveQuery (Single Source of Truth)
    if (rawProducts && rawProducts.length > 0) {
      rawProducts.forEach((p: any) => {
        const recipeArray = p.ingredients || p.ficheTechnique;
        const isFinished =
          p.type === 'finished_good' ||
          p.type === 'produit_fini' ||
          (recipeArray && Array.isArray(recipeArray) && recipeArray.length > 0);

        if (isFinished && recipeArray && Array.isArray(recipeArray) && recipeArray.length > 0) {
          const normalizedIngredients: FicheTechniqueIngredient[] = recipeArray.map((ing: any) => ({
            rawMaterialId: ing.rawMaterialId || ing.id || `rm_${Math.random().toString(36).substring(2, 7)}`,
            name: ing.name || ing.materialName || 'Ingrédient Inconnu',
            quantityPerBatch: Number(ing.quantityPerBatch ?? ing.dosagePerBatch ?? 1),
            unit: ing.unit || 'kg',
            category: ing.category || 'Général',
          }));

          list.push({
            id: p.id,
            code: p.code || 'PF',
            name: p.name,
            category: p.category || 'Pâtisserie',
            type: 'finished_good',
            roomId: p.roomId || 'patisserie_fine',
            yieldPerBatch: Number(p.yieldPerBatch ?? p.baseBatchYield ?? 50),
            batchUnit: p.batchUnit ?? p.unit ?? 'pièces',
            instructions: p.instructions || '',
            description: p.description || '',
            ingredients: normalizedIngredients,
            currentStock: p.currentStock,
          });
        }
      });
    }

    // If db.products contains finished products, return list directly
    if (list.length > 0) {
      return list;
    }

    return SEED_FINISHED_GOODS;
  }, [rawProducts]);

  // Ensure valid selection
  useEffect(() => {
    if (finishedProducts.length > 0 && !finishedProducts.some((p) => p.id === selectedProductId)) {
      setSelectedProductId(finishedProducts[0].id);
    }
  }, [finishedProducts, selectedProductId]);

  const selectedProduct: FinishedProductWithFiche | null = useMemo(() => {
    return finishedProducts.find((p) => p.id === selectedProductId) || finishedProducts[0] || null;
  }, [finishedProducts, selectedProductId]);

  // --------------------------------------------------------------------------
  // 4. Live Calculation & Stock Sufficiency Safeguards
  // --------------------------------------------------------------------------
  const calculatedTotalYield = useMemo(() => {
    if (!selectedProduct) return 0;
    const count = Number(batchCount) || 0;
    return Math.round(selectedProduct.yieldPerBatch * count);
  }, [selectedProduct, batchCount]);

  const ingredientCalculationRows: CalculatedIngredientRow[] = useMemo(() => {
    if (!selectedProduct || !selectedProduct.ingredients) return [];
    const count = Math.max(0.1, Number(batchCount) || 1);

    return selectedProduct.ingredients.map((ing) => {
      const calculatedQuantity = Math.round(ing.quantityPerBatch * count * 1000) / 1000;

      // Find in live Dexie raw materials table
      const matchedMat = rawMaterials?.find(
        (rm) =>
          rm.id === ing.rawMaterialId ||
          rm.name.trim().toLowerCase() === ing.name.trim().toLowerCase() ||
          (rm.code && rm.code === ing.rawMaterialId)
      );

      const availableStock = matchedMat?.currentStock ?? 0;
      const isSufficient = availableStock >= calculatedQuantity;
      const shortfall = isSufficient
        ? 0
        : Math.round((calculatedQuantity - availableStock) * 1000) / 1000;

      return {
        rawMaterialId: matchedMat?.id || ing.rawMaterialId,
        name: ing.name,
        category: ing.category || matchedMat?.category || 'Matières Premières',
        quantityPerBatch: ing.quantityPerBatch,
        calculatedQuantity,
        unit: ing.unit,
        availableStock,
        isSufficient,
        shortfall,
        isWeighed: !!checkedIngredients[ing.rawMaterialId],
      };
    });
  }, [selectedProduct, batchCount, rawMaterials, checkedIngredients]);

  // Overall Stock Health
  const missingIngredients = useMemo(() => {
    return ingredientCalculationRows.filter((r) => !r.isSufficient);
  }, [ingredientCalculationRows]);

  const hasStockShortage = missingIngredients.length > 0;
  const canBake = !hasStockShortage && batchCount > 0 && !!selectedProduct;

  // Toggle kitchen weighing check
  const toggleIngredientCheck = (matId: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [matId]: !prev[matId],
    }));
  };

  // --------------------------------------------------------------------------
  // 5. Emergency / Testing Stock Replenishment Override
  // --------------------------------------------------------------------------
  const handleAutoReplenishShortages = async () => {
    try {
      if (missingIngredients.length === 0) return;
      await db.transaction('rw', [db.raw_materials], async () => {
        for (const row of missingIngredients) {
          const mat = await db.raw_materials.get(row.rawMaterialId);
          if (mat) {
            const topUp = Math.ceil(row.shortfall + 10);
            await db.raw_materials.update(row.rawMaterialId, {
              currentStock: Math.round((mat.currentStock + topUp) * 100) / 100,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });
      setFeedbackSuccess(
        `Réapprovisionnement d'urgence appliqué avec succès pour ${missingIngredients.length} ingrédient(s). Le stock est désormais suffisant.`
      );
      setTimeout(() => setFeedbackSuccess(null), 5000);
    } catch (err) {
      console.error('Replenish error:', err);
      setFeedbackError('Échec du réapprovisionnement automatique.');
    }
  };

  // --------------------------------------------------------------------------
  // 6. Atomic Dexie Inventory Deduction & OF Creation
  // --------------------------------------------------------------------------
  const handleValidateAndDeduct = async () => {
    if (!selectedProduct) {
      setFeedbackError('Veuillez sélectionner un produit fini.');
      return;
    }

    if (hasStockShortage) {
      setFeedbackError(
        'Impossible de valider : certains ingrédients sont en rupture de stock dans la base Dexie.'
      );
      return;
    }

    if (batchCount <= 0) {
      setFeedbackError('Le nombre de tours / batches doit être supérieur à zéro.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const ofId = `of_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      let orderSnapshot: DexieProductionOrder;

      // ATOMIC TRANSACTION: [db.raw_materials, db.production_orders]
      await db.transaction('rw', [db.raw_materials, db.production_orders], async () => {
        const deductedSnapshots = [];

        // 1. Deduct exact calculated quantities from db.raw_materials
        for (const row of ingredientCalculationRows) {
          const mat = await db.raw_materials.get(row.rawMaterialId);
          const current = mat?.currentStock ?? 0;
          const after = Math.max(0, Math.round((current - row.calculatedQuantity) * 1000) / 1000);

          if (mat) {
            await db.raw_materials.update(row.rawMaterialId, {
              currentStock: after,
              updatedAt: nowIso,
            });
          }

          deductedSnapshots.push({
            rawMaterialId: row.rawMaterialId,
            materialName: row.name,
            dosagePerBatch: row.quantityPerBatch,
            totalCalculated: row.calculatedQuantity,
            unit: row.unit,
            stockBefore: current,
            stockAfter: after,
          });
        }

        // 2. Create the historical record in db.production_orders
        orderSnapshot = {
          id: ofId,
          ofCode: currentOfCode,
          bakerName: bakerName.trim() || 'Chef Pâtissier',
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productCode: selectedProduct.code || 'PF',
          batchCount,
          baseBatchYield: selectedProduct.yieldPerBatch,
          totalYield: calculatedTotalYield,
          yieldUnit: selectedProduct.batchUnit,
          batchUnit: selectedProduct.batchUnit,
          specialInstructions: notes,
          notes,
          roomId: selectedProduct.roomId,
          deductedIngredients: deductedSnapshots,
          ingredients: deductedSnapshots,
          status: 'completed',
          createdAt: nowIso,
        };

        await db.production_orders.put(orderSnapshot);
      });

      // Transaction successfully committed!
      setActiveOrderForPrint(orderSnapshot!);
      setFeedbackSuccess(
        `Ordre de Fabrication ${currentOfCode} validé ! Le stock a été déduit avec succès.`
      );

      // Generate next OF code
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = Math.floor(100 + Math.random() * 900);
      setCurrentOfCode(`OF-${today}-${rand}`);
      setCheckedIngredients({});

      // Open print prompt automatically
      setTimeout(() => {
        window.print();
      }, 350);
    } catch (err: any) {
      console.error('[BakerProductionOrderWorkflow] Transaction failed:', err);
      setFeedbackError(`Erreur lors de la validation : ${err?.message || 'Échec Dexie transaction'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Print Trigger for current form or a past order
  const handlePrintCurrentView = (order?: DexieProductionOrder) => {
    if (order) {
      setActiveOrderForPrint(order);
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtered products for dropdown search
  const filteredProducts = useMemo(() => {
    return finishedProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRoom = selectedRoomFilter === 'ALL' || p.roomId === selectedRoomFilter;
      return matchesSearch && matchesRoom;
    });
  }, [finishedProducts, searchTerm, selectedRoomFilter]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">
      {/* --------------------------------------------------------------------
          TOP NAVIGATION & ACTION BAR (HIDDEN IN PRINT)
          -------------------------------------------------------------------- */}
      <div className="print:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Workflow Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Atelier Pâtisserie &middot; Ordre de Fabrication
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Délice ERP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fiches Techniques &bull; Pesée Connectée &bull; Déduction Dexie.js
              </p>
            </div>
          </div>

          {/* Tab Navigation & A4 Preview Toggle */}
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('NEW_OF')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'NEW_OF'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Nouvel OF &amp; Pesée</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeTab === 'HISTORY'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historique ({productionOrders?.length ?? 0})</span>
              </button>
            </div>

            {/* A4 Preview Modal Toggle */}
            <button
              type="button"
              onClick={() => setShowA4Preview(!showA4Preview)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                showA4Preview
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title="Afficher ou masquer la feuille A4 officielle de pesée"
            >
              {showA4Preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Aperçu A4</span>
            </button>

            {/* Direct Instant Print Button */}
            <button
              type="button"
              onClick={() => handlePrintCurrentView()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-xs transition-all shadow-sm hover:border-amber-500/40"
              title="Imprimer directement la fiche de pesée"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          STATUS ALERTS & FEEDBACK NOTIFICATIONS (PRINT HIDDEN)
          -------------------------------------------------------------------- */}
      <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {feedbackSuccess && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 shadow-lg shadow-emerald-950/50 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-emerald-100">Action Réussie</p>
              <p className="text-xs text-emerald-300 mt-0.5">{feedbackSuccess}</p>
            </div>
            <button
              onClick={() => setFeedbackSuccess(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feedbackError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-200 flex items-start gap-3 shadow-lg shadow-rose-950/50 animate-in fade-in">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-rose-100">Attention</p>
              <p className="text-xs text-rose-300 mt-0.5">{feedbackError}</p>
            </div>
            <button
              onClick={() => setFeedbackError(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CRITICAL STOCK SHORTAGE ALERT BANNER */}
        {hasStockShortage && activeTab === 'NEW_OF' && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-600/80 text-rose-100 shadow-xl shadow-rose-950/60">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Rupture de Stock Critique &mdash; Fabrication Bloquée
                    <span className="px-2 py-0.5 text-[11px] bg-rose-800 text-rose-100 rounded-full font-bold">
                      {missingIngredients.length} ingrédient(s) insuffisant(s)
                    </span>
                  </h3>
                  <p className="text-xs text-rose-200 mt-1 max-w-2xl">
                    Le stock disponible dans la base locale Dexie (<code>db.raw_materials</code>) ne
                    permet pas de couvrir ce volume de production ({batchCount} tour(s)). La validation
                    et déduction sont désactivées pour protéger la cohérence des stocks.
                  </p>
                </div>
              </div>

              {/* Automatic Quick Top-Up for Testing/Lab Emergency */}
              <button
                type="button"
                onClick={handleAutoReplenishShortages}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                title="Ajoute temporairement la quantité manquante + 10 unités dans db.raw_materials"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réapprovisionner (Dépannage Dexie)</span>
              </button>
            </div>

            {/* Missing Ingredients Details Pills */}
            <div className="mt-4 pt-3 border-t border-rose-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {missingIngredients.map((item) => (
                <div
                  key={item.rawMaterialId}
                  className="p-2.5 rounded-xl bg-rose-900/60 border border-rose-700/60 text-xs flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-rose-300">
                      Dispo : <span className="font-semibold">{item.availableStock} {item.unit}</span> | Besoin : <span className="font-semibold">{item.calculatedQuantity} {item.unit}</span>
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-md bg-rose-800 text-white font-mono font-bold shrink-0">
                    -{item.shortfall} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------
          MAIN WORKFLOW CONTENT: NEW OF vs HISTORY (PRINT HIDDEN)
          -------------------------------------------------------------------- */}
      <div className="print:hidden max-w-7xl mx-auto px-4 sm:px-6">
        {activeTab === 'NEW_OF' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN (5 cols): Production Order Configuration Form */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card: Order Identification */}
              <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Paramètres de Fabrication
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                    {currentOfCode}
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Baker Name Input + Preset Quick Buttons */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chef / Pâtissier Responsable</span>
                    </label>
                    <input
                      type="text"
                      value={bakerName}
                      onChange={(e) => setBakerName(e.target.value)}
                      placeholder="Nom du chef pâtissier..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                    />

                    {/* Quick Baker presets */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PRESET_BAKERS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBakerName(b)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            bakerName === b
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                              : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {b.split(' ')[0]} {b.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Finished Product Dropdown with Live Search */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-amber-400" />
                        <span>Produit Fini (avec Fiche Technique)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {finishedProducts.length} recettes disponibles
                      </span>
                    </label>

                    {/* Dropdown Select */}
                    <div className="relative">
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full appearance-none px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pr-10 cursor-pointer"
                      >
                        {finishedProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.yieldPerBatch} {p.batchUnit}/tour ({p.category})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>

                    {/* Selected Product Quick Info Card */}
                    {selectedProduct && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-300">
                            {selectedProduct.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Atelier : <span className="text-slate-200 uppercase font-semibold">{selectedProduct.roomId.replace(/_/g, ' ')}</span> &bull; Réf : <span className="font-mono text-slate-300">{selectedProduct.code}</span>
                          </p>
                          {onNavigateToFicheTechnique && (
                            <button
                              type="button"
                              onClick={() => onNavigateToFicheTechnique(selectedProduct.id)}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                              <span>Modifier Fiche Technique &amp; COGS</span>
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Rendement Base</span>
                          <span className="text-xs font-black text-white font-mono">
                            {selectedProduct.yieldPerBatch} {selectedProduct.batchUnit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Batch Multiplier (batchCount) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-amber-400" />
                        <span>Nombre de Tours / Batches</span>
                      </span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        x{batchCount}
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchCount((prev) => Math.max(0.5, Math.round((prev - 0.5) * 10) / 10))}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-amber-500 font-bold active:scale-95 transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="50"
                        value={batchCount}
                        onChange={(e) => setBatchCount(Math.max(0.1, parseFloat(e.target.value) || 0))}
                        className="flex-1 text-center py-2 bg-slate-900 border border-slate-700 rounded-xl text-base font-black text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                      />

                      <button
                        type="button"
                        onClick={() => setBatchCount((prev) => Math.round((prev + 0.5) * 10) / 10)}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-amber-500 font-bold active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Batch Multiplier Quick Presets */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {BATCH_SHORTCUTS.map((multiplier) => (
                        <button
                          key={multiplier}
                          type="button"
                          onClick={() => setBatchCount(multiplier)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-bold transition-all ${
                            batchCount === multiplier
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          {multiplier}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Special Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Consignes &amp; Instructions Particulières</span>
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Températures de cuisson, précautions de tourage, pointage..."
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Expected Production Output Summary Banner */}
                <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-slate-900 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
                        Rendement Total Prévu
                      </p>
                      <p className="text-2xl font-black text-white font-mono mt-0.5">
                        {calculatedTotalYield}{' '}
                        <span className="text-sm font-normal text-amber-300">
                          {selectedProduct?.batchUnit || 'unités'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <p>{selectedProduct?.yieldPerBatch} &times; {batchCount} tours</p>
                      <p className="text-[11px] text-slate-500">Formule industrielle</p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button: Validate, Deduct Stock & Print */}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleValidateAndDeduct}
                    disabled={!canBake || isSubmitting}
                    className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                      !canBake || isSubmitting
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Déduction Dexie &amp; Impression en cours...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>Valider, Déduire le Stock &amp; Imprimer</span>
                      </>
                    )}
                  </button>

                  {!canBake && (
                    <p className="text-[11px] text-center text-rose-400 mt-2 font-medium">
                      {hasStockShortage
                        ? 'Bouton désactivé : des ingrédients sont en rupture de stock ci-contre.'
                        : 'Veuillez saisir un nombre de tours valide.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (7 cols): Calculated Recipe & Live Stock Safeguards Table */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Scale className="w-4 h-4 text-amber-400" />
                      Fiche de Pesée Calculée &amp; Contrôle de Stock
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recette multipliée par {batchCount} &bull; Comparaison temps réel avec <code>db.raw_materials</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                      {ingredientCalculationRows.length} ingrédients
                    </span>
                  </div>
                </div>

                {/* Recipe Ingredients Calculation Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-[11px] uppercase tracking-wider font-bold text-slate-400 bg-slate-900/60">
                        <th className="py-2.5 px-3">Contrôle</th>
                        <th className="py-2.5 px-3">Ingrédient / Matière</th>
                        <th className="py-2.5 px-3 text-right">Dosage Base</th>
                        <th className="py-2.5 px-3 text-right">À Peser ({batchCount}x)</th>
                        <th className="py-2.5 px-3 text-right">Stock Actuel</th>
                        <th className="py-2.5 px-3 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {ingredientCalculationRows.map((row) => {
                        const isChecked = !!checkedIngredients[row.rawMaterialId];
                        return (
                          <tr
                            key={row.rawMaterialId}
                            className={`transition-colors ${
                              !row.isSufficient
                                ? 'bg-rose-950/30 hover:bg-rose-950/50'
                                : isChecked
                                ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                                : 'hover:bg-slate-750/50'
                            }`}
                          >
                            {/* Weighing Checklist Box */}
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => toggleIngredientCheck(row.rawMaterialId)}
                                className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                    : 'border-slate-600 bg-slate-900 hover:border-slate-500 text-transparent'
                                }`}
                                title="Cocher une fois pesé"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            </td>

                            {/* Material Name & Category */}
                            <td className="py-3 px-3">
                              <p className="font-bold text-white flex items-center gap-1.5">
                                <span className={isChecked ? 'line-through text-slate-400' : ''}>
                                  {row.name}
                                </span>
                              </p>
                              <span className="text-[10px] text-slate-400">{row.category}</span>
                            </td>

                            {/* Base Dosage */}
                            <td className="py-3 px-3 text-right font-mono text-slate-400">
                              {row.quantityPerBatch} {row.unit}
                            </td>

                            {/* Total Calculated to Weigh */}
                            <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                              <span className="text-sm">{row.calculatedQuantity}</span>{' '}
                              <span className="text-xs">{row.unit}</span>
                            </td>

                            {/* Available Stock in Dexie db.raw_materials */}
                            <td className="py-3 px-3 text-right font-mono text-xs">
                              <span
                                className={`font-semibold ${
                                  row.isSufficient ? 'text-slate-300' : 'text-rose-400 font-bold'
                                }`}
                              >
                                {row.availableStock} {row.unit}
                              </span>
                            </td>

                            {/* Sufficiency Badge */}
                            <td className="py-3 px-3 text-center">
                              {row.isSufficient ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Conforme</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Manque {row.shortfall} {row.unit}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Recipe Instructions / Chef Directive */}
                {selectedProduct?.instructions && (
                  <div className="mt-5 p-3.5 rounded-xl bg-slate-900 border border-slate-700/80">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      <span>Fiche Technique Officielle &mdash; Instructions du Chef</span>
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {selectedProduct.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------
             TAB 2: PRODUCTION ORDERS HISTORY
             ------------------------------------------------------------------ */
          <div className="bg-slate-800/90 border border-slate-700/70 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  Historique des Ordres de Fabrication (OF)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Historique immuable stocké dans IndexedDB (<code>db.production_orders</code>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('NEW_OF')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-amber-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer un Nouvel OF</span>
              </button>
            </div>

            {(!productionOrders || productionOrders.length === 0) ? (
              <div className="py-16 text-center text-slate-400">
                <ChefHat className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-base font-medium text-slate-300">Aucun ordre de fabrication enregistré</p>
                <p className="text-xs text-slate-500 mt-1">
                  Les ordres validés s'afficheront ici avec le détail des ingrédients déduits.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-[11px] uppercase tracking-wider font-bold text-slate-400 bg-slate-900/60">
                      <th className="py-3 px-3">Code OF</th>
                      <th className="py-3 px-3">Date / Heure</th>
                      <th className="py-3 px-3">Pâtissier</th>
                      <th className="py-3 px-3">Produit Réalisé</th>
                      <th className="py-3 px-3 text-right">Tours</th>
                      <th className="py-3 px-3 text-right">Rendement</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {productionOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-750/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">
                          {ord.ofCode}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(ord.createdAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 font-medium text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ord.bakerName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-white">{ord.productName}</p>
                          <span className="text-[10px] text-slate-400">
                            {ord.deductedIngredients?.length || 0} ingrédients déduits
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                          {ord.batchCount}x
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {ord.totalYield} {ord.yieldUnit || ord.batchUnit || 'pièces'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Validé &amp; Déduit</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handlePrintCurrentView(ord)}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold inline-flex items-center gap-1"
                            title="Réimprimer cet Ordre de Fabrication"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Réimprimer</span>
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

      {/* --------------------------------------------------------------------
          INTERACTIVE A4 PREVIEW MODAL (ON SCREEN TOGGLE)
          -------------------------------------------------------------------- */}
      {showA4Preview && (
        <div className="print:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 my-8">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Aperçu Document A4 Officiel (Fiche de Pesée)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer Maintenant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowA4Preview(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Sheet Container Inside Preview */}
            <div className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-inner border border-slate-300 font-sans max-h-[75vh] overflow-y-auto">
              <A4DocumentLayout
                ofCode={activeOrderForPrint?.ofCode || currentOfCode}
                bakerName={activeOrderForPrint?.bakerName || bakerName}
                productName={activeOrderForPrint?.productName || selectedProduct?.name || ''}
                productCode={activeOrderForPrint?.productCode || selectedProduct?.code || 'PF'}
                roomId={activeOrderForPrint?.roomId || selectedProduct?.roomId || 'patisserie_fine'}
                batchCount={activeOrderForPrint?.batchCount ?? batchCount}
                yieldPerBatch={activeOrderForPrint?.baseBatchYield ?? selectedProduct?.yieldPerBatch ?? 50}
                totalYield={activeOrderForPrint?.totalYield ?? calculatedTotalYield}
                batchUnit={activeOrderForPrint?.yieldUnit || selectedProduct?.batchUnit || 'pièces'}
                notes={activeOrderForPrint?.notes || notes}
                ingredients={
                  activeOrderForPrint?.deductedIngredients?.map((di) => ({
                    rawMaterialId: di.rawMaterialId,
                    name: di.materialName,
                    category: '',
                    quantityPerBatch: di.dosagePerBatch,
                    calculatedQuantity: di.totalCalculated,
                    unit: di.unit,
                    availableStock: di.stockBefore,
                    isSufficient: true,
                    shortfall: 0,
                  })) || ingredientCalculationRows
                }
                createdAt={activeOrderForPrint?.createdAt || new Date().toISOString()}
              />
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          OFFICIAL A4 PRINTABLE DOCUMENT (@media print ONLY)
          -------------------------------------------------------------------- */}
      <div className="hidden print:block printable-a4-order w-full bg-white text-black p-0 m-0">
        <A4DocumentLayout
          ofCode={activeOrderForPrint?.ofCode || currentOfCode}
          bakerName={activeOrderForPrint?.bakerName || bakerName}
          productName={activeOrderForPrint?.productName || selectedProduct?.name || ''}
          productCode={activeOrderForPrint?.productCode || selectedProduct?.code || 'PF'}
          roomId={activeOrderForPrint?.roomId || selectedProduct?.roomId || 'patisserie_fine'}
          batchCount={activeOrderForPrint?.batchCount ?? batchCount}
          yieldPerBatch={activeOrderForPrint?.baseBatchYield ?? selectedProduct?.yieldPerBatch ?? 50}
          totalYield={activeOrderForPrint?.totalYield ?? calculatedTotalYield}
          batchUnit={activeOrderForPrint?.yieldUnit || selectedProduct?.batchUnit || 'pièces'}
          notes={activeOrderForPrint?.notes || notes}
          ingredients={
            activeOrderForPrint?.deductedIngredients?.map((di) => ({
              rawMaterialId: di.rawMaterialId,
              name: di.materialName,
              category: '',
              quantityPerBatch: di.dosagePerBatch,
              calculatedQuantity: di.totalCalculated,
              unit: di.unit,
              availableStock: di.stockBefore,
              isSufficient: true,
              shortfall: 0,
            })) || ingredientCalculationRows
          }
          createdAt={activeOrderForPrint?.createdAt || new Date().toISOString()}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Component: Pristine Official A4 Document Layout
// ============================================================================

interface A4DocumentLayoutProps {
  ofCode: string;
  bakerName: string;
  productName: string;
  productCode: string;
  roomId: string;
  batchCount: number;
  yieldPerBatch: number;
  totalYield: number;
  batchUnit: string;
  notes: string;
  ingredients: CalculatedIngredientRow[];
  createdAt: string;
}

function A4DocumentLayout({
  ofCode,
  bakerName,
  productName,
  productCode,
  roomId,
  batchCount,
  yieldPerBatch,
  totalYield,
  batchUnit,
  notes,
  ingredients,
  createdAt,
}: A4DocumentLayoutProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = new Date(createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-[210mm] mx-auto bg-white text-slate-900 text-xs font-sans leading-tight">
      {/* Brand Header */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
            Pâtisserie Le Délice
          </h1>
          <p className="text-[11px] font-semibold text-slate-700 tracking-wide uppercase">
            Laboratoire Central &bull; Direction de la Production
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Atelier : <span className="font-bold text-slate-800 uppercase">{roomId.replace(/_/g, ' ')}</span> &bull; Système ERP Traçabilité
          </p>
        </div>

        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-black text-sm rounded">
            {ofCode}
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            Émis le {formattedDate} à {formattedTime}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-amber-700 font-bold">
            Document de Pesée Officiel
          </p>
        </div>
      </div>

      {/* OF Document Title Banner */}
      <div className="my-3 py-1.5 px-3 bg-slate-100 border border-slate-300 rounded text-center">
        <h2 className="text-sm font-black tracking-wider text-slate-900 uppercase">
          Ordre de Fabrication &amp; Fiche de Pesée au Laboratoire
        </h2>
      </div>

      {/* Metadata Cards Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Left: Product & Recipe Info */}
        <div className="p-3 border border-slate-300 rounded bg-slate-50/60">
          <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
            Produit Fini à Réaliser
          </p>
          <p className="text-sm font-black text-slate-950 mt-0.5">{productName}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Code Article : <span className="font-mono font-bold text-slate-800">{productCode}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span>Rendement unitaire :</span>
            <span className="font-bold font-mono">
              {yieldPerBatch} {batchUnit} / tour
            </span>
          </div>
        </div>

        {/* Right: Production Volume & Baker Responsibility */}
        <div className="p-3 border border-slate-300 rounded bg-slate-50/60">
          <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
            Responsable &amp; Volume de Commande
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[11px] text-slate-600">Pâtissier :</span>
            <span className="text-xs font-bold text-slate-950">{bakerName}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-600">Multiplicateur :</span>
            <span className="font-bold text-amber-800 font-mono text-xs">
              {batchCount} Tour(s) ({batchCount}x)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-900">Rendement Attendu :</span>
            <span className="text-sm font-black text-slate-950 font-mono">
              {totalYield} {batchUnit}
            </span>
          </div>
        </div>
      </div>

      {/* Special Directives & Notes */}
      {notes && (
        <div className="mb-4 p-2.5 bg-amber-50/60 border border-amber-300 rounded">
          <p className="text-[9px] uppercase font-bold text-amber-900 tracking-wider mb-0.5">
            Instructions &amp; Consignes Techniques du Chef
          </p>
          <p className="text-[10.5px] text-slate-800 italic leading-snug">{notes}</p>
        </div>
      )}

      {/* Technical Recipe & Weighting Table */}
      <div className="mb-4">
        <table className="w-full border-collapse border border-slate-400 text-left text-[10px]">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 font-bold uppercase tracking-wider text-[9px]">
              <th className="border border-slate-400 py-1.5 px-2 text-center w-8">N°</th>
              <th className="border border-slate-400 py-1.5 px-2">Matière Première / Ingrédient</th>
              <th className="border border-slate-400 py-1.5 px-2 text-right w-24">Dosage Base (1x)</th>
              <th className="border border-slate-400 py-1.5 px-2 text-right w-28 bg-slate-300/60 font-black">
                À Peser ({batchCount}x)
              </th>
              <th className="border border-slate-400 py-1.5 px-2 text-center w-20">Contrôle [ &radic; ]</th>
              <th className="border border-slate-400 py-1.5 px-2 text-center w-24">N° Lot / Visa</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((item, idx) => (
              <tr
                key={item.rawMaterialId}
                className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}
              >
                <td className="border border-slate-400 py-1.5 px-2 text-center font-mono text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-400 py-1.5 px-2 font-semibold text-slate-950">
                  {item.name}
                </td>
                <td className="border border-slate-400 py-1.5 px-2 text-right font-mono text-slate-600">
                  {item.quantityPerBatch} {item.unit}
                </td>
                <td className="border border-slate-400 py-1.5 px-2 text-right font-mono font-black text-slate-950 bg-slate-100/50">
                  <span className="text-xs">{item.calculatedQuantity}</span> {item.unit}
                </td>
                <td className="border border-slate-400 py-1.5 px-2 text-center">
                  <div className="w-4 h-4 mx-auto border-2 border-slate-500 rounded-sm"></div>
                </td>
                <td className="border border-slate-400 py-1.5 px-2 text-center text-slate-400 font-mono text-[8px]">
                  ...................
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quality Control & Regulatory Directives */}
      <div className="mb-6 p-2 bg-slate-50 border border-slate-300 rounded text-[9px] text-slate-600 space-y-0.5">
        <p className="font-bold text-slate-800 uppercase tracking-wide">
          Protocole de Contrôle Qualité &amp; Hygiène HACCP :
        </p>
        <p>
          1. Tare et pesée métrologique obligatoire sur balance calibrée pour chaque ingrédient.
        </p>
        <p>
          2. Contrôle visuel et organoleptique à réception et dépotage des matières premières.
        </p>
        <p>
          3. Déduction immédiate enregistrée dans la base centrale Dexie &bull; Traçabilité des lots garantie.
        </p>
      </div>

      {/* Dual Signature Blocks */}
      <div className="grid grid-cols-2 gap-6 pt-2 border-t-2 border-slate-900">
        <div className="border border-slate-400 rounded p-3 h-28 flex flex-col justify-between">
          <div>
            <p className="font-bold text-[10px] text-slate-900 uppercase">
              Visa Pâtissier (Pesée &amp; Réalisation)
            </p>
            <p className="text-[9px] text-slate-500">Nom : {bakerName}</p>
          </div>
          <div className="border-b border-dotted border-slate-400 pb-1">
            <span className="text-[9px] text-slate-400">Signature :</span>
          </div>
        </div>

        <div className="border border-slate-400 rounded p-3 h-28 flex flex-col justify-between">
          <div>
            <p className="font-bold text-[10px] text-slate-900 uppercase">
              Visa Responsable Laboratoire (Contrôle Qualité)
            </p>
            <p className="text-[9px] text-slate-500">Conformité pesée, aspects et rendement</p>
          </div>
          <div className="border-b border-dotted border-slate-400 pb-1">
            <span className="text-[9px] text-slate-400">Signature :</span>
          </div>
        </div>
      </div>

      {/* Footer System Notice */}
      <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[8px] text-slate-400">
        PÂTISSERIE LE DÉLICE &bull; ERP DE PRODUCTION &bull; TRANSACTION DEXIE REF: {ofCode} &bull; PAGE 1/1
      </div>
    </div>
  );
}

export default BakerProductionOrderWorkflow;
