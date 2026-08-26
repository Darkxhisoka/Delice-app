import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileText
} from 'lucide-react';

export const InventoryList: React.FC = () => {
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
            <span>Stock Matières Premières</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                stockType === 'RAW_MATERIALS' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {materials.length} Références
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
            <span>Stock Produits Semi-Finis</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                stockType === 'SEMI_FINISHED' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {sfStockItems.length} Bases
            </span>
          </button>
        </div>

        {stockType === 'RAW_MATERIALS' && (
          <div className="pr-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportRawMaterialsToPDF(materials)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors"
              title="Exporter le rapport d'inventaire du stock en PDF"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Exporter PDF</span>
            </button>
            <button
              onClick={() => exportRawMaterialsToExcel(materials)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg shadow-xs transition-colors"
              title="Exporter le tableau d'inventaire du stock en format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exporter Excel</span>
            </button>
            <button
              onClick={() => setIsImporterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-700" />
              <span>Importer MP (CSV/Excel)</span>
            </button>
          </div>
        )}

        {stockType === 'SEMI_FINISHED' && (
          <div className="pr-2">
            <button
              onClick={handleOpenProduceModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <ChefHat className="w-4 h-4" /> Produire un Lot
            </button>
          </div>
        )}
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              {stockType === 'RAW_MATERIALS' ? 'Valorisation Matières Premières' : 'Valorisation Semi-Finis'}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {(stockType === 'RAW_MATERIALS' ? totalRawValue : totalSfValue).toFixed(2)} DZD
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {stockType === 'RAW_MATERIALS'
                ? 'Prix moyen pondéré d\'achat'
                : 'Coût de revient calculé des composants'}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              {stockType === 'RAW_MATERIALS' ? 'Matières Actives' : 'Bases Actives'}
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {stockType === 'RAW_MATERIALS' ? `${materials.length} Réf.` : `${sfStockItems.length} Bases`}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Réparties sur {(stockType === 'RAW_MATERIALS' ? rawMaterialCategories : sfCategories).length} catégories
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            {stockType === 'RAW_MATERIALS' ? <Boxes className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Alertes Stock Bas</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {stockType === 'RAW_MATERIALS' ? lowStockRawCount : lowStockSfCount} Articles
            </div>
            <p className="text-xs text-slate-500 mt-0.5">En-dessous du seuil de réapprovisionnement</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {stockType === 'RAW_MATERIALS'
              ? 'Stock de Matières Premières - Laboratoire Central'
              : 'Stock de Produits Semi-Finis (Bases de Pâtisserie)'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {stockType === 'RAW_MATERIALS'
              ? 'Solde en temps réel et coût moyen pondéré unitaire.'
              : 'Composants intermédiaires (crèmes, pâtes, mousses) pour l\'assemblage.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {stockType === 'RAW_MATERIALS' && (
            <>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors shrink-0"
                title="Ajouter manuellement une nouvelle matière première"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>+ Add Raw Material</span>
              </button>

              <button
                type="button"
                onClick={() => setIsImporterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 rounded-lg shadow-2xs transition-colors shrink-0"
                title="Importer des matières premières depuis un fichier CSV ou Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                <span>Import Raw Materials (CSV/Excel)</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-2xs transition-colors shrink-0"
            title="Scanner le code-barres de la matière première"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-300" />
            <span>Scan Caméra MP</span>
          </button>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={stockType === 'RAW_MATERIALS' ? 'Rechercher matière ou SKU...' : 'Rechercher base semi-finie...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les Catégories</option>
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3 min-w-[200px]">Matière Première & SKU</th>
                  <th className="p-3 w-36">Catégorie</th>
                  <th className="p-3 w-32 text-center">Niveau de Stock</th>
                  <th className="p-3 w-28 text-center">Statut</th>
                  <th className="p-3 w-36 text-right">Coût Moyen / Unité</th>
                  <th className="p-3 w-36 text-right">Valorisation Totale</th>
                  <th className="p-3 w-28 text-center">Seuil Réappro</th>
                  <th className="p-3 w-20 text-center">Action</th>
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
                        <span className="font-black text-sm text-slate-900">{mat.currentStock}</span>{' '}
                        <span className="text-slate-500 font-medium">{mat.unit}</span>
                      </td>
                      <td className="p-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Rupture
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Stock Bas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            En Stock
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-700">
                        {mat.currentAvgCost.toFixed(2)} DZD / {mat.unit}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{totalVal.toFixed(2)} DZD</td>
                      <td className="p-3 text-center text-slate-500">
                        {mat.reorderLevel} {mat.unit}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditRaw(mat)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Ajuster le stock ou coût unitaire"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRawMaterial(mat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Supprimer de Supabase"
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
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3 min-w-[220px]">Recette Composant Semi-Fini</th>
                  <th className="p-3 w-36">Catégorie</th>
                  <th className="p-3 w-32 text-center">Stock Actuel</th>
                  <th className="p-3 w-28 text-center">Statut</th>
                  <th className="p-3 w-36 text-right">Coût Unitaire Calculé</th>
                  <th className="p-3 w-36 text-right">Valorisation Totale</th>
                  <th className="p-3 w-28 text-center">Seuil Min</th>
                  <th className="p-3 w-20 text-center">Action</th>
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
                        <span className="text-[10px] text-slate-400 font-medium">Dernière préparation: {sf.lastUpdated}</span>
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
                            Épuisé
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Stock Bas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Disponible
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-indigo-700">
                        {unitCost.toFixed(2)} DZD / {sf.unit}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{totalVal.toFixed(2)} DZD</td>
                      <td className="p-3 text-center text-slate-500">
                        {sf.minStockLevel} {sf.unit}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenEditSf(sf)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ajuster le stock semi-fini"
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
              <h3 className="text-base font-bold text-slate-900">Ajuster Stock & Coût Moyen</h3>
              <button onClick={() => setEditingMat(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ajustement manuel de la matière première <strong className="text-slate-900">{editingMat.name}</strong>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Niveau de Stock ({editingMat.unit})</label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustedStock}
                  onChange={(e) => setAdjustedStock(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coût Moyen Par {editingMat.unit} (DZD)</label>
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveRawAdjustment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Enregistrer l'Ajustement
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
              <h3 className="text-base font-bold text-slate-900">Ajuster Stock Produit Semi-Fini</h3>
              <button onClick={() => setEditingSfStock(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Mise à jour du niveau de stock pour <strong className="text-slate-900">{editingSfStock.recipeName}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Actuel ({editingSfStock.unit})</label>
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
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveSfAdjustment}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Enregistrer le Stock
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
                Produire un Lot de Produit Semi-Fini
              </h3>
              <button onClick={() => setShowProduceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteProduction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sélectionner la Recette Semi-Finie</label>
                <select
                  value={selectedProduceRecipeId}
                  onChange={(e) => setSelectedProduceRecipeId(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {semiFinishedRecipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (1 lot produit {r.yieldUnits} {r.unitName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre de Lots à Produire</label>
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
                    <span>Rendement du Lot :</span>
                    <span className="text-sm font-black text-indigo-700">
                      +{selectedProduceRecipe.yieldUnits * batchesToProduce} {selectedProduceRecipe.unitName}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 space-y-1">
                    <span className="font-bold text-indigo-800 text-[11px]">Déduction Requise des Matières Premières :</span>
                    <ul className="space-y-1 text-[11px] text-slate-700">
                      {selectedProduceRecipe.ingredients.map((ing, idx) => {
                        const mat = materials.find((m) => m.id === ing.rawMaterialId);
                        const qtyNeeded = ing.quantity * batchesToProduce;
                        const hasEnough = mat ? mat.currentStock >= qtyNeeded : false;

                        return (
                          <li key={idx} className="flex items-center justify-between">
                            <span>
                              • {mat ? mat.name : 'Matière Première'} : <strong>{qtyNeeded} {mat?.unit || 'unité'}</strong>
                            </span>
                            {hasEnough ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" /> Disponible ({mat?.currentStock} {mat?.unit})
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Insuffisant ! (Stock : {mat?.currentStock})
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Déduire le Stock & Produire
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

    </div>
  );
};
