import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  addRequisition,
  getActiveStore,
  getRetailProducts,
  notifyToast,
  saveRetailProducts,
  subscribeToStoreChanges,
} from '../../services/storage';
import { fetchRetailProductsFromSupabase, insertRequisitionToSupabase } from '../../services/supabaseService';
import { dbBulkUpsertProducts } from '../../db/database';
import { RequisitionItem, RetailProduct } from '../../types';
import { UnitConverterModal } from '../common/UnitConverterModal';
import { UnitConversionBadge } from '../common/UnitConversionBadge';
import { Plus, Minus, Trash2, Send, ShoppingBag, Calendar, AlertCircle, Sparkles, Check, Loader2, Scale, RefreshCw } from 'lucide-react';

interface RequisitionFormProps {
  onSuccess?: () => void;
}

const toRequisitionLine = (product: RetailProduct, quantityRequested: number): Omit<RequisitionItem, 'id'> => ({
  productName: product.name,
  category: product.category,
  quantityRequested,
  unit: product.unit,
  unitEstimatedCost: product.costPrice,
});

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const activeStore = getActiveStore();
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);

  // Live product catalog, sourced from the shared store (localStorage/Dexie), never a static mock.
  // No filtering here on stock level or an isAvailable flag: a newly created finished product
  // (any category/room, including new ones like mille_feuille or gateaux_orientaux) must be
  // requestable immediately, even before central lab has produced stock for it.
  const [catalog, setCatalog] = useState<RetailProduct[]>(() => getRetailProducts());
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToStoreChanges(() => setCatalog(getRetailProducts()));
    return unsubscribe;
  }, []);

  const catalogByCategory = useMemo(() => {
    const groups = new Map<string, RetailProduct[]>();
    for (const product of catalog) {
      const key = product.category || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(product);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const handleRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    try {
      const cloudProducts = await fetchRetailProductsFromSupabase();
      if (cloudProducts.length > 0) {
        saveRetailProducts(cloudProducts);
        await dbBulkUpsertProducts(
          cloudProducts.map((p) => ({
            id: p.id,
            code: p.sku,
            name: p.name,
            category: p.category,
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
        notifyToast({
          type: 'success',
          title: 'Catalogue Actualisé',
          message: `${cloudProducts.length} article(s) synchronisé(s) depuis Supabase.`,
        });
      } else {
        setCatalog(getRetailProducts());
        notifyToast({
          type: 'info',
          title: 'Catalogue Local',
          message: 'Aucune donnée Supabase disponible, utilisation du catalogue local le plus récent.',
        });
      }
    } catch (err: any) {
      console.error('Error refreshing product catalog:', err);
      setCatalog(getRetailProducts());
      notifyToast({
        type: 'error',
        title: 'Erreur de Synchronisation',
        message: err.message || "Échec de l'actualisation du catalogue.",
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

  // Dynamic Line Items state, seeded from the first two catalog products once loaded.
  const [items, setItems] = useState<Omit<RequisitionItem, 'id'>[]>(() => {
    const seed = getRetailProducts();
    return seed.slice(0, 2).map((p, idx) => toRequisitionLine(p, idx === 0 ? 100 : 80));
  });

  const handleAddItem = () => {
    const firstProduct = catalog[0];
    if (!firstProduct) {
      notifyToast({
        type: 'error',
        title: 'Catalogue Vide',
        message: 'Aucun produit disponible. Actualisez le catalogue avant de continuer.',
      });
      return;
    }
    setItems((prev) => [...prev, toRequisitionLine(firstProduct, 50)]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('A requisition must contain at least one item.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCatalogSelect = (index: number, productName: string) => {
    const matched = catalog.find((p) => p.name === productName);
    if (!matched) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productName: matched.name,
        category: matched.category,
        unit: matched.unit,
        unitEstimatedCost: matched.costPrice,
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

  // Quick-add suggestions are derived live from the loaded catalog, not hardcoded indices,
  // so they always reflect whatever products currently exist (including newly added ones).
  const quickAddSuggestions = useMemo(() => catalog.slice(0, 4), [catalog]);

  const handleQuickAddTemplate = (product: RetailProduct, defaultQty: number) => {
    setItems((prev) => [...prev, toRequisitionLine(product, defaultQty)]);
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
        title: 'Validation Error',
        message: 'Please add at least one pastry item to your requisition.',
      });
      return;
    }

    if (!dateNeeded) {
      notifyToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please specify the target delivery date required for your store.',
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

      // Insert directly into Supabase table
      const createdSupaReq = await insertRequisitionToSupabase(reqPayload);

      // Also sync to local storage cache
      addRequisition(reqPayload);

      notifyToast({
        type: 'success',
        title: 'Requisition Supabase Transmise !',
        message: `${createdSupaReq.requisitionNumber} enregistrée dans Supabase pour ${activeStore.name}.`,
      });

      // Reset notes and reset items to default
      setNotes('');
      setItems([
        {
          productName: CATALOG_PRODUCTS[0].name,
          category: CATALOG_PRODUCTS[0].category,
          quantityRequested: 100,
          unit: CATALOG_PRODUCTS[0].unit,
          unitEstimatedCost: CATALOG_PRODUCTS[0].unitEstimatedCost,
        },
      ]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error inserting requisition to Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Supabase',
        message: err.message || 'Échec de la création de la réquisition sur Supabase.'
      });
    } finally {
      setSubmitting(false);
    }
  };

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
              <span className="text-xs text-emerald-200 font-medium">Formulaire de Commande Boutique</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{activeStore.name}</h2>
            <p className="text-xs text-emerald-100/80 mt-0.5">{activeStore.address} • Gérant : {activeStore.managerName}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-right shrink-0">
            <span className="text-[11px] text-emerald-200 block uppercase font-bold tracking-wider">Total Estimé Commande</span>
            <span className="text-2xl font-black text-white">{totalEstimatedCost.toFixed(2)} DZD</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Basic Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Point de Vente Assigné</label>
            <input
              type="text"
              readOnly
              value={activeStore.name}
              className="w-full text-base sm:text-xs font-medium bg-slate-200/80 text-slate-700 rounded-lg px-3 py-2.5 border border-slate-300 cursor-not-allowed min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Demandeur (Nom Employé)</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date de Livraison Souhaitée</label>
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

        {/* Quick Add Catalog Templates */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ajout Rapide de Incontournables</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Cliquer pour ajouter à la liste de commande</span>
              <button
                type="button"
                onClick={handleRefreshCatalog}
                disabled={isRefreshingCatalog}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Recharger le catalogue produits depuis Supabase et mettre à jour le cache local"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCatalog ? 'animate-spin' : ''}`} />
                Actualiser le Catalogue
              </button>
            </div>
          </div>
          {quickAddSuggestions.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Aucun produit dans le catalogue. Cliquez sur "Actualiser le Catalogue" pour synchroniser.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {quickAddSuggestions.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleQuickAddTemplate(product, 50)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> +50 {product.name}
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
              Lignes de Commande ({items.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConverterOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                title={t('unitConverter.title', 'Convertisseur d\'Unités')}
              >
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                <span>{t('unitConverter.openTool', 'Convertisseur d\'Unités')}</span>
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Ajouter une Ligne
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3 w-8">#</th>
                    <th className="p-3 min-w-[220px]">Pâtisserie / Article</th>
                    <th className="p-3 w-32">Catégorie</th>
                    <th className="p-3 w-28">Quantité</th>
                    <th className="p-3 w-20">Unité</th>
                    <th className="p-3 w-28 text-right">Prix Unitaire</th>
                    <th className="p-3 w-32 text-right">Total Ligne</th>
                    <th className="p-3 w-12 text-center">Action</th>
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
                            <select
                              value={item.productName}
                              onChange={(e) => handleCatalogSelect(index, e.target.value)}
                              className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            >
                              {catalogByCategory.map(([category, products]) => (
                                <optgroup key={category} label={category}>
                                  {products.map((prod) => (
                                    <option key={prod.id} value={prod.name}>
                                      {prod.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
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
                            {item.unitEstimatedCost.toFixed(2)} DZD
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {lineTotal.toFixed(2)} DZD
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Supprimer la ligne"
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

        {/* Special Notes & Urgency Instructions */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes Spéciales & Instructions de Livraison (Optionnel)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Livraison tôt le matin demandée pour événement, emballage réfrigéré recommandé..."
            className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-3 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Submission Actions Footer */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>La commande sera transmise immédiatement à l'équipe du Laboratoire Central.</span>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
            Envoyer la Commande au Labo ({totalEstimatedCost.toFixed(2)} DZD)
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
