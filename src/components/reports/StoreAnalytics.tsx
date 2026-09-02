import React, { useState, useEffect } from 'react';
import {
  StoreLocation,
  SaleTransaction,
  UnsoldProductLog,
  TransitWasteLog,
  RetailProduct
} from '../../types';
import {
  getStores,
  getSaleTransactions,
  getUnsoldLogs,
  getTransitWasteLogs,
  getRetailProducts,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  BarChart3,
  TrendingUp,
  PackageX,
  DollarSign,
  AlertTriangle,
  Award,
  Store,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  PieChart
} from 'lucide-react';

interface StoreMetrics {
  storeId: string;
  storeName: string;
  code: string;
  managerName: string;
  totalSalesUnits: number;
  totalRevenue: number;
  totalWasteUnits: number;
  totalWasteValue: number;
  wastePercentage: number;
}

interface HighWasteAlert {
  storeName: string;
  productName: string;
  category: string;
  wasteUnits: number;
  soldUnits: number;
  wasteRatePercentage: number;
  financialLoss: number;
  recommendation: string;
}

export const StoreAnalytics: React.FC = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [unsoldLogs, setUnsoldLogs] = useState<UnsoldProductLog[]>([]);
  const [transitWaste, setTransitWaste] = useState<TransitWasteLog[]>([]);
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');

  const loadData = () => {
    setStores(getStores());
    setSales(getSaleTransactions());
    setUnsoldLogs(getUnsoldLogs());
    setTransitWaste(getTransitWasteLogs());
    setProducts(getRetailProducts());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  // Compute metrics per store
  const storeMetricsList: StoreMetrics[] = stores.map((st) => {
    const storeSales = sales.filter((s) => s.storeId === st.id);
    const storeUnsold = unsoldLogs.filter((u) => u.storeId === st.id);
    const storeTransit = transitWaste.filter((t) => t.storeId === st.id);

    const totalSalesUnits = storeSales.reduce((acc, s) => {
      return acc + s.items.reduce((iAcc, item) => iAcc + item.quantity, 0);
    }, 0);

    const totalRevenue = storeSales.reduce((acc, s) => acc + s.totalAmount, 0);

    const totalUnsoldUnits = storeUnsold.reduce((acc, u) => acc + u.quantity, 0);
    const totalUnsoldLoss = storeUnsold.reduce((acc, u) => acc + u.totalLossValue, 0);

    const totalTransitLoss = storeTransit.reduce((acc, t) => acc + t.totalLossValue, 0);

    const totalWasteUnits = totalUnsoldUnits;
    const totalWasteValue = totalUnsoldLoss + totalTransitLoss;

    const totalUnitsHandled = totalSalesUnits + totalWasteUnits;
    const wastePercentage = totalUnitsHandled > 0
      ? Math.round((totalWasteUnits / totalUnitsHandled) * 100)
      : 0;

    return {
      storeId: st.id,
      storeName: st.name,
      code: st.code,
      managerName: st.managerName,
      totalSalesUnits,
      totalRevenue,
      totalWasteUnits,
      totalWasteValue,
      wastePercentage
    };
  });

  // Global Aggregates
  const totalNetworkRevenue = storeMetricsList.reduce((acc, sm) => acc + sm.totalRevenue, 0);
  const totalNetworkUnitsSold = storeMetricsList.reduce((acc, sm) => acc + sm.totalSalesUnits, 0);
  const totalNetworkWasteValue = storeMetricsList.reduce((acc, sm) => acc + sm.totalWasteValue, 0);

  // Product Ranking (Best Selling vs High Waste)
  const productPerformanceMap: {
    [prodName: string]: { soldQty: number; revenue: number; wasteQty: number; wasteValue: number };
  } = {};

  sales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productPerformanceMap[item.productName]) {
        productPerformanceMap[item.productName] = { soldQty: 0, revenue: 0, wasteQty: 0, wasteValue: 0 };
      }
      productPerformanceMap[item.productName].soldQty += item.quantity;
      productPerformanceMap[item.productName].revenue += item.totalPrice;
    });
  });

  unsoldLogs.forEach((u) => {
    if (!productPerformanceMap[u.productName]) {
      productPerformanceMap[u.productName] = { soldQty: 0, revenue: 0, wasteQty: 0, wasteValue: 0 };
    }
    productPerformanceMap[u.productName].wasteQty += u.quantity;
    productPerformanceMap[u.productName].wasteValue += u.totalLossValue;
  });

  const rankedProducts = Object.entries(productPerformanceMap).map(([pName, data]) => ({
    productName: pName,
    soldQty: data.soldQty,
    revenue: data.revenue,
    wasteQty: data.wasteQty,
    wasteValue: data.wasteValue
  })).sort((a, b) => b.soldQty - a.soldQty);

  // Compute High Waste Alerts per Store & Product location
  const highWasteAlerts: HighWasteAlert[] = [];

  stores.forEach((st) => {
    const storeUnsold = unsoldLogs.filter((u) => u.storeId === st.id);
    const storeSales = sales.filter((s) => s.storeId === st.id);

    // Group unsold by product
    const prodWasteMap: { [pName: string]: { wasteQty: number; loss: number; category: string } } = {};
    storeUnsold.forEach((u) => {
      if (!prodWasteMap[u.productName]) {
        prodWasteMap[u.productName] = { wasteQty: 0, loss: 0, category: u.category };
      }
      prodWasteMap[u.productName].wasteQty += u.quantity;
      prodWasteMap[u.productName].loss += u.totalLossValue;
    });

    Object.entries(prodWasteMap).forEach(([pName, wData]) => {
      // Find sold qty for this product in this store
      let soldQty = 0;
      storeSales.forEach((s) => {
        s.items.filter((i) => i.productName === pName).forEach((i) => {
          soldQty += i.quantity;
        });
      });

      const totalHandled = soldQty + wData.wasteQty;
      const rate = totalHandled > 0 ? Math.round((wData.wasteQty / totalHandled) * 100) : 100;

      if (rate >= 20 || wData.wasteQty >= 5) {
        const recommendReduce = Math.max(2, Math.ceil(wData.wasteQty * 0.7));
        highWasteAlerts.push({
          storeName: st.name,
          productName: pName,
          category: wData.category,
          wasteUnits: wData.wasteQty,
          soldUnits: soldQty,
          wasteRatePercentage: rate,
          financialLoss: wData.loss,
          recommendation: `Réduire la commande quotidienne d'approvisionnement de -${recommendReduce} unités.`
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Executive Dashboard & Strategic Analytics</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Analyse Comparative Multi-Boutiques & Déchets</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Suivi consolidé des Ventes, du Chiffre d'Affaires et des Pertes pour l'ensemble du réseau de 6 boutiques. Détection intelligente des anomalies de gaspillage avec recommandations d'ajustement.
          </p>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-2xl border border-indigo-500/30 text-right shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Réseau Couvert</span>
          <span className="text-lg font-black text-amber-400">6 Points de Vente</span>
        </div>
      </div>

      {/* Global Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Chiffre d'Affaires Réseau</span>
            <span className="text-2xl font-black text-slate-950">
              {totalNetworkRevenue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Ventes directes POS en boutiques</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Volume Ventes Pâtisserie</span>
            <span className="text-2xl font-black text-slate-950">
              {totalNetworkUnitsSold.toLocaleString('fr-FR')} unités
            </span>
            <span className="text-[10px] text-indigo-600 font-bold block mt-1">
              Sur les 6 points de vente
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Coût Financier Invendus</span>
            <span className="text-2xl font-black text-red-600">
              {totalNetworkWasteValue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
            </span>
            <span className="text-[10px] text-red-500 font-bold block mt-1">
              Inclus casse & fins de journée
            </span>
          </div>
          <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100">
            <PackageX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* High Waste Optimization Recommendations Banner */}
      {highWasteAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-3xl p-5 text-slate-950 shadow-lg border border-amber-600 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 fill-slate-950 text-amber-400" />
              <h3 className="font-black text-sm uppercase tracking-tight">
                Analyse Intelligente Anti-Gaspillage — Recommandations Réduction Commandes
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black uppercase">
              {highWasteAlerts.length} alertes détectées
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highWasteAlerts.map((alert, idx) => (
              <div key={idx} className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 border border-amber-300 text-xs space-y-1">
                <div className="flex items-center justify-between font-black text-slate-900">
                  <span>{alert.storeName}</span>
                  <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px]">
                    {alert.wasteRatePercentage}% de pertes
                  </span>
                </div>
                <p className="font-bold text-slate-800">
                  Article: <span className="text-amber-900">{alert.productName}</span> ({alert.wasteUnits} unités perdues)
                </p>
                <div className="bg-amber-100 p-2 rounded-xl text-amber-950 font-medium text-[11px] flex items-center gap-1.5 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span><strong>Action recommandée :</strong> {alert.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Store Comparison Cards Grid */}
      <div className="space-y-3">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <Store className="w-4 h-4 text-indigo-600" />
          <span>Performance Détaillée par Point de Vente</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeMetricsList.map((sm) => (
            <div
              key={sm.storeId}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">{sm.code}</span>
                    <h4 className="font-black text-sm text-slate-900">{sm.storeName}</h4>
                    <p className="text-[11px] text-slate-500">Gérant: {sm.managerName}</p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      sm.wastePercentage > 15
                        ? 'bg-red-100 text-red-800'
                        : sm.wastePercentage > 8
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {sm.wastePercentage}% Perte
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Chiffre d'Affaires</span>
                    <span className="text-base font-black text-emerald-700">
                      {sm.totalRevenue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{sm.totalSalesUnits} unités vendues</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Valeur Invendus</span>
                    <span className="text-base font-black text-red-600">
                      {sm.totalWasteValue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{sm.totalWasteUnits} unités jetées</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>Taux de conversion vente</span>
                  <span>{100 - sm.wastePercentage}% Réussi</span>
                </div>
                <div className="w-full bg-red-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${100 - sm.wastePercentage}%` }}
                  />
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Product Ranking Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
          <span>Classement Général des Produits sur le Réseau</span>
          <span className="text-amber-400 text-[10px]">Top Ventes vs Pertes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Rang</th>
                <th className="p-3">Pâtisserie</th>
                <th className="p-3 text-right">Unités Vendues</th>
                <th className="p-3 text-right">Chiffre d'Affaires</th>
                <th className="p-3 text-right">Unités Perdues</th>
                <th className="p-3 text-right">Perte Financière</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rankedProducts.map((p, index) => (
                <tr key={p.productName} className="hover:bg-slate-50">
                  <td className="p-3 font-black text-slate-400">#{index + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{p.productName}</td>
                  <td className="p-3 text-right font-black text-indigo-900">{p.soldQty}</td>
                  <td className="p-3 text-right font-black text-emerald-700">
                    {p.revenue.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                  </td>
                  <td className="p-3 text-right font-bold text-red-600">{p.wasteQty}</td>
                  <td className="p-3 text-right text-red-700 font-medium">
                    {p.wasteValue.toFixed(2)} DZD
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
