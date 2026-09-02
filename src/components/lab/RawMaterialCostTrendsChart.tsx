import React, { useState, useMemo } from 'react';
import { RawMaterial, Receipt } from '../../types';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Download,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Info,
  Calendar,
  Boxes
} from 'lucide-react';

interface RawMaterialCostTrendsChartProps {
  rawMaterials: RawMaterial[];
  receipts: Receipt[];
}

type ViewMode = 'TOTAL_SPEND' | 'UNIT_PRICE_EVOLUTION' | 'CATEGORY_PERCENT';

export const RawMaterialCostTrendsChart: React.FC<RawMaterialCostTrendsChartProps> = ({
  rawMaterials,
  receipts
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('TOTAL_SPEND');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('ALL');

  // Month labels for 6-month history (March 2026 - August 2026)
  const monthList = [
    { key: '2026-03', label: 'Mars 2026', short: 'Mar' },
    { key: '2026-04', label: 'Avril 2026', short: 'Avr' },
    { key: '2026-05', label: 'Mai 2026', short: 'Mai' },
    { key: '2026-06', label: 'Juin 2026', short: 'Juin' },
    { key: '2026-07', label: 'Juillet 2026', short: 'Juil' },
    { key: '2026-08', label: 'Août 2026', short: 'Août' }
  ];

  // 1. Calculate Monthly Category Purchasing Expenditure over 6 Months
  const monthlyCategoryData = useMemo(() => {
    // Base monthly multiplier variations simulating market inflation/seasonality
    const categoryBaseCostMap: Record<string, number[]> = {
      'Flour & Grains': [142000, 145000, 148000, 151000, 156000, 160000],
      'Fats & Oils': [185000, 190000, 198000, 205000, 218000, 225000],
      'Chocolate & Cocoa': [110000, 112000, 116000, 122000, 128000, 134000],
      'Dairy & Eggs': [95000, 98000, 102000, 105000, 109000, 114000],
      'Sugars & Sweeteners': [45000, 46000, 47000, 48000, 49500, 51000],
      'Flavorings & Vanilla': [38000, 39500, 41000, 43000, 45000, 47500],
      'Packaging': [30000, 30500, 31000, 31500, 32000, 33000]
    };

    // Calculate actual receipt expenditures by month
    const receiptMonthlySpend: Record<string, Record<string, number>> = {};
    receipts.forEach((r) => {
      const monthKey = r.purchaseDate ? r.purchaseDate.substring(0, 7) : '2026-08';
      if (!receiptMonthlySpend[monthKey]) {
        receiptMonthlySpend[monthKey] = {};
      }
      r.items.forEach((item) => {
        const mat = rawMaterials.find((m) => m.id === item.rawMaterialId || m.name === item.rawMaterialName);
        const cat = mat ? mat.category : 'Other';
        receiptMonthlySpend[monthKey][cat] = (receiptMonthlySpend[monthKey][cat] || 0) + item.totalCost;
      });
    });

    return monthList.map((m, idx) => {
      const monthSpend = receiptMonthlySpend[m.key] || {};
      const flour = Math.round((categoryBaseCostMap['Flour & Grains'][idx] || 150000) + (monthSpend['Flour & Grains'] || 0) * 0.2);
      const fats = Math.round((categoryBaseCostMap['Fats & Oils'][idx] || 200000) + (monthSpend['Fats & Oils'] || 0) * 0.2);
      const choc = Math.round((categoryBaseCostMap['Chocolate & Cocoa'][idx] || 120000) + (monthSpend['Chocolate & Cocoa'] || 0) * 0.2);
      const dairy = Math.round((categoryBaseCostMap['Dairy & Eggs'][idx] || 100000) + (monthSpend['Dairy & Eggs'] || 0) * 0.2);
      const sugar = Math.round((categoryBaseCostMap['Sugars & Sweeteners'][idx] || 48000) + (monthSpend['Sugars & Sweeteners'] || 0) * 0.2);
      const vanilla = Math.round((categoryBaseCostMap['Flavorings & Vanilla'][idx] || 40000) + (monthSpend['Flavorings & Vanilla'] || 0) * 0.2);
      const pack = Math.round((categoryBaseCostMap['Packaging'][idx] || 32000) + (monthSpend['Packaging'] || 0) * 0.2);

      const total = flour + fats + choc + dairy + sugar + vanilla + pack;

      return {
        month: m.short,
        monthFull: m.label,
        monthKey: m.key,
        'Flour & Grains': flour,
        'Fats & Oils': fats,
        'Chocolate & Cocoa': choc,
        'Dairy & Eggs': dairy,
        'Sugars & Sweeteners': sugar,
        'Flavorings & Vanilla': vanilla,
        'Packaging': pack,
        TotalSpent: total
      };
    });
  }, [receipts, rawMaterials]);

  // 2. Unit Cost Evolution per Key Raw Material over 6 Months
  const unitPriceTrendsData = useMemo(() => {
    // Standard baseline price progression per material ID
    const priceHistories: Record<string, number[]> = {
      'rm-1': [3.80, 3.85, 3.90, 4.00, 4.15, 4.20], // Farine T55
      'rm-2': [4.50, 4.55, 4.60, 4.70, 4.85, 4.90], // Farine T45
      'rm-3': [12.50, 12.80, 13.20, 13.90, 14.50, 14.80], // Beurre Extra-Fin
      'rm-5': [15.20, 15.50, 16.00, 16.80, 17.50, 18.00], // Chocolat Noir 70%
      'rm-7': [1.02, 1.04, 1.05, 1.08, 1.09, 1.10], // Sucre
      'rm-9': [0.24, 0.25, 0.25, 0.26, 0.27, 0.28], // Oeufs
      'rm-10': [4.20, 4.30, 4.45, 4.60, 4.70, 4.80], // Crème Fleurette
      'rm-11': [18.00, 18.50, 19.00, 19.50, 20.00, 21.00] // Vanille
    };

    return monthList.map((m, idx) => {
      const row: Record<string, number | string> = {
        month: m.short,
        monthFull: m.label,
        monthKey: m.key
      };

      rawMaterials.forEach((rm) => {
        const history = priceHistories[rm.id];
        if (history) {
          row[rm.name] = history[idx];
        } else {
          // Generate realistic variation starting around currentAvgCost
          const factor = 1 - (5 - idx) * 0.02;
          row[rm.name] = Number((rm.currentAvgCost * factor).toFixed(2));
        }
      });

      return row;
    });
  }, [rawMaterials]);

  // 3. Overall 6-Month Budget Variance Metrics
  const firstMonthTotal = monthlyCategoryData[0]?.TotalSpent || 600000;
  const latestMonthTotal = monthlyCategoryData[5]?.TotalSpent || 710000;
  const totalDifferenceDzd = latestMonthTotal - firstMonthTotal;
  const totalPercentageIncrease = Number(((totalDifferenceDzd / firstMonthTotal) * 100).toFixed(1));

  // Identify Top Inflation Raw Materials
  const materialInflationList = useMemo(() => {
    return rawMaterials.map((rm) => {
      const month1Price = (unitPriceTrendsData[0][rm.name] as number) || rm.currentAvgCost * 0.88;
      const month6Price = (unitPriceTrendsData[5][rm.name] as number) || rm.currentAvgCost;
      const diff = month6Price - month1Price;
      const percent = month1Price > 0 ? (diff / month1Price) * 100 : 0;

      let volatility: 'HAUTE' | 'MODÉRÉE' | 'STABLE' = 'STABLE';
      if (percent >= 12) volatility = 'HAUTE';
      else if (percent >= 5) volatility = 'MODÉRÉE';

      return {
        id: rm.id,
        name: rm.name,
        sku: rm.sku,
        category: rm.category,
        unit: rm.unit,
        startPrice: month1Price,
        currentPrice: month6Price,
        diffDzd: diff,
        percentChange: Number(percent.toFixed(1)),
        volatility
      };
    }).sort((a, b) => b.percentChange - a.percentChange);
  }, [rawMaterials, unitPriceTrendsData]);

  // Filtered materials for line chart comparison
  const keyTrackedMaterials = useMemo(() => {
    if (selectedMaterialId !== 'ALL') {
      return rawMaterials.filter((m) => m.id === selectedMaterialId);
    }
    if (selectedCategory !== 'ALL') {
      return rawMaterials.filter((m) => m.category === selectedCategory).slice(0, 5);
    }
    // Top 5 materials by default
    return rawMaterials.filter((m) => ['rm-1', 'rm-3', 'rm-5', 'rm-10', 'rm-11'].includes(m.id));
  }, [rawMaterials, selectedCategory, selectedMaterialId]);

  const COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#3b82f6', '#14b8a6'];

  // Export 6-Month Raw Material Cost Report to CSV
  const handleExportCostReport = () => {
    const headers = ['Matière Première', 'SKU', 'Catégorie', 'Prix Mars 2026', 'Prix Août 2026', 'Évolution DZD', 'Évolution %', 'Niveau Volatilité'];
    const rows = materialInflationList.map((m) => [
      `"${m.name}"`,
      m.sku,
      `"${m.category}"`,
      m.startPrice.toFixed(2),
      m.currentPrice.toFixed(2),
      m.diffDzd.toFixed(2),
      `${m.percentChange}%`,
      m.volatility
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suivi_couts_matieres_premieres_6mois_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      
      {/* Component Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Évolution des Coûts d'Achat Matières Premières (6 Mois)
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Mars - Août 2026
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Suivi comparatif des dépenses globales et variations des prix unitaires fournisseurs pour l'anticipation budgétaire du Lab.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('TOTAL_SPEND')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'TOTAL_SPEND'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dépenses Totales (DZD)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('UNIT_PRICE_EVOLUTION')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'UNIT_PRICE_EVOLUTION'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Prix Unitaires (/unité)
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCostReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Exporter Rapport CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Ribbon: Budget Variance & Inflation Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-xs space-y-1.5 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Dépense Mensuelle Actuelle</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{latestMonthTotal.toLocaleString()} DZD</div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{totalPercentageIncrease}% vs Mars 2026 ({firstMonthTotal.toLocaleString()} DZD)</span>
          </div>
        </div>

        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Inflation Matière Maximale</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {materialInflationList[0]?.name || 'Beurre Extra-Fin'}
          </div>
          <p className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
            <span>+{materialInflationList[0]?.percentChange || 18.4}% d'augmentation sur 6 mois</span>
          </p>
        </div>

        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
            <span>Catégorie la Plus Involutive</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">Beurres & Matières Grasses</div>
          <p className="text-[11px] text-indigo-700 font-semibold">
            +21.6% d'impact sur le budget global Lab
          </p>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
            <span>Stabilité des Approvisionnements</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {materialInflationList.filter((m) => m.volatility === 'STABLE').length} Ingrédients
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">
            Prix stables (variation &lt; 5%) sur 6 mois
          </p>
        </div>

      </div>

      {/* Dynamic Main Chart Canvas */}
      <div className="space-y-4">
        
        {/* Category & Material Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" /> Filtres de Visualisation :
            </span>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedMaterialId('ALL');
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Toutes les Catégories</option>
              <option value="Flour & Grains">Farines & Céréales</option>
              <option value="Fats & Oils">Beurres & Huiles</option>
              <option value="Chocolate & Cocoa">Chocolats & Cacao</option>
              <option value="Dairy & Eggs">Produits Laitiers & Œufs</option>
              <option value="Sugars & Sweeteners">Sucres & Édulcorants</option>
              <option value="Flavorings & Vanilla">Aromates & Vanille</option>
              <option value="Packaging">Emballages</option>
            </select>

            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[220px]"
            >
              <option value="ALL">Tous les Ingrédients Clés</option>
              {rawMaterials.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name} ({rm.sku})
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Affichage des données cumulées du Laboratoire Central
          </span>
        </div>

        {/* Chart View 1: Total Purchasing Spend over 6 Months (AreaChart) */}
        {viewMode === 'TOTAL_SPEND' && (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCategoryData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorButter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k DZD`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} DZD`,
                    name === 'TotalSpent' ? 'Dépense Totale Achats' : name
                  ]}
                  labelFormatter={(label) => `Mois: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="TotalSpent"
                  name="Dépenses Totales Achats (DZD)"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="Fats & Oils"
                  name="Beurres & Grasses (DZD)"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorButter)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chart View 2: Unit Price Evolution per Key Material (LineChart) */}
        {viewMode === 'UNIT_PRICE_EVOLUTION' && (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={unitPriceTrendsData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${v} DZD`}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)} DZD / unité`, 'Coût Moyen d\'Achat']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {keyTrackedMaterials.map((rm, idx) => (
                  <Line
                    key={rm.id}
                    type="monotone"
                    dataKey={rm.name}
                    name={`${rm.name} (${rm.unit})`}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

      {/* AI Chef Budget Anticipation & Actionable Advice Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5 text-slate-950" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
            Recommandations d'Anticipation Budgétaire du Chef (Analyse IA 6 Mois)
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            • <strong>Hausse Forte sur le Beurre Extra-Fin (+18.4%)</strong> : Prévoyez une révision des coûts de revient sur la gamme Viennoiserie (Croissants/Pains au chocolat) ou négociez des contrats de sous-lots trimestriels groupés avec les moulins.<br />
            • <strong>Stabilité des Farines T55 & Sucre</strong> : Maintenez les fréquences de réapprovisionnement actuelles en stock de sécurité (15 jours).<br />
            • <strong>Option Reprise de Marge</strong> : Envisagez un ajustement de 3.5% sur le prix de vente boutique des entremets chocolat pour absorber l'inflation des fèves de cacao.
          </p>
        </div>
      </div>

      {/* Detailed Material Inflation & Volatility Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            Tableau Comparatif d'Évolution des Prix Unitaires par Ingrédient (6 Mois)
          </h4>
          <span className="text-[11px] font-medium text-slate-500">
            {materialInflationList.length} Ingrédients Analysés
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Ingrédient / SKU</th>
                <th className="py-2.5 px-3">Catégorie</th>
                <th className="py-2.5 px-3 text-right">Prix Mars 2026</th>
                <th className="py-2.5 px-3 text-right">Prix Août 2026</th>
                <th className="py-2.5 px-3 text-right">Variation (DZD)</th>
                <th className="py-2.5 px-3 text-right">Variation (%)</th>
                <th className="py-2.5 px-3 text-center">Volatilité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materialInflationList.map((m) => {
                const isHigh = m.volatility === 'HAUTE';
                const isModerate = m.volatility === 'MODÉRÉE';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block">{m.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">SKU: {m.sku}</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-600">{m.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">{m.startPrice.toFixed(2)} DZD</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{m.currentPrice.toFixed(2)} DZD</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                      {m.diffDzd >= 0 ? `+${m.diffDzd.toFixed(2)}` : m.diffDzd.toFixed(2)} DZD
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] ${
                        m.percentChange > 0
                          ? isHigh
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {m.percentChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {m.percentChange}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        isHigh
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isModerate
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {m.volatility}
                      </span>
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
