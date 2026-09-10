import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getRawMaterials,
  saveRawMaterials,
  getSemiFinishedStock,
  updateSemiFinishedStockQuantity,
  produceSemiFinishedBatch,
  getRecipes,
  getRecipeUnitCost,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  fetchRawMaterialsFromSupabase,
  upsertRawMaterialToSupabase,
  deleteRawMaterialFromSupabase
} from '../../services/supabaseService';
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
  ShoppingCart
} from 'lucide-react';

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

  // Semi-Finished manual stock adjustment state
  const [editingSfStock, setEditingSfStock] = useState<SemiFinishedStockItem | null>(null);
  const [adjustedSfStock, setAdjustedSfStock] = useState<number>(0);

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

  const loadData = async () => {
    setLoading(true);
    try {
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

      const updated = materials.map((m) => (m.id === editingMat.id ? updatedMat : m));
      setMaterials(updated);
      saveRawMaterials(updated);

      notifyToast({
        type: 'success',
        title: 'Mise à jour Supabase Réussie',
        message: `${editingMat.name} mis à jour dans Supabase (Stock: ${adjustedStock} ${editingMat.unit}).`
      });
      setEditingMat(null);
    } catch (err: any) {
      console.error('Error updating raw material in Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Échec Supabase',
        message: err.message || 'Impossible d\'enregistrer les modifications sur Supabase.'
      });
    }
  };

  const handleDeleteRawMaterial = async (mat: RawMaterial) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer "${mat.name}" de la base Supabase ?`)) return;
    try {
      await deleteRawMaterialFromSupabase(mat.id);
      const remaining = materials.filter((m) => m.id !== mat.id);
      setMaterials(remaining);
      saveRawMaterials(remaining);

      notifyToast({
        type: 'success',
        title: 'Matière Première Supprimée',
        message: `"${mat.name}" a été retiré de la base de données Supabase.`
      });
    } catch (err: any) {
      console.error('Error deleting raw material from Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur de Suppression',
        message: err.message || 'Échec de la suppression sur Supabase.'
      });
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

  // Handlers for Semi-Finished edit
  const handleOpenEditSf = (sf: SemiFinishedStockItem) => {
    setEditingSfStock(sf);
    setAdjustedSfStock(sf.currentStock);
  };

  const handleSaveSfAdjustment = () => {
    if (!editingSfStock) return;
    updateSemiFinishedStockQuantity(editingSfStock.id, adjustedSfStock);
    notifyToast({
      type: 'success',
      title: 'Semi-Finished Stock Adjusted',
      message: `${editingSfStock.recipeName} stock updated to ${adjustedSfStock} ${editingSfStock.unit}`,
    });
    setEditingSfStock(null);
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
          </div>
        )}

        {stockType === 'SEMI_FINISHED' && (
          <div className="pr-2">
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
                {filteredMaterials.map((mat) => {
                  const totalVal = mat.currentStock * mat.currentAvgCost;
                  const isLowStock = mat.currentStock <= mat.reorderLevel;
                  const isOutOfStock = mat.currentStock <= 0;

                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
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
                {filteredSfStock.map((sf) => {
                  const recipe = recipes.find((r) => r.id === sf.recipeId);
                  const unitCost = recipe ? getRecipeUnitCost(recipe, recipes, materials) : 0;
                  const totalVal = sf.currentStock * unitCost;
                  const isLowStock = sf.currentStock <= sf.minStockLevel;
                  const isOutOfStock = sf.currentStock <= 0;

                  return (
                    <tr key={sf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          {sf.recipeName}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{t('inventory.lastPrepared', { date: sf.lastUpdated, defaultValue: `Dernière préparation: ${sf.lastUpdated}` })}</span>
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
                        <button
                          onClick={() => handleOpenEditSf(sf)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title={t('inventory.adjustSfModalTitle', 'Ajuster le stock semi-fini')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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

      {/* Semi-Finished Stock Adjustment Modal */}
      {editingSfStock && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{t('inventory.adjustSfModalTitle', 'Ajuster Stock Produit Semi-Fini')}</h3>
              <button onClick={() => setEditingSfStock(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {t('inventory.adjustSfDesc', { name: editingSfStock.recipeName, defaultValue: `Mise à jour du niveau de stock pour ${editingSfStock.recipeName}.` })}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{t('inventory.stock', 'Stock Actuel')} ({editingSfStock.unit})</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={adjustedSfStock}
                onChange={(e) => setAdjustedSfStock(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                onClick={() => setEditingSfStock(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleSaveSfAdjustment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
              >
                {t('inventory.saveStock', 'Enregistrer le Stock')}
              </button>
            </div>
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

    </div>
  );
};
