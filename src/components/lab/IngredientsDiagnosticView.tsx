import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  DexieProduct,
  DexieRawMaterial,
  DexieProductIngredient
} from '../../db/database';
import { saveRawMaterials, notifyToast } from '../../services/storage';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wrench,
  Search,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  FileText,
  Boxes,
  Layers,
  Sparkles,
  Link,
  Unlink,
  X
} from 'lucide-react';

interface IngredientsDiagnosticViewProps {
  onClose?: () => void;
  className?: string;
}

export interface OrphanedIngredientItem {
  productId: string;
  productName: string;
  productCode: string;
  productType: string;
  ingredientIndex: number;
  ingredientName: string;
  rawMaterialId: string;
  quantityPerBatch: number;
  unit: string;
  unitCost: number;
  isOrphaned: boolean;
  matchedMaterial: DexieRawMaterial | null;
  suggestedMatch: DexieRawMaterial | null;
}

export const IngredientsDiagnosticView: React.FC<IngredientsDiagnosticViewProps> = ({
  onClose,
  className = ''
}) => {
  // Live queries to Dexie tables
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const rawMaterials = useLiveQuery(() => db.raw_materials.toArray()) || [];

  // Filter & Search states
  const [filterMode, setFilterMode] = useState<'ALL' | 'ORPHANS_ONLY' | 'VALID_ONLY'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');

  // Interactive remap state per ingredient row: { [uniqueRowKey]: selectedRawMaterialId }
  const [manualRemapSelection, setManualRemapSelection] = useState<Record<string, string>>({});

  // Loading / processing states
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [fixSuccessMessage, setFixSuccessMessage] = useState<string | null>(null);

  // New Raw Material inline modal/form state
  const [showAddMaterialModal, setShowAddMaterialModal] = useState<boolean>(false);
  const [newMaterialName, setNewMaterialName] = useState<string>('');
  const [newMaterialUnit, setNewMaterialUnit] = useState<string>('kg');
  const [newMaterialCost, setNewMaterialCost] = useState<number>(100);
  const [newMaterialStock, setNewMaterialStock] = useState<number>(50);
  const [newMaterialCategory, setNewMaterialCategory] = useState<string>('Matières Premières');

  // Build lookups
  const rawMaterialIdMap = useMemo(() => {
    const map = new Map<string, DexieRawMaterial>();
    rawMaterials.forEach((rm) => {
      map.set(rm.id, rm);
    });
    return map;
  }, [rawMaterials]);

  const rawMaterialNameMap = useMemo(() => {
    const map = new Map<string, DexieRawMaterial>();
    rawMaterials.forEach((rm) => {
      const norm = rm.name.toLowerCase().trim();
      map.set(norm, rm);
    });
    return map;
  }, [rawMaterials]);

  // Analyze all ingredients across all products
  const analyzedIngredients = useMemo<OrphanedIngredientItem[]>(() => {
    const list: OrphanedIngredientItem[] = [];

    products.forEach((prod) => {
      const ings = prod.ingredients || prod.ficheTechnique || [];
      ings.forEach((ing, idx) => {
        const rawId = ing.rawMaterialId?.toString().trim() || '';
        const matched = rawMaterialIdMap.get(rawId) || null;
        const isOrphaned = !matched;

        // Try to find a suggested match by normalized name
        let suggested: DexieRawMaterial | null = null;
        if (isOrphaned && ing.name) {
          const normName = ing.name.toLowerCase().trim();
          suggested = rawMaterialNameMap.get(normName) || null;

          // If no exact name match, try substring or slug
          if (!suggested) {
            const found = rawMaterials.find((rm) => {
              const rmNorm = rm.name.toLowerCase().trim();
              return (
                rmNorm.includes(normName) ||
                normName.includes(rmNorm) ||
                rm.id.toLowerCase().includes(normName.replace(/[^a-z0-9]/g, '_'))
              );
            });
            if (found) suggested = found;
          }
        }

        list.push({
          productId: prod.id,
          productName: prod.name || 'Produit sans nom',
          productCode: prod.code || 'PF-000',
          productType: prod.type || 'finished_good',
          ingredientIndex: idx,
          ingredientName: ing.name || 'Ingrédient sans nom',
          rawMaterialId: rawId,
          quantityPerBatch: ing.quantityPerBatch || 0,
          unit: ing.unit || 'kg',
          unitCost: ing.unitCost || 0,
          isOrphaned,
          matchedMaterial: matched,
          suggestedMatch: suggested
        });
      });
    });

    return list;
  }, [products, rawMaterialIdMap, rawMaterialNameMap, rawMaterials]);

  // Usage count per raw material
  const rawMaterialUsageMap = useMemo(() => {
    const countMap = new Map<string, number>();
    analyzedIngredients.forEach((item) => {
      if (item.matchedMaterial) {
        const current = countMap.get(item.matchedMaterial.id) || 0;
        countMap.set(item.matchedMaterial.id, current + 1);
      }
    });
    return countMap;
  }, [analyzedIngredients]);

  // Metrics
  const totalProducts = products.length;
  const totalIngredients = analyzedIngredients.length;
  const orphanedCount = analyzedIngredients.filter((i) => i.isOrphaned).length;
  const validCount = totalIngredients - orphanedCount;
  const totalMaterials = rawMaterials.length;

  // Filtered ingredients list
  const filteredIngredients = useMemo(() => {
    return analyzedIngredients.filter((item) => {
      // Filter mode
      if (filterMode === 'ORPHANS_ONLY' && !item.isOrphaned) return false;
      if (filterMode === 'VALID_ONLY' && item.isOrphaned) return false;

      // Product filter
      if (selectedProductFilter !== 'ALL' && item.productId !== selectedProductFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchProd = item.productName.toLowerCase().includes(term);
        const matchIng = item.ingredientName.toLowerCase().includes(term);
        const matchId = item.rawMaterialId.toLowerCase().includes(term);
        if (!matchProd && !matchIng && !matchId) return false;
      }

      return true;
    });
  }, [analyzedIngredients, filterMode, selectedProductFilter, searchTerm]);

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  /**
   * Helper: recalculates COGS for a product given its updated ingredients
   */
  const recalculateProductCOGS = (
    prod: DexieProduct,
    newIngredients: DexieProductIngredient[]
  ): DexieProduct => {
    const totalBatchCost = newIngredients.reduce(
      (sum, ing) => sum + (ing.quantityPerBatch || 0) * (ing.unitCost || 0),
      0
    );
    const yieldBatch = prod.yieldPerBatch && prod.yieldPerBatch > 0 ? prod.yieldPerBatch : 1;
    const unitCost = Number((totalBatchCost / yieldBatch).toFixed(2));
    const sellingPrice = prod.sellingPrice || prod.price || 0;
    const marginAmount = Number((sellingPrice - unitCost).toFixed(2));
    const marginPercentage =
      sellingPrice > 0 ? Number((((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(2)) : 0;

    return {
      ...prod,
      ingredients: newIngredients,
      ficheTechnique: newIngredients,
      totalBatchCost: Number(totalBatchCost.toFixed(2)),
      unitCost,
      cogsUnitCost: unitCost,
      costPrice: unitCost,
      marginAmount,
      marginPercentage,
      updatedAt: new Date().toISOString()
    };
  };

  /**
   * Fix a single ingredient link
   */
  const handleFixSingleIngredient = async (
    item: OrphanedIngredientItem,
    targetRawMaterial: DexieRawMaterial
  ) => {
    try {
      const prod = await db.products.get(item.productId);
      if (!prod) return;

      const currentIngredients = [...(prod.ingredients || prod.ficheTechnique || [])];
      if (!currentIngredients[item.ingredientIndex]) return;

      const cost = targetRawMaterial.unitCost ?? targetRawMaterial.costPerUnit ?? targetRawMaterial.pamp ?? 0;

      currentIngredients[item.ingredientIndex] = {
        ...currentIngredients[item.ingredientIndex],
        rawMaterialId: targetRawMaterial.id,
        name: targetRawMaterial.name,
        unit: targetRawMaterial.unit || currentIngredients[item.ingredientIndex].unit || 'kg',
        unitCost: cost,
        totalCost: Number(
          ((currentIngredients[item.ingredientIndex].quantityPerBatch || 0) * cost).toFixed(2)
        ),
        type: 'RAW_MATERIAL'
      };

      const updatedProd = recalculateProductCOGS(prod, currentIngredients);
      await db.products.put(updatedProd);

      notifyToast({
        type: 'success',
        title: 'Liaison Réparée !',
        message: `"${item.ingredientName}" de "${prod.name}" est désormais lié à "${targetRawMaterial.name}" (${targetRawMaterial.id}).`
      });
    } catch (err: any) {
      console.error('Erreur lors de la réparation de lingrédient:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible de réparer cette liaison.'
      });
    }
  };

  /**
   * Create the missing raw material in db.raw_materials and link it immediately
   */
  const handleCreateMissingMaterial = async (item: OrphanedIngredientItem) => {
    try {
      const slug = item.ingredientName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');

      const newId = item.rawMaterialId && item.rawMaterialId.startsWith('rm_')
        ? item.rawMaterialId
        : `rm_${slug || Date.now()}`;

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const newCode = `MP-${randomSuffix}`;

      const newMat: DexieRawMaterial = {
        id: newId,
        code: newCode,
        name: item.ingredientName,
        category: 'Matières Premières',
        unit: item.unit || 'kg',
        currentStock: 50,
        stockQuantity: 50,
        unitCost: item.unitCost || 100,
        costPerUnit: item.unitCost || 100,
        pamp: item.unitCost || 100,
        currentAvgCost: item.unitCost || 100,
        minStockAlert: 10,
        storeId: 'lab_central',
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      // Add to Dexie table
      await db.raw_materials.put(newMat);

      // Also link to the product
      await handleFixSingleIngredient(item, newMat);

      // Synchronize with storage
      const allMaterials = await db.raw_materials.toArray();
      saveRawMaterials(
        allMaterials.map((m) => ({
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
          lastUpdated: m.updatedAt || new Date().toISOString()
        }))
      );

      notifyToast({
        type: 'success',
        title: 'Matière Première Créée & Reliée !',
        message: `La matière "${newMat.name}" a été ajoutée au stock et liée à la fiche technique.`
      });
    } catch (err: any) {
      console.error('Erreur lors de la création de la matière première:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible de créer la matière première.'
      });
    }
  };

  /**
   * Delete an orphaned ingredient from the product recipe
   */
  const handleDeleteOrphanedIngredient = async (item: OrphanedIngredientItem) => {
    if (
      !window.confirm(
        `Supprimer définitivement l'ingrédient "${item.ingredientName}" de la fiche technique "${item.productName}" ?`
      )
    ) {
      return;
    }

    try {
      const prod = await db.products.get(item.productId);
      if (!prod) return;

      const currentIngredients = [...(prod.ingredients || prod.ficheTechnique || [])];
      currentIngredients.splice(item.ingredientIndex, 1);

      const updatedProd = recalculateProductCOGS(prod, currentIngredients);
      await db.products.put(updatedProd);

      notifyToast({
        type: 'info',
        title: 'Ingrédient Supprimé',
        message: `"${item.ingredientName}" a été retiré de "${prod.name}".`
      });
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible de supprimer cet ingrédient.'
      });
    }
  };

  /**
   * Batch Auto-Fix: Automatically repairs all orphaned ingredients across all products using the unified cleanAndSyncRecipeIngredients engine
   */
  const handleAutoFixAllOrphans = async () => {
    const orphans = analyzedIngredients.filter((i) => i.isOrphaned);
    if (orphans.length === 0) {
      notifyToast({
        type: 'info',
        title: 'Aucun Orphelin',
        message: 'Toutes les fiches techniques sont déjà parfaitement reliées au stock de matières premières !'
      });
      return;
    }

    if (
      !window.confirm(
        `🚨 Diagnostic : ${orphans.length} ingrédient(s) orphelin(s) détecté(s).\n\nVoulez-vous lancer la réparation automatique intelligente ?\n\n• Si une matière première existe avec un nom similaire, le lien sera rétabli.\n• Si la matière première n'existe pas en stock, elle sera automatiquement créée et liée.`
      )
    ) {
      return;
    }

    setIsFixing(true);

    try {
      // Execute the centralized data consistency and migration engine
      const { cleanAndSyncRecipeIngredients } = await import('../../db/recipeMigrationService');
      const res = await cleanAndSyncRecipeIngredients();

      const msg = `✅ Réparation terminée : ${res.ingredientsRepaired} ingrédient(s) réparé(s) dans ${res.productsUpdated} fiche(s) technique(s) (${res.rawMaterialsCreated} matière(s) manquante(s) créée(s) en stock).`;
      setFixSuccessMessage(msg);

      notifyToast({
        type: 'success',
        title: 'Diagnostic & Réparation Terminés',
        message: msg
      });
    } catch (err: any) {
      console.error('Erreur lors de la réparation automatique:', err);
      notifyToast({
        type: 'error',
        title: 'Échec de la Réparation',
        message: err.message || 'Une erreur est survenue.'
      });
    } finally {
      setIsFixing(false);
    }
  };

  /**
   * Add a brand new material to db.raw_materials from the diagnostic panel
   */
  const handleAddNewMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;

    try {
      const slug = newMaterialName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');

      const newId = `rm_${slug || Date.now()}`;
      const newMat: DexieRawMaterial = {
        id: newId,
        code: `MP-${Math.floor(100 + Math.random() * 900)}`,
        name: newMaterialName.trim(),
        category: newMaterialCategory,
        unit: newMaterialUnit,
        currentStock: Number(newMaterialStock) || 0,
        stockQuantity: Number(newMaterialStock) || 0,
        unitCost: Number(newMaterialCost) || 0,
        costPerUnit: Number(newMaterialCost) || 0,
        pamp: Number(newMaterialCost) || 0,
        currentAvgCost: Number(newMaterialCost) || 0,
        minStockAlert: 10,
        storeId: 'lab_central',
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      await db.raw_materials.put(newMat);

      // Sync with storage cache
      const allMaterials = await db.raw_materials.toArray();
      saveRawMaterials(
        allMaterials.map((m) => ({
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
          lastUpdated: m.updatedAt || new Date().toISOString()
        }))
      );

      setShowAddMaterialModal(false);
      setNewMaterialName('');
      setNewMaterialCost(100);
      setNewMaterialStock(50);

      notifyToast({
        type: 'success',
        title: 'Matière Première Ajoutée',
        message: `"${newMat.name}" a été ajoutée dans db.raw_materials.`
      });
    } catch (err: any) {
      console.error('Erreur lors de lajout:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Impossible d\'ajouter la matière première.'
      });
    }
  };

  return (
    <div
      id="ingredients-diagnostic-view"
      className={`bg-stone-100/70 border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 ${className}`}
    >
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-900">
                  Diagnostic & Intégrité des Ingrédients
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded-md">
                  db.products ↔ db.raw_materials
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Comparaison côte à côte des ingrédients référencés dans les fiches techniques vs les matières premières réelles en stock.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Identify Orphans Button */}
          <button
            type="button"
            id="btn-identify-orphans"
            onClick={() => setFilterMode('ORPHANS_ONLY')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
              filterMode === 'ORPHANS_ONLY'
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
            title="Filtrer et afficher uniquement les ingrédients orphelins"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Identifier Orphelins</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                filterMode === 'ORPHANS_ONLY' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {orphanedCount}
            </span>
          </button>

          {/* Fix All Auto Button */}
          <button
            type="button"
            id="btn-fix-all-orphans"
            onClick={handleAutoFixAllOrphans}
            disabled={isFixing || orphanedCount === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Rétablir les correspondances ou créer les matières manquantes pour tous les orphelins"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isFixing ? 'animate-spin' : ''}`} />
            <span>{isFixing ? 'Réparation...' : 'Tout Réparer Automatiquement'}</span>
          </button>

          {/* New Material Button */}
          <button
            type="button"
            onClick={() => setShowAddMaterialModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Créer une nouvelle matière première dans db.raw_materials"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Matière Première</span>
          </button>

          {/* Close button if modal/overlay mode */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition"
              title="Fermer le diagnostic"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Success Banner (if any) */}
      {fixSuccessMessage && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-medium shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{fixSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFixSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. KPI Diagnostic Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Products */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-stone-400" /> Fiches Produits
          </span>
          <div className="text-xl font-black text-stone-900">{totalProducts}</div>
          <p className="text-[11px] text-stone-500">dans db.products</p>
        </div>

        {/* Total Ingredient Lines */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-stone-400" /> Ingrédients Totaux
          </span>
          <div className="text-xl font-black text-stone-900">{totalIngredients}</div>
          <p className="text-[11px] text-stone-500">lignes de recettes</p>
        </div>

        {/* Valid Linked */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Liaisons Valides
          </span>
          <div className="text-xl font-black text-emerald-700">{validCount}</div>
          <p className="text-[11px] text-emerald-600 font-medium">
            {totalIngredients > 0 ? `${Math.round((validCount / totalIngredients) * 100)}% liés` : '100%'}
          </p>
        </div>

        {/* Orphaned Ingredients */}
        <div
          onClick={() => setFilterMode(orphanedCount > 0 ? 'ORPHANS_ONLY' : 'ALL')}
          className={`p-3.5 rounded-xl border shadow-2xs space-y-1 cursor-pointer transition-all ${
            orphanedCount > 0
              ? 'bg-rose-50/80 border-rose-300 hover:bg-rose-100/70 ring-2 ring-rose-300/50'
              : 'bg-white border-stone-200'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
              orphanedCount > 0 ? 'text-rose-700' : 'text-stone-400'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${orphanedCount > 0 ? 'text-rose-600' : 'text-stone-400'}`} />
            Ingrédients Orphelins
          </span>
          <div className={`text-xl font-black ${orphanedCount > 0 ? 'text-rose-700' : 'text-stone-900'}`}>
            {orphanedCount}
          </div>
          <p className={`text-[11px] ${orphanedCount > 0 ? 'text-rose-600 font-bold' : 'text-stone-500'}`}>
            {orphanedCount > 0 ? 'À corriger ! (Cliquer)' : 'Aucune anomalie'}
          </p>
        </div>

        {/* Total Raw Materials */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-indigo-600" /> Stock MP Actif
          </span>
          <div className="text-xl font-black text-indigo-900">{totalMaterials}</div>
          <p className="text-[11px] text-indigo-600 font-medium">dans db.raw_materials</p>
        </div>
      </div>

      {/* 4. Controls, Filters & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        {/* Filter Mode Pills */}
        <div className="inline-flex rounded-lg bg-stone-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
              filterMode === 'ALL' ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Tous ({totalIngredients})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('ORPHANS_ONLY')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              filterMode === 'ORPHANS_ONLY'
                ? 'bg-rose-600 text-white shadow-2xs font-bold'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <Unlink className="w-3.5 h-3.5" />
            <span>Orphelins Uniquement ({orphanedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('VALID_ONLY')}
            className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              filterMode === 'VALID_ONLY'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Valides Uniquement ({validCount})</span>
          </button>
        </div>

        {/* Search & Product Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Product selector */}
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-2.5 py-1 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-800 font-medium"
          >
            <option value="ALL">Toutes les Fiches ({totalProducts})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code || 'PF'})
              </option>
            ))}
          </select>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Rechercher ingrédient ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Side-by-Side Diagnostic Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Ingredients in db.products (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Ingrédients dans les Fiches Techniques (`db.products`)</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Chaque ingrédient doit posséder un `rawMaterialId` valide qui pointe vers `db.raw_materials`.
              </p>
            </div>
            <span className="text-xs font-bold text-stone-600 bg-stone-200/80 px-2 py-0.5 rounded-full">
              {filteredIngredients.length} ligne(s)
            </span>
          </div>

          <div className="divide-y divide-stone-100 overflow-y-auto max-h-[640px] text-xs">
            {filteredIngredients.length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-stone-700">Aucun ingrédient correspondant au filtre actuel.</p>
                <p className="text-[11px] text-stone-400">
                  {filterMode === 'ORPHANS_ONLY'
                    ? 'Félicitations, aucun ingrédient orphelin détecté !'
                    : 'Modifiez vos critères de recherche.'}
                </p>
              </div>
            ) : (
              filteredIngredients.map((item) => {
                const rowKey = `${item.productId}_${item.ingredientIndex}_${item.rawMaterialId}`;
                const selectedTargetId = manualRemapSelection[rowKey] || '';

                return (
                  <div
                    key={rowKey}
                    className={`p-3.5 transition-colors ${
                      item.isOrphaned ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-stone-50/50'
                    }`}
                  >
                    {/* Header line: Recipe Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-900">{item.productName}</span>
                        <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded font-mono">
                          {item.productCode}
                        </span>
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-medium">
                          {item.productType === 'semi_finished' ? 'Base Semi-Finie' : 'Produit Fini'}
                        </span>
                      </div>

                      {/* Status badge */}
                      {item.isOrphaned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          ORPHELIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          RELIÉ
                        </span>
                      )}
                    </div>

                    {/* Body: Ingrédient details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600 bg-white/70 p-2 rounded-lg border border-stone-200/80 mb-2">
                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">Ingrédient déclaré :</span>
                        <span className="font-bold text-stone-800 text-xs">{item.ingredientName}</span>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Dosage : <strong className="text-stone-700">{item.quantityPerBatch} {item.unit}</strong>
                          {item.unitCost > 0 && ` (${item.unitCost} DZD/${item.unit})`}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-stone-400 block uppercase">ID Référencé (`rawMaterialId`) :</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code
                            className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                              item.isOrphaned
                                ? 'bg-rose-100 text-rose-800 border border-rose-200 font-bold'
                                : 'bg-stone-100 text-stone-800'
                            }`}
                          >
                            {item.rawMaterialId || '(vide / non défini)'}
                          </code>
                        </div>

                        {item.matchedMaterial ? (
                          <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-medium">
                            <ArrowRight className="w-3 h-3" />
                            Trouvé : {item.matchedMaterial.name} [Stock : {item.matchedMaterial.currentStock ?? item.matchedMaterial.stockQuantity ?? 0} {item.matchedMaterial.unit}]
                          </div>
                        ) : (
                          <div className="text-[11px] text-rose-600 mt-0.5 font-semibold">
                            ⚠️ Aucun article dans db.raw_materials avec cet ID !
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Orphan Repair Actions Strip */}
                    {item.isOrphaned && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-amber-600" />
                            Actions de Réparation :
                          </span>

                          {item.suggestedMatch && (
                            <button
                              type="button"
                              onClick={() => handleFixSingleIngredient(item, item.suggestedMatch!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-2xs transition-colors cursor-pointer"
                              title={`Lier immédiatement à ${item.suggestedMatch.name}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Relier à "{item.suggestedMatch.name}" ({item.suggestedMatch.id})</span>
                            </button>
                          )}
                        </div>

                        {/* Manual remapping selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <select
                            value={selectedTargetId}
                            onChange={(e) =>
                              setManualRemapSelection((prev) => ({
                                ...prev,
                                [rowKey]: e.target.value
                              }))
                            }
                            className="flex-1 px-2 py-1 text-xs bg-white border border-stone-300 rounded text-stone-800 font-medium"
                          >
                            <option value="">-- Choisir une matière première existante --</option>
                            {rawMaterials.map((rm) => (
                              <option key={rm.id} value={rm.id}>
                                {rm.name} ({rm.unit}) - ID: {rm.id} [Stock: {rm.currentStock ?? rm.stockQuantity ?? 0} {rm.unit}]
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            disabled={!selectedTargetId}
                            onClick={() => {
                              const target = rawMaterialIdMap.get(selectedTargetId);
                              if (target) handleFixSingleIngredient(item, target);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-2xs transition-colors cursor-pointer"
                          >
                            Appliquer Lien
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCreateMissingMaterial(item)}
                            className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded shadow-2xs transition-colors cursor-pointer"
                            title="Créer cette matière première dans db.raw_materials"
                          >
                            Créer en Stock
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrphanedIngredient(item)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded transition-colors"
                            title="Supprimer cet ingrédient orphelin de la recette"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Table db.raw_materials (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl shadow-2xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <span>Table des Matières Premières (`db.raw_materials`)</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Catalogue réel et actif du laboratoire central.
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              {rawMaterials.length} références
            </span>
          </div>

          <div className="divide-y divide-stone-100 overflow-y-auto max-h-[640px] text-xs">
            {rawMaterials.length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-2">
                <Boxes className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-semibold text-stone-700">Aucune matière première dans db.raw_materials.</p>
                <p className="text-[11px] text-stone-400">
                  Cliquez sur "+ Matière Première" ou sur le bouton de réinitialisation.
                </p>
              </div>
            ) : (
              rawMaterials.map((rm) => {
                const usageCount = rawMaterialUsageMap.get(rm.id) || 0;
                const cost = rm.unitCost ?? rm.costPerUnit ?? rm.pamp ?? 0;
                const stock = rm.currentStock ?? rm.stockQuantity ?? 0;

                return (
                  <div key={rm.id} className="p-3 hover:bg-stone-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 text-xs">{rm.name}</span>
                          <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded font-mono">
                            {rm.code || 'MP-000'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Catégorie : <span className="font-medium text-stone-700">{rm.category || 'Matières Premières'}</span>
                        </div>
                      </div>

                      {/* Usage badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          usageCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                        title={`Utilisé dans ${usageCount} ligne(s) de recettes`}
                      >
                        {usageCount > 0 ? `${usageCount} recette(s)` : 'Non utilisé'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 text-[11px]">
                      <div>
                        <span className="text-stone-400">ID : </span>
                        <code className="text-stone-700 font-mono bg-stone-100 px-1 py-0.2 rounded text-[10px]">
                          {rm.id}
                        </code>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-stone-600">
                          Coût : <strong>{cost} DZD/{rm.unit}</strong>
                        </span>
                        <span
                          className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                            stock > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          Stock : {stock} {rm.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 6. Inline Add New Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-stone-900 text-base">Ajouter une Matière Première</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewMaterial} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nom de la Matière Première *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pépites de Chocolat 50%"
                  value={newMaterialName}
                  onChange={(e) => setNewMaterialName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Unité</label>
                  <select
                    value={newMaterialUnit}
                    onChange={(e) => setNewMaterialUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="kg">kg (Kilogramme)</option>
                    <option value="g">g (Gramme)</option>
                    <option value="L">L (Litre)</option>
                    <option value="mL">mL (Millilitre)</option>
                    <option value="pièces">pièces / unités</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={newMaterialCategory}
                    onChange={(e) => setNewMaterialCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Prix PAMP (DZD / {newMaterialUnit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMaterialCost}
                    onChange={(e) => setNewMaterialCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Stock Initial</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newMaterialStock}
                    onChange={(e) => setNewMaterialStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Créer la Matière
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientsDiagnosticView;
