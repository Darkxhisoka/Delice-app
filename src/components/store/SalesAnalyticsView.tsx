import React, { useState, useEffect } from 'react';
import {
  SaleTransaction,
  StoreLocation,
  UnsoldProductLog
} from '../../types';
import {
  getSaleTransactions,
  getUnsoldLogs,
  subscribeToStoreChanges
} from '../../services/storage';
import { SaleReceiptModal } from './SaleReceiptModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  Eye,
  Calendar,
  PieChart,
  Award,
  PackageX,
  Zap,
  Download
} from 'lucide-react';
import { exportSalesTransactionsPDF } from '../../utils/pdfExport';
import { formatCurrency, formatDZD, formatMoney } from '../../utils/formatters';

interface SalesAnalyticsViewProps {
  currentStore: StoreLocation;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 text-xs font-mono space-y-1">
        <p className="font-bold text-slate-300 font-sans">{label}</p>
        <p className="text-emerald-400 font-black">
          Gross Sales: {formatCurrency(Number(payload[0].value))}
        </p>
        {payload[1] && (
          <p className="text-indigo-300 font-semibold">
            Completed Tickets: {payload[1].value} orders
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const SalesAnalyticsView: React.FC<SalesAnalyticsViewProps> = ({ currentStore }) => {
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [unsoldLogs, setUnsoldLogs] = useState<UnsoldProductLog[]>([]);
  const [dateRange, setDateRange] = useState<'TODAY' | '7DAYS' | 'MONTH' | 'ALL'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<SaleTransaction | null>(null);

  const loadData = () => {
    const storeSales = getSaleTransactions(currentStore.id);
    setSales(storeSales);

    const storeUnsold = getUnsoldLogs(currentStore.id);
    setUnsoldLogs(storeUnsold);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, [currentStore.id]);

  // Date Filtering
  const now = new Date();
  const filteredSales = sales.filter((s) => {
    if (dateRange === 'ALL') return true;
    const saleDate = new Date(s.timestamp);
    if (dateRange === 'TODAY') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (dateRange === '7DAYS') {
      const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateRange === 'MONTH') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  const filteredUnsold = unsoldLogs.filter((u) => {
    if (dateRange === 'ALL') return true;
    const logDate = new Date(u.recordedAt);
    if (dateRange === 'TODAY') return logDate.toDateString() === now.toDateString();
    if (dateRange === '7DAYS') {
      const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateRange === 'MONTH') {
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Analytics Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOrders = filteredSales.length;
  const avgTicketSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalUnsoldLoss = filteredUnsold.reduce((sum, u) => sum + u.totalLossValue, 0);

  // Top Selling Products Breakdown
  const productStats: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productStats[item.productId]) {
        productStats[item.productId] = {
          name: item.productName,
          category: item.category,
          qty: 0,
          revenue: 0,
        };
      }
      productStats[item.productId].qty += item.quantity;
      productStats[item.productId].revenue += item.totalPrice;
    });
  });

  const topProductsList = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);

  // Payment Breakdown
  const paymentCounts = {
    CASH: 0,
    CARD: 0,
    CONTACTLESS: 0,
    MOBILE_PAY: 0,
  };
  filteredSales.forEach((s) => {
    if (s.paymentMethod in paymentCounts) {
      paymentCounts[s.paymentMethod as keyof typeof paymentCounts] += 1;
    }
  });

  // Daily Sales Trends for Current Week (Last 7 Days)
  const weeklyTrend = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (6 - i));
    const dateKey = d.toDateString();
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const daySales = sales.filter((s) => new Date(s.timestamp).toDateString() === dateKey);
    const dayRevenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      day: dayLabel,
      fullDate: `${dayLabel}, ${dayFormatted}`,
      sales: Number(dayRevenue.toFixed(2)),
      orders: daySales.length,
    };
  });

  const weeklyRevenue = weeklyTrend.reduce((sum, d) => sum + d.sales, 0);
  const peakDayObj = [...weeklyTrend].sort((a, b) => b.sales - a.sales)[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Range Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-emerald-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Retail Store Sales Analytics</h2>
            <p className="text-xs text-slate-300 mt-1">
              Revenue performance, transaction metrics, and unsold product analysis for <strong className="text-white">{currentStore.name}</strong>.
            </p>
          </div>
        </div>

        {/* Date Selector & Export PDF Button */}
        <div className="flex items-center gap-3 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={() => exportSalesTransactionsPDF(filteredSales, currentStore.name, `Période: ${dateRange}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Rapport Ventes PDF</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: '7DAYS', label: '7 Days' },
              { id: 'MONTH', label: 'This Month' },
              { id: 'ALL', label: 'All Time' },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  dateRange === range.id
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Gross Sales Revenue</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Total POS volume
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Completed Orders</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {totalOrders} <span className="text-xs font-medium text-slate-500">tickets</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Customer transactions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Average Ticket Size</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(avgTicketSize)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Per transaction average</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Unsold Product Loss</span>
            <div className="text-2xl font-black text-red-600 font-mono mt-1">
              {formatCurrency(totalUnsoldLoss)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Waste & markdown total</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Daily Sales Trends Mini Chart (Current Week) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Current Week Daily Sales Trends</h3>
              <p className="text-[11px] text-slate-400">7-day gross revenue performance & order volume visualizer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono self-start sm:self-auto">
            <div className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-bold">
              7-Day Total: {formatCurrency(weeklyRevenue)}
            </div>
            {peakDayObj && peakDayObj.sales > 0 && (
              <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200/60 font-bold">
                Peak: {peakDayObj.day} ({formatCurrency(peakDayObj.sales)})
              </div>
            )}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-48 sm:h-56 lg:h-64 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) => `${val} DZD`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#salesGradient)"
                activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products & Payment Methods Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Top Performing Pastry Products</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">By Sales Revenue</span>
          </div>

          <div className="space-y-3">
            {topProductsList.slice(0, 5).map((prod, idx) => {
              const maxRevenue = topProductsList[0]?.revenue || 1;
              const pct = (prod.revenue / maxRevenue) * 100;

              return (
                <div key={prod.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      {prod.name}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({prod.category})
                      </span>
                    </span>
                    <div className="text-right font-mono">
                      <span className="font-black text-slate-900">{formatCurrency(prod.revenue)}</span>
                      <span className="text-[10px] text-slate-400 ml-2">({prod.qty} sold)</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {topProductsList.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No completed sales recorded for this date range.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PieChart className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Payment Method Distribution</h3>
          </div>

          <div className="space-y-3">
            {[
              { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard, count: paymentCounts.CARD, color: 'bg-blue-600' },
              { id: 'CASH', label: 'Cash Tendered', icon: Banknote, count: paymentCounts.CASH, color: 'bg-emerald-600' },
              { id: 'CONTACTLESS', label: 'Tap / Mobile Pay', icon: Smartphone, count: paymentCounts.CONTACTLESS + paymentCounts.MOBILE_PAY, color: 'bg-purple-600' },
            ].map((pm) => {
              const Icon = pm.icon;
              const pct = totalOrders > 0 ? ((pm.count / totalOrders) * 100).toFixed(0) : '0';

              return (
                <div key={pm.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-slate-600" />
                      {pm.label}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {pm.count} orders ({pct}%)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${pm.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Completed Sales History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm">Completed Sales Transactions Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-semibold">
            {filteredSales.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <th className="py-2.5 px-3">Receipt #</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3">Items Summary</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {sale.transactionNumber}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {new Date(sale.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{sale.cashierName}</td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                    {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                    {formatCurrency(sale.totalAmount)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => setSelectedReceipt(sale)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No sales transactions logged yet for this store.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Receipt Modal */}
      {selectedReceipt && (
        <SaleReceiptModal
          sale={selectedReceipt}
          store={currentStore}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
