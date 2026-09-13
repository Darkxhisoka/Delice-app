import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { fetchUnifiedCatalog, UnifiedCatalogItem, CatalogFilterType } from '../../utils/catalog';
import { addRequisition, getActiveStore, notifyToast } from '../../services/storage';
import { insertRequisitionToSupabase } from '../../services/supabaseService';
import { OrderLine, RequisitionItem } from '../../types';
import { UnitConverterModal } from '../common/UnitConverterModal';
import { UnitConversionBadge } from '../common/UnitConversionBadge';
import {
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingBag,
  Calendar,
  AlertCircle,
  Check,
  Loader2,
  Scale,
  Cake,
  Package,
  Layers,
  Search,
} from 'lucide-react';

export interface StoreRequisitionProps {
  onSuccess?: () => void;
}

export const StoreRequisition: React.FC<StoreRequisitionProps> = ({ onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const activeStore = getActiveStore();

  // Modal and dialog state
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(true);
  const [catalogItems, setCatalogItems] = useState<UnifiedCatalogItem[]>([]);

  // Filter for item selection: ALL | FINISHED | RAW
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Target Delivery Date (defaults to tomorrow)
  const [dateNeeded, setDateNeeded] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  const [requestedBy, setRequestedBy] = useState<string>(activeStore.managerName || 'Store Staff');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 1. Unified Data Fetching: Load db.products & db.raw_materials on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setCatalogLoading(true);
      try {
        const items = await fetchUnifiedCatalog();
        if (isMounted) {
          setCatalogItems(items);
        }
      } catch (err) {
        console.error('Error fetching unified catalog for store requisition:', err);
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered catalogue pool for the dropdown
  const filteredCatalogItems = useMemo(() => {
    let result = catalogItems;
    if (catalogFilter === 'FINISHED') {
      result = result.filter((item) => item.itemType === 'finished_product');
    } else if (catalogFilter === 'RAW') {
      result = result.filter((item) => item.itemType === 'raw_material');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.itemTitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.code && item.code.toLowerCase().includes(q))
      );
    }
    return result;
  }, [catalogItems, catalogFilter, searchQuery]);

  // Initial Order Lines: at least 1 finished product and 1 raw material if available
  const [orderLines, setOrderLines] = useState<OrderLine[]>([
    {
      itemId: 'prod-gs-1',
      itemType: 'finished_product',
      itemTitle: 'Croissant au Beurre Artisanal',
      category: 'Viennoiserie & Brioche',
      roomId: 'viennoiserie',
      requestedQty: 100,
      unit: 'pcs',
      unitEstimatedCost: 0.95,
    },
    {
      itemId: 'rm-1',
      itemType: 'raw_material',
      itemTitle: 'Farine T65 Haute Tradition',
      category: 'Flour & Grains',
      roomId: 'storage_lab',
      requestedQty: 25,
      unit: 'kg',
      unitEstimatedCost: 1.45,
    },
  ]);

  // Auto-synchronize initial order line details once catalog is loaded
  useEffect(() => {
    if (catalogItems.length > 0) {
      setOrderLines((prev) =>
        prev.map((line) => {
          const match = catalogItems.find(
            (c) => c.itemId === line.itemId || c.itemTitle.toLowerCase() === line.itemTitle.toLowerCase()
          );
          if (match) {
            return {
              ...line,
              itemId: match.itemId,
              itemType: match.itemType,
              itemTitle: match.itemTitle,
              category: match.category,
              roomId: match.roomId,
              unit: match.unit,
              unitEstimatedCost: match.unitEstimatedCost,
            };
          }
          return line;
        })
      );
    }
  }, [catalogItems]);

  // Add a new line to order
  const handleAddLine = (preferredType?: 'finished_product' | 'raw_material') => {
    let candidate = catalogItems.find((c) =>
      preferredType ? c.itemType === preferredType : true
    );
    if (!candidate && catalogItems.length > 0) {
      candidate = catalogItems[0];
    }

    if (candidate) {
      const newLine: OrderLine = {
        itemId: candidate.itemId,
        itemType: candidate.itemType,
        itemTitle: candidate.itemTitle,
        category: candidate.category,
        roomId: candidate.roomId,
        requestedQty: candidate.itemType === 'raw_material' ? 10 : 50,
        unit: candidate.unit,
        unitEstimatedCost: candidate.unitEstimatedCost,
      };
      setOrderLines((prev) => [...prev, newLine]);
    } else {
      // Fallback
      setOrderLines((prev) => [
        ...prev,
        {
          itemId: `item-${Date.now()}`,
          itemType: preferredType || 'finished_product',
          itemTitle: preferredType === 'raw_material' ? 'Beurre Sec 84%' : 'Croissant Pur Beurre',
          category: preferredType === 'raw_material' ? 'Fats & Oils' : 'Viennoiserie & Brioche',
          roomId: preferredType === 'raw_material' ? 'storage_lab' : 'viennoiserie',
          requestedQty: 20,
          unit: preferredType === 'raw_material' ? 'kg' : 'pcs',
          unitEstimatedCost: 1.5,
        },
      ]);
    }
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    if (orderLines.length <= 1) {
      notifyToast({
        type: 'error',
        title: t('storeRequisition.emptyCartError', 'Validation'),
        message: t('storeRequisition.emptyCartError', 'Une demande doit contenir au moins un article.'),
      });
      return;
    }
    setOrderLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Change selected item in a row -> automatically update itemType, unit, category, roomId, cost
  const handleSelectItem = (index: number, itemId: string) => {
    const selected = catalogItems.find((c) => c.itemId === itemId);
    if (!selected) return;

    setOrderLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemId: selected.itemId,
        itemType: selected.itemType,
        itemTitle: selected.itemTitle,
        category: selected.category,
        roomId: selected.roomId,
        unit: selected.unit, // Automatically update unit (pcs, kg, L)
        unitEstimatedCost: selected.unitEstimatedCost,
      };
      return updated;
    });
  };

  // Real-time counter quantity change
  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setOrderLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], requestedQty: validQty };
      return updated;
    });
  };

  // Quick Add Template Items
  const handleQuickAdd = (
    title: string,
    type: 'finished_product' | 'raw_material',
    qty: number,
    unit: string,
    category: string,
    roomId: string,
    unitEstimatedCost: number
  ) => {
    // Check if item exists in catalog
    const matched = catalogItems.find(
      (c) => c.itemTitle.toLowerCase().includes(title.toLowerCase()) && c.itemType === type
    );

    const newLine: OrderLine = {
      itemId: matched ? matched.itemId : `quick-${Date.now()}`,
      itemType: type,
      itemTitle: matched ? matched.itemTitle : title,
      category: matched ? matched.category : category,
      roomId: matched ? matched.roomId : roomId,
      requestedQty: qty,
      unit: matched ? matched.unit : unit,
      unitEstimatedCost: matched ? matched.unitEstimatedCost : unitEstimatedCost,
    };

    setOrderLines((prev) => [...prev, newLine]);
  };

  // Total Estimated Order Cost
  const totalEstimatedCost = useMemo(() => {
    return orderLines.reduce(
      (sum, line) => sum + line.requestedQty * (line.unitEstimatedCost || 1.0),
      0
    );
  }, [orderLines]);

  // Counts of products vs raw materials in current order
  const { finishedCount, rawCount } = useMemo(() => {
    let finished = 0;
    let raw = 0;
    for (const l of orderLines) {
      if (l.itemType === 'finished_product') finished++;
      else raw++;
    }
    return { finishedCount: finished, rawCount: raw };
  }, [orderLines]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderLines.length === 0) {
      notifyToast({
        type: 'error',
        title: t('storeRequisition.emptyCartError', 'Erreur de Validation'),
        message: t('storeRequisition.emptyCartError', 'Veuillez ajouter au moins une ligne de commande.'),
      });
      return;
    }

    if (!dateNeeded) {
      notifyToast({
        type: 'error',
        title: t('storeRequisition.missingDateError', 'Erreur de Validation'),
        message: t('storeRequisition.missingDateError', 'Veuillez spécifier la date de livraison souhaitée.'),
      });
      return;
    }

    setSubmitting(true);

    try {
      // Map OrderLines into RequisitionItem format
      const itemsWithIds: RequisitionItem[] = orderLines.map((line, idx) => ({
        id: `rqi-${Date.now()}-${idx}`,
        productName: line.itemTitle,
        category: line.category,
        quantityRequested: line.requestedQty,
        unit: line.unit,
        unitEstimatedCost: line.unitEstimatedCost || 1.0,
        roomId: line.roomId as any,
        itemId: line.itemId,
        itemType: line.itemType,
      }));

      const reqPayload = {
        storeId: activeStore.id,
        storeName: activeStore.name,
        requestedBy: requestedBy.trim() || activeStore.managerName || 'Store Manager',
        dateNeeded,
        notes,
        items: itemsWithIds,
        totalEstimatedCost,
      };

      // 1. Insert directly to Supabase table
      const createdSupaReq = await insertRequisitionToSupabase(reqPayload);

      // 2. Also sync to local storage cache and dispatch notifications
      addRequisition(reqPayload);

      notifyToast({
        type: 'success',
        title: t('storeRequisition.successTitle', 'Commande Transmise !'),
        message: `${createdSupaReq.requisitionNumber} ${t(
          'storeRequisition.successMessage',
          'enregistrée avec succès dans le système pour'
        )} ${activeStore.name}.`,
      });

      // Reset form
      setNotes('');
      if (catalogItems.length > 0) {
        const firstProd = catalogItems.find((i) => i.itemType === 'finished_product') || catalogItems[0];
        setOrderLines([
          {
            itemId: firstProd.itemId,
            itemType: firstProd.itemType,
            itemTitle: firstProd.itemTitle,
            category: firstProd.category,
            roomId: firstProd.roomId,
            requestedQty: 50,
            unit: firstProd.unit,
            unitEstimatedCost: firstProd.unitEstimatedCost,
          },
        ]);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error submitting store requisition:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err.message || 'Échec de la transmission de la réquisition.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="store-requisition-container"
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${
        isRtl ? 'rtl' : 'ltr'
      }`}
    >
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                {activeStore.code || 'MAG'}
              </span>
              <span className="text-xs text-emerald-200 font-medium">
                {t('storeRequisition.title', "Demande d'approvisionnement")}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white/10 text-white/90">
                <span>🍰 {finishedCount}</span>
                <span>•</span>
                <span>📦 {rawCount}</span>
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{activeStore.name}</h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              {activeStore.address} • {t('common.manager', 'Gérant')} : {activeStore.managerName}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">
              {t('storeRequisition.totalEstimatedCost', 'Total Estimé Commande')}
            </span>
            <span className="text-2xl font-black text-white">
              {totalEstimatedCost.toFixed(2)} <span className="text-sm font-semibold">DZD</span>
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 2. Basic Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('storeRequisition.assignedStore', 'Point de Vente Assigné')}
            </label>
            <input
              type="text"
              readOnly
              value={activeStore.name}
              className="w-full text-base sm:text-xs font-medium bg-slate-200/80 text-slate-700 rounded-lg px-3 py-2.5 border border-slate-300 cursor-not-allowed min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('storeRequisition.requestedBy', 'Demandeur (Nom Employé)')}
            </label>
            <input
              type="text"
              required
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder="Nom de l'Employé Magasin"
              className="w-full text-base sm:text-xs font-medium bg-white text-slate-900 rounded-lg px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('storeRequisition.dateNeeded', 'Date de Livraison Souhaitée')}
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateNeeded}
                onChange={(e) => setDateNeeded(e.target.value)}
                className="w-full text-base sm:text-xs font-medium bg-white text-slate-900 rounded-lg px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-8 min-h-[44px]"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 3. Quick Add Catalog Templates (Finished Products & Raw Materials) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('storeRequisition.quickAddTitle', "Ajout Rapide d'Incontournables")}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('storeRequisition.quickAddSubtitle', 'Cliquer pour ajouter à la liste de commande')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Finished Products Quick Adds */}
            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Croissant',
                  'finished_product',
                  100,
                  'pcs',
                  'Viennoiserie & Brioche',
                  'viennoiserie',
                  0.95
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Cake className="w-3.5 h-3.5 text-amber-600" />
              <span>+100 Croissants</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Chocolat',
                  'finished_product',
                  80,
                  'pcs',
                  'Viennoiserie & Brioche',
                  'viennoiserie',
                  1.15
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Cake className="w-3.5 h-3.5 text-amber-600" />
              <span>+80 Pains au Chocolat</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Mille-Feuille',
                  'finished_product',
                  30,
                  'pcs',
                  'Mille-Feuille',
                  'feuilletage',
                  1.8
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Cake className="w-3.5 h-3.5 text-amber-600" />
              <span>+30 Mille-Feuilles</span>
            </button>

            {/* Raw Materials Quick Adds */}
            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Farine',
                  'raw_material',
                  25,
                  'kg',
                  'Flour & Grains',
                  'storage_lab',
                  1.45
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>+25kg Farine T65</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Beurre',
                  'raw_material',
                  10,
                  'kg',
                  'Fats & Oils',
                  'storage_lab',
                  9.8
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>+10kg Beurre Sec 84%</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickAdd(
                  'Chocolat',
                  'raw_material',
                  5,
                  'kg',
                  'Chocolate & Cocoa',
                  'storage_lab',
                  18.5
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span>+5kg Chocolat Valrhona</span>
            </button>
          </div>
        </div>

        {/* 4. Filter Buttons Bar Above Item Selection Pool */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              {t('storeRequisition.type', 'Filtre Catalogue')} :
            </span>

            {/* Filter Toggle 1: [ Tous ] */}
            <button
              id="filter-toggle-all"
              type="button"
              onClick={() => setCatalogFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                catalogFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              <span>{t('storeRequisition.filterAll', 'Tous')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200">
                {catalogItems.length}
              </span>
            </button>

            {/* Filter Toggle 2: [ 🍰 Produits Finis ] */}
            <button
              id="filter-toggle-finished"
              type="button"
              onClick={() => setCatalogFilter('FINISHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                catalogFilter === 'FINISHED'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              <span>{t('storeRequisition.filterFinished', '🍰 Produits Finis')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-700 text-amber-100">
                {catalogItems.filter((i) => i.itemType === 'finished_product').length}
              </span>
            </button>

            {/* Filter Toggle 3: [ 📦 Matières Premières ] */}
            <button
              id="filter-toggle-raw"
              type="button"
              onClick={() => setCatalogFilter('RAW')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                catalogFilter === 'RAW'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-white text-indigo-900 hover:bg-indigo-50 border border-indigo-300'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('storeRequisition.filterRaw', '📦 Matières Premières')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-700 text-indigo-100">
                {catalogItems.filter((i) => i.itemType === 'raw_material').length}
              </span>
            </button>
          </div>

          {/* Search bar inside catalog filter */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher article..."
              className="w-full text-xs bg-white text-slate-800 rounded-lg pl-8 pr-3 py-1.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* 5. Dynamic Order Line Items Table */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>
                {t('storeRequisition.orderLines', 'Lignes de Commande')} ({orderLines.length})
              </span>
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsConverterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                title={t('unitConverter.title', "Convertisseur d'Unités")}
              >
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                <span>{t('unitConverter.openTool', "Convertisseur d'Unités")}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddLine('finished_product')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>+ {t('storeRequisition.finishedProduct', 'Produit Fini')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddLine('raw_material')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ {t('storeRequisition.rawMaterial', 'Matière Première')}</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 w-36">{t('storeRequisition.type', 'Type')}</th>
                    <th className="p-3 min-w-[240px]">
                      {t('storeRequisition.itemTitle', 'Article / Pâtisserie')}
                    </th>
                    <th className="p-3 w-32">{t('storeRequisition.category', 'Catégorie')}</th>
                    <th className="p-3 w-28">{t('storeRequisition.room', 'Atelier Destiné')}</th>
                    <th className="p-3 w-36">{t('storeRequisition.quantity', 'Quantité')}</th>
                    <th className="p-3 w-24 text-right">{t('storeRequisition.unitPrice', 'Prix Est.')}</th>
                    <th className="p-3 w-28 text-right">{t('storeRequisition.lineTotal', 'Total Ligne')}</th>
                    <th className="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <AnimatePresence initial={false}>
                    {orderLines.map((line, index) => {
                      const lineTotal = line.requestedQty * (line.unitEstimatedCost || 1.0);
                      const isFinished = line.itemType === 'finished_product';

                      return (
                        <motion.tr
                          key={`${line.itemId}-${index}`}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-3 font-semibold text-slate-400">{index + 1}</td>

                          {/* Discriminator Visual Badge */}
                          <td className="p-3">
                            {isFinished ? (
                              <span
                                id={`badge-finished-${index}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs"
                              >
                                <Cake className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{t('storeRequisition.finishedProduct', 'Produit Fini')}</span>
                              </span>
                            ) : (
                              <span
                                id={`badge-raw-${index}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-300 shadow-xs"
                              >
                                <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span>{t('storeRequisition.rawMaterial', 'Matière Première')}</span>
                              </span>
                            )}
                          </td>

                          {/* Item Selection Dropdown */}
                          <td className="p-3">
                            {catalogLoading ? (
                              <div className="flex items-center gap-2 text-slate-500 py-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="text-xs">{t('storeRequisition.catalogLoading', 'Chargement...')}</span>
                              </div>
                            ) : (
                              <select
                                id={`item-select-${index}`}
                                value={line.itemId}
                                onChange={(e) => handleSelectItem(index, e.target.value)}
                                className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                              >
                                {/* Group options by Type if filter is ALL */}
                                {catalogFilter === 'ALL' ? (
                                  <>
                                    <optgroup label="🍰 Produits Finis (Pastry & Viennoiserie)">
                                      {filteredCatalogItems
                                        .filter((c) => c.itemType === 'finished_product')
                                        .map((prod) => (
                                          <option key={prod.itemId} value={prod.itemId}>
                                            {prod.itemTitle} ({prod.unit})
                                          </option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="📦 Matières Premières (Stock Labo)">
                                      {filteredCatalogItems
                                        .filter((c) => c.itemType === 'raw_material')
                                        .map((rm) => (
                                          <option key={rm.itemId} value={rm.itemId}>
                                            {rm.itemTitle} ({rm.unit})
                                          </option>
                                        ))}
                                    </optgroup>
                                  </>
                                ) : (
                                  filteredCatalogItems.map((item) => (
                                    <option key={item.itemId} value={item.itemId}>
                                      {item.itemType === 'finished_product' ? '🍰 ' : '📦 '}
                                      {item.itemTitle} ({item.unit})
                                    </option>
                                  ))
                                )}
                              </select>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="p-3 text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {line.category}
                            </span>
                          </td>

                          {/* Room ID Badge */}
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] uppercase font-bold">
                              {line.roomId || 'storage_lab'}
                            </span>
                          </td>

                          {/* Real-time Counter & Auto Unit (pcs, kg, L) */}
                          <td className="p-3">
                            <div className="flex flex-col gap-1 min-w-[140px]">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      index,
                                      Math.max(1, line.requestedQty - (line.unit === 'kg' ? 5 : 5))
                                    )
                                  }
                                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 transition-colors touch-manipulation font-bold cursor-pointer"
                                  title="-5"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="relative flex-1">
                                  <input
                                    id={`qty-input-${index}`}
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    value={line.requestedQty}
                                    onChange={(e) =>
                                      handleQuantityChange(index, parseInt(e.target.value, 10) || 1)
                                    }
                                    className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      index,
                                      line.requestedQty + (line.unit === 'kg' ? 5 : 5)
                                    )
                                  }
                                  className="w-9 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 transition-colors touch-manipulation font-bold cursor-pointer"
                                  title="+5"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Automatic Realtime Unit Display & Converter */}
                              <div className="flex items-center justify-between text-[11px] px-1">
                                <span className="font-bold text-slate-600 uppercase">
                                  {line.requestedQty} {line.unit}
                                </span>
                                <UnitConversionBadge
                                  quantity={line.requestedQty}
                                  unit={line.unit}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="p-3 text-right font-medium text-slate-600">
                            {(line.unitEstimatedCost || 1.0).toFixed(2)} DZD
                          </td>

                          {/* Total Line */}
                          <td className="p-3 text-right font-bold text-slate-900 font-mono">
                            {lineTotal.toFixed(2)} DZD
                          </td>

                          {/* Action / Delete */}
                          <td className="p-3 text-center">
                            <button
                              id={`delete-line-${index}`}
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title={t('storeRequisition.removeLine', 'Supprimer')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 6. Special Notes & Urgency Instructions */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('storeRequisition.notes', 'Notes Spéciales & Instructions de Livraison (Optionnel)')}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t(
              'storeRequisition.notesPlaceholder',
              'Ex: Livraison tôt le matin demandée pour événement, emballage réfrigéré recommandé...'
            )}
            className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-3 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* 7. Submission Actions Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {t(
                'storeRequisition.disclaimer',
                "La commande sera transmise immédiatement à l'équipe du Laboratoire Central."
              )}
            </span>
          </div>

          <button
            id="submit-requisition-btn"
            type="submit"
            disabled={submitting || orderLines.length === 0}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer ${
              submitting
                ? 'bg-slate-400 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg active:scale-98'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('storeRequisition.submitting', 'Transmission en cours...')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {t('storeRequisition.submitOrder', 'Envoyer la Commande au Labo')} (
                  {totalEstimatedCost.toFixed(2)} DZD)
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Unit Converter Modal */}
      <UnitConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />
    </div>
  );
};

export default StoreRequisition;
