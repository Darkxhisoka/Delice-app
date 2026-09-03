import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  addRequisition,
  getActiveStore,
  getRawMaterials,
  getRetailProducts,
  notifyToast,
  saveRetailProducts,
  subscribeToStoreChanges,
} from '../../services/storage';
import { fetchRawMaterialsFromSupabase, fetchRetailProductsFromSupabase, insertRequisitionToSupabase } from '../../services/supabaseService';
import { dbBulkUpsertProducts, CATEGORY_TO_ROOM_MAP } from '../../db/database';
import { getProductRoomId } from '../../utils/orderAggregator';
import { RawMaterial, RequisitionItem, RequisitionItemType, RetailProduct, FinishedProductCategory } from '../../types';
import { UnitConverterModal } from '../common/UnitConverterModal';
import { UnitConversionBadge } from '../common/UnitConversionBadge';
import { Plus, Minus, Trash2, Send, ShoppingBag, Calendar, AlertCircle, Loader2, Scale, RefreshCw, Search, ChevronDown, Package, Tag } from 'lucide-react';

interface RequisitionFormProps {
  onSuccess?: () => void;
}

type ItemFilter = 'all' | 'finished' | 'raw';

interface UnifiedCatalogItem {
  itemId: string;
  itemType: RequisitionItemType;
  itemTitle: string;
  category: string;
  unit: string;
  unitCost: number;
}

const toUnifiedItem = (product: RetailProduct): UnifiedCatalogItem => ({
  itemId: product.id,
  itemType: 'finished',
  itemTitle: product.name,
  category: product.category || 'Other',
  unit: product.unit,
  unitCost: product.costPrice,
});

const rawToUnifiedItem = (mat: RawMaterial): UnifiedCatalogItem => ({
  itemId: mat.id,
  itemType: 'raw',
  itemTitle: mat.name,
  category: mat.category,
  unit: mat.unit,
  unitCost: mat.currentAvgCost,
});

const toRequisitionLine = (item: UnifiedCatalogItem, quantityRequested: number): Omit<RequisitionItem, 'id'> => ({
  itemId: item.itemId,
  itemType: item.itemType,
  itemTitle: item.itemTitle,
  productName: item.itemTitle,
  category: item.category,
  quantityRequested,
  unit: item.unit,
  unitEstimatedCost: item.unitCost,
});

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const activeStore = getActiveStore();
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);

  const [catalog, setCatalog] = useState<RetailProduct[]>(() => getRetailProducts());
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => getRawMaterials());
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToStoreChanges(() => {
      setCatalog(getRetailProducts());
      setRawMaterials(getRawMaterials());
    });
    return unsubscribe;
  }, []);

  const unifiedCatalog = useMemo<UnifiedCatalogItem[]>(() => {
    const finished = catalog.map(toUnifiedItem);
    const raw = rawMaterials.map(rawToUnifiedItem);
    return [...finished, ...raw];
  }, [catalog, rawMaterials]);

  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = useMemo(() => {
    let items = unifiedCatalog;
    if (itemFilter === 'finished') items = items.filter((i) => i.itemType === 'finished');
    else if (itemFilter === 'raw') items = items.filter((i) => i.itemType === 'raw');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.itemTitle.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.itemId.toLowerCase().includes(q)
      );
    }
    return items;
  }, [unifiedCatalog, itemFilter, searchQuery]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, UnifiedCatalogItem[]>();
    for (const item of filteredCatalog) {
      const key = item.category || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredCatalog]);

  const finishedCount = catalog.length;
  const rawCount = rawMaterials.length;

  const handleRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    try {
      const [cloudProducts, cloudRawMaterials] = await Promise.all([
        fetchRetailProductsFromSupabase(),
        fetchRawMaterialsFromSupabase(),
      ]);

      if (cloudProducts.length > 0) {
        saveRetailProducts(cloudProducts);
        await dbBulkUpsertProducts(
          cloudProducts.map((p) => ({
            id: p.id,
            code: p.sku,
            name: p.name,
            category: p.category,
            roomId: CATEGORY_TO_ROOM_MAP[p.category as FinishedProductCategory] || getProductRoomId(p.name, p.category),
            unit: p.unit,
            price: p.price,
            costPrice: p.costPrice,
            currentStock: 0,
            minStockAlert: 0,
            storeId: activeStore.id,
            isActive: true,
            updatedAt: new Date().toISOString(),
          }))
        );
        setCatalog(cloudProducts);
      }

      if (cloudRawMaterials.length > 0) {
        const { saveRawMaterials } = await import('../../services/storage');
        saveRawMaterials(cloudRawMaterials);
        setRawMaterials(cloudRawMaterials);
      }

      const totalNew = cloudProducts.length + cloudRawMaterials.length;
      if (totalNew > 0) {
        notifyToast({
          type: 'success',
          title: t('requisition.catalogUpdated', 'Catalogue Actualisé'),
          message: `${totalNew} ${t('requisition.itemsSynced', 'article(s) synchronisé(s) depuis Supabase.')}`,
        });
      } else {
        notifyToast({
          type: 'info',
          title: t('requisition.localCatalog', 'Catalogue Local'),
          message: t('requisition.noCloudData', 'Aucune donnée Supabase disponible, utilisation du catalogue local.'),
        });
      }
    } catch (err: any) {
      console.error('Error refreshing catalog:', err);
      setCatalog(getRetailProducts());
      setRawMaterials(getRawMaterials());
      notifyToast({
        type: 'error',
        title: t('requisition.syncError', 'Erreur de Synchronisation'),
        message: err.message || t('requisition.syncFailed', "Échec de l'actualisation du catalogue."),
      });
    } finally {
      setIsRefreshingCatalog(false);
    }
  };

  const [dateNeeded, setDateNeeded] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  const [requestedBy, setRequestedBy] = useState<string>(activeStore.managerName || 'Store Staff');
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<Omit<RequisitionItem, 'id'>[]>(() => {
    const seed = getRetailProducts();
    if (seed.length === 0) return [];
    return seed.slice(0, 2).map((p, idx) => toRequisitionLine(toUnifiedItem(p), idx === 0 ? 100 : 80));
  });

  const handleAddItem = () => {
    const firstItem = unifiedCatalog[0];
    if (!firstItem) {
      notifyToast({
        type: 'error',
        title: t('requisition.emptyCatalog', 'Catalogue Vide'),
        message: t('requisition.emptyCatalogMsg', 'Aucun produit disponible. Actualisez le catalogue avant de continuer.'),
      });
      return;
    }
    setItems((prev) => [...prev, toRequisitionLine(firstItem, 50)]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      notifyToast({
        type: 'warning',
        title: t('requisition.minItems', 'Minimum 1 ligne'),
        message: t('requisition.minItemsMsg', 'Une réquisition doit contenir au moins un article.'),
      });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const matched = unifiedCatalog.find((i) => i.itemId === itemId);
    if (!matched) return;

    setItems((prev) => {
      const updated = [...prev];
      const existing = updated[index];
      updated[index] = {
        ...existing,
        itemId: matched.itemId,
        itemType: matched.itemType,
        itemTitle: matched.itemTitle,
        productName: matched.itemTitle,
        category: matched.category,
        unit: matched.unit,
        unitEstimatedCost: matched.unitCost,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(1, qty);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantityRequested: validQty };
      return updated;
    });
  };

  const quickAddSuggestions = useMemo(() => unifiedCatalog.slice(0, 6), [unifiedCatalog]);

  const handleQuickAddTemplate = (item: UnifiedCatalogItem, defaultQty: number) => {
    setItems((prev) => [...prev, toRequisitionLine(item, defaultQty)]);
  };

  const totalEstimatedCost = items.reduce(
    (sum, item) => sum + item.quantityRequested * item.unitEstimatedCost,
    0
  );

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      notifyToast({
        type: 'error',
        title: t('requisition.validationError', 'Validation Error'),
        message: t('requisition.addItemAtLeast', 'Please add at least one item to your requisition.'),
      });
      return;
    }

    if (!dateNeeded) {
      notifyToast({
        type: 'error',
        title: t('requisition.validationError', 'Validation Error'),
        message: t('requisition.specifyDate', 'Please specify the target delivery date.'),
      });
      return;
    }

    setSubmitting(true);

    try {
      const itemsWithIds: RequisitionItem[] = items.map((item, idx) => ({
        ...item,
        id: `rqi-${Date.now()}-${idx}`,
      }));

      const reqPayload = {
        storeId: activeStore.id,
        storeName: activeStore.name,
        requestedBy: requestedBy.trim() || activeStore.managerName,
        dateNeeded,
        notes,
        items: itemsWithIds,
        totalEstimatedCost,
      };

      const createdSupaReq = await insertRequisitionToSupabase(reqPayload);
      addRequisition(reqPayload);

      notifyToast({
        type: 'success',
        title: t('requisition.submitted', 'Réquisition Transmise !'),
        message: `${createdSupaReq.requisitionNumber} — ${activeStore.name}`,
      });

      setNotes('');
      if (unifiedCatalog.length > 0) {
        setItems([toRequisitionLine(unifiedCatalog[0], 100)]);
      } else {
        setItems([]);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error inserting requisition to Supabase:', err);
      notifyToast({
        type: 'error',
        title: t('requisition.submitError', 'Erreur Supabase'),
        message: err.message || t('requisition.submitFailed', "Échec de la création de la réquisition."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filterButtons: { key: ItemFilter; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: t('requisition.filterAll', 'Tous'), count: unifiedCatalog.length, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { key: 'finished', label: t('requisition.filterFinished', 'Produits Finis'), count: finishedCount, icon: <Tag className="w-3.5 h-3.5" /> },
    { key: 'raw', label: t('requisition.filterRaw', 'Matières Premières'), count: rawCount, icon: <Package className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                {activeStore.code}
              </span>
              <span className="text-xs text-emerald-200 font-medium">{t('requisition.formSubtitle', 'Formulaire de Commande Boutique')}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{activeStore.name}</h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">{activeStore.address} • {t('requisition.manager', 'Gérant')} : {activeStore.managerName}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">{t('requisition.totalEstimate', 'Total Estimé')}</span>
            <span className="text-2xl font-black text-white">{totalEstimatedCost.toFixed(2)} {t('common.currency', 'DZD')}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">

        {/* Basic Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('requisition.assignedStore', 'Point de Vente Assigné')}</label>
            <input
              type="text"
              readOnly
              value={activeStore.name}
              className="w-full text-base sm:text-xs font-medium bg-slate-200/80 text-slate-700 rounded-lg px-3 py-2.5 border border-slate-300 cursor-not-allowed min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('requisition.requester', 'Demandeur')}</label>
            <input
              type="text"
              required
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              placeholder={t('requisition.requesterPlaceholder', "Nom de l'Employé Magasin")}
              className="w-full text-base sm:text-xs font-medium bg-white text-slate-900 rounded-lg px-3 py-2.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('requisition.deliveryDate', 'Date de Livraison Souhaitée')}</label>
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

        {/* Filter Toggle + Search + Refresh */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => { setItemFilter(btn.key); setSearchQuery(''); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    itemFilter === btn.key
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {btn.icon}
                  {btn.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    itemFilter === btn.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleRefreshCatalog}
              disabled={isRefreshingCatalog}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title={t('requisition.refreshTooltip', 'Recharger le catalogue depuis Supabase')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCatalog ? 'animate-spin' : ''}`} />
              {t('requisition.refreshCatalog', 'Actualiser le Catalogue')}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('requisition.searchPlaceholder', 'Rechercher un produit fini ou matière première...')}
              className="w-full text-sm font-medium bg-white text-slate-900 rounded-xl ps-10 pe-4 py-2.5 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Suggestions */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            {t('requisition.quickAdd', 'Ajout Rapide')}
          </span>
          {quickAddSuggestions.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {t('requisition.noProducts', 'Aucun produit. Cliquez sur "Actualiser le Catalogue".')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickAddSuggestions.map((item) => (
                <button
                  key={`${item.itemType}-${item.itemId}`}
                  type="button"
                  onClick={() => handleQuickAddTemplate(item, 50)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    item.itemType === 'finished'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {item.itemType === 'finished' ? '🏷️' : '📦'} +50 {item.itemTitle}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              {t('requisition.orderLines', 'Lignes de Commande')} ({items.length})
            </h3>
            <div className="flex items-center gap-2">
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
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> {t('requisition.addLine', 'Ajouter une Ligne')}
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 min-w-[260px]">{t('requisition.colItem', 'Article / Matière')}</th>
                    <th className="p-3 w-24">{t('requisition.colType', 'Type')}</th>
                    <th className="p-3 w-32">{t('requisition.colCategory', 'Catégorie')}</th>
                    <th className="p-3 w-28">{t('requisition.colQuantity', 'Quantité')}</th>
                    <th className="p-3 w-20">{t('requisition.colUnit', 'Unité')}</th>
                    <th className="p-3 w-28 text-right">{t('requisition.colUnitCost', 'Coût Unit.')}</th>
                    <th className="p-3 w-32 text-right">{t('requisition.colLineTotal', 'Total Ligne')}</th>
                    <th className="p-3 w-12 text-center">{t('requisition.colAction', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => {
                      const lineTotal = item.quantityRequested * item.unitEstimatedCost;
                      return (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-3 font-semibold text-slate-400">{index + 1}</td>
                          <td className="p-3">
                            <UnifiedItemSelector
                              value={item.itemId}
                              currentTitle={item.itemTitle}
                              currentType={item.itemType}
                              groupedCatalog={groupedCatalog}
                              onSelect={(itemId) => handleItemSelect(index, itemId)}
                              searchPlaceholder={t('requisition.searchPlaceholder', 'Rechercher...')}
                            />
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${
                                item.itemType === 'finished'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.itemType === 'finished' ? '🏷️' : '📦'}
                              {item.itemType === 'finished'
                                ? t('requisition.badgeFinished', 'Produit Fini')
                                : t('requisition.badgeRaw', 'Matière Première')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 min-w-[130px]">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(index, Math.max(1, item.quantityRequested - 5))}
                                className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 transition-colors touch-manipulation font-bold"
                                title="-5"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                value={item.quantityRequested}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                className="w-full text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 text-center focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(index, item.quantityRequested + 5)}
                                className="w-9 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 transition-colors touch-manipulation font-bold"
                                title="+5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-slate-700">{item.unit}</span>
                              <UnitConversionBadge
                                quantity={item.quantityRequested}
                                unit={item.unit}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-600">
                            {item.unitEstimatedCost.toFixed(2)} {t('common.currencyDa', 'DZD')}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {lineTotal.toFixed(2)} {t('common.currencyDa', 'DZD')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                              title={t('requisition.removeLine', 'Supprimer la ligne')}
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

        {/* Special Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('requisition.specialNotes', 'Notes Spéciales & Instructions de Livraison')} ({t('common.optional', 'Optionnel')})
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('requisition.notesPlaceholder', 'Ex: Livraison tôt le matin, emballage réfrigéré...')}
            className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-3 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Submission Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('requisition.submitNote', 'La commande sera transmise immédiatement au Laboratoire Central.')}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {t('requisition.submitButton', 'Envoyer la Commande')} ({totalEstimatedCost.toFixed(2)} {t('common.currency', 'DZD')})
          </button>
        </div>

      </form>

      <UnitConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />
    </div>
  );
};

interface UnifiedItemSelectorProps {
  value: string;
  currentTitle: string;
  currentType: RequisitionItemType;
  groupedCatalog: [string, UnifiedCatalogItem[]][];
  onSelect: (itemId: string) => void;
  searchPlaceholder: string;
}

const UnifiedItemSelector: React.FC<UnifiedItemSelectorProps> = ({
  value,
  currentTitle,
  currentType,
  groupedCatalog,
  onSelect,
  searchPlaceholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { t: t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedCatalog;
    const q = search.toLowerCase().trim();
    return groupedCatalog
      .map(([category, items]) => [
        category,
        items.filter(
          (i) =>
            i.itemTitle.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.itemId.toLowerCase().includes(q)
        ),
      ] as [string, UnifiedCatalogItem[]])
      .filter(([, items]) => items.length > 0);
  }, [groupedCatalog, search]);

  const totalVisible = filteredGroups.reduce((sum, [, items]) => sum + items.length, 0);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className={`w-full flex items-center justify-between gap-2 text-xs font-semibold rounded-xl p-2.5 border transition-colors min-h-[44px] ${
          currentType === 'finished'
            ? 'bg-emerald-50/50 border-emerald-200 text-slate-900 hover:border-emerald-300'
            : 'bg-amber-50/50 border-amber-200 text-slate-900 hover:border-amber-300'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span>{currentType === 'finished' ? '🏷️' : '📦'}</span>
          <span className="truncate">{currentTitle || '—'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full min-w-[300px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-2.5 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full text-xs bg-slate-50 text-slate-900 rounded-lg ps-8 pe-3 py-2 border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="max-h-[260px] overflow-y-auto overscroll-contain">
              {totalVisible === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {t('requisition.noMatch', 'Aucun article trouvé')}
                </div>
              ) : (
                filteredGroups.map(([category, catItems]) => (
                  <div key={category}>
                    <div className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      {category}
                    </div>
                    {catItems.map((item) => (
                      <button
                        key={`${item.itemType}-${item.itemId}`}
                        type="button"
                        onClick={() => {
                          onSelect(item.itemId);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${
                          item.itemId === value ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <span className="shrink-0">{item.itemType === 'finished' ? '🏷️' : '📦'}</span>
                        <span className="font-semibold text-slate-800 truncate flex-1">{item.itemTitle}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.itemType === 'finished'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.itemType === 'finished'
                            ? t('requisition.badgeFinished', 'Produit Fini')
                            : t('requisition.badgeRaw', 'Matière Première')}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400 font-medium">
                          {item.unitCost.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400">
              <span>{totalVisible} {t('requisition.itemsAvailable', 'article(s)')}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">🏷️ {t('requisition.badgeFinished', 'Produit Fini')}</span>
                <span className="flex items-center gap-1">📦 {t('requisition.badgeRaw', 'Matière Première')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
