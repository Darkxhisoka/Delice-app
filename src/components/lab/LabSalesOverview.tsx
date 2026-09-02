import React, { useState, useEffect } from 'react';
import {
  SaleTransaction,
  UnsoldProductLog,
  StoreLocation
} from '../../types';
import {
  getSaleTransactions,
  getUnsoldLogs,
  getStores,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  Store,
  DollarSign,
  TrendingUp,
  PackageX,
  ShoppingBag,
  Award,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight,
  Download
} from 'lucide-react';
import { exportSalesTransactionsPDF } from '../../utils/pdfExport';

export const LabSalesOverview: React.FC = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [unsoldLogs, setUnsoldLogs] = useState<UnsoldProductLog[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');

  const loadData = () => {
    setStores(getStores());
    setSales(getSaleTransactions());
    setUnsoldLogs(getUnsoldLogs());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const filteredSales = selectedStoreId === 'ALL'
    ? sales
    : sales.filter((s) => s.storeId === selectedStoreId);

  const filteredUnsold = selectedStoreId === 'ALL'
    ? unsoldLogs
    : unsoldLogs.filter((u) => u.storeId === selectedStoreId);

  // Overall Financial Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalTickets = filteredSales.length;
  const totalUnsoldLoss = filteredUnsold.reduce((sum, u) => sum + u.totalLossValue, 0);

  // Store Performance Leaderboard
  const storePerformance = stores.map((st) => {
    const stSales = sales.filter((s) => s.storeId === st.id);
    const stUnsold = unsoldLogs.filter((u) => u.storeId === st.id);
    const stRevenue = stSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const stLoss = stUnsold.reduce((sum, u) => sum + u.totalLossValue, 0);

    return {
      store: st,
      revenue: stRevenue,
      tickets: stSales.length,
      loss: stLoss,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Retail Network Sales & Waste Overview</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Central Lab Master View
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Monitor real-time retail store sales, order ticket volume, and daily pastry waste across all 6 retail locations.
              </p>
            </div>
          </div>

          {/* Store Filter & Export Button */}
          <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                const storeObj = stores.find((s) => s.id === selectedStoreId);
                const name = storeObj ? storeObj.name : 'Toutes les Boutiques';
                exportSalesTransactionsPDF(filteredSales, name, 'Synthèse Lab Central');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-slate-950 font-black text-xs transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Ventes PDF</span>
            </button>

            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="py-2 px-3 bg-white/10 text-white rounded-xl text-xs font-bold border border-white/20 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Retail Outlets</option>
              {stores.map((st) => (
                <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Level Key Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Network Sales Volume</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalRevenue.toFixed(2)} DZD
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Across retail sales registers</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Customer Tickets</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalTickets} <span className="text-xs font-normal text-slate-500">sales</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Completed retail transactions</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <PackageX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500">Network Unsold Waste</span>
            <div className="text-2xl font-black text-red-600 font-mono">
              {totalUnsoldLoss.toFixed(2)} DZD
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Disposed & expired cost</p>
          </div>
        </div>
      </div>

      {/* Store Performance Leaderboard Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Retail Stores Sales & Waste Ranking</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">{stores.length} Active Outlets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storePerformance.map((item, idx) => (
            <div
              key={item.store.id}
              className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                    Outlet #{idx + 1}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    {item.tickets} tickets
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{item.store.name}</h4>
                <p className="text-[11px] text-slate-500">{item.store.address}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Sales</span>
                  <span className="text-base font-black text-emerald-600">{item.revenue.toFixed(2)} DZD</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Waste Loss</span>
                  <span className="text-sm font-bold text-red-600">{item.loss.toFixed(2)} DZD</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
