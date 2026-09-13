import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  DexieProduct,
  DexieRawMaterial,
  DexieProductIngredient,
  migrateLegacyFichesAndFinishedGoodsToProducts,
  validateRecipeIngredients
} from '../../db/database';
import { SAMPLE_SEMI_FINISHED_GOODS } from '../../db/dbSeeder';
import {
  ChefHat,
  Scale,
  DollarSign,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Copy,
  Save,
  TrendingUp,
  Layers,
  RefreshCw,
  FileText,
  PieChart,
  ArrowRight,
  Info,
  Package,
  Sliders,
  Check,
  X,
  SlidersHorizontal,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FicheTechniqueEditor } from './FicheTechniqueEditor';
import { IngredientsDiagnosticView } from './IngredientsDiagnosticView';

interface FicheTechniqueCOGSProps {
  initialProductId?: string;
  onNavigateToBakerOF?: (productId: string) => void;
}

const PRODUCTION_ROOM_LABELS: Record<string, { fr: string; color: string }> = {
  mille_feuille: { fr: 'Feuilletage & Mille-Feuille', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  viennoiserie: { fr: 'Viennoiserie & Briocherie', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  patisserie_fine: { fr: 'Pâtisseries Fines', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  gateaux_orientaux: { fr: 'Gâteaux Orientaux & Miel', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  gateaux_secs: { fr: 'Gâteaux Secs & Biscuits', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  piece_montee: { fr: 'Pièces Montées & Entremets', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  trompe_oeil: { fr: 'Trompe-l’œil & Créations', color: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const FicheTechniqueCOGS: React.FC<FicheTechniqueCOGSProps> = ({
  initialProductId,
  onNavigateToBakerOF
}) => {
  // --------------------------------------------------------------------------
  // 1. Live Queries from Dexie.js (Single Source of Truth)
  // --------------------------------------------------------------------------
  const liveProducts = useLiveQuery(async () => {
    const all = await db.products.toArray();
    // Filter finished goods or products with technical recipes
    return all.filter(
      (p) =>
        p.type === 'finished_good' ||
        p.type === 'produit_fini' ||
        (p.ingredients && p.ingredients.length > 0) ||
        (p.ficheTechnique && p.ficheTechnique.length > 0)
    );
  }, []);

  const liveRawMaterials = useLiveQuery(async () => {
    return await db.raw_materials.toArray();
  }, []);

  const liveSemiFinished = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all.filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini');
  }, []);

  // Ensure semi-finished products (bases) exist in db.products
  useEffect(() => {
    const ensureSemiFinishedSeeded = async () => {
      try {
        const all = await db.products.toArray();
        const sfCount = all.filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini').length;
        if (sfCount === 0) {
          await db.products.bulkPut(SAMPLE_SEMI_FINISHED_GOODS);
        }
      } catch (e) {
        console.warn('[FicheTechniqueCOGS] Auto-seed semi-finished warning:', e);
      }
    };
    ensureSemiFinishedSeeded();
  }, []);

  // --------------------------------------------------------------------------
  // 2. Component State
  // --------------------------------------------------------------------------
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [viewMode, setViewMode] = useState<'ADVANCED' | 'STUDIO_EDITOR' | 'DIAGNOSTIC'>('ADVANCED');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Modal State for New Product creation
  const [showNewProductModal, setShowNewProductModal] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCode, setNewProdCode] = useState<string>('');
  const [newProdRoom, setNewProdRoom] = useState<string>('patisserie_fine');
  const [newProdCategory, setNewProdCategory] = useState<string>('Pâtisseries Fines');
  const [newProdYield, setNewProdYield] = useState<number>(50);
  const [newProdUnit, setNewProdUnit] = useState<string>('pièces');
  const [newProdSellingPrice, setNewProdSellingPrice] = useState<number>(350);

  // Active Working Draft State for Selected Product
  const [draftProduct, setDraftProduct] = useState<DexieProduct | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Add Ingredient Form State (Raw Materials + Semi-Finished)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [ingredientDosage, setIngredientDosage] = useState<string>('');
  const [ingredientUnit, setIngredientUnit] = useState<string>('kg');
  const [ingredientTypeFilter, setIngredientTypeFilter] = useState<'ALL' | 'RAW_MATERIAL' | 'SEMI_FINISHED'>('ALL');
  const [materialSearch, setMaterialSearch] = useState<string>('');

  // Target Margin calculator helper state
  const [targetMarginPercent, setTargetMarginPercent] = useState<number>(65);

  // Fast Unified Component Lookup Map (linking db.raw_materials AND db.products semi-finis)
  const componentLookupMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        cost: number;
        unit: string;
        name: string;
        stock: number;
        type: 'RAW_MATERIAL' | 'SEMI_FINISHED';
        category: string;
        code?: string;
      }
    >();

    if (liveRawMaterials) {
      liveRawMaterials.forEach((rm) => {
        const cost = rm.costPerUnit || rm.unitCost || rm.currentAvgCost || rm.pamp || 0;
        const data = {
          id: rm.id,
          cost,
          unit: rm.unit || 'kg',
          name: rm.name,
          stock: rm.currentStock ?? rm.stockQuantity ?? 0,
          type: 'RAW_MATERIAL' as const,
          category: rm.category || 'Matières Premières',
          code: rm.code
        };
        map.set(rm.id, data);
        map.set(rm.name.toLowerCase().trim(), data);
      });
    }

    if (liveSemiFinished) {
      liveSemiFinished.forEach((sf) => {
        const cost = sf.cogsUnitCost || sf.costPrice || sf.unitCost || 0;
        const data = {
          id: sf.id,
          cost,
          unit: sf.batchUnit || sf.unit || 'kg',
          name: sf.name,
          stock: sf.currentStock ?? 0,
          type: 'SEMI_FINISHED' as const,
          category: sf.category || 'Bases & Semi-Finis',
          code: sf.code
        };
        map.set(sf.id, data);
        map.set(sf.name.toLowerCase().trim(), data);
      });
    }

    return map;
  }, [liveRawMaterials, liveSemiFinished]);

  // Alias for backward-compatibility with existing selectors and calculations
  const rawMaterialCostMap = componentLookupMap;

  // Sync initial product selection
  useEffect(() => {
    if (liveProducts && liveProducts.length > 0) {
      if (!selectedProductId || !liveProducts.some((p) => p.id === selectedProductId)) {
        const target = initialProductId && liveProducts.some((p) => p.id === initialProductId)
          ? initialProductId
          : liveProducts[0].id;
        setSelectedProductId(target);
      }
    }
  }, [liveProducts, selectedProductId, initialProductId]);

  // Load selected product into draft state
  useEffect(() => {
    if (!selectedProductId || !liveProducts) return;
    const found = liveProducts.find((p) => p.id === selectedProductId);
    if (found) {
      // Normalize ingredients with real-time costs from raw materials table
      const sourceIngredients = found.ingredients || found.ficheTechnique || [];
      const updatedIngredients: DexieProductIngredient[] = sourceIngredients.map((ing) => {
        const matInfo = rawMaterialCostMap.get(ing.rawMaterialId) || rawMaterialCostMap.get(ing.name.toLowerCase().trim());
        const liveCost = matInfo && matInfo.cost > 0 ? matInfo.cost : (ing.unitCost || 0);
        const qty = Number(ing.quantityPerBatch || 0);
        return {
          rawMaterialId: ing.rawMaterialId,
          name: ing.name,
          quantityPerBatch: qty,
          unit: ing.unit || matInfo?.unit || 'kg',
          category: ing.category || 'Matières Premières',
          unitCost: liveCost,
          totalCost: Number((qty * liveCost).toFixed(2))
        };
      });

      const totalBatchCost = updatedIngredients.reduce((sum, item) => sum + (item.totalCost || 0), 0);
      const yieldPerBatch = Number(found.yieldPerBatch || 50);
      const cogsUnitCost = yieldPerBatch > 0 ? Number((totalBatchCost / yieldPerBatch).toFixed(2)) : 0;
      const sellingPrice = Number(found.sellingPrice || found.price || 0);
      const marginAmount = Number((sellingPrice - cogsUnitCost).toFixed(2));
      const marginPercentage = sellingPrice > 0 ? Number(((marginAmount / sellingPrice) * 100).toFixed(2)) : 0;

      setDraftProduct({
        ...found,
        yieldPerBatch,
        batchUnit: found.batchUnit || found.unit || 'pièces',
        sellingPrice,
        price: sellingPrice,
        totalBatchCost: Number(totalBatchCost.toFixed(2)),
        cogsUnitCost,
        costPrice: cogsUnitCost,
        marginAmount,
        marginPercentage,
        ingredients: updatedIngredients,
        ficheTechnique: updatedIngredients
      });
      setIsDirty(false);
    }
  }, [selectedProductId, liveProducts, rawMaterialCostMap]);

  // --------------------------------------------------------------------------
  // 3. Computed COGS & Dynamic Metrics
  // --------------------------------------------------------------------------
  const cogsMetrics = useMemo(() => {
    if (!draftProduct) {
      return {
        totalBatchCost: 0,
        cogsUnitCost: 0,
        sellingPrice: 0,
        marginAmount: 0,
        marginPercentage: 0,
        pricingMultiplier: 0,
        suggestedPriceAtTargetMargin: 0
      };
    }

    const totalBatchCost = (draftProduct.ingredients || []).reduce((acc, ing) => {
      const qty = Number(ing.quantityPerBatch) || 0;
      const cost = Number(ing.unitCost) || 0;
      return acc + (qty * cost);
    }, 0);

    const yieldQty = Math.max(1, Number(draftProduct.yieldPerBatch) || 1);
    const cogsUnitCost = totalBatchCost / yieldQty;
    const sellingPrice = Number(draftProduct.sellingPrice || draftProduct.price || 0);
    const marginAmount = sellingPrice - cogsUnitCost;
    const marginPercentage = sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
    const pricingMultiplier = cogsUnitCost > 0 ? sellingPrice / cogsUnitCost : 0;

    // Target margin calculation: sellingPrice = cogsUnitCost / (1 - targetMargin / 100)
    const marginRatio = (100 - targetMarginPercent) / 100;
    const suggestedPriceAtTargetMargin = marginRatio > 0 ? Math.round((cogsUnitCost / marginRatio) / 5) * 5 : 0;

    return {
      totalBatchCost: Number(totalBatchCost.toFixed(2)),
      cogsUnitCost: Number(cogsUnitCost.toFixed(2)),
      sellingPrice: Number(sellingPrice.toFixed(2)),
      marginAmount: Number(marginAmount.toFixed(2)),
      marginPercentage: Number(marginPercentage.toFixed(2)),
      pricingMultiplier: Number(pricingMultiplier.toFixed(2)),
      suggestedPriceAtTargetMargin
    };
  }, [draftProduct, targetMarginPercent]);

  // --------------------------------------------------------------------------
  // 4. Ingredient Management Handlers
  // --------------------------------------------------------------------------
  const handleAddIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftProduct) return;

    const dosageNum = parseFloat(ingredientDosage);
    if (!selectedMaterialId || isNaN(dosageNum) || dosageNum <= 0) {
      return;
    }

    const itemInfo = componentLookupMap.get(selectedMaterialId);
    if (!itemInfo) return;

    const unitCost = Number(itemInfo.cost || 0);
    const totalCost = Number((dosageNum * unitCost).toFixed(2));

    const existingIndex = (draftProduct.ingredients || []).findIndex(
      (ing) => ing.rawMaterialId === selectedMaterialId
    );

    let updatedIngredients: DexieProductIngredient[];

    if (existingIndex >= 0) {
      // Increment dosage
      updatedIngredients = [...(draftProduct.ingredients || [])];
      const prev = updatedIngredients[existingIndex];
      const newQty = Number((prev.quantityPerBatch + dosageNum).toFixed(3));
      updatedIngredients[existingIndex] = {
        ...prev,
        quantityPerBatch: newQty,
        unitCost,
        totalCost: Number((newQty * unitCost).toFixed(2)),
        type: itemInfo.type
      };
    } else {
      // Add new ingredient row
      const newIng: DexieProductIngredient = {
        rawMaterialId: itemInfo.id,
        name: itemInfo.name,
        quantityPerBatch: dosageNum,
        unit: ingredientUnit || itemInfo.unit || 'kg',
        category: itemInfo.category || (itemInfo.type === 'SEMI_FINISHED' ? 'Bases & Semi-Finis' : 'Matières Premières'),
        unitCost,
        totalCost,
        type: itemInfo.type
      };
      updatedIngredients = [...(draftProduct.ingredients || []), newIng];
    }

    setDraftProduct({
      ...draftProduct,
      ingredients: updatedIngredients,
      ficheTechnique: updatedIngredients
    });
    setIsDirty(true);

    // Reset input fields
    setSelectedMaterialId('');
    setIngredientDosage('');
    setMaterialSearch('');
  };

  const handleUpdateIngredientQuantity = (rawMaterialId: string, newQtyString: string) => {
    if (!draftProduct) return;
    const qty = parseFloat(newQtyString);
    if (isNaN(qty) || qty < 0) return;

    const updated = (draftProduct.ingredients || []).map((ing) => {
      if (ing.rawMaterialId === rawMaterialId) {
        const cost = ing.unitCost || 0;
        return {
          ...ing,
          quantityPerBatch: qty,
          totalCost: Number((qty * cost).toFixed(2))
        };
      }
      return ing;
    });

    setDraftProduct({
      ...draftProduct,
      ingredients: updated,
      ficheTechnique: updated
    });
    setIsDirty(true);
  };

  const handleRemoveIngredient = (rawMaterialId: string) => {
    if (!draftProduct) return;
    const updated = (draftProduct.ingredients || []).filter(
      (ing) => ing.rawMaterialId !== rawMaterialId
    );
    setDraftProduct({
      ...draftProduct,
      ingredients: updated,
      ficheTechnique: updated
    });
    setIsDirty(true);
  };

  // --------------------------------------------------------------------------
  // 5. Database Save Operations (Single Source of Truth: db.products)
  // --------------------------------------------------------------------------
  const handleSaveToDatabase = async () => {
    if (!draftProduct) return;

    // Strict UI validation against db.raw_materials
    const rawMaterialsList = await db.raw_materials.toArray();
    const validation = validateRecipeIngredients(draftProduct.ingredients || [], rawMaterialsList);
    if (!validation.isValid) {
      alert(
        `🚨 Validation Fiche Technique Échouée :\n\n` +
        validation.errors.join('\n') +
        `\n\nVeuillez sélectionner des matières premières valides depuis db.raw_materials.`
      );
      return;
    }

    try {
      const yieldPerBatch = Number(draftProduct.yieldPerBatch) || 50;
      const sellingPrice = Number(draftProduct.sellingPrice || draftProduct.price || 0);
      const totalBatchCost = cogsMetrics.totalBatchCost;
      const cogsUnitCost = cogsMetrics.cogsUnitCost;
      const marginAmount = cogsMetrics.marginAmount;
      const marginPercentage = cogsMetrics.marginPercentage;

      const recordToSave: DexieProduct = {
        ...draftProduct,
        yieldPerBatch,
        batchUnit: draftProduct.batchUnit || 'pièces',
        sellingPrice,
        price: sellingPrice,
        totalBatchCost,
        cogsUnitCost,
        costPrice: cogsUnitCost,
        marginAmount,
        marginPercentage,
        ingredients: draftProduct.ingredients || [],
        ficheTechnique: draftProduct.ingredients || [],
        type: 'finished_good',
        updatedAt: new Date().toISOString()
      };

      await db.products.put(recordToSave);
      setIsDirty(false);
      setSaveSuccessNotice(`✅ Fiche Technique "${recordToSave.name}" synchronisée dans db.products avec succès !`);

      setTimeout(() => {
        setSaveSuccessNotice(null);
      }, 4000);
    } catch (err) {
      console.error('[FicheTechniqueCOGS] Erreur lors de l’enregistrement dans db.products:', err);
      alert('Erreur lors de la sauvegarde dans db.products : ' + String(err));
    }
  };

  const handleCreateNewProduct = async () => {
    if (!newProdName.trim()) {
      alert('Veuillez entrer un nom pour le produit fini.');
      return;
    }

    const id = `prod_${newProdName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const code = newProdCode.trim() || `PF-${Math.floor(100 + Math.random() * 900)}`;

    const newGood: DexieProduct = {
      id,
      code,
      name: newProdName.trim(),
      category: newProdCategory,
      type: 'finished_good',
      roomId: newProdRoom,
      unit: newProdUnit,
      batchUnit: newProdUnit,
      yieldPerBatch: Number(newProdYield) || 50,
      price: Number(newProdSellingPrice) || 350,
      sellingPrice: Number(newProdSellingPrice) || 350,
      costPrice: 0,
      cogsUnitCost: 0,
      totalBatchCost: 0,
      marginAmount: Number(newProdSellingPrice) || 350,
      marginPercentage: 100,
      currentStock: 0,
      minStockAlert: 10,
      storeId: 'lab_central',
      storeName: 'Laboratoire Central',
      barcode: `613000${Math.floor(1000 + Math.random() * 9000)}`,
      isActive: true,
      updatedAt: new Date().toISOString(),
      description: '',
      instructions: '',
      ingredients: [],
      ficheTechnique: []
    };

    await db.products.put(newGood);
    setShowNewProductModal(false);
    setSelectedProductId(id);

    // Reset modal form
    setNewProdName('');
    setNewProdCode('');
    setNewProdYield(50);
    setNewProdSellingPrice(350);
  };

  const handleDuplicateProduct = async () => {
    if (!draftProduct) return;
    const duplicatedName = `${draftProduct.name} (Copie)`;
    const newId = `prod_${duplicatedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newCode = `${draftProduct.code || 'PF'}-CP`;

    const duplicated: DexieProduct = {
      ...draftProduct,
      id: newId,
      code: newCode,
      name: duplicatedName,
      updatedAt: new Date().toISOString()
    };

    await db.products.put(duplicated);
    setSelectedProductId(newId);
    setSaveSuccessNotice(`Fiche dupliquée avec succès : "${duplicatedName}"`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateLegacyFichesAndFinishedGoodsToProducts();
      setSaveSuccessNotice(`Migration terminée : ${result.migratedCount} nouvelles fiches, ${result.updatedCount} mises à jour (${result.totalFinishedGoods} produits finis au total).`);
      setTimeout(() => setSaveSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Migration error:', err);
    } finally {
      setIsMigrating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --------------------------------------------------------------------------
  // 6. Filtered Lists
  // --------------------------------------------------------------------------
  const filteredProducts = useMemo(() => {
    if (!liveProducts) return [];
    return liveProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRoom =
        selectedRoomFilter === 'all' || p.roomId === selectedRoomFilter;

      return matchesSearch && matchesRoom;
    });
  }, [liveProducts, searchTerm, selectedRoomFilter]);

  const filteredRawMaterials = useMemo(() => {
    if (!liveRawMaterials) return [];
    if (!materialSearch.trim()) return liveRawMaterials.slice(0, 30);
    const q = materialSearch.toLowerCase().trim();
    return liveRawMaterials
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.code && m.code.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [liveRawMaterials, materialSearch]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header & Context Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Fiches Techniques & Calculateur COGS
              </h1>
              <p className="text-sm text-stone-500">
                Source unique de vérité (<code className="text-amber-700 font-mono text-xs bg-amber-50 px-1 py-0.5 rounded">db.products</code>) pour les recettes, rendements et coûts de revient.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* View Mode Toggle: Detailed A4 Fiche vs Studio Recipe Editor */}
          <div className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('ADVANCED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'ADVANCED'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vue Fiche & Impression
            </button>
            <button
              type="button"
              onClick={() => setViewMode('STUDIO_EDITOR')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                viewMode === 'STUDIO_EDITOR'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Éditeur Recette (Studio)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DIAGNOSTIC')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                viewMode === 'DIAGNOSTIC'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-stone-600 hover:text-indigo-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Diagnostic Ingrédients vs Stock</span>
            </button>
          </div>

          <button
            onClick={handleRunMigration}
            disabled={isMigrating}
            title="Consolider et synchroniser les anciennes fiches avec db.products"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin text-amber-600' : ''}`} />
            {isMigrating ? 'Migration en cours...' : 'Consolider Données'}
          </button>

          <button
            onClick={() => setShowNewProductModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nouveau Produit Fini
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {saveSuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-medium shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
            <button
              onClick={() => setSaveSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conditional Rendering: Diagnostic vs Studio Recipe Editor vs Detailed View */}
      {viewMode === 'DIAGNOSTIC' ? (
        <IngredientsDiagnosticView onClose={() => setViewMode('ADVANCED')} />
      ) : viewMode === 'STUDIO_EDITOR' ? (
        <FicheTechniqueEditor
          initialProductId={selectedProductId}
          onSaved={(prod) => {
            setSelectedProductId(prod.id);
            setSaveSuccessNotice(`Fiche technique "${prod.name}" synchronisée dans db.products.`);
          }}
          onClose={() => setViewMode('ADVANCED')}
        />
      ) : (
      /* Main Grid: Left Master List / Right Detail Editor */
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Master Finished Goods Catalog (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Catalogue Produits Finis ({filteredProducts.length})
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Room Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedRoomFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedRoomFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Tous
              </button>
              {Object.entries(PRODUCTION_ROOM_LABELS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedRoomFilter(key)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedRoomFilter === key
                      ? 'bg-amber-700 text-white font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {info.fr.split('&')[0].trim()}
                </button>
              ))}
            </div>

            {/* Product Cards List */}
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-sm">
                  Aucun produit fini trouvé.
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  const roomConfig = PRODUCTION_ROOM_LABELS[prod.roomId || 'patisserie_fine'] || {
                    fr: prod.category || 'Atelier',
                    color: 'bg-stone-100 text-stone-700 border-stone-300'
                  };

                  const unitCost = Number(prod.cogsUnitCost || prod.costPrice || 0);
                  const sellingPrice = Number(prod.sellingPrice || prod.price || 0);
                  const marginPct = Number(prod.marginPercentage || 0);

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        if (isDirty) {
                          if (window.confirm('Vous avez des modifications non enregistrées. Voulez-vous changer de produit ?')) {
                            setSelectedProductId(prod.id);
                          }
                        } else {
                          setSelectedProductId(prod.id);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-400'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-mono text-stone-500 font-semibold">
                            {prod.code || 'PF'}
                          </span>
                          <h3 className={`text-sm font-bold leading-tight ${isSelected ? 'text-amber-950' : 'text-stone-900'}`}>
                            {prod.name}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${roomConfig.color}`}>
                          {roomConfig.fr.split('&')[0].trim()}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <div className="text-stone-500">
                          Rendement : <span className="font-semibold text-stone-800">{prod.yieldPerBatch || 50} {prod.batchUnit || 'pièces'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-stone-400 font-medium">Revient:</span>
                          <span className="font-bold text-stone-800">{unitCost > 0 ? `${unitCost.toFixed(1)} DZD` : '—'}</span>
                        </div>
                      </div>

                      {sellingPrice > 0 && (
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">Prix vente : <span className="font-semibold text-stone-700">{sellingPrice} DZD</span></span>
                          <span className={`px-1.5 py-0.2 rounded font-semibold ${
                            marginPct >= 60
                              ? 'bg-emerald-100 text-emerald-800'
                              : marginPct >= 40
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {marginPct > 0 ? `${marginPct.toFixed(0)}% marge` : '0%'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Fiche Technique & COGS Engine (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!draftProduct ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-400 space-y-3">
              <ChefHat className="w-12 h-12 mx-auto text-stone-300" />
              <p className="text-base font-medium text-stone-600">Sélectionnez un produit fini dans la liste pour afficher sa fiche technique.</p>
            </div>
          ) : (
            <>
              {/* Product Info & Specs Card */}
              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {draftProduct.code || 'PF'}
                      </span>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                        {draftProduct.name}
                      </h2>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      Atelier : <span className="font-medium text-stone-700">{PRODUCTION_ROOM_LABELS[draftProduct.roomId || 'patisserie_fine']?.fr || draftProduct.category}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {onNavigateToBakerOF && (
                      <button
                        onClick={() => onNavigateToBakerOF(draftProduct.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Lancer OF Boulanger
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Imprimer Fiche
                    </button>

                    <button
                      onClick={handleDuplicateProduct}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Dupliquer
                    </button>
                  </div>
                </div>

                {/* Editable Parameters Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Rendement par Tour (Nominal)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={draftProduct.yieldPerBatch || 50}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setDraftProduct({ ...draftProduct, yieldPerBatch: val });
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                      />
                      <input
                        type="text"
                        value={draftProduct.batchUnit || 'pièces'}
                        onChange={(e) => {
                          setDraftProduct({ ...draftProduct, batchUnit: e.target.value, unit: e.target.value });
                          setIsDirty(true);
                        }}
                        placeholder="Unité"
                        className="w-24 px-2 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg text-center"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Prix de Vente Conseillé (DZD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={draftProduct.sellingPrice || draftProduct.price || 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          setDraftProduct({ ...draftProduct, sellingPrice: val, price: val });
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-1.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-stone-900"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-stone-400">DZD</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Atelier de Fabrication
                    </label>
                    <select
                      value={draftProduct.roomId || 'patisserie_fine'}
                      onChange={(e) => {
                        setDraftProduct({ ...draftProduct, roomId: e.target.value });
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      {Object.entries(PRODUCTION_ROOM_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.fr}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-600 mb-1">
                      Catégorie Commerciale
                    </label>
                    <input
                      type="text"
                      value={draftProduct.category || 'Pâtisseries Fines'}
                      onChange={(e) => {
                        setDraftProduct({ ...draftProduct, category: e.target.value });
                        setIsDirty(true);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                    />
                  </div>
                </div>

                {/* Financial COGS KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-stone-400" />
                      Coût Total par Tour
                    </span>
                    <p className="text-lg font-bold text-stone-900 font-mono">
                      {cogsMetrics.totalBatchCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-stone-500">DZD</span>
                    </p>
                    <span className="text-[10px] text-stone-400 block">
                      Pour {draftProduct.yieldPerBatch || 50} {draftProduct.batchUnit || 'pièces'}
                    </span>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      Coût Revient Unitaire
                    </span>
                    <p className="text-lg font-bold text-amber-950 font-mono">
                      {cogsMetrics.cogsUnitCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-amber-700">DZD</span>
                    </p>
                    <span className="text-[10px] text-amber-700 block">
                      COGS Matière Première
                    </span>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                      Marge Brute / Unité
                    </span>
                    <p className="text-lg font-bold text-stone-900 font-mono">
                      {cogsMetrics.marginAmount >= 0 ? `+${cogsMetrics.marginAmount.toFixed(2)}` : cogsMetrics.marginAmount.toFixed(2)} <span className="text-xs font-normal text-stone-500">DZD</span>
                    </p>
                    <span className="text-[10px] text-stone-400 block">
                      Multiplicateur : x{cogsMetrics.pricingMultiplier}
                    </span>
                  </div>

                  <div className={`border rounded-xl p-3.5 space-y-1 ${
                    cogsMetrics.marginPercentage >= 60
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : cogsMetrics.marginPercentage >= 40
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}>
                    <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                      <span>Taux de Marge</span>
                      <span className="text-xs font-bold font-mono">{cogsMetrics.marginPercentage.toFixed(1)}%</span>
                    </span>
                    <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full ${
                          cogsMetrics.marginPercentage >= 60
                            ? 'bg-emerald-600'
                            : cogsMetrics.marginPercentage >= 40
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, cogsMetrics.marginPercentage))}%` }}
                      />
                    </div>
                    <span className="text-[10px] block opacity-80 pt-0.5">
                      {cogsMetrics.marginPercentage >= 60 ? 'Marge saine (≥ 60%)' : cogsMetrics.marginPercentage >= 40 ? 'Marge modérée' : 'Marge critique (< 40%)'}
                    </span>
                  </div>
                </div>

                {/* Target Margin Price Suggester */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Pour viser <strong>{targetMarginPercent}% de marge</strong>, le prix de vente suggéré est de{' '}
                      <strong className="text-stone-900 font-mono text-sm">{cogsMetrics.suggestedPriceAtTargetMargin} DZD</strong>.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500 font-medium">Cible :</span>
                    {[55, 60, 65, 70].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setTargetMarginPercent(pct)}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                          targetMarginPercent === pct
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setDraftProduct({
                          ...draftProduct,
                          sellingPrice: cogsMetrics.suggestedPriceAtTargetMargin,
                          price: cogsMetrics.suggestedPriceAtTargetMargin
                        });
                        setIsDirty(true);
                      }}
                      className="ml-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded transition-colors cursor-pointer"
                    >
                      Appliquer
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Ingredient Manager (La Formule de la Fiche Technique) */}
              <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Composition de la Fiche Technique (Dosage pour 1 Tour)
                  </h3>
                  <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
                    {draftProduct.ingredients?.length || 0} matière(s) première(s)
                  </span>
                </div>

                {/* Add Ingredient Bar */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                      Ajouter une Matière Première ou Semi-Fini à la Recette
                    </span>

                    {/* Filter Pills */}
                    <div className="inline-flex rounded-lg bg-stone-200/80 p-0.5 text-xs font-medium self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setIngredientTypeFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          ingredientTypeFilter === 'ALL'
                            ? 'bg-white text-stone-900 shadow-sm font-bold'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Tous (MP + SF)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredientTypeFilter('RAW_MATERIAL')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                          ingredientTypeFilter === 'RAW_MATERIAL'
                            ? 'bg-emerald-600 text-white shadow-sm font-bold'
                            : 'text-stone-600 hover:text-emerald-800'
                        }`}
                      >
                        🌱 Matières 1ères ({liveRawMaterials?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredientTypeFilter('SEMI_FINISHED')}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                          ingredientTypeFilter === 'SEMI_FINISHED'
                            ? 'bg-indigo-600 text-white shadow-sm font-bold'
                            : 'text-stone-600 hover:text-indigo-800'
                        }`}
                      >
                        ⚡ Semi-Finis ({liveSemiFinished?.length || 0})
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-xs font-medium text-stone-600">
                        Sélectionner l'ingrédient (Stock Matières Premières & Semi-Finis)
                      </label>
                      <select
                        value={selectedMaterialId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedMaterialId(val);
                          const matched = componentLookupMap.get(val);
                          if (matched) {
                            setIngredientUnit(matched.unit || 'kg');
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium"
                      >
                        <option value="">-- Choisir une matière première ou un produit semi-fini --</option>
                        
                        {(ingredientTypeFilter === 'ALL' || ingredientTypeFilter === 'RAW_MATERIAL') && (
                          <optgroup label="🌱 Matières Premières (Stock Matières Premières)">
                            {liveRawMaterials?.map((mat) => {
                              const cost = mat.costPerUnit || mat.unitCost || mat.currentAvgCost || mat.pamp || 0;
                              const stock = mat.currentStock ?? mat.stockQuantity ?? 0;
                              const formattedCost = cost > 0 ? `${cost.toFixed(2)} DZD/${mat.unit}` : `0 DZD/${mat.unit}`;
                              return (
                                <option key={mat.id} value={mat.id}>
                                  {mat.name} (Stock: {stock} {mat.unit}) — {formattedCost}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}

                        {(ingredientTypeFilter === 'ALL' || ingredientTypeFilter === 'SEMI_FINISHED') && (
                          <optgroup label="⚡ Produits Semi-Finis & Bases (Stock Semi-Finis)">
                            {liveSemiFinished?.map((sf) => {
                              const cost = sf.cogsUnitCost || sf.costPrice || sf.unitCost || 0;
                              const u = sf.batchUnit || sf.unit || 'kg';
                              const stock = sf.currentStock ?? 0;
                              return (
                                <option key={sf.id} value={sf.id}>
                                  ⭐ {sf.name} ({cost > 0 ? `${cost.toFixed(2)} DZD/${u}` : `0 DZD/${u}`} - Stock: {stock} {u})
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium text-stone-600">
                        Dosage ({ingredientUnit})
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          placeholder="Ex: 1.250"
                          value={ingredientDosage}
                          onChange={(e) => setIngredientDosage(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                        />
                        <span className="text-xs font-bold text-stone-500 w-10 text-center">
                          {ingredientUnit}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={() => handleAddIngredient()}
                        disabled={!selectedMaterialId || !ingredientDosage}
                        className="w-full py-2 px-4 text-sm font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter à la Recette
                      </button>
                    </div>
                  </div>

                  {/* Selected Item Stock & Cost Pill Preview */}
                  {selectedMaterialId && (() => {
                    const sel = componentLookupMap.get(selectedMaterialId);
                    if (!sel) return null;
                    const isSf = sel.type === 'SEMI_FINISHED';
                    const isOut = sel.stock <= 0;
                    return (
                      <div className={`px-3 py-2 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border ${
                        isSf
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            isSf ? 'bg-indigo-200 text-indigo-800' : 'bg-emerald-200 text-emerald-800'
                          }`}>
                            {isSf ? '⚡ SEMI-FINI (BASE)' : '🌱 MATIÈRE PREMIÈRE'}
                          </span>
                          <span className="font-semibold">{sel.name}</span>
                          {sel.code && <span className="text-[11px] text-stone-500 font-mono">[{sel.code}]</span>}
                        </div>
                        <div className="flex items-center gap-3 font-mono">
                          <span>
                            Stock disponible : <strong className={isOut ? 'text-rose-600 font-bold' : 'text-stone-900 font-bold'}>{sel.stock} {sel.unit}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {isSf ? 'Coût COGS' : 'PAMP'} : <strong className="text-stone-900 font-bold">{sel.cost.toFixed(2)} DZD/{sel.unit}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Ingredients Table */}
                <div className="overflow-x-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-100 text-stone-700 text-xs uppercase font-semibold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Ingrédient / Base (Matière Première ou Semi-Fini)</th>
                        <th className="py-3 px-4 text-right">Dosage / Tour</th>
                        <th className="py-3 px-4 text-right">Prix Unitaire</th>
                        <th className="py-3 px-4 text-right">Coût Ingrédient</th>
                        <th className="py-3 px-4 w-32 text-center">Part du Coût</th>
                        <th className="py-3 px-4 w-16 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {(!draftProduct.ingredients || draftProduct.ingredients.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-stone-400 text-sm">
                            Aucun ingrédient dans cette fiche technique. Ajoutez des matières premières ou semi-finis ci-dessus.
                          </td>
                        </tr>
                      ) : (
                        draftProduct.ingredients.map((ing, idx) => {
                          const totalBatchCost = cogsMetrics.totalBatchCost;
                          const costShare = totalBatchCost > 0 ? ((ing.totalCost || 0) / totalBatchCost) * 100 : 0;
                          const matInfo = componentLookupMap.get(ing.rawMaterialId) || componentLookupMap.get(ing.name.toLowerCase().trim());
                          const stock = matInfo?.stock ?? 0;
                          const isLowStock = matInfo && stock <= (ing.quantityPerBatch * 2);
                          const isOutOfStock = matInfo && stock <= 0;
                          const isSemiFinished = ing.type === 'SEMI_FINISHED' || matInfo?.type === 'SEMI_FINISHED' || ing.category?.toLowerCase().includes('semi') || ing.category?.toLowerCase().includes('base');

                          return (
                            <tr key={`${ing.rawMaterialId}_${idx}`} className="hover:bg-stone-50/70 transition-colors">
                              <td className="py-3 px-4 text-center font-mono text-xs text-stone-400">
                                {idx + 1}
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-stone-900 flex items-center gap-2 flex-wrap">
                                    <span>{ing.name}</span>
                                    {isSemiFinished ? (
                                      <span className="text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        ⚡ Semi-Fini
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                        🌱 Matière 1ère
                                      </span>
                                    )}
                                    {isOutOfStock ? (
                                      <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
                                        Rupture stock (0 {ing.unit})
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                                        Stock bas ({stock} {ing.unit})
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-stone-500">
                                    <span>{ing.category || (isSemiFinished ? 'Bases & Semi-Finis' : 'Matières Premières')}</span>
                                    <span>•</span>
                                    <span>Stock en laboratoire : <strong className={isOutOfStock ? 'text-rose-600 font-bold' : isLowStock ? 'text-amber-600 font-bold' : 'text-emerald-700 font-bold'}>{stock} {ing.unit}</strong></span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={ing.quantityPerBatch}
                                    onChange={(e) => handleUpdateIngredientQuantity(ing.rawMaterialId, e.target.value)}
                                    className="w-24 px-2 py-1 text-right text-sm bg-stone-50 border border-stone-200 rounded font-semibold focus:bg-white focus:ring-1 focus:ring-amber-500"
                                  />
                                  <span className="text-xs text-stone-500 font-medium w-8 text-left">
                                    {ing.unit}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right font-mono text-stone-600">
                                {ing.unitCost ? `${ing.unitCost.toFixed(2)} DZD` : '0.00 DZD'}
                              </td>

                              <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                                {ing.totalCost ? `${ing.totalCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD` : '0.00 DZD'}
                              </td>

                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
                                    <span>{costShare.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-amber-600 h-full rounded-full"
                                      style={{ width: `${Math.min(100, costShare)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredient(ing.rawMaterialId)}
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Supprimer cet ingrédient"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {draftProduct.ingredients && draftProduct.ingredients.length > 0 && (
                      <tfoot className="bg-stone-50 font-bold border-t border-stone-200 text-stone-900">
                        <tr>
                          <td colSpan={2} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                            Total Tour ({draftProduct.yieldPerBatch} {draftProduct.batchUnit}) :
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {draftProduct.ingredients.reduce((acc, i) => acc + (i.quantityPerBatch || 0), 0).toFixed(3)} kg/L/unités
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-stone-500">—</td>
                          <td className="py-3 px-4 text-right font-mono text-base text-amber-900">
                            {cogsMetrics.totalBatchCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD
                          </td>
                          <td colSpan={2} className="py-3 px-4 text-center text-xs text-stone-500">
                            Revient : <strong>{cogsMetrics.cogsUnitCost.toFixed(2)} DZD / {draftProduct.batchUnit || 'pièce'}</strong>
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Instructions & Baking Technique */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Instructions Techniques & Protocole de Cuisson
                  </label>
                  <textarea
                    rows={3}
                    value={draftProduct.instructions || ''}
                    onChange={(e) => {
                      setDraftProduct({ ...draftProduct, instructions: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Protocole de fabrication : tourage, températures de sole, temps de pousse, finitions..."
                    className="w-full p-3 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Action Save Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-stone-200">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    {isDirty ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        Modifications non enregistrées dans db.products
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Check className="w-4 h-4" />
                        Synchronisé avec db.products
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSaveToDatabase}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all cursor-pointer ${
                      isDirty
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Enregistrer dans db.products
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Modal: New Finished Good Creation */}
      <AnimatePresence>
        {showNewProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-stone-200 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Nouveau Produit Fini & Fiche Technique
                  </h3>
                </div>
                <button
                  onClick={() => setShowNewProductModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nom du Produit Fini *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tartelette Framboise Pistache"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Code Référence
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: PF-TAR-09"
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Atelier / Chambre Lab
                    </label>
                    <select
                      value={newProdRoom}
                      onChange={(e) => setNewProdRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                    >
                      {Object.entries(PRODUCTION_ROOM_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.fr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Rendement / Tour
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newProdYield}
                      onChange={(e) => setNewProdYield(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-center font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Unité
                    </label>
                    <input
                      type="text"
                      value={newProdUnit}
                      onChange={(e) => setNewProdUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Prix Vente (DZD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={newProdSellingPrice}
                      onChange={(e) => setNewProdSellingPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-right font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewProduct}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Créer et Éditer la Fiche
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
