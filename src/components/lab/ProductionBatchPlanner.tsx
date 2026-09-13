import React, { useState, useEffect, useMemo } from 'react';
import { DailyPastryProductionForecast, ProductionBatch } from '../../types';
import { 
  getProductionForecasts, 
  updateProductionForecasts, 
  getRecipes, 
  getRawMaterials,
  getProductionBatches,
  calculateRecipeStockRequirement,
  deductStockForProductionSheet,
  notifyToast,
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  exportProductionBatchesToPDF, 
  exportProductionBatchesToExcel 
} from '../../utils/reportingExport';
import { 
  printThermalDocument, 
  generateProductionLabelHtml 
} from '../../utils/thermalPrinter';
import { 
  Utensils, 
  TrendingUp, 
  Sparkles, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Save, 
  Zap, 
  DollarSign, 
  ChefHat,
  FileText,
  FileSpreadsheet,
  Printer,
  PackageCheck,
  AlertTriangle,
  Play
} from 'lucide-react';

export const ProductionBatchPlanner: React.FC = () => {
  const [forecasts, setForecasts] = useState<DailyPastryProductionForecast[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Vendredi / Samedi (Pic Weekend)');
  const [weekendMultiplier, setWeekendMultiplier] = useState<number>(1.25);
  const [weatherFactor, setWeatherFactor] = useState<number>(1.05);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const loadData = () => {
    setForecasts(getProductionForecasts());
    setProductionBatches(getProductionBatches());
  };

  const handleBatchQtyChange = (recipeId: string, qty: number) => {
    const updated = forecasts.map(f => {
      if (f.recipeId === recipeId) {
        return { ...f, recommendedBatchQty: Math.max(0, qty) };
      }
      return f;
    });
    setForecasts(updated);
    setIsSaved(false);
  };

  const handleApplyAiOptimizations = () => {
    const totalMultiplier = weekendMultiplier * weatherFactor;
    const updated = forecasts.map(f => {
      const optimized = Math.round((f.historicalAvgDailySales * totalMultiplier) - (f.currentFinishedStockAcrossStores * 0.5));
      return {
        ...f,
        recommendedBatchQty: Math.max(10, optimized),
        dayOfWeekMultiplier: Number(totalMultiplier.toFixed(2))
      };
    });
    setForecasts(updated);
    updateProductionForecasts(updated);
    notifyToast({
      type: 'success',
      title: '✨ Planning IA Appliqué',
      message: `Calcul prédictif ajusté (+${Math.round((totalMultiplier - 1) * 100)}% sur volume standard).`
    });
    setIsSaved(true);
  };

  const handleSavePlan = () => {
    updateProductionForecasts(forecasts);
    setIsSaved(true);
    notifyToast({
      type: 'success',
      title: 'Production Plan Sauvegardé',
      message: 'Les quantités cibles sont synchronisées avec les fiches de fabrication.'
    });
  };

  const handleLaunchProduction = (recipeId: string, qty: number) => {
    if (qty <= 0) {
      notifyToast({
        type: 'error',
        title: 'Quantité Invalide',
        message: 'Veuillez saisir une quantité supérieure à 0.'
      });
      return;
    }

    const res = deductStockForProductionSheet(recipeId, qty, 'Chef Pâtissier (Labo)');
    if (!res.success && res.missingIngredients) {
      notifyToast({
        type: 'error',
        title: 'Stock Matières Insuffisant',
        message: `Impossible de lancer la production : ${res.missingIngredients.map(m => `${m.name} (Manque ${m.needed - m.available} ${m.unit})`).join(', ')}`
      });
    } else if (res.batch) {
      loadData();
    }
  };

  const handlePrintThermalLabel = (batch: ProductionBatch) => {
    const html = generateProductionLabelHtml({
      batchNumber: batch.batchNumber,
      recipeName: batch.recipeName,
      quantity: batch.plannedQuantity,
      unit: batch.unit || 'portions',
      productionDate: batch.productionDate,
      expiryDate: batch.expiryDate,
      supervisorName: batch.supervisorName || 'Chef Pâtissier'
    });
    printThermalDocument(html, `Étiquette Lot ${batch.batchNumber}`);
  };

  const totalBatches = forecasts.reduce((acc, f) => acc + f.recommendedBatchQty, 0);
  const totalCost = forecasts.reduce((acc, f) => acc + (f.recommendedBatchQty * f.estimatedRawCost), 0);
  const totalRevenue = forecasts.reduce((acc, f) => acc + (f.recommendedBatchQty * f.estimatedRetailValue), 0);
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Planification Prédictive & Fiches de Production
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Directoire Labo Central
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Plan de Production Journalier & Déduction Stock
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Anticipation des volumes de fabrication selon l'historique des ventes, contrôle instantané du stock matières et génération des fiches de production.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => exportProductionBatchesToPDF(productionBatches)}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              title="Exporter les fiches de production en PDF"
            >
              <FileText className="w-4 h-4 text-rose-400" /> PDF
            </button>
            <button
              onClick={() => exportProductionBatchesToExcel(productionBatches)}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              title="Exporter les fiches de production en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
            <button
              onClick={handleApplyAiOptimizations}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Zap className="w-4 h-4 fill-current" /> Recalculer via IA
            </button>
            <button
              onClick={handleSavePlan}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" /> Enregistrer le Plan
            </button>
          </div>
        </div>

        {/* Global KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-900/50">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Volume Pièces Total</span>
            <span className="text-xl font-black text-white">{totalBatches.toLocaleString('fr-FR')} {forecasts[0]?.unitName || 'unités'}</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Coût Matières Cible</span>
            <span className="text-xl font-black text-amber-400">{totalCost.toLocaleString('fr-DZ')} DZD</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chiffre d'Affaires Estimé</span>
            <span className="text-xl font-black text-emerald-400">{totalRevenue.toLocaleString('fr-DZ')} DZD</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-900/40">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Marge Brute Cible</span>
            <span className="text-xl font-black text-indigo-300">{grossMargin.toFixed(1)} %</span>
          </div>
        </div>
      </div>

      {/* Adjusters & Filters */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Jour de Référence</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="font-bold text-slate-900 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="Lundi / Mardi (Calme)">Lundi / Mardi (Activité Standard)</option>
              <option value="Mercredi / Jeudi (Soutenu)">Mercredi / Jeudi (Affluence Moyenne)</option>
              <option value="Vendredi / Samedi (Pic Weekend)">Vendredi / Samedi (Pic Weekend & Événements)</option>
              <option value="Dimanche (Brunch & Famille)">Dimanche (Brunch & Gâteaux Partage)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Coeff Weekend :</span>
            <input 
              type="range" 
              min="1.0" 
              max="1.6" 
              step="0.05"
              value={weekendMultiplier}
              onChange={(e) => setWeekendMultiplier(parseFloat(e.target.value))}
              className="w-24 accent-indigo-600"
            />
            <span className="text-xs font-black text-indigo-600">x{weekendMultiplier.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Facteur Météo/Fêtes :</span>
            <input 
              type="range" 
              min="0.8" 
              max="1.4" 
              step="0.05"
              value={weatherFactor}
              onChange={(e) => setWeatherFactor(parseFloat(e.target.value))}
              className="w-24 accent-amber-500"
            />
            <span className="text-xs font-black text-amber-600">x{weatherFactor.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Production Forecast & Automated Stock Deduction Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900">Grille de Fabrication & Contrôle Stock Matières</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {forecasts.length} Recettes Sous Gestion
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">Recette & Catégorie</th>
                <th className="p-4 text-center">Moyenne Ventes/J</th>
                <th className="p-4 text-center">Stock Boutiques</th>
                <th className="p-4 text-center">Fournée Cible</th>
                <th className="p-4 text-center">Disponibilité MP</th>
                <th className="p-4 text-right">Coût / Revient</th>
                <th className="p-4 text-center">Action Déduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {forecasts.map((item) => {
                const batchCost = item.recommendedBatchQty * item.estimatedRawCost;
                const batchRev = item.recommendedBatchQty * item.estimatedRetailValue;
                const stockCheck = calculateRecipeStockRequirement(item.recipeId, item.recommendedBatchQty);
                const isShort = !stockCheck.hasSufficientStock;

                return (
                  <tr key={item.recipeId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-slate-900">{item.recipeName}</div>
                      <span className="text-xs text-slate-400">{item.category}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 text-xs">
                        {item.historicalAvgDailySales} {item.unitName}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 font-bold text-indigo-700 text-xs">
                        {item.currentFinishedStockAcrossStores} {item.unitName}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={item.recommendedBatchQty}
                          onChange={(e) => handleBatchQtyChange(item.recipeId, parseInt(e.target.value) || 0)}
                          className="w-20 p-2 text-center rounded-xl bg-indigo-50/50 border border-indigo-200 font-black text-indigo-900 focus:outline-none focus:border-indigo-600 focus:bg-white text-base shadow-inner"
                        />
                        <span className="text-xs text-slate-400">{item.unitName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {isShort ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs" title={stockCheck.ingredients.filter(i => !i.isSufficient).map(i => `${i.name}: manque ${i.shortfall} ${i.unit}`).join(', ')}>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Stock Insuffisant</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Matières OK</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-slate-700">{batchCost.toLocaleString('fr-DZ')} DZD</span>
                      <span className="block text-[11px] text-slate-400">({item.estimatedRawCost} DZD/u)</span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleLaunchProduction(item.recipeId, item.recommendedBatchQty)}
                        disabled={isShort || item.recommendedBatchQty <= 0}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 ${
                          isShort || item.recommendedBatchQty <= 0
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                        title="Valider la fiche de fabrication et déduire automatiquement les matières premières du stock"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Lancer Lot</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Production Batches & Thermal Label Printing Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black text-slate-900">Lots & Fiches de Production Actives</h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {productionBatches.length} Lots Enregistrés
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productionBatches.map((batch) => (
            <div
              key={batch.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                    {batch.batchNumber}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    batch.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {batch.status}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 text-sm mt-2">{batch.recipeName}</h4>
                <div className="text-xs text-slate-600 mt-1">
                  Quantité : <strong className="text-indigo-600 font-bold">{batch.plannedQuantity} {batch.unit || 'portions'}</strong>
                </div>
                {batch.expiryDate && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    DLC : {new Date(batch.expiryDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {batch.supervisorName || 'Chef Pâtissier'}
                </span>
                <button
                  onClick={() => handlePrintThermalLabel(batch)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors"
                  title="Imprimer l'étiquette thermique de traçabilité sur imprimante 80mm/58mm"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Imprimer Étiquette</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
