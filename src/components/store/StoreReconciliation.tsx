import React, { useState, useEffect } from 'react';
import { StoreLocation, DailyStoreInventory } from '../../types';
import {
  calculateOrGetTodayReconciliation,
  closeDailyReconciliation,
  saveDailyStoreInventory,
  getDailyStoreInventory,
  subscribeToStoreChanges
} from '../../services/storage';
import { exportReconciliationPDF } from '../../utils/pdfExport';
import {
  Calculator,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Lock,
  RefreshCw,
  Info,
  Layers,
  ShoppingBag,
  TrendingDown,
  ShieldCheck,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface StoreReconciliationProps {
  currentStore: StoreLocation;
}

export const StoreReconciliation: React.FC<StoreReconciliationProps> = ({ currentStore }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [records, setRecords] = useState<DailyStoreInventory[]>([]);
  const [isClosed, setIsClosed] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>(currentStore.managerName || 'Caissier Principal');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Load and subscribe
  const loadData = () => {
    const { records: resRecords, isClosed: resClosed } = calculateOrGetTodayReconciliation(
      currentStore.id,
      selectedDate
    );
    setRecords(resRecords);
    setIsClosed(resClosed);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [currentStore.id, selectedDate]);

  // Handle physical count change for optional adjustments
  const handleActualCountChange = (pastryId: string, valueStr: string) => {
    if (isClosed) return;
    const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
    const newCount = isNaN(val) ? 0 : Math.max(0, val);

    setRecords((prev) =>
      prev.map((r) => {
        if (r.pastryId === pastryId) {
          const variance = Math.max(0, r.expectedClosingStock - newCount);
          return {
            ...r,
            actualClosingStock: newCount,
            unaccountedWasteVariance: variance
          };
        }
        return r;
      })
    );
  };

  // Reset physical counts to expected calculated values
  const handleResetToCalculated = () => {
    if (isClosed) return;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        actualClosingStock: r.expectedClosingStock,
        unaccountedWasteVariance: 0
      }))
    );
  };

  // Confirm and Close Day
  const handleCloseDay = () => {
    closeDailyReconciliation(currentStore.id, records, cashierName, generalNotes);
    setShowConfirmModal(false);
    loadData();
  };

  // Key metrics calculations
  const totalAvailableQty = records.reduce((acc, r) => acc + r.openingStock + r.receivedRequisitions, 0);
  const totalSalesQty = records.reduce((acc, r) => acc + r.totalSales, 0);
  const totalExpectedUnsoldQty = records.reduce((acc, r) => acc + r.expectedClosingStock, 0);
  const totalActualClosingQty = records.reduce((acc, r) => acc + r.actualClosingStock, 0);
  const totalUnaccountedVarianceQty = records.reduce((acc, r) => acc + r.unaccountedWasteVariance, 0);
  
  const totalUnsoldCostValue = records.reduce(
    (acc, r) => acc + (r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice,
    0
  );

  const categories = Array.from(new Set(records.map((r) => r.category)));

  const filteredRecords = filterCategory === 'ALL'
    ? records
    : records.filter((r) => r.category === filterCategory);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-700 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Réconciliation Automatique du Stock & Invendus EOD</h2>
                {isClosed ? (
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Clôturée
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Calcul Automatique Actif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Calcul en temps réel des invendus basé sur les bons de livraison du Lab Central et les ventes de la caisse POS.
              </p>
            </div>
          </div>

          {/* Date Selector & PDF Export */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => exportReconciliationPDF(records, currentStore.name, selectedDate, cashierName)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Rapport PDF</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-white">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Available */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Disponible Total</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalAvailableQty} <span className="text-xs font-normal text-slate-500">unités</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Leftover + Reçu Lab</p>
        </div>

        {/* Total POS Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ventes Caisse POS</span>
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">-{totalSalesQty} <span className="text-xs font-normal text-slate-500">unités</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Enregistrées en caisse</p>
        </div>

        {/* Expected Unsold */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Invendus Théoriques</span>
            <Calculator className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{totalExpectedUnsoldQty} <span className="text-xs font-normal text-slate-500">unités</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Disponible - Ventes</p>
        </div>

        {/* Unaccounted Variance / Physical Damage */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Pertes / Casse Physique</span>
            <AlertTriangle className={`w-4 h-4 ${totalUnaccountedVarianceQty > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${totalUnaccountedVarianceQty > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {totalUnaccountedVarianceQty > 0 ? `-${totalUnaccountedVarianceQty}` : '0'} <span className="text-xs font-normal text-slate-500">unités</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Écart comptage physique</p>
        </div>

        {/* Total Financial Waste Value */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Valeur Pertes/Invendus</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-amber-400 mt-2">{totalUnsoldCostValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">DZD</span></p>
          <p className="text-[11px] text-slate-400 mt-1">Coût de revient total</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-slate-900">Tableau de Réconciliation EOD</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
              {filteredRecords.length} articles
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setFilterCategory('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterCategory === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tout
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    filterCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {!isClosed && (
              <button
                type="button"
                onClick={handleResetToCalculated}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réinitialiser Comptage</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Pâtisserie / Produit</th>
                <th className="py-3 px-3 text-center">Opening (Veille)</th>
                <th className="py-3 px-3 text-center">Reçu du Lab</th>
                <th className="py-3 px-3 text-center">Ventes POS</th>
                <th className="py-3 px-3 text-center bg-amber-50 text-amber-950">Invendus Calculés</th>
                <th className="py-3 px-3 text-center bg-indigo-50 text-indigo-950">Comptage Physique Réel</th>
                <th className="py-3 px-3 text-center">Écart / Casse</th>
                <th className="py-3 px-4 text-right">Coût Perte (DZD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((item) => {
                const itemLossValue = (item.actualClosingStock + item.unaccountedWasteVariance) * item.unitCostPrice;

                return (
                  <tr key={item.pastryId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Pastry Name & Category */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{item.pastryName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.unitPrice.toFixed(2)} DZD / {item.unit}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Opening Stock */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-600">
                      {item.openingStock}
                    </td>

                    {/* Received Requisitions */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-black ${
                        item.receivedRequisitions > 0 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'
                      }`}>
                        +{item.receivedRequisitions}
                      </span>
                    </td>

                    {/* Total Sales POS */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-lg font-black ${
                        item.totalSales > 0 ? 'bg-indigo-100 text-indigo-800' : 'text-slate-400'
                      }`}>
                        -{item.totalSales}
                      </span>
                    </td>

                    {/* Calculated Unsold / Remaining */}
                    <td className="py-3.5 px-3 text-center bg-amber-50/60 font-black text-amber-900 text-sm">
                      {item.expectedClosingStock}
                    </td>

                    {/* Actual Physical Count Input */}
                    <td className="py-3.5 px-3 text-center bg-indigo-50/40">
                      {isClosed ? (
                        <span className="font-black text-indigo-950 text-sm">
                          {item.actualClosingStock}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0"
                            value={item.actualClosingStock}
                            onChange={(e) => handleActualCountChange(item.pastryId, e.target.value)}
                            className="w-16 py-1 px-2 text-center text-xs font-black bg-white border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs"
                          />
                        </div>
                      )}
                    </td>

                    {/* Unaccounted Waste Variance */}
                    <td className="py-3.5 px-3 text-center">
                      {item.unaccountedWasteVariance > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3 h-3" />
                          -{item.unaccountedWasteVariance}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-semibold">0 (Conforme)</span>
                      )}
                    </td>

                    {/* Financial Loss Value */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {itemLossValue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* EOD Confirmation Action Bar */}
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                {isClosed ? 'Journée Officiellement Clôturée' : 'Clôture de Caisse en Attente de Validation'}
              </p>
              <p className="text-[11px] text-slate-400">
                {isClosed
                  ? `Validé le ${new Date(records[0]?.closedAt || '').toLocaleString('fr-FR')} par ${records[0]?.closedBy}`
                  : 'La validation synchronise automatiquement les registres d\'invendus avec le Laboratoire Central.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {isClosed ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Statut : Clôturé & Synchronisé</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md hover:shadow-lg transform active:scale-95 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Valider & Clôturer la Journée (EOD)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirmation de Clôture EOD</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Boutique : {currentStore.name} ({selectedDate})
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Résumé des Invendus & Pertes :</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                <li>Invendus physiques en vitrine : <strong>{totalActualClosingQty} unités</strong></li>
                <li>Écarts/Pertes non expliqués : <strong>{totalUnaccountedVarianceQty} unités</strong></li>
                <li>Valeur financière totale transmise au Lab : <strong>{totalUnsoldCostValue.toFixed(2)} DZD</strong></li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom du Responsable / Caissier :
                </label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Claire Vance"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes ou Remarques de Clôture (Optionnel) :
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={2}
                  className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ex: Température normale, vitrine propre, 1 croissant écrasé..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleCloseDay}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmer & Clôturer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
