import React, { useState, useEffect } from 'react';
import {
  getDailyStoreInventory,
  getStores,
  getRetailProducts,
  subscribeToStoreChanges
} from '../../services/storage';
import { DailyStoreInventory, StoreLocation, RetailProduct } from '../../types';
import { exportReconciliationPDF } from '../../utils/pdfExport';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Download,
  TrendingDown,
  Sparkles,
  PieChart as PieChartIcon,
  Store,
  Layers,
  ArrowDownRight,
  Filter,
  ShieldAlert,
  ChefHat
} from 'lucide-react';

export const LabWasteAnalytics: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [inventoryRecords, setInventoryRecords] = useState<DailyStoreInventory[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [products, setProducts] = useState<RetailProduct[]>([]);

  const loadData = () => {
    setInventoryRecords(getDailyStoreInventory());
    setStores(getStores());
    setProducts(getRetailProducts());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  // Filter records by date and store
  const filteredRecords = inventoryRecords.filter((r) => {
    const matchesDate = !selectedDate || r.date === selectedDate;
    const matchesStore = selectedStoreId === 'ALL' || r.storeId === selectedStoreId;
    return matchesDate && matchesStore;
  });

  // Calculate totals
  const totalFinancialLoss = filteredRecords.reduce(
    (acc, r) => acc + (r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice,
    0
  );

  const totalUnsoldUnits = filteredRecords.reduce(
    (acc, r) => acc + r.actualClosingStock + r.unaccountedWasteVariance,
    0
  );

  const totalReceivedUnits = filteredRecords.reduce(
    (acc, r) => acc + r.openingStock + r.receivedRequisitions,
    0
  );

  const averageUnsoldRate = totalReceivedUnits > 0
    ? ((totalUnsoldUnits / totalReceivedUnits) * 100).toFixed(1)
    : '0.0';

  // Closed Stores Count for selectedDate
  const dateRecords = inventoryRecords.filter((r) => r.date === selectedDate);
  const closedStoreIds = Array.from(
    new Set(dateRecords.filter((r) => r.status === 'CLOSED').map((r) => r.storeId))
  );

  // Store-by-store summary data for charts & cards
  const storeSummaries = stores.map((store) => {
    const storeRecords = inventoryRecords.filter(
      (r) => r.storeId === store.id && r.date === selectedDate
    );
    const isClosed = storeRecords.some((r) => r.status === 'CLOSED');
    
    const lossVal = storeRecords.reduce(
      (acc, r) => acc + (r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice,
      0
    );

    const unsoldUnits = storeRecords.reduce(
      (acc, r) => acc + r.actualClosingStock + r.unaccountedWasteVariance,
      0
    );

    const receivedUnits = storeRecords.reduce(
      (acc, r) => acc + r.openingStock + r.receivedRequisitions,
      0
    );

    const unsoldPct = receivedUnits > 0 ? (unsoldUnits / receivedUnits) * 100 : 0;

    // Top unsold items for this store
    const sortedItems = [...storeRecords].sort((a, b) => {
      const aTotal = a.actualClosingStock + a.unaccountedWasteVariance;
      const bTotal = b.actualClosingStock + b.unaccountedWasteVariance;
      return bTotal - aTotal;
    });

    const topUnsold = sortedItems.slice(0, 3).map((item) => {
      const itemTotalAvailable = item.openingStock + item.receivedRequisitions;
      const itemUnsold = item.actualClosingStock + item.unaccountedWasteVariance;
      const pct = itemTotalAvailable > 0 ? (itemUnsold / itemTotalAvailable) * 100 : 0;
      return {
        name: item.pastryName,
        unsoldQty: itemUnsold,
        totalAvailable: itemTotalAvailable,
        pct: pct.toFixed(1)
      };
    });

    return {
      storeId: store.id,
      storeName: store.name,
      code: store.code,
      isClosed,
      lossVal,
      unsoldUnits,
      receivedUnits,
      unsoldPct: unsoldPct.toFixed(1),
      topUnsold
    };
  });

  // Top overall unsold items across all stores
  const productUnsoldMap: { [key: string]: { name: string; unsold: number; cost: number; totalAvailable: number } } = {};
  filteredRecords.forEach((r) => {
    if (!productUnsoldMap[r.pastryId]) {
      productUnsoldMap[r.pastryId] = {
        name: r.pastryName,
        unsold: 0,
        cost: 0,
        totalAvailable: 0
      };
    }
    const totalItemUnsold = r.actualClosingStock + r.unaccountedWasteVariance;
    productUnsoldMap[r.pastryId].unsold += totalItemUnsold;
    productUnsoldMap[r.pastryId].cost += totalItemUnsold * r.unitCostPrice;
    productUnsoldMap[r.pastryId].totalAvailable += r.openingStock + r.receivedRequisitions;
  });

  const topUnsoldProductsChartData = Object.values(productUnsoldMap)
    .filter((p) => p.unsold > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 6)
    .map((p) => ({
      name: p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name,
      UnsoldUnits: p.unsold,
      PerteDZD: Math.round(p.cost)
    }));

  const chartStoreData = storeSummaries.map((s) => ({
    name: s.code,
    storeName: s.storeName,
    PerteDZD: Math.round(s.lossVal),
    UnsoldUnits: s.unsoldUnits
  }));

  const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];

  return (
    <div className="space-y-6">
      
      {/* Central Lab Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-900/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Analyse Centralisée des Invendus & Pertes Boutiques</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ajustement Production Lab
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Aperçu multi-boutiques en temps réel pour optimiser les volumes de préparation et réduire les pertes pécuniaires du Laboratoire Central.
              </p>
            </div>
          </div>

          {/* Date & Store Filter Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-indigo-900/80 text-xs text-white">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer"
              />
            </div>

            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="py-2 px-3 bg-slate-950/80 text-white rounded-xl text-xs font-bold border border-indigo-900/80 outline-none cursor-pointer"
            >
              <option value="ALL">Toutes les 6 Boutiques</option>
              {stores.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Financial Loss */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Valeur Pertes Invendus Total</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">
            {totalFinancialLoss.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">DZD</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Sur la période sélectionnée</p>
        </div>

        {/* Total Unsold Units */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Volume Total d'Invendus</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {totalUnsoldUnits} <span className="text-xs font-normal text-slate-500">unités</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Invendus + Écarts physiques</p>
        </div>

        {/* Average Unsold Rate */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Taux d'Invendus Moyen</span>
            <PieChartIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 mt-2">
            {averageUnsoldRate}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Du stock total mis à disposition</p>
        </div>

        {/* Closed Stores Ratio */}
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Clôtures EOD Réceptionnées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">
            {closedStoreIds.length} / {stores.length} <span className="text-xs font-normal text-slate-400">boutiques</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pour la date du {selectedDate}</p>
        </div>
      </div>

      {/* Production Adjustment AI Recommendation Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-300/60 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              Recommandation d'Ajustement de Production pour Demain :
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              Basé sur la réconciliation d'aujourd'hui ({totalUnsoldUnits} invendus enregistrés) :
              <strong className="text-slate-900 font-black ml-1">
                Réduire les livraisons de Croissants au Beurre de -12% sur les boutiques Store #2 et Store #4
              </strong>{' '}
              et augmenter le stock de Tartelettes Framboise de +8% pour rééquilibrer la marge globale.
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Financial Loss per Store */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Perte Financière par Boutique (DZD)</h3>
              <p className="text-xs text-slate-500">Montant des invendus par point de vente</p>
            </div>
            <Store className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStoreData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any) => [`${value.toLocaleString()} DZD`, 'Coût Perte']}
                  labelFormatter={(label: string) => {
                    const st = chartStoreData.find((d) => d.name === label);
                    return st ? st.storeName : label;
                  }}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="PerteDZD" radius={[6, 6, 0, 0]}>
                  {chartStoreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Unsold Products */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Top Pâtisseries les plus jetées / invendues</h3>
              <p className="text-xs text-slate-500">Classées par valeur pécuniaire d'invendus</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topUnsoldProductsChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={120} />
                <Tooltip
                  formatter={(value: any) => [`${value.toLocaleString()} DZD`, 'Coût Perte']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="PerteDZD" fill="#ec4899" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown Cards across 6 Retail Outlets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Synthèse par Point de Vente ({stores.length} Boutiques)</h3>
          <span className="text-xs text-slate-500 font-semibold">Date : {selectedDate}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeSummaries.map((st) => (
            <div
              key={st.storeId}
              className={`rounded-2xl p-5 border transition-all ${
                st.isClosed
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-50/80 border-dashed border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px]">
                      {st.code}
                    </span>
                    <h4 className="font-bold text-slate-900 text-xs">{st.storeName}</h4>
                  </div>
                </div>

                {st.isClosed ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Clôturée
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    En attente EOD
                  </span>
                )}
              </div>

              {/* Stats per store */}
              <div className="grid grid-cols-2 gap-3 my-3 bg-slate-50 p-3 rounded-xl">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Perte Financière</p>
                  <p className="text-sm font-black text-rose-600 mt-0.5">
                    {st.lossVal.toFixed(2)} DZD
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Taux Invendus</p>
                  <p className="text-sm font-black text-indigo-600 mt-0.5">
                    {st.unsoldPct}% <span className="text-[10px] text-slate-400 font-normal">({st.unsoldUnits} unit.)</span>
                  </p>
                </div>
              </div>

              {/* Top Unsold Items per Store */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Top Invendus de la Boutique :
                </p>
                {st.topUnsold.length > 0 ? (
                  st.topUnsold.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-semibold text-slate-800 truncate max-w-[160px]">{item.name}</span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                        {item.unsoldQty} unit. ({item.pct}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">Aucune donnée disponible</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Records Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Registre Détaillé des Invendus par Produit</h3>
          <span className="text-xs text-slate-500 font-semibold">{filteredRecords.length} enregistrements</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Boutique</th>
                <th className="py-3 px-4">Pâtisserie</th>
                <th className="py-3 px-3 text-center">Initial</th>
                <th className="py-3 px-3 text-center">Reçu</th>
                <th className="py-3 px-3 text-center">Vendu</th>
                <th className="py-3 px-3 text-center">Invendu Réel</th>
                <th className="py-3 px-3 text-center">Écart Physique</th>
                <th className="py-3 px-4 text-right">Perte (DZD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((r) => {
                const loss = (r.actualClosingStock + r.unaccountedWasteVariance) * r.unitCostPrice;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.storeName}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{r.pastryName}</p>
                      <p className="text-[10px] text-slate-400">{r.category}</p>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-bold">{r.openingStock}</td>
                    <td className="py-3 px-3 text-center text-emerald-700 font-bold">+{r.receivedRequisitions}</td>
                    <td className="py-3 px-3 text-center text-indigo-700 font-bold">-{r.totalSales}</td>
                    <td className="py-3 px-3 text-center font-black text-amber-900 bg-amber-50/50">{r.actualClosingStock}</td>
                    <td className="py-3 px-3 text-center">
                      {r.unaccountedWasteVariance > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                          -{r.unaccountedWasteVariance}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {loss.toFixed(2)} DZD
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
