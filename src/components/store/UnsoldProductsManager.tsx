import React, { useState, useEffect } from 'react';
import {
  UnsoldProductLog,
  UnsoldLogReason,
  RetailStoreStock,
  StoreLocation,
  RetailCategory
} from '../../types';
import {
  getUnsoldLogs,
  recordUnsoldLog,
  getRetailStoreStock,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  Trash2,
  AlertTriangle,
  PackageX,
  Clock,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  Tag,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface UnsoldProductsManagerProps {
  currentStore: StoreLocation;
}

const REASONS: { key: UnsoldLogReason; label: string; description: string; badgeColor: string }[] = [
  {
    key: 'EXPIRED_WASTE',
    label: 'Péremption / Fin de Journée',
    description: 'Délai de fraîcheur dépassé ; jeté ou donné.',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    key: 'DAMAGED_DISPLAY',
    label: 'Endommagé en Vitrine',
    description: 'Abîmé ou écrasé dans la vitrine.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    key: 'STAFF_TASTING',
    label: 'Dégustation / Contrôle Qualité Staff',
    description: "Échantillonné pour l'assurance qualité quotidienne.",
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    key: 'CLEARANCE_MARKDOWN',
    label: 'Remise Fin de Journée',
    description: 'Lot soldé du soir.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    key: 'CARRIED_OVER',
    label: 'Reporté au Lendemain',
    description: 'Produit longue conservation conservé.',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
  },
];

export const UnsoldProductsManager: React.FC<UnsoldProductsManagerProps> = ({ currentStore }) => {
  const [unsoldLogs, setUnsoldLogs] = useState<UnsoldProductLog[]>([]);
  const [stockItems, setStockItems] = useState<RetailStoreStock[]>([]);
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<UnsoldLogReason>('EXPIRED_WASTE');
  const [recordedBy, setRecordedBy] = useState<string>('Store Staff');
  const [notes, setNotes] = useState<string>('');
  const [showLogForm, setShowLogForm] = useState<boolean>(false);

  const loadData = () => {
    const logs = getUnsoldLogs(currentStore.id);
    setUnsoldLogs(logs);

    const stock = getRetailStoreStock(currentStore.id);
    setStockItems(stock);
    if (stock.length > 0 && !selectedProductId) {
      setSelectedProductId(stock[0].productId);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, [currentStore.id]);

  const selectedStockItem = stockItems.find((s) => s.productId === selectedProductId);

  // Financial calculations
  const unitCost = selectedStockItem ? selectedStockItem.costPrice : 0;
  const unitPrice = selectedStockItem ? selectedStockItem.price : 0;
  const totalLossValue = quantity * (reason === 'CLEARANCE_MARKDOWN' ? unitPrice * 0.5 : unitCost);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || quantity <= 0) return;

    recordUnsoldLog({
      storeId: currentStore.id,
      storeName: currentStore.name,
      recordedBy: recordedBy || 'Store Staff',
      productId: selectedStockItem.productId,
      productName: selectedStockItem.productName,
      category: selectedStockItem.category,
      quantity,
      unit: selectedStockItem.unit,
      unitCost: selectedStockItem.costPrice,
      sellingPrice: selectedStockItem.price,
      totalLossValue,
      reason,
      notes: notes.trim() || undefined,
    });

    // Reset Form
    setQuantity(1);
    setNotes('');
    setShowLogForm(false);
  };

  // Filtered Logs
  const filteredLogs = unsoldLogs.filter((log) => {
    const matchesReason = filterReason === 'ALL' || log.reason === filterReason;
    const matchesSearch =
      log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.logNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesReason && matchesSearch;
  });

  // Analytics Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogs = unsoldLogs.filter((l) => l.recordedAt.startsWith(todayStr));
  const totalLossToday = todayLogs.reduce((sum, l) => sum + l.totalLossValue, 0);
  const totalItemsUnsoldToday = todayLogs.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-amber-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <PackageX className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Registre des Invendus & Perte</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Suivi des Pertes de Fin de Journée
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Enregistrez les produits périmés, invendus en vitrine, remises du soir et articles reportés pour <strong className="text-white">{currentStore.name}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md transition-all shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> {showLogForm ? 'Fermer le Formulaire' : '+ Enregistrer un Invendu'}
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Valeur de Perte du Jour</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalLossToday.toFixed(2)} DZD
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculé au coût unitaire</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <PackageX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Articles Invendus Aujourd'hui</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalItemsUnsoldToday} <span className="text-xs font-medium text-slate-500">unités</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Toutes catégories confondues</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Total des Entrées</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {unsoldLogs.length} <span className="text-xs font-medium text-slate-500">enregistrements</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Historique complet</p>
          </div>
        </div>
      </div>

      {/* Slide-Down Log Entry Form */}
      {showLogForm && (
        <form
          onSubmit={handleLogSubmit}
          className="bg-white rounded-2xl p-6 border-2 border-amber-300/80 shadow-lg space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">Déclarer un Article Invendu / Perte</h3>
            </div>
            <span className="text-xs text-slate-400">
              Point de Vente : <strong className="text-slate-700">{currentStore.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Select Product */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sélectionner le Produit</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {stockItems.map((s) => (
                  <option key={s.productId} value={s.productId}>
                    {s.productName} (Stock: {s.currentStock} {s.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quantité Invendue</label>
              <input
                type="number"
                min="1"
                max={selectedStockItem ? selectedStockItem.currentStock || 100 : 100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Motif / Catégorie d'Élimination</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as UnsoldLogReason)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              >
                {REASONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recorded By */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Enregistré Par</label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Additional Notes & Calculated Loss preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2">
              <label className="font-bold text-slate-700 block mb-1 text-xs">Notes / Détails</label>
              <input
                type="text"
                placeholder="Ex: 4 croissants retirés à la fermeture à 20h00..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-800 font-bold uppercase block">
                  Perte Financière Estimée
                </span>
                <span className="text-xl font-black text-amber-950 font-mono">
                  {totalLossValue.toFixed(2)} DZD
                </span>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Unsold Logs Table & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Historique des Invendus & Pertes</h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher dans l'historique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">Toutes les raisons</option>
              {REASONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <th className="py-2.5 px-3">N° Log</th>
                <th className="py-2.5 px-3">Nom du Produit</th>
                <th className="py-2.5 px-3 text-center">Qté Invendue</th>
                <th className="py-2.5 px-3 text-right">Coût Unitaire</th>
                <th className="py-2.5 px-3 text-right">Valeur Perte</th>
                <th className="py-2.5 px-3">Catégorie / Motif</th>
                <th className="py-2.5 px-3">Saisi Par</th>
                <th className="py-2.5 px-3">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const reasonMeta = REASONS.find((r) => r.key === log.reason);
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {log.logNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {log.productName}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {log.unitCost.toFixed(2)} DZD
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-red-600">
                      {log.totalLossValue.toFixed(2)} DZD
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          reasonMeta?.badgeColor || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {reasonMeta?.label || log.reason}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{log.recordedBy}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(log.recordedAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <PackageX className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="font-bold">Aucun Enregistrement d'Invendu Trouvé</p>
                    <p className="text-[11px]">Utilisez le bouton "+ Enregistrer un Invendu" ci-dessus pour consigner les pertes.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
