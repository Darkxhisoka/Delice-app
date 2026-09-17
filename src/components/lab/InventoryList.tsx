import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DexieProductIngredient } from '../../db/database';
import { resetAndSeedRawMaterials } from '../../db/dbSeeder';
import {
  syncAllSemiFinishedStockAndProducts,
  syncSingleSemiFinishedToDexie,
  syncDeleteSemiFinishedFromDexie,
  syncUpdateSemiFinishedStockInDexie,
} from '../../services/semiFinishedSyncService';
import {
  getRawMaterials,
  saveRawMaterials,
  getSemiFinishedStock,
  updateSemiFinishedStockQuantity,
  updateSemiFinishedStockItem,
  deleteSemiFinishedStockItem,
  addSemiFinishedStockItem,
  produceSemiFinishedBatch,
  getRecipes,
  saveRecipe,
  getRecipeUnitCost,
  subscribeToStoreChanges,
  notifyToast,
  deduplicateById,
  addActivityLog
} from '../../services/storage';
import {
  fetchRawMaterialsFromSupabase,
  upsertRawMaterialToSupabase,
  deleteRawMaterialFromSupabase
} from '../../services/supabaseService';
import { supabase } from '../../lib/supabaseClient';
import { RawMaterial, SemiFinishedStockItem, Recipe } from '../../types';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { RawMaterialImporter } from './RawMaterialImporter';
import { AddRawMaterialModal } from './AddRawMaterialModal';
import { UnitConverterModal } from '../common/UnitConverterModal';
import { UnitConversionBadge } from '../common/UnitConversionBadge';
import { GenerateReorderListModal } from './GenerateReorderListModal';
import { exportRawMaterialsToPDF, exportRawMaterialsToExcel } from '../../utils/reportingExport';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Edit2,
  Plus,
  RefreshCw,
  Layers,
  ChefHat,
  X,
  ArrowRight,
  PackageCheck,
  Scan,
  Barcode,
  FileSpreadsheet,
  Trash2,
  Loader2,
  Download,
  FileText,
  Scale,
  ShoppingCart,
  Wrench,
  Calculator,
  RotateCcw
} from 'lucide-react';
import { IngredientsDiagnosticView } from './IngredientsDiagnosticView';

export interface SfRecipeIngredientDraft {
  rawMaterialId: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export const InventoryList: React.FC = () => {
  const { t } = useTranslation();
  const [stockType, setStockType] = useState<'RAW_MATERIALS' | 'SEMI_FINISHED'>('RAW_MATERIALS');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [sfStockItems, setSfStockItems] = useState<SemiFinishedStockItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Bulk Importer Modal State
  const [isImporterOpen, setIsImporterOpen] = useState<boolean>(false);
  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Raw Material manual stock adjustment state
  const [editingMat, setEditingMat] = useState<RawMaterial | null>(null);
  const [adjustedStock, setAdjustedStock] = useState<number>(0);
  const [adjustedCost, setAdjustedCost] = useState<number>(0);

  // Semi-Finished manual stock adjustment and full edit/delete state
  const [editingSfStock, setEditingSfStock] = useState<SemiFinishedStockItem | null>(null);
  const [editSfName, setEditSfName] = useState<string>('');
  const [editSfCategory, setEditSfCategory] = useState<string>('');
  const [editSfUnit, setEditSfUnit] = useState<string>('kg');
  const [editSfStock, setEditSfStock] = useState<number>(0);
  const [editSfMinStock, setEditSfMinStock] = useState<number>(0);
  const [deletingSfStock, setDeletingSfStock] = useState<SemiFinishedStockItem | null>(null);

  // New Semi-Finished creation modal state (Recipe & Ingredients)
  const [showAddSfModal, setShowAddSfModal] = useState<boolean>(false);
  const [newSfName, setNewSfName] = useState<string>('');
  const [newSfCategory, setNewSfCategory] = useState<string>('Pâtes de base');
  const [newSfUnit, setNewSfUnit] = useState<string>('kg');
  const [newSfYield, setNewSfYield] = useState<number>(1);
  const [newSfStock, setNewSfStock] = useState<number>(10);
  const [newSfMinStock, setNewSfMinStock] = useState<number>(5);
  const [newSfIngredients, setNewSfIngredients] = useState<SfRecipeIngredientDraft[]>([]);
  const [selectedNewMatId, setSelectedNewMatId] = useState<string>('');
  const [newMatQty, setNewMatQty] = useState<number>(1);

  // Edit Semi-Finished recipe & ingredients state
  const [editSfYield, setEditSfYield] = useState<number>(1);
  const [editSfIngredients, setEditSfIngredients] = useState<SfRecipeIngredientDraft[]>([]);
  const [selectedEditMatId, setSelectedEditMatId] = useState<string>('');
  const [editMatQty, setEditMatQty] = useState<number>(1);

  // Batch Production Modal State
  const [showProduceModal, setShowProduceModal] = useState<boolean>(false);
  const [selectedProduceRecipeId, setSelectedProduceRecipeId] = useState<string>('');
  const [batchesToProduce, setBatchesToProduce] = useState<number>(1);

  // Camera Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Unit Converter Modal State
  const [isUnitConverterOpen, setIsUnitConverterOpen] = useState<boolean>(false);
  const [converterMaterial, setConverterMaterial] = useState<RawMaterial | null>(null);

  // Reorder List Modal State
  const [isReorderModalOpen, setIsReorderModalOpen] = useState<boolean>(false);
  const [reorderPreselectedMatId, setReorderPreselectedMatId] = useState<string | undefined>(undefined);

  // Diagnostic Ingredients vs Stock Modal State
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);

  // Reset all stock to 0 state
  const [showResetStockModal, setShowResetStockModal] = useState<boolean>(false);
  const [isResettingStock, setIsResettingStock] = useState<boolean>(false);

  // Live Query from Dexie db.raw_materials (Single reactive source of truth)
  const liveDexieRawMaterials = useLiveQuery(() => db.raw_materials.toArray(), []);

  // Live Query from Dexie db.products for Semi-Finished goods (Single reactive source of truth)
  const liveDexieSemiFinished = useLiveQuery(
    () => db.products.filter((p) => p.type === 'semi_finished' || p.type === 'semi_fini').toArray(),
    []
  );

  useEffect(() => {
    if (liveDexieRawMaterials && liveDexieRawMaterials.length > 0) {
      const converted: RawMaterial[] = deduplicateById(liveDexieRawMaterials.map((m) => ({
        id: m.id,
        name: m.name,
        sku: m.code || `MP-${m.id}`,
        category: (m.category as any) || 'Flour & Grains',
        unit: (m.unit as any) || 'kg',
        currentStock: m.currentStock ?? m.stockQuantity ?? 0,
        currentAvgCost: m.currentAvgCost ?? m.unitCost ?? m.costPerUnit ?? m.pamp ?? 0,
        reorderLevel: m.minStockAlert ?? 10,
        min_reorder_level: m.minStockAlert ?? 10,
        totalPurchasedQty: m.currentStock ?? m.stockQuantity ?? 0,
        lastUpdated: m.updatedAt || new Date().toISOString()
      })));
      setMaterials(converted);
      setLoading(false);
    }
  }, [liveDexieRawMaterials]);

  useEffect(() => {
    if (liveDexieSemiFinished && liveDexieSemiFinished.length > 0) {
      const convertedSf: SemiFinishedStockItem[] = liveDexieSemiFinished.map((p) => ({
        id: p.id,
        recipeId: p.id,
        recipeName: p.name,
        category: p.category || 'Bases & Semi-Finis',
        currentStock: p.currentStock ?? 0,
        unit: p.unit || p.batchUnit || 'kg',
        minStockLevel: p.minStockAlert ?? 5,
        lastUpdated: p.updatedAt ? p.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      }));
      setSfStockItems(convertedSf);
    }
  }, [liveDexieSemiFinished]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Synchronize semi-finished stock with Dexie db.products bidirectionally
      await syncAllSemiFinishedStockAndProducts();

      const supaMats = await fetchRawMaterialsFromSupabase();
      if (supaMats && supaMats.length > 0) {
        setMaterials(supaMats);
        saveRawMaterials(supaMats);
      } else {
        setMaterials(getRawMaterials());
      }
    } catch (err: any) {
      console.error('Failed to load raw materials from Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Supabase',
        message: err.message || 'Impossible de se connecter à la base Supabase pour charger les matières premières.'
      });
      setMaterials(getRawMaterials());
    } finally {
      setSfStockItems(getSemiFinishedStock());
      setRecipes(getRecipes());
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(() => {
      setMaterials(getRawMaterials());
      setSfStockItems(getSemiFinishedStock());
      setRecipes(getRecipes());
    });
  }, []);

  const handleBarcodeDetectedInInventory = (material: RawMaterial, _barcode: string) => {
    setStockType('RAW_MATERIALS');
    setSearchTerm(material.sku);
    setEditingMat(material);
    setAdjustedStock(material.currentStock);
    setAdjustedCost(material.currentAvgCost);
    setIsScannerOpen(false);

    notifyToast({
      type: 'info',
      title: 'Ingrédient Scanné Identifié !',
      message: `${material.name} (${material.sku}) sélectionné pour mise à jour rapide du stock.`
    });
  };

  const handleOpenEditRaw = (mat: RawMaterial) => {
    setEditingMat(mat);
    setAdjustedStock(mat.currentStock);
    setAdjustedCost(mat.currentAvgCost);
  };

  const handleSaveRawAdjustment = async () => {
    if (!editingMat) return;
    try {
      const updatedMat = await upsertRawMaterialToSupabase({
        ...editingMat,
        currentStock: adjustedStock,
        currentAvgCost: adjustedCost,
        lastUpdated: new Date().toISOString()
      });

      // Synchroniser directement avec Dexie db.raw_materials
      await db.raw_materials.put({
        id: editingMat.id,
        code: editingMat.sku || `MP-${editingMat.id}`,
        name: editingMat.name,
        category: editingMat.category || 'Flour & Grains',
        unit: editingMat.unit || 'kg',
        currentStock: adjustedStock,
        stockQuantity: adjustedStock,
        unitCost: adjustedCost,
        costPerUnit: adjustedCost,
        pamp: adjustedCost,
        currentAvgCost: adjustedCost,
        minStockAlert: editingMat.reorderLevel ?? 10,
        storeId: 'lab_central',
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      const updated = materials.map((m) => (m.id === editingMat.id ? updatedMat : m));
      setMaterials(updated);
      saveRawMaterials(updated);

      notifyToast({
        type: 'success',
        title: 'Mise à jour Réussie',
        message: `${editingMat.name} mis à jour (Stock: ${adjustedStock} ${editingMat.unit}, Coût: ${adjustedCost} DZD).`
      });
      setEditingMat(null);
    } catch (err: any) {
      console.error('Error updating raw material:', err);
      notifyToast({
        type: 'error',
        title: 'Échec de mise à jour',
        message: err.message || 'Impossible d\'enregistrer les modifications.'
      });
    }
  };

  const handleDeleteRawMaterial = async (mat: RawMaterial) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${mat.name}" du stock et des fiches techniques ?`)) return;
    try {
      await deleteRawMaterialFromSupabase(mat.id);
      await db.raw_materials.delete(mat.id);
      const remaining = materials.filter((m) => m.id !== mat.id);
      setMaterials(remaining);
      saveRawMaterials(remaining);

      notifyToast({
        type: 'success',
        title: 'Matière Première Supprimée',
        message: `"${mat.name}" a été retiré du stock.`
      });
    } catch (err: any) {
      console.error('Error deleting raw material:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur de Suppression',
        message: err.message || 'Échec de la suppression.'
      });
    }
  };

  const handleConfirmResetAllRawStock = async () => {
    setIsResettingStock(true);
    try {
      const now = new Date().toISOString();

      // 1. Bulk update directly in Dexie db.raw_materials to trigger reactive useLiveQuery
      await db.raw_materials.toCollection().modify({
        currentStock: 0,
        stockQuantity: 0,
        updatedAt: now
      });

      // 2. Prepare updated materials list
      const currentList = materials.length > 0 ? materials : getRawMaterials();
      const updated = currentList.map((m) => ({
        ...m,
        currentStock: 0,
        totalPurchasedQty: 0,
        lastUpdated: now
      }));

      // 3. Persist to localStorage, notify reactive listeners, and sync to Firestore
      saveRawMaterials(updated);
      setMaterials(updated);

      // 4. Update Supabase if available
      try {
        await supabase
          .from('raw_materials')
          .update({ current_stock: 0, last_updated: now })
          .neq('id', '__none__');
      } catch (supaErr) {
        console.warn('[InventoryList] Supabase raw_materials stock reset note:', supaErr);
      }

      // 5. Add audit log
      addActivityLog({
        type: 'STOCK_ADJUSTED',
        title: 'Remise à zéro des stocks matières premières',
        description: `Le stock actuel de l'ensemble des ${updated.length} matières premières a été réinitialisé à 0.`,
        actor: 'Laboratoire Central',
        sourceInterface: 'LAB',
        badgeText: 'STOCK 0',
        severity: 'warning',
        metadata: {
          itemCount: updated.length,
          sourceInterface: 'LAB',
          notes: 'Remise à zéro globale de tous les stocks actuels'
        }
      });

      notifyToast({
        type: 'success',
        title: 'Stock Réinitialisé à 0',
        message: `Le stock actuel de l'ensemble des ${updated.length} matières premières a été remis à 0.`
      });

      setShowResetStockModal(false);
    } catch (error: any) {
      console.error('Failed to reset raw materials stock:', error);
      notifyToast({
        type: 'error',
        title: 'Erreur Réinitialisation',
        message: error?.message || 'Une erreur est survenue lors de la remise à zéro des stocks.'
      });
    } finally {
      setIsResettingStock(false);
    }
  };

  const semiFinishedRecipes = useMemo(
    () => recipes.filter((r) => r.recipeType === 'SEMI_FINISHED'),
    [recipes]
  );

  // Filtered Raw Materials with useMemo
  const rawMaterialCategories = useMemo(
    () => Array.from(new Set(materials.map((m) => m.category))),
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return materials.filter((m) => {
      const matchesCat = categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchesSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.sku.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [materials, categoryFilter, searchTerm]);

  // Filtered Semi-Finished Stock with useMemo
  const sfCategories = useMemo(
    () => Array.from(new Set(sfStockItems.map((sf) => sf.category))),
    [sfStockItems]
  );

  const filteredSfStock = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return sfStockItems.filter((sf) => {
      const matchesCat = categoryFilter === 'ALL' || sf.category === categoryFilter;
      const matchesSearch = !term || sf.recipeName.toLowerCase().includes(term);
      return matchesCat && matchesSearch;
    });
  }, [sfStockItems, categoryFilter, searchTerm]);

  // Valuations with useMemo
  const { totalRawValue, lowStockRawCount } = useMemo(() => {
    let val = 0;
    let lowCount = 0;
    for (const m of materials) {
      val += m.currentStock * m.currentAvgCost;
      if (m.currentStock <= m.reorderLevel) lowCount++;
    }
    return { totalRawValue: val, lowStockRawCount: lowCount };
  }, [materials]);

  const { totalSfValue, lowStockSfCount } = useMemo(() => {
    let val = 0;
    let lowCount = 0;
    for (const sf of sfStockItems) {
      const recipe = recipes.find((r) => r.id === sf.recipeId);
      const unitCost = recipe ? getRecipeUnitCost(recipe, recipes, materials) : 0;
      val += sf.currentStock * unitCost;
      if (sf.currentStock <= sf.minStockLevel) lowCount++;
    }
    return { totalSfValue: val, lowStockSfCount: lowCount };
  }, [sfStockItems, recipes, materials]);

  // Ingredient handling for New Semi-Finished
  const handleAddIngredientToNew = () => {
    if (!selectedNewMatId) {
      notifyToast({
        type: 'error',
        title: 'Matière première requise',
        message: 'Veuillez sélectionner une matière première à ajouter.',
      });
      return;
    }
    const mat = materials.find((m) => m.id === selectedNewMatId);
    if (!mat) return;

    const qty = Math.max(0.001, Number(newMatQty) || 1);
    setNewSfIngredients((prev) => {
      const existing = prev.find((item) => item.rawMaterialId === mat.id);
      if (existing) {
        return prev.map((item) =>
          item.rawMaterialId === mat.id
            ? { ...item, quantity: Number((item.quantity + qty).toFixed(3)) }
            : item
        );
      }
      return [
        ...prev,
        {
          rawMaterialId: mat.id,
          name: mat.name,
          category: mat.category,
          quantity: qty,
          unit: mat.unit || 'kg',
          unitCost: mat.currentAvgCost || 0,
        },
      ];
    });

    setSelectedNewMatId('');
    setNewMatQty(1);
  };

  const handleRemoveIngredientFromNew = (rawMaterialId: string) => {
    setNewSfIngredients((prev) => prev.filter((i) => i.rawMaterialId !== rawMaterialId));
  };

  const handleUpdateIngredientQtyInNew = (rawMaterialId: string, quantity: number) => {
    setNewSfIngredients((prev) =>
      prev.map((i) =>
        i.rawMaterialId === rawMaterialId
          ? { ...i, quantity: Math.max(0, quantity) }
          : i
      )
    );
  };

  // Ingredient handling for Edit Semi-Finished
  const handleAddIngredientToEdit = () => {
    if (!selectedEditMatId) {
      notifyToast({
        type: 'error',
        title: 'Matière première requise',
        message: 'Veuillez sélectionner une matière première à ajouter.',
      });
      return;
    }
    const mat = materials.find((m) => m.id === selectedEditMatId);
    if (!mat) return;

    const qty = Math.max(0.001, Number(editMatQty) || 1);
    setEditSfIngredients((prev) => {
      const existing = prev.find((item) => item.rawMaterialId === mat.id);
      if (existing) {
        return prev.map((item) =>
          item.rawMaterialId === mat.id
            ? { ...item, quantity: Number((item.quantity + qty).toFixed(3)) }
            : item
        );
      }
      return [
        ...prev,
        {
          rawMaterialId: mat.id,
          name: mat.name,
          category: mat.category,
          quantity: qty,
          unit: mat.unit || 'kg',
          unitCost: mat.currentAvgCost || 0,
        },
      ];
    });

    setSelectedEditMatId('');
    setEditMatQty(1);
  };

  const handleRemoveIngredientFromEdit = (rawMaterialId: string) => {
    setEditSfIngredients((prev) => prev.filter((i) => i.rawMaterialId !== rawMaterialId));
  };

  const handleUpdateIngredientQtyInEdit = (rawMaterialId: string, quantity: number) => {
    setEditSfIngredients((prev) =>
      prev.map((i) =>
        i.rawMaterialId === rawMaterialId
          ? { ...i, quantity: Math.max(0, quantity) }
          : i
      )
    );
  };

  // Handlers for Semi-Finished edit & delete
  const handleOpenEditSf = async (sf: SemiFinishedStockItem) => {
    setEditingSfStock(sf);
    setEditSfName(sf.recipeName);
    setEditSfCategory(sf.category);
    setEditSfUnit(sf.unit || 'kg');
    setEditSfStock(sf.currentStock);
    setEditSfMinStock(sf.minStockLevel);

    // Look for existing recipe in recipes state
    const r = recipes.find(
      (rec) => rec.id === sf.recipeId || rec.name.toLowerCase() === sf.recipeName.toLowerCase()
    );
    let draftIngs: SfRecipeIngredientDraft[] = [];
    let yieldVal = 1;

    if (r) {
      yieldVal = r.yieldUnits || 1;
      draftIngs = (r.ingredients || []).map((ing) => {
        const mat = materials.find((m) => m.id === ing.rawMaterialId);
        return {
          rawMaterialId: ing.rawMaterialId || `mat-${Date.now()}`,
          name: mat ? mat.name : 'Matière Première',
          category: mat?.category,
          quantity: ing.quantity || 0,
          unit: ing.unit || mat?.unit || 'kg',
          unitCost: mat?.currentAvgCost || 0,
        };
      });
    }

    // Also check Dexie db.products if draftIngs is empty
    if (draftIngs.length === 0) {
      try {
        const p = await db.products
          .filter(
            (prod) =>
              (prod.type === 'semi_finished' || prod.type === 'semi_fini') &&
              (prod.id === sf.id ||
                prod.id === sf.recipeId ||
                prod.name.toLowerCase() === sf.recipeName.toLowerCase())
          )
          .first();

        if (p) {
          yieldVal = p.yieldPerBatch || 1;
          const pIngs = p.ingredients || p.ficheTechnique || [];
          if (pIngs.length > 0) {
            draftIngs = pIngs.map((ing) => {
              const mat = materials.find(
                (m) =>
                  m.id === ing.rawMaterialId ||
                  m.name.toLowerCase() === ing.name.toLowerCase()
              );
              return {
                rawMaterialId: ing.rawMaterialId,
                name: ing.name,
                category: ing.category || mat?.category,
                quantity: ing.quantityPerBatch || 0,
                unit: ing.unit || mat?.unit || 'kg',
                unitCost: ing.unitCost ?? mat?.currentAvgCost ?? 0,
              };
            });
          }
        }
      } catch (err) {
        console.warn('[InventoryList] Error loading SF ingredients from Dexie:', err);
      }
    }

    setEditSfYield(yieldVal);
    setEditSfIngredients(draftIngs);
  };

  const handleSaveSfEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSfStock) return;
    if (!editSfName.trim()) {
      notifyToast({
        type: 'error',
        title: 'Champ requis',
        message: 'Veuillez renseigner le nom du composant semi-fini.',
      });
      return;
    }

    const totalBatchCost = editSfIngredients.reduce(
      (sum, ing) => sum + ing.quantity * ing.unitCost,
      0
    );
    const yieldUnits = Math.max(0.001, Number(editSfYield) || 1);
    const calculatedUnitCost = totalBatchCost / yieldUnits;

    // 1. Update stock item
    updateSemiFinishedStockItem(editingSfStock.id, {
      recipeName: editSfName.trim(),
      category: editSfCategory.trim() || 'Composants & Bases',
      unit: editSfUnit.trim() || 'kg',
      currentStock: Math.max(0, editSfStock),
      minStockLevel: Math.max(0, editSfMinStock),
    });

    // 2. Update linked recipe
    const recipeId = editingSfStock.recipeId || `sf-rec-${editingSfStock.id}`;
    const updatedRecipe: Recipe = {
      id: recipeId,
      name: editSfName.trim(),
      category: editSfCategory.trim() || 'Composants & Bases',
      recipeType: 'SEMI_FINISHED',
      yieldUnits: yieldUnits,
      unitName: editSfUnit.trim() || 'kg',
      prepTimeMinutes: 30,
      ingredients: editSfIngredients.map((ing) => ({
        type: 'RAW_MATERIAL',
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
    saveRecipe(updatedRecipe);

    // 3. Sync with Dexie db.products
    const dexieIngredients: DexieProductIngredient[] = editSfIngredients.map((ing) => ({
      rawMaterialId: ing.rawMaterialId,
      name: ing.name,
      quantityPerBatch: ing.quantity,
      unit: ing.unit,
      category: ing.category,
      unitCost: ing.unitCost,
      totalCost: Number((ing.quantity * ing.unitCost).toFixed(2)),
      type: 'RAW_MATERIAL',
    }));

    try {
      const match = await db.products
        .filter(
          (p) =>
            (p.type === 'semi_finished' || p.type === 'semi_fini') &&
            (p.id === editingSfStock.id ||
              p.id === editingSfStock.recipeId ||
              p.name.toLowerCase() === editingSfStock.recipeName.toLowerCase())
        )
        .first();

      if (match) {
        await db.products.update(match.id, {
          name: editSfName.trim(),
          category: editSfCategory.trim() || match.category,
          unit: editSfUnit.trim() || match.unit,
          batchUnit: editSfUnit.trim() || match.batchUnit,
          currentStock: Math.max(0, editSfStock),
          minStockAlert: Math.max(0, editSfMinStock),
          yieldPerBatch: yieldUnits,
          cogsUnitCost: Number(calculatedUnitCost.toFixed(2)),
          unitCost: Number(calculatedUnitCost.toFixed(2)),
          costPrice: Number(calculatedUnitCost.toFixed(2)),
          totalBatchCost: Number(totalBatchCost.toFixed(2)),
          ingredients: dexieIngredients,
          ficheTechnique: dexieIngredients,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[InventoryList] Sync db.products on sf edit:', err);
    }

    setSfStockItems(getSemiFinishedStock());
    setRecipes(getRecipes());
    notifyToast({
      type: 'success',
      title: 'Recette Semi-Finie Modifiée',
      message: `« ${editSfName.trim()} » mise à jour avec ${editSfIngredients.length} ingrédient(s).`,
    });
    setEditingSfStock(null);
  };

  const handleDeleteSf = async () => {
    if (!deletingSfStock) return;
    const targetName = deletingSfStock.recipeName;
    const targetId = deletingSfStock.id;
    const recipeId = deletingSfStock.recipeId;

    deleteSemiFinishedStockItem(targetId);

    // Also remove from Dexie db.products if exists
    try {
      const matches = await db.products
        .filter(
          (p) =>
            (p.type === 'semi_finished' || p.type === 'semi_fini') &&
            (p.id === targetId ||
              p.id === recipeId ||
              p.name.toLowerCase() === targetName.toLowerCase())
        )
        .toArray();

      for (const m of matches) {
        await db.products.delete(m.id);
      }
    } catch (err) {
      console.warn('[InventoryList] Error deleting from db.products:', err);
    }

    setSfStockItems(getSemiFinishedStock());
    notifyToast({
      type: 'success',
      title: 'Composant Semi-Fini Supprimé',
      message: `« ${targetName} » a été supprimé du stock avec succès.`,
    });
    setDeletingSfStock(null);
  };

  const handleCreateNewSf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSfName.trim()) {
      notifyToast({
        type: 'error',
        title: 'Nom requis',
        message: 'Veuillez saisir un nom pour le nouveau produit semi-fini.',
      });
      return;
    }

    if (newSfIngredients.length === 0) {
      const confirmNoIngredients = window.confirm(
        "Vous n'avez ajouté aucun ingrédient à cette recette semi-finie. Voulez-vous continuer et l'enregistrer sans ingrédients ?"
      );
      if (!confirmNoIngredients) return;
    }

    const recipeId = `sf-rec-${Date.now()}`;
    const totalBatchCost = newSfIngredients.reduce(
      (sum, ing) => sum + ing.quantity * ing.unitCost,
      0
    );
    const yieldUnits = Math.max(0.001, Number(newSfYield) || 1);
    const calculatedUnitCost = totalBatchCost / yieldUnits;

    // 1. Create standard Recipe
    const newRecipe: Recipe = {
      id: recipeId,
      name: newSfName.trim(),
      category: newSfCategory.trim() || 'Composants & Bases',
      recipeType: 'SEMI_FINISHED',
      yieldUnits: yieldUnits,
      unitName: newSfUnit.trim() || 'kg',
      prepTimeMinutes: 30,
      ingredients: newSfIngredients.map((ing) => ({
        type: 'RAW_MATERIAL',
        rawMaterialId: ing.rawMaterialId,
        quantity: ing.quantity,
        unit: ing.unit,
      })),
    };
    saveRecipe(newRecipe);

    // 2. Add to SemiFinishedStock
    const newItem = addSemiFinishedStockItem({
      recipeId: newRecipe.id,
      recipeName: newRecipe.name,
      category: newRecipe.category,
      unit: newRecipe.unitName,
      currentStock: Math.max(0, newSfStock),
      minStockLevel: Math.max(0, newSfMinStock),
    });

    // 3. Save to Dexie db.products
    const dexieIngredients: DexieProductIngredient[] = newSfIngredients.map((ing) => ({
      rawMaterialId: ing.rawMaterialId,
      name: ing.name,
      quantityPerBatch: ing.quantity,
      unit: ing.unit,
      category: ing.category,
      unitCost: ing.unitCost,
      totalCost: Number((ing.quantity * ing.unitCost).toFixed(2)),
      type: 'RAW_MATERIAL',
    }));

    try {
      await db.products.put({
        id: newItem.id,
        code: `SF-${Math.floor(100 + Math.random() * 900)}`,
        name: newItem.recipeName,
        category: newItem.category,
        unit: newItem.unit,
        batchUnit: newItem.unit,
        price: 0,
        costPrice: Number(calculatedUnitCost.toFixed(2)),
        cogsUnitCost: Number(calculatedUnitCost.toFixed(2)),
        unitCost: Number(calculatedUnitCost.toFixed(2)),
        totalBatchCost: Number(totalBatchCost.toFixed(2)),
        currentStock: newItem.currentStock,
        minStockAlert: newItem.minStockLevel,
        storeId: 'lab_central',
        storeName: 'Laboratoire Central',
        isActive: true,
        updatedAt: new Date().toISOString(),
        type: 'semi_finished',
        yieldPerBatch: yieldUnits,
        ingredients: dexieIngredients,
        ficheTechnique: dexieIngredients,
      });
    } catch (err) {
      console.warn('[InventoryList] Error registering new SF in db.products:', err);
    }

    setSfStockItems(getSemiFinishedStock());
    setRecipes(getRecipes());
    notifyToast({
      type: 'success',
      title: 'Recette Semi-Finie Enregistrée',
      message: `« ${newItem.recipeName} » créée avec ${newSfIngredients.length} ingrédient(s) (Coût de revient : ${calculatedUnitCost.toFixed(2)} DZD/${newItem.unit}).`,
    });

    setNewSfName('');
    setNewSfIngredients([]);
    setNewSfYield(1);
    setSelectedNewMatId('');
    setShowAddSfModal(false);
  };

  // Handlers for Batch Production
  const handleOpenProduceModal = () => {
    if (semiFinishedRecipes.length > 0) {
      setSelectedProduceRecipeId(semiFinishedRecipes[0].id);
    }
    setBatchesToProduce(1);
    setShowProduceModal(true);
  };

  const handleExecuteProduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduceRecipeId || batchesToProduce <= 0) return;

    const success = produceSemiFinishedBatch(selectedProduceRecipeId, batchesToProduce);
    if (success) {
      const updatedSf = getSemiFinishedStock().find((s) => s.recipeId === selectedProduceRecipeId);
      if (updatedSf) {
        syncUpdateSemiFinishedStockInDexie(updatedSf.id, updatedSf.currentStock);
      }
      setShowProduceModal(false);
    }
  };

  const selectedProduceRecipe = recipes.find((r) => r.id === selectedProduceRecipeId);

  return (
    <div className="space-y-4">
      
      {/* Top Stock Category Switcher Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStockType('RAW_MATERIALS');
              setCategoryFilter('ALL');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              stockType === 'RAW_MATERIALS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>{t('inventory.rawMaterialsTab', 'Stock Matières Premières')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                stockType === 'RAW_MATERIALS' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {t('inventory.refCount', { count: materials.length, defaultValue: `${materials.length} Références` })}
            </span>
          </button>

          <button
            onClick={() => {
              setStockType('SEMI_FINISHED');
              setCategoryFilter('ALL');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              stockType === 'SEMI_FINISHED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t('inventory.semiFinishedTab', 'Stock Produits Semi-Finis')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                stockType === 'SEMI_FINISHED' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {t('inventory.baseCount', { count: sfStockItems.length, defaultValue: `${sfStockItems.length} Bases` })}
            </span>
          </button>
        </div>

        {stockType === 'RAW_MATERIALS' && (
          <div className="pr-2 flex flex-wrap items-center gap-2">
            <button
              id="btn-generate-reorder-list"
              onClick={() => {
                setReorderPreselectedMatId(undefined);
                setIsReorderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title={t('inventory.generateReorderListTitle', 'Générer la liste de réapprovisionnement pour les ingrédients sous le seuil d\'alerte')}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('inventory.generateReorderList', 'Liste de Réappro')}</span>
              {lowStockRawCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-rose-700 rounded-full text-[10px] font-black leading-none">
                  {lowStockRawCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setConverterMaterial(null);
                setIsUnitConverterOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200/80 hover:bg-amber-300 active:bg-amber-400 rounded-lg shadow-xs transition-colors cursor-pointer"
              title={t('unitConverter.title', 'Convertisseur Universel d\'Unités')}
            >
              <Scale className="w-4 h-4 text-amber-800" />
              <span>{t('unitConverter.openTool', 'Convertisseur d\'Unités')}</span>
            </button>
            <button
              onClick={() => exportRawMaterialsToPDF(materials)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title={t('inventory.exportPDFTitle', 'Exporter le rapport d\'inventaire du stock en PDF')}
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>{t('inventory.exportPDF', 'Exporter PDF')}</span>
            </button>
            <button
              onClick={() => exportRawMaterialsToExcel(materials)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title={t('inventory.exportExcelTitle', 'Exporter le tableau d\'inventaire du stock en format Excel (.xlsx)')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t('inventory.exportExcel', 'Exporter Excel')}</span>
            </button>
            <button
              onClick={() => setIsImporterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-700" />
              <span>{t('inventory.importCSV', 'Importer MP (CSV/Excel)')}</span>
            </button>
            <button
              onClick={async () => {
                if (window.confirm("Voulez-vous synchroniser et recharger le stock de matières premières avec les fiches techniques du laboratoire ?")) {
                  try {
                    await resetAndSeedRawMaterials();
                    notifyToast({
                      type: 'success',
                      title: 'Stock Réaligné',
                      message: 'Le stock de matières premières est parfaitement aligné avec les fiches techniques.'
                    });
                  } catch (e: any) {
                    notifyToast({
                      type: 'error',
                      title: 'Erreur',
                      message: e.message || 'Impossible de réaligner le stock.'
                    });
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 active:bg-indigo-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Réaligner et synchroniser les matières premières avec les fiches techniques"
            >
              <RefreshCw className="w-4 h-4 text-indigo-700" />
              <span>Réaligner Fiches Techniques</span>
            </button>
            <button
              onClick={() => setIsDiagnosticOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Ouvrir le panneau de diagnostic des ingrédients des fiches techniques vs matières premières"
            >
              <Wrench className="w-4 h-4 text-amber-700" />
              <span>Diagnostic Ingrédients</span>
            </button>
            <button
              id="btn-reset-all-raw-stock"
              onClick={() => setShowResetStockModal(true)}
              disabled={materials.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Remettre tout le stock actuel des matières premières à 0"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Remettre tout le stock à 0</span>
            </button>
          </div>
        )}

        {stockType === 'SEMI_FINISHED' && (
          <div className="pr-2 flex items-center gap-2">
            <button
              onClick={() => setShowAddSfModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Ajouter manuellement un nouveau produit semi-fini"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Semi-Fini</span>
            </button>
            <button
              onClick={handleOpenProduceModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ChefHat className="w-4 h-4" /> {t('inventory.produceBatch', 'Produire un Lot')}
            </button>
          </div>
        )}
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              {stockType === 'RAW_MATERIALS' ? t('inventory.rawValuation', 'Valorisation Matières Premières') : t('inventory.sfValuation', 'Valorisation Semi-Finis')}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {(stockType === 'RAW_MATERIALS' ? totalRawValue : totalSfValue).toFixed(2)} {t('common.currency', 'DZD')}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {stockType === 'RAW_MATERIALS'
                ? t('inventory.rawAvgCostDesc', 'Prix moyen pondéré d\'achat')
                : t('inventory.sfAvgCostDesc', 'Coût de revient calculé des composants')}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              {stockType === 'RAW_MATERIALS' ? t('inventory.activeMaterials', 'Matières Actives') : t('inventory.activeBases', 'Bases Actives')}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stockType === 'RAW_MATERIALS' ? t('inventory.refCount', { count: materials.length, defaultValue: `${materials.length} Réf.` }) : t('inventory.baseCount', { count: sfStockItems.length, defaultValue: `${sfStockItems.length} Bases` })}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('inventory.spreadAcrossCategories', { count: (stockType === 'RAW_MATERIALS' ? rawMaterialCategories : sfCategories).length, defaultValue: `Réparties sur ${(stockType === 'RAW_MATERIALS' ? rawMaterialCategories : sfCategories).length} catégories` })}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            {stockType === 'RAW_MATERIALS' ? <Boxes className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
        </div>

        <div 
          onClick={() => {
            if (stockType === 'RAW_MATERIALS') {
              setReorderPreselectedMatId(undefined);
              setIsReorderModalOpen(true);
            }
          }}
          className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between transition-all ${
            stockType === 'RAW_MATERIALS' ? 'cursor-pointer hover:border-rose-400 hover:shadow-md group' : ''
          }`}
          title={stockType === 'RAW_MATERIALS' ? 'Cliquer pour générer la liste de réapprovisionnement' : undefined}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">{t('inventory.lowStockAlerts', 'Alertes Stock Bas')}</span>
              {stockType === 'RAW_MATERIALS' && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md group-hover:bg-rose-100 transition-colors">
                  Réappro →
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {t('inventory.itemsCount', { count: (stockType === 'RAW_MATERIALS' ? lowStockRawCount : lowStockSfCount), defaultValue: `${stockType === 'RAW_MATERIALS' ? lowStockRawCount : lowStockSfCount} Articles` })}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t('inventory.belowReorderLevel', 'En-dessous du seuil de réapprovisionnement')}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {stockType === 'RAW_MATERIALS'
              ? t('inventory.rawStockTitle', 'Stock de Matières Premières - Laboratoire Central')
              : t('inventory.sfStockTitle', 'Stock de Produits Semi-Finis (Bases de Pâtisserie)')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {stockType === 'RAW_MATERIALS'
              ? t('inventory.rawStockDesc', 'Solde en temps réel et coût moyen pondéré unitaire.')
              : t('inventory.sfStockDesc', 'Composants intermédiaires (crèmes, pâtes, mousses) pour l\'assemblage.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {stockType === 'RAW_MATERIALS' && (
            <>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                title={t('inventory.addMaterial', '+ Add Raw Material')}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>{t('inventory.addMaterial', '+ Add Raw Material')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImporterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                title={t('inventory.importCSV', 'Importer MP (CSV/Excel)')}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                <span>{t('inventory.importCSV', 'Importer MP (CSV/Excel)')}</span>
              </button>

              <button
                id="btn-quick-reset-raw-stock"
                type="button"
                onClick={() => setShowResetStockModal(true)}
                disabled={materials.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                title="Remettre tout le stock actuel des matières premières à 0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Stock à 0</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            title={t('inventory.scanBarcode', 'Scan Caméra MP')}
          >
            <Scan className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t('inventory.scanBarcode', 'Scan Caméra MP')}</span>
          </button>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              placeholder={stockType === 'RAW_MATERIALS' ? t('inventory.searchRawPlaceholder', 'Rechercher matière ou SKU...') : t('inventory.searchSfPlaceholder', 'Rechercher base semi-finie...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">{t('inventory.allCategories', 'Toutes les Catégories')}</option>
              {(stockType === 'RAW_MATERIALS' ? rawMaterialCategories : sfCategories).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Views */}
      {stockType === 'RAW_MATERIALS' ? (
        /* Raw Materials Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3 min-w-[200px]">{t('inventory.colRawSku', 'Matière Première & SKU')}</th>
                  <th className="p-3 w-36">{t('inventory.colCategory', 'Catégorie')}</th>
                  <th className="p-3 w-32 text-center">{t('inventory.colStockLevel', 'Niveau de Stock')}</th>
                  <th className="p-3 w-28 text-center">{t('inventory.colStatus', 'Statut')}</th>
                  <th className="p-3 w-36 text-right rtl:text-left">{t('inventory.colUnitCost', 'Coût Moyen / Unité')}</th>
                  <th className="p-3 w-36 text-right rtl:text-left">{t('inventory.colTotalVal', 'Valorisation Totale')}</th>
                  <th className="p-3 w-28 text-center">{t('inventory.colReorderThreshold', 'Seuil Réappro')}</th>
                  <th className="p-3 w-20 text-center">{t('inventory.colAction', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredMaterials.map((mat, idx) => {
                  const totalVal = mat.currentStock * mat.currentAvgCost;
                  const isLowStock = mat.currentStock <= mat.reorderLevel;
                  const isOutOfStock = mat.currentStock <= 0;

                  return (
                    <tr key={`${mat.id || 'mat'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{mat.name}</div>
                        <span className="text-[10px] font-mono text-slate-400">{mat.sku}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {mat.category}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div>
                            <span className="font-black text-sm text-slate-900">{mat.currentStock}</span>{' '}
                            <span className="text-slate-500 font-medium">{mat.unit}</span>
                          </div>
                          <UnitConversionBadge
                            quantity={mat.currentStock}
                            unit={mat.unit}
                            material={mat}
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        {isOutOfStock ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReorderPreselectedMatId(mat.id);
                              setIsReorderModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 transition-colors cursor-pointer"
                            title="Rupture de stock ! Cliquer pour commander"
                          >
                            <ShoppingCart className="w-3 h-3 text-rose-700" />
                            <span>{t('inventory.outOfStock', 'Rupture')}</span>
                          </button>
                        ) : isLowStock ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReorderPreselectedMatId(mat.id);
                              setIsReorderModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                            title="Stock bas ! Cliquer pour commander"
                          >
                            <ShoppingCart className="w-3 h-3 text-amber-700" />
                            <span>{t('inventory.lowStock', 'Stock Bas')}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t('inventory.inStock', 'En Stock')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right rtl:text-left font-bold text-indigo-700">
                        {mat.currentAvgCost.toFixed(2)} {t('common.currency', 'DZD')} / {mat.unit}
                      </td>
                      <td className="p-3 text-right rtl:text-left font-bold text-slate-900">{totalVal.toFixed(2)} {t('common.currency', 'DZD')}</td>
                      <td className="p-3 text-center text-slate-500">
                        {mat.reorderLevel} {mat.unit}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setReorderPreselectedMatId(mat.id);
                              setIsReorderModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Ajouter au bon de réapprovisionnement"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConverterMaterial(mat);
                              setIsUnitConverterOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title={t('unitConverter.title', 'Convertisseur d\'Unités')}
                          >
                            <Scale className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditRaw(mat)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title={t('inventory.adjustModalTitle', 'Ajuster le stock ou coût unitaire')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRawMaterial(mat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={t('inventory.deleteMaterial', 'Supprimer')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Semi-Finished Stock Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3 min-w-[220px]">{t('inventory.colSfRecipe', 'Recette Composant Semi-Fini')}</th>
                  <th className="p-3 w-36">{t('inventory.colCategory', 'Catégorie')}</th>
                  <th className="p-3 w-32 text-center">{t('inventory.colCurrentStock', 'Stock Actuel')}</th>
                  <th className="p-3 w-28 text-center">{t('inventory.colStatus', 'Statut')}</th>
                  <th className="p-3 w-36 text-right rtl:text-left">{t('inventory.colCalculatedUnitCost', 'Coût Unitaire Calculé')}</th>
                  <th className="p-3 w-36 text-right rtl:text-left">{t('inventory.colTotalVal', 'Valorisation Totale')}</th>
                  <th className="p-3 w-28 text-center">{t('inventory.colMinThreshold', 'Seuil Min')}</th>
                  <th className="p-3 w-20 text-center">{t('inventory.colAction', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredSfStock.map((sf, idx) => {
                  const recipe = recipes.find((r) => r.id === sf.recipeId);
                  const unitCost = recipe ? getRecipeUnitCost(recipe, recipes, materials) : 0;
                  const totalVal = sf.currentStock * unitCost;
                  const isLowStock = sf.currentStock <= sf.minStockLevel;
                  const isOutOfStock = sf.currentStock <= 0;

                  return (
                    <tr key={`${sf.id || 'sf'}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          {sf.recipeName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                          {recipe && (
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              <ChefHat className="w-3 h-3" />
                              {recipe.ingredients.length} ingrédient(s)
                            </span>
                          )}
                          <span>{t('inventory.lastPrepared', { date: sf.lastUpdated, defaultValue: `Dernière préparation: ${sf.lastUpdated}` })}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {sf.category}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-black text-sm text-slate-900">{sf.currentStock.toFixed(1)}</span>{' '}
                        <span className="text-slate-500 font-medium">{sf.unit}</span>
                      </td>
                      <td className="p-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            {t('inventory.exhausted', 'Épuisé')}
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {t('inventory.lowStock', 'Stock Bas')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {t('inventory.inStock', 'Disponible')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right rtl:text-left font-bold text-indigo-700">
                        {unitCost.toFixed(2)} {t('common.currency', 'DZD')} / {sf.unit}
                      </td>
                      <td className="p-3 text-right rtl:text-left font-bold text-slate-900">{totalVal.toFixed(2)} {t('common.currency', 'DZD')}</td>
                      <td className="p-3 text-center text-slate-500">
                        {sf.minStockLevel} {sf.unit}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditSf(sf)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Modifier le produit semi-fini"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSfStock(sf)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer le produit semi-fini du stock"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Material Manual Stock Adjustment Modal */}
      {editingMat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('inventory.adjustModalTitle', 'Ajuster Stock & Coût Moyen')}</h3>
              <button onClick={() => setEditingMat(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {t('inventory.adjustRawDesc', { name: editingMat.name, defaultValue: `Ajustement manuel de la matière première ${editingMat.name}.` })}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('inventory.stock', 'Niveau de Stock')} ({editingMat.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('inventory.averageCost', 'Coût Moyen')} / {editingMat.unit} ({t('common.currency', 'DZD')})</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustedCost}
                  onChange={(e) => setAdjustedCost(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setEditingMat(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSaveRawAdjustment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
              >
                {t('inventory.saveAdjustment', 'Enregistrer l\'Ajustement')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Semi-Finished Stock Full Edit Modal (Recipe & Ingredients) */}
      {editingSfStock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Modifier la Recette Semi-Finie</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Recette & Ingrédients
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Mettre à jour les ingrédients, le rendement et le stock du composant</p>
                </div>
              </div>
              <button onClick={() => setEditingSfStock(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSfEdit} className="space-y-4">
              {/* Section 1: Informations Générales */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Caractéristiques Générales
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom du Composant Semi-Fini <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSfName}
                    onChange={(e) => setEditSfName(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex. Pâte Feuilletée Inversée, Crème Pâtissière..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={editSfCategory}
                      onChange={(e) => setEditSfCategory(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      placeholder="ex. Pâtes de base, Crèmes..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unité</label>
                    <select
                      value={editSfUnit}
                      onChange={(e) => setEditSfUnit(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="kg">kg (Kilogramme)</option>
                      <option value="g">g (Gramme)</option>
                      <option value="L">L (Litre)</option>
                      <option value="ml">ml (Millilitre)</option>
                      <option value="pièces">pièces (Unité)</option>
                      <option value="plaques">plaques</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rendement par lot ({editSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editSfYield}
                      onChange={(e) => setEditSfYield(parseFloat(e.target.value) || 1)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Stock Actuel ({editSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSfStock}
                      onChange={(e) => setEditSfStock(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seuil d'Alerte Min ({editSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editSfMinStock}
                      onChange={(e) => setEditSfMinStock(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Ingrédients & Composition de la Recette */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
                    Composition de la Recette (Matières Premières)
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    {editSfIngredients.length} ingrédient(s)
                  </span>
                </div>

                {/* Quick Add Ingredient Bar */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sélectionner une Matière Première
                    </label>
                    <select
                      value={selectedEditMatId}
                      onChange={(e) => setSelectedEditMatId(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-slate-50 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choisir un ingrédient dans le stock --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit}) — {m.currentAvgCost.toFixed(2)} DZD/{m.unit} (Stock: {m.currentStock} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Quantité {selectedEditMatId ? `(${materials.find((m) => m.id === selectedEditMatId)?.unit || 'u'})` : ''}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={editMatQty}
                      onChange={(e) => setEditMatQty(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredientToEdit}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {/* Ingredients List Table */}
                {editSfIngredients.length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-slate-500 text-xs">
                    <p className="font-medium text-slate-700">Aucun ingrédient dans la recette</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sélectionnez une matière première ci-dessus pour ajouter des ingrédients à cette recette semi-finie.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Matière Première</th>
                          <th className="p-2.5 w-28 text-center">Quantité</th>
                          <th className="p-2.5 w-24 text-right">Coût Unitaire</th>
                          <th className="p-2.5 w-24 text-right">Coût Ligne</th>
                          <th className="p-2.5 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editSfIngredients.map((ing) => {
                          const lineCost = ing.quantity * ing.unitCost;
                          return (
                            <tr key={ing.rawMaterialId} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-semibold text-slate-900">
                                <div>{ing.name}</div>
                                {ing.category && (
                                  <span className="text-[10px] text-slate-400 font-normal">{ing.category}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={ing.quantity}
                                    onChange={(e) =>
                                      handleUpdateIngredientQtyInEdit(ing.rawMaterialId, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-16 p-1 text-xs font-bold text-center border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <span className="text-slate-500 text-[11px]">{ing.unit}</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-medium text-slate-600">
                                {ing.unitCost.toFixed(2)} DZD
                              </td>
                              <td className="p-2.5 text-right font-bold text-indigo-700">
                                {lineCost.toFixed(2)} DZD
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientFromEdit(ing.rawMaterialId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Retirer cet ingrédient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Real-time Calculation Summary Card */}
                {editSfIngredients.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Coût Total du Lot :</span>{' '}
                      <span className="font-black text-slate-900 text-sm">
                        {editSfIngredients.reduce((s, i) => s + i.quantity * i.unitCost, 0).toFixed(2)} DZD
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      <span className="text-slate-600 font-semibold">Coût de Revient Unitaire (COGS) :</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white font-black rounded-lg shadow-xs text-sm">
                        {(
                          editSfIngredients.reduce((s, i) => s + i.quantity * i.unitCost, 0) /
                          Math.max(0.001, Number(editSfYield) || 1)
                        ).toFixed(2)}{' '}
                        DZD / {editSfUnit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSfStock(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semi-Finished Delete Confirmation Modal */}
      {deletingSfStock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer le Produit Semi-Fini</h3>
                <p className="text-xs text-slate-500">Cette action est irréversible</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>
                Êtes-vous sûr de vouloir supprimer définitivement le produit semi-fini{' '}
                <span className="font-bold text-slate-900">« {deletingSfStock.recipeName} »</span> ?
              </p>
              <p className="text-slate-500 text-[11px]">
                Stock actuel : <span className="font-semibold">{deletingSfStock.currentStock} {deletingSfStock.unit}</span> ({deletingSfStock.category})
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingSfStock(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleDeleteSf}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Semi-Finished Creation Modal (Recipe & Ingredients) */}
      {showAddSfModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Nouvelle Recette Semi-Finie</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Base & Ingrédients
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Définissez la composition, les ingrédients et les niveaux de stock pour cette base de laboratoire.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddSfModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSf} className="space-y-4">
              {/* Section 1: Informations Générales */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Caractéristiques Générales
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nom de la Recette / Base <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSfName}
                    onChange={(e) => setNewSfName(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex. Ganache Chocolat Noir 64%, Crème Pâtissière Vanille, Pâte Feuilletée Inversée..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={newSfCategory}
                      onChange={(e) => setNewSfCategory(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      placeholder="ex. Pâtes de base, Crèmes..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unité de mesure</label>
                    <select
                      value={newSfUnit}
                      onChange={(e) => setNewSfUnit(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="kg">kg (Kilogramme)</option>
                      <option value="g">g (Gramme)</option>
                      <option value="L">L (Litre)</option>
                      <option value="ml">ml (Millilitre)</option>
                      <option value="pièces">pièces (Unité)</option>
                      <option value="plaques">plaques</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rendement par lot ({newSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newSfYield}
                      onChange={(e) => setNewSfYield(parseFloat(e.target.value) || 1)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Stock Initial en Labo ({newSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSfStock}
                      onChange={(e) => setNewSfStock(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Seuil Alerte Min ({newSfUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSfMinStock}
                      onChange={(e) => setNewSfMinStock(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Ingrédients & Composition de la Recette */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
                    Composition de la Recette (Matières Premières)
                  </h4>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    {newSfIngredients.length} ingrédient(s)
                  </span>
                </div>

                {/* Quick Add Ingredient Bar */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Sélectionner une Matière Première
                    </label>
                    <select
                      value={selectedNewMatId}
                      onChange={(e) => setSelectedNewMatId(e.target.value)}
                      className="w-full text-xs font-medium text-slate-900 bg-slate-50 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Choisir un ingrédient dans le stock --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit}) — {m.currentAvgCost.toFixed(2)} DZD/{m.unit} (Stock: {m.currentStock} {m.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-28">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Quantité {selectedNewMatId ? `(${materials.find((m) => m.id === selectedNewMatId)?.unit || 'u'})` : ''}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={newMatQty}
                      onChange={(e) => setNewMatQty(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredientToNew}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {/* Ingredients List Table */}
                {newSfIngredients.length === 0 ? (
                  <div className="p-4 text-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-slate-500 text-xs">
                    <p className="font-medium text-slate-700">Aucun ingrédient dans la recette</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sélectionnez une matière première ci-dessus pour composer votre recette semi-finie.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Matière Première</th>
                          <th className="p-2.5 w-28 text-center">Quantité</th>
                          <th className="p-2.5 w-24 text-right">Coût Unitaire</th>
                          <th className="p-2.5 w-24 text-right">Coût Ligne</th>
                          <th className="p-2.5 w-12 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {newSfIngredients.map((ing) => {
                          const lineCost = ing.quantity * ing.unitCost;
                          return (
                            <tr key={ing.rawMaterialId} className="hover:bg-slate-50/80">
                              <td className="p-2.5 font-semibold text-slate-900">
                                <div>{ing.name}</div>
                                {ing.category && (
                                  <span className="text-[10px] text-slate-400 font-normal">{ing.category}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={ing.quantity}
                                    onChange={(e) =>
                                      handleUpdateIngredientQtyInNew(ing.rawMaterialId, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-16 p-1 text-xs font-bold text-center border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <span className="text-slate-500 text-[11px]">{ing.unit}</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-medium text-slate-600">
                                {ing.unitCost.toFixed(2)} DZD
                              </td>
                              <td className="p-2.5 text-right font-bold text-indigo-700">
                                {lineCost.toFixed(2)} DZD
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientFromNew(ing.rawMaterialId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Retirer cet ingrédient"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Real-time Calculation Summary Card */}
                {newSfIngredients.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Coût Total du Lot :</span>{' '}
                      <span className="font-black text-slate-900 text-sm">
                        {newSfIngredients.reduce((s, i) => s + i.quantity * i.unitCost, 0).toFixed(2)} DZD
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      <span className="text-slate-600 font-semibold">Coût de Revient Unitaire (COGS) :</span>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white font-black rounded-lg shadow-xs text-sm">
                        {(
                          newSfIngredients.reduce((s, i) => s + i.quantity * i.unitCost, 0) /
                          Math.max(0.001, Number(newSfYield) || 1)
                        ).toFixed(2)}{' '}
                        DZD / {newSfUnit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSfModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer la Recette & Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Production Modal */}
      {showProduceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-indigo-600" />
                {t('inventory.produceModalTitle', 'Produire un Lot de Produit Semi-Fini')}
              </h3>
              <button onClick={() => setShowProduceModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteProduction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('inventory.selectSfRecipe', 'Sélectionner la Recette Semi-Finie')}</label>
                <select
                  value={selectedProduceRecipeId}
                  onChange={(e) => setSelectedProduceRecipeId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {semiFinishedRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (1 lot -&gt; {r.yieldUnits} {r.unitName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{t('inventory.batchesCount', 'Nombre de Lots à Produire')}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={batchesToProduce}
                  onChange={(e) => setBatchesToProduce(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {selectedProduceRecipe && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-indigo-900">
                    <span>{t('inventory.yieldLabel', 'Rendement du Lot :')}</span>
                    <span className="text-sm font-black text-indigo-700">
                      +{selectedProduceRecipe.yieldUnits * batchesToProduce} {selectedProduceRecipe.unitName}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 space-y-1">
                    <span className="font-bold text-indigo-800 text-[11px]">{t('inventory.deductionRequired', 'Déduction Requise des Matières Premières :')}</span>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      {selectedProduceRecipe.ingredients.map((ing, idx) => {
                        const mat = materials.find((m) => m.id === ing.rawMaterialId);
                        const qtyNeeded = ing.quantity * batchesToProduce;
                        const hasEnough = mat ? mat.currentStock >= qtyNeeded : false;

                        return (
                          <li key={idx} className="flex items-center justify-between">
                            <span>
                              • {mat ? mat.name : t('inventory.rawMaterials', 'Matière Première')} : <strong>{qtyNeeded} {mat?.unit || 'unité'}</strong>
                            </span>
                            {hasEnough ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" /> {t('inventory.available', 'Disponible')} ({mat?.currentStock} {mat?.unit})
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {t('inventory.insufficient', 'Insuffisant !')} ({t('inventory.stock', 'Stock')} : {mat?.currentStock})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProduceModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {t('inventory.deductAndProduce', 'Déduire le Stock & Produire')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        rawMaterials={materials}
        onDetected={handleBarcodeDetectedInInventory}
      />

      {/* Bulk CSV / Excel Raw Material Importer Modal */}
      <RawMaterialImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={() => {
          setMaterials(getRawMaterials());
        }}
      />

      {/* Manual Add Raw Material Modal */}
      <AddRawMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setMaterials(getRawMaterials());
        }}
      />

      {/* Unit Converter Modal */}
      <UnitConverterModal
        isOpen={isUnitConverterOpen}
        onClose={() => {
          setIsUnitConverterOpen(false);
          setConverterMaterial(null);
        }}
        initialMaterial={converterMaterial}
      />

      {/* Generate Reorder List Modal */}
      <GenerateReorderListModal
        isOpen={isReorderModalOpen}
        onClose={() => {
          setIsReorderModalOpen(false);
          setReorderPreselectedMatId(undefined);
        }}
        materials={materials}
        preselectedMaterialId={reorderPreselectedMatId}
      />

      {/* Diagnostic Ingrédients vs Matières Premières Modal */}
      {isDiagnosticOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-stone-50 rounded-2xl max-w-7xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200">
            <IngredientsDiagnosticView onClose={() => setIsDiagnosticOpen(false)} />
          </div>
        </div>
      )}

      {/* Reset All Current Stock to 0 Confirmation Modal */}
      {showResetStockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Remettre tout le stock actuel à 0
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matières Premières — Laboratoire Central
                </p>
              </div>
            </div>

            <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-200 text-xs text-rose-950 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirmation : Réinitialisation globale des stocks</span>
              </div>
              <p className="leading-relaxed">
                Cette action va réinitialiser le <span className="font-bold">Stock Actuel</span> de toutes les matières premières ({materials.length} références) à <span className="font-bold text-rose-700">0</span>.
              </p>
              <div className="bg-white/90 rounded-lg p-3 border border-rose-100 space-y-1.5 text-slate-700 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Matières premières concernées :</span>
                  <span className="font-bold text-slate-900">{materials.length} articles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valorisation actuelle du stock :</span>
                  <span className="font-bold text-rose-700">{totalRawValue.toFixed(2)} DZD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nouvelle valorisation après remise à 0 :</span>
                  <span className="font-bold text-slate-900">0.00 DZD</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ℹ️ <span className="font-medium text-slate-800">Données préservées :</span> Les fiches techniques, liaisons de recettes, prix moyens pondérés (PAMP), seuils d'alerte et références SKU restent inchangés.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResettingStock}
                onClick={() => setShowResetStockModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-reset-raw-stock"
                type="button"
                disabled={isResettingStock}
                onClick={handleConfirmResetAllRawStock}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-60"
              >
                {isResettingStock ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Remise à zéro en cours...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmer et remettre à 0</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
