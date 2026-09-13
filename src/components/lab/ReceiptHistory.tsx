import React, { useState, useEffect } from 'react';
import { getReceipts, getRawMaterials, subscribeToStoreChanges } from '../../services/storage';
import { Receipt, RawMaterial } from '../../types';
import { FileText, Search, Calendar, ChevronDown, ChevronUp, DollarSign, Building, TrendingUp, BarChart3 } from 'lucide-react';
import { RawMaterialCostTrendsChart } from './RawMaterialCostTrendsChart';

export const ReceiptHistory: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCostTrends, setShowCostTrends] = useState<boolean>(false);

  useEffect(() => {
    const load = () => {
      setReceipts(getReceipts());
      setRawMaterials(getRawMaterials());
    };
    load();
    return subscribeToStoreChanges(load);
  }, []);

  const filtered = receipts.filter((r) => {
    const search = searchTerm.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(search) ||
      r.invoiceNumber.toLowerCase().includes(search) ||
      r.supplierName.toLowerCase().includes(search) ||
      r.items.some((i) => i.rawMaterialName.toLowerCase().includes(search))
    );
  });

  const totalSpent = receipts.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Raw Material Purchase Receipts History</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Log of all incoming supplier deliveries, unit prices paid, and invoice totals.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCostTrends(!showCostTrends)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              showCostTrends
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>{showCostTrends ? 'Masquer Graphique Coûts 6 Mois' : '📈 Graphique Évolution Coûts 6 Mois'}</span>
          </button>

          <div className="text-right border-r border-slate-200 pr-4 hidden md:block">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Expenditure</span>
            <span className="text-base font-black text-slate-900">{totalSpent.toFixed(2)} DZD</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search receipt # or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 6-Month Raw Material Purchasing Cost Trends Chart */}
      {showCostTrends && (
        <RawMaterialCostTrendsChart rawMaterials={rawMaterials} receipts={receipts} />
      )}

      {/* Receipts List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs font-medium">
          No purchase receipts found matching search.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rec) => {
            const isExpanded = expandedId === rec.id;

            return (
              <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700 shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{rec.receiptNumber}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {rec.supplierName}
                        </span>
                        <span className="text-xs font-mono text-slate-500">Inv: {rec.invoiceNumber}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Purchased: <strong className="text-slate-700">{rec.purchaseDate}</strong></span>
                        <span>•</span>
                        <span>Recorded by: {rec.recordedBy}</span>
                        <span>•</span>
                        <span>{rec.items.length} Items Received</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Invoice Total</span>
                      <span className="text-base font-black text-slate-900">{rec.totalAmount.toFixed(2)} DZD</span>
                    </div>

                    <button className="p-1.5 text-slate-400 hover:text-slate-700">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Item Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-5 bg-slate-50/60 space-y-3">
                    {rec.notes && (
                      <div className="text-xs text-slate-700 bg-slate-100 p-3 rounded-xl border border-slate-200">
                        <strong className="font-bold">Inspection Remarks:</strong> {rec.notes}
                      </div>
                    )}

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                            <th className="p-2.5">Raw Material</th>
                            <th className="p-2.5 text-center">Quantity Received</th>
                            <th className="p-2.5 text-right">Unit Price Paid</th>
                            <th className="p-2.5 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rec.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{item.rawMaterialName}</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="p-2.5 text-right text-slate-600">{item.unitPrice.toFixed(2)} DZD</td>
                              <td className="p-2.5 text-right font-bold text-slate-900">{item.totalCost.toFixed(2)} DZD</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
