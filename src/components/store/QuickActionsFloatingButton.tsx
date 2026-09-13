import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StoreLocation,
  RetailStoreStock,
  UnsoldLogReason
} from '../../types';
import {
  getRetailStoreStock,
  recordUnsoldLog,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  Zap,
  PackageX,
  X,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldAlert,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

interface QuickActionsFloatingButtonProps {
  currentStore: StoreLocation;
  onNavigateTab?: (tab: 'POS_SALES' | 'RECEIVING' | 'RECONCILIATION' | 'UNSOLD_LOGS' | 'SALES_ANALYTICS' | 'NEW_REQ' | 'HISTORY') => void;
}

export const QuickActionsFloatingButton: React.FC<QuickActionsFloatingButtonProps> = ({
  currentStore,
  onNavigateTab
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'REPORT_UNSOLD' | 'QUICK_LINKS'>('REPORT_UNSOLD');
  const [stock, setStock] = useState<RetailStoreStock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected state for fast reporting
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<UnsoldLogReason>('EXPIRED_WASTE');
  const [notes, setNotes] = useState('');
  const [reportedBy, setRecordedBy] = useState('Store Staff');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastReportedSummary, setLastReportedSummary] = useState('');

  const quickReasons: { key: UnsoldLogReason; label: string; iconName: string; bgClass: string; textClass: string }[] = [
    {
      key: 'EXPIRED_WASTE',
      label: t('quickActions.reasonExpired', 'Fin de Journée / DLC'),
      iconName: 'Clock',
      bgClass: 'bg-red-50 hover:bg-red-100 border-red-200',
      textClass: 'text-red-700'
    },
    {
      key: 'DAMAGED_DISPLAY',
      label: t('quickActions.reasonDamaged', 'Vitrine Abîmée'),
      iconName: 'AlertTriangle',
      bgClass: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
      textClass: 'text-amber-700'
    },
    {
      key: 'STAFF_TASTING',
      label: t('quickActions.reasonTasting', 'Dégustation Staff'),
      iconName: 'Sparkles',
      bgClass: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      textClass: 'text-purple-700'
    },
    {
      key: 'CLEARANCE_MARKDOWN',
      label: t('quickActions.reasonClearance', 'Remise Soir (Soldes)'),
      iconName: 'ShieldAlert',
      bgClass: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      textClass: 'text-blue-700'
    }
  ];

  const loadStock = () => {
    const items = getRetailStoreStock(currentStore.id);
    setStock(items);
    if (items.length > 0 && !selectedProductId) {
      setSelectedProductId(items[0].productId);
    }
  };

  useEffect(() => {
    loadStock();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadStock();
    });
    return unsubscribe;
  }, [currentStore.id]);

  const selectedStockItem = stock.find((s) => s.productId === selectedProductId) || stock[0];

  const filteredStock = stock.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFastReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || quantity <= 0) return;

    const unitCost = selectedStockItem.costPrice || 0;
    const unitPrice = selectedStockItem.price || 0;
    const totalLossValue = quantity * (reason === 'CLEARANCE_MARKDOWN' ? unitPrice * 0.5 : unitCost);

    recordUnsoldLog({
      storeId: currentStore.id,
      storeName: currentStore.name,
      recordedBy: reportedBy || 'Caisse Store',
      productId: selectedStockItem.productId,
      productName: selectedStockItem.productName,
      category: selectedStockItem.category,
      quantity,
      unit: selectedStockItem.unit,
      unitCost,
      sellingPrice: unitPrice,
      totalLossValue,
      reason,
      notes: notes.trim() || 'Signalement express via Quick Actions floating button',
    });

    setLastReportedSummary(`${quantity}x ${selectedStockItem.productName} (${selectedStockItem.unit})`);
    setIsSuccess(true);
    setQuantity(1);
    setNotes('');

    setTimeout(() => {
      setIsSuccess(false);
    }, 3500);
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))] rtl:right-auto rtl:left-[calc(1.25rem+env(safe-area-inset-left,0px))] z-40 flex flex-col items-end rtl:items-start gap-2">
        
        {/* Helper pulse badge when closed */}
        {!isOpen && (
          <div className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg border border-slate-700 flex items-center gap-1.5 animate-bounce pointer-events-none">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{t('quickActions.fabBadge', 'Signalement Express Invendus')}</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('quickActions.ariaLabel', 'Actions rapides')}
          className={`relative p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 text-white rotate-90 ring-4 ring-slate-300'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 ring-4 ring-amber-400/30 hover:scale-105'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 fill-slate-950" />
            </div>
          )}
          
          {/* Active store badge */}
          <span className="absolute -top-1 -right-1 rtl:-right-auto rtl:-left-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
          </span>
        </button>
      </div>

      {/* Floating Action Popover / Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200">
            
            {/* Popover Header */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-amber-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div className="text-start">
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>{t('quickActions.headerTitle', { name: currentStore.name, defaultValue: `Quick Actions — ${currentStore.name}` })}</span>
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    {t('quickActions.headerSubtitle', 'Signalement 1-Tap des invendus & casse directement au Labo Central')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Toast Banner */}
            {isSuccess && (
              <div className="bg-emerald-500 text-slate-950 p-4 font-bold text-xs flex items-center justify-between animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
                  <div className="text-start">
                    <div>{t('quickActions.successTitle', 'Invendu Transmis au Labo Central avec Succès !')}</div>
                    <div className="font-normal text-[11px] opacity-90">{lastReportedSummary}</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="px-2 py-1 rounded bg-slate-950 text-white text-[10px] font-bold uppercase cursor-pointer"
                >
                  {t('quickActions.ok', 'OK')}
                </button>
              </div>
            )}

            {/* Tabs inside modal */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                onClick={() => setActiveMode('REPORT_UNSOLD')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'REPORT_UNSOLD'
                    ? 'border-amber-500 text-slate-900 bg-white font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <PackageX className="w-4 h-4 text-amber-600" />
                <span>{t('quickActions.tabUnsold', '⚡ Signalement 1-Tap Invendu')}</span>
              </button>
              <button
                onClick={() => setActiveMode('QUICK_LINKS')}
                className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'QUICK_LINKS'
                    ? 'border-indigo-600 text-indigo-950 bg-white font-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>{t('quickActions.tabShortcuts', 'Raccourcis Navigation')}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              
              {activeMode === 'REPORT_UNSOLD' ? (
                <form onSubmit={handleFastReportSubmit} className="space-y-4">
                  
                  {/* Step 1: Select Product */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800">{t('quickActions.step1', "1. Sélectionner l'Article Pâtisserie en Stock :")}</label>
                      <span className="text-[10px] text-slate-400 font-semibold">{t('quickActions.availableCount', { count: filteredStock.length, defaultValue: `${filteredStock.length} disponibles` })}</span>
                    </div>

                    {/* Fast Search input */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('quickActions.searchPlaceholder', 'Rechercher par nom...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-slate-50 text-start"
                      />
                    </div>

                    {/* Product Grid selection */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1 rtl:pr-0 rtl:pl-1">
                      {filteredStock.map((st) => (
                        <button
                          key={st.productId}
                          type="button"
                          onClick={() => setSelectedProductId(st.productId)}
                          className={`p-2 rounded-xl text-left rtl:text-right border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                            selectedProductId === st.productId
                              ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="truncate font-bold text-[11px]">{st.productName}</div>
                          <div className={`text-[10px] mt-1 ${selectedProductId === st.productId ? 'text-slate-950/80 font-medium' : 'text-slate-400'}`}>
                            {t('quickActions.stockLabel', { stock: st.currentStock, unit: st.unit, defaultValue: `Stock : ${st.currentStock} ${st.unit}` })}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Preset Reason Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 text-start">{t('quickActions.step2', '2. Motif du Signalement :')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {quickReasons.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setReason(r.key)}
                          className={`p-2.5 rounded-xl border text-xs text-left rtl:text-right transition-all cursor-pointer ${
                            reason === r.key
                              ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-sm'
                              : `${r.bgClass} ${r.textClass} font-semibold`
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: Quantity Stepper with Quick Presets */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-start">
                      <span className="text-xs font-bold text-slate-800">{t('quickActions.step3', '3. Quantité Déclarée :')}</span>
                      <p className="text-[10px] text-slate-400">{t('quickActions.unitsToDeduct', 'Paires ou unités à déduire')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-12 text-center font-black text-sm bg-transparent border-none focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Presets */}
                      <div className="flex items-center gap-1">
                        {[1, 5, 10].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQuantity(preset)}
                            className={`px-2 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                              quantity === preset
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            +{preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional Note */}
                  <div>
                    <input
                      type="text"
                      placeholder={t('quickActions.notePlaceholder', 'Note optionnelle (ex: lot abîmé en vitrine)')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-start"
                    />
                  </div>

                  {/* Submit 1-Tap Button */}
                  <button
                    type="submit"
                    disabled={!selectedStockItem}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>{t('quickActions.submitBtn', '⚡ TRANSMETTRE INVENDU AU LABO CENTRAL (1-TAP)')}</span>
                  </button>

                </form>
              ) : (
                /* QUICK LINKS TAB */
                <div className="space-y-2 py-2">
                  <p className="text-xs text-slate-500 font-medium mb-3 text-start">
                    {t('quickActions.shortcutsDesc', 'Accès rapide aux fonctionnalités clés du portal point de vente :')}
                  </p>

                  <button
                    onClick={() => {
                      onNavigateTab?.('POS_SALES');
                      setIsOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900">{t('quickActions.posTitle', 'Caisse POS & Vente Directe Client')}</div>
                      <div className="text-[10px] text-slate-500">{t('quickActions.posDesc', 'Enregistrer une transaction comptant ou carte')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigateTab?.('RECEIVING');
                      setIsOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-900">{t('quickActions.receivingTitle', '🚚 Réception Camion & Contrôle Stock')}</div>
                      <div className="text-[10px] text-slate-500">{t('quickActions.receivingDesc', 'Pointer la livraison du Labo Central et valider')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigateTab?.('NEW_REQ');
                      setIsOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">{t('quickActions.reqTitle', 'Demande Approvisionnement Labo')}</div>
                      <div className="text-[10px] text-slate-500">{t('quickActions.reqDesc', 'Commander des pâtisseries pour demain')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
                  </button>

                  <button
                    onClick={() => {
                      onNavigateTab?.('RECONCILIATION');
                      setIsOpen(false);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left rtl:text-right transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 group-hover:text-amber-900">{t('quickActions.reconcileTitle', '⚡ Clôture Stock EOD & Inventaire')}</div>
                      <div className="text-[10px] text-slate-500">{t('quickActions.reconcileDesc', 'Reconcilier le stock physique en fin de journée')}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" />
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </>
  );
};
