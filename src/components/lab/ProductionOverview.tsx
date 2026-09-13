import React, { useState, useEffect, useMemo } from 'react';
import {
  getRawMaterials,
  getRecipes,
  getRequisitions,
  getReceipts,
  getProductionBatches,
  subscribeToStoreChanges
} from '../../services/storage';
import { RawMaterial, Recipe, Requisition } from '../../types';
import { WeeklyProductionTrendsChart } from './WeeklyProductionTrendsChart';
import {
  exportProductionBatchesToPDF,
  exportProductionBatchesToExcel
} from '../../utils/reportingExport';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Factory,
  TrendingUp,
  Boxes,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChefHat,
  Scale,
  Zap,
  Sparkles,
  Layers,
  ArrowUpRight,
  Gauge,
  FileText,
  FileSpreadsheet
} from 'lucide-react';

interface ActiveBatch {
  id: string;
  batchCode: string;
  recipeName: string;
  category: string;
  targetUnits: number;
  completedUnits: number;
  stage: 'MIXING' | 'PROOFING' | 'BAKING' | 'COOLING' | 'QUALITY_CHECK' | 'DISPATCH_READY';
  progress: number;
  assignedStation: string;
  leadChef: string;
  startTime: string;
  estimatedFinish: string;
}

export const ProductionOverview: React.FC = () => {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [timeWindow, setTimeWindow] = useState<'TODAY' | '7DAYS' | '30DAYS'>('TODAY');
  const [materialChartMode, setMaterialChartMode] = useState<'STACKED' | 'LINES'>('STACKED');

  const loadData = () => {
    setRawMaterials(getRawMaterials());
    setRecipes(getRecipes());
    setRequisitions(getRequisitions());
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  // Mocked/calculated active production pipeline batches for Central Lab
  const activeBatches: ActiveBatch[] = [
    {
      id: 'b1',
      batchCode: 'BATCH-2026-0803-01',
      recipeName: 'Artisan Butter Croissant Lamination',
      category: 'Croissants & Pastries',
      targetUnits: 1200,
      completedUnits: 1200,
      stage: 'DISPATCH_READY',
      progress: 100,
      assignedStation: 'Oven Line #1',
      leadChef: 'Chef Antoine',
      startTime: '04:30 AM',
      estimatedFinish: '07:15 AM'
    },
    {
      id: 'b2',
      batchCode: 'BATCH-2026-0803-02',
      recipeName: 'Pain au Chocolat (Valrhona 64%)',
      category: 'Croissants & Pastries',
      targetUnits: 850,
      completedUnits: 680,
      stage: 'BAKING',
      progress: 80,
      assignedStation: 'Deck Oven #2',
      leadChef: 'Chef Marie',
      startTime: '05:00 AM',
      estimatedFinish: '08:00 AM'
    },
    {
      id: 'b3',
      batchCode: 'BATCH-2026-0803-03',
      recipeName: 'Vanilla Bean Tart Shells (Sub-recipe)',
      category: 'Tart Shells & Bases',
      targetUnits: 500,
      completedUnits: 350,
      stage: 'COOLING',
      progress: 70,
      assignedStation: 'Pastry Station B',
      leadChef: 'Chef Pierre',
      startTime: '06:15 AM',
      estimatedFinish: '08:45 AM'
    },
    {
      id: 'b4',
      batchCode: 'BATCH-2026-0803-04',
      recipeName: 'Brioche Nanterre Loaves',
      category: 'Bread & Savory',
      targetUnits: 350,
      completedUnits: 175,
      stage: 'PROOFING',
      progress: 50,
      assignedStation: 'Proofing Chamber A',
      leadChef: 'Chef Luc',
      startTime: '06:45 AM',
      estimatedFinish: '09:30 AM'
    },
    {
      id: 'b5',
      batchCode: 'BATCH-2026-0803-05',
      recipeName: 'Valrhona Chocolate Ganache Filling',
      category: 'Fillings & Creams',
      targetUnits: 250,
      completedUnits: 50,
      stage: 'MIXING',
      progress: 20,
      assignedStation: 'Batch Mixer #3',
      leadChef: 'Chef Sophie',
      startTime: '07:15 AM',
      estimatedFinish: '09:15 AM'
    }
  ];

  // Daily Production Category Breakdown
  const categoryProductionData = [
    { category: 'Croissants & Pastries', actual: 2050, target: 2200, unitCost: 0.85 },
    { category: 'Cakes & Tortes', actual: 340, target: 400, unitCost: 4.20 },
    { category: 'Tart Shells & Bases', actual: 850, target: 900, unitCost: 0.65 },
    { category: 'Fillings & Creams', actual: 420, target: 450, unitCost: 1.10 },
    { category: 'Bread & Savory', actual: 520, target: 600, unitCost: 0.95 }
  ];

  // Material Consumption Trend Data (Past 7 Days)
  const rawMaterialTrendData = [
    { day: 'Mon', Flour: 145, Butter: 82, Chocolate: 42, Sugar: 35, Dairy: 55, TotalKg: 359 },
    { day: 'Tue', Flour: 160, Butter: 95, Chocolate: 48, Sugar: 38, Dairy: 62, TotalKg: 403 },
    { day: 'Wed', Flour: 155, Butter: 88, Chocolate: 52, Sugar: 40, Dairy: 58, TotalKg: 393 },
    { day: 'Thu', Flour: 170, Butter: 102, Chocolate: 58, Sugar: 44, Dairy: 68, TotalKg: 442 },
    { day: 'Fri', Flour: 195, Butter: 120, Chocolate: 68, Sugar: 52, Dairy: 80, TotalKg: 515 },
    { day: 'Sat', Flour: 220, Butter: 140, Chocolate: 85, Sugar: 60, Dairy: 95, TotalKg: 600 },
    { day: 'Sun (Today)', Flour: 185, Butter: 110, Chocolate: 62, Sugar: 48, Dairy: 72, TotalKg: 477 }
  ];

  // Aggregate Metrics
  const totalUnitsProducedToday = categoryProductionData.reduce((sum, c) => sum + c.actual, 0);
  const totalUnitsTargetToday = categoryProductionData.reduce((sum, c) => sum + c.target, 0);
  const targetAchievementPct = Math.round((totalUnitsProducedToday / totalUnitsTargetToday) * 100);
  const totalMaterialKgToday = rawMaterialTrendData[rawMaterialTrendData.length - 1].TotalKg;

  // Raw Materials Near Reorder Level
  const lowStockMaterials = useMemo(() => {
    return rawMaterials.filter((rm) => rm.currentStock <= rm.reorderLevel * 1.25);
  }, [rawMaterials]);

  // Stage Badge Renderer
  const renderStageBadge = (stage: ActiveBatch['stage']) => {
    switch (stage) {
      case 'MIXING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">1. Mixing</span>;
      case 'PROOFING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">2. Proofing</span>;
      case 'BAKING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">3. Baking (Oven)</span>;
      case 'COOLING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">4. Cooling</span>;
      case 'QUALITY_CHECK':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">5. Quality Inspection</span>;
      case 'DISPATCH_READY':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">6. Ready for Dispatch</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Central Lab Production & Material Consumption Overview</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Real-time Lab Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Monitor current daily pastry production output against targets, batch stage pipelines, and raw ingredient consumption trends.
              </p>
            </div>
          </div>

          {/* Controls: Time Window & Exports */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportProductionBatchesToPDF(getProductionBatches())}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all active:scale-95"
                title="Exporter le rapport de production en PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" /> PDF
              </button>
              <button
                onClick={() => exportProductionBatchesToExcel(getProductionBatches())}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-all active:scale-95"
                title="Exporter les lots de production en Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Excel
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs">
              {[
                { id: 'TODAY', label: 'Today (Live)' },
                { id: '7DAYS', label: '7-Day Trend' },
                { id: '30DAYS', label: '30-Day Trend' },
              ].map((tw) => (
                <button
                  key={tw.id}
                  onClick={() => setTimeWindow(tw.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    timeWindow === tw.id
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Units Produced Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Daily Units Produced</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {totalUnitsProducedToday.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-medium">/ {totalUnitsTargetToday.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> {targetAchievementPct}% Target Yield Achieved
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Raw Material Consumed Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Raw Ingredients Consumed</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {totalMaterialKgToday} <span className="text-xs text-slate-500 font-medium">kg</span>
            </div>
            <p className="text-[11px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> Butter, Flour, Chocolate & Dairy
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Lab Capacity Utilization */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Oven & Equipment Capacity</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              88.5% <span className="text-xs text-emerald-600 font-bold">Optimal</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">5 Active Baking Lines running</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Active Batches in Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Active Production Batches</span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {activeBatches.length} <span className="text-xs text-slate-500 font-medium">batches</span>
            </div>
            <p className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Shift A in full operation
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Daily Production Output vs Target (Recharts ComposedChart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-500" />
                Daily Pastry Production Yield vs Target
              </h3>
              <p className="text-[11px] text-slate-400">Actual finished units produced vs scheduled lab target</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" /> Actual Units
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-indigo-600 inline-block" /> Target Yield
              </span>
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryProductionData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                  interval={0}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [
                    `${val} units`,
                    name === 'actual' ? 'Actual Produced' : 'Scheduled Target'
                  ]}
                />
                <Bar dataKey="actual" name="Actual Produced" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={28} />
                <Bar dataKey="target" name="Scheduled Target" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Raw Material Consumption Trends (Recharts AreaChart / LineChart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                Raw Material Daily Consumption Trends (kg)
              </h3>
              <p className="text-[11px] text-slate-400">7-day ingredient consumption across French Butter, Flour & Chocolate</p>
            </div>

            {/* Stacked vs Line Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold self-start sm:self-auto">
              <button
                onClick={() => setMaterialChartMode('STACKED')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  materialChartMode === 'STACKED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setMaterialChartMode('LINES')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  materialChartMode === 'LINES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Lines
              </button>
            </div>
          </div>

          <div className="h-56 sm:h-64 lg:h-72 w-full min-w-0 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {materialChartMode === 'STACKED' ? (
                <AreaChart data={rawMaterialTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="flourGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="butterGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="chocGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="Flour" stackId="1" stroke="#6366f1" fill="url(#flourGrad)" name="Flour T55/T65 (kg)" />
                  <Area type="monotone" dataKey="Butter" stackId="1" stroke="#f59e0b" fill="url(#butterGrad)" name="French Butter 84% (kg)" />
                  <Area type="monotone" dataKey="Chocolate" stackId="1" stroke="#8b5cf6" fill="url(#chocGrad)" name="Valrhona Chocolate (kg)" />
                </AreaChart>
              ) : (
                <LineChart data={rawMaterialTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#fff', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="Flour" stroke="#6366f1" strokeWidth={3} name="Flour T55/T65 (kg)" />
                  <Line type="monotone" dataKey="Butter" stroke="#f59e0b" strokeWidth={3} name="French Butter 84% (kg)" />
                  <Line type="monotone" dataKey="Chocolate" stroke="#8b5cf6" strokeWidth={3} name="Valrhona Chocolate (kg)" />
                  <Line type="monotone" dataKey="Dairy" stroke="#10b981" strokeWidth={2} name="Cream & Eggs (kg)" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Ingredient Warning Bar */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Ingredient Reorder Threshold Alert</h4>
              <p className="text-xs text-amber-800">
                {lowStockMaterials.length} raw materials in the lab inventory are near or below safety reorder levels:
                {' '}
                <strong className="text-amber-950">{lowStockMaterials.map((m) => `${m.name} (${m.currentStock} ${m.unit})`).join(', ')}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Production Batches Pipeline Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-sm">Central Lab Active Production Pipeline</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-semibold">
            {activeBatches.length} Live Batches Active Today
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <th className="py-2.5 px-3">Batch Code</th>
                <th className="py-2.5 px-3">Recipe / Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Current Production Stage</th>
                <th className="py-2.5 px-3 text-center">Batch Progress</th>
                <th className="py-2.5 px-3">Assigned Oven/Station</th>
                <th className="py-2.5 px-3">Lead Pastry Chef</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                    {batch.batchCode}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">
                    {batch.recipeName}
                  </td>
                  <td className="py-3 px-3 text-slate-500">
                    {batch.category}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {renderStageBadge(batch.stage)}
                  </td>
                  <td className="py-3 px-3 text-center min-w-[140px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold text-slate-600">
                        <span>{batch.completedUnits} / {batch.targetUnits} units</span>
                        <span>{batch.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            batch.progress === 100
                              ? 'bg-emerald-500'
                              : batch.progress >= 70
                              ? 'bg-amber-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${batch.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {batch.assignedStation}
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-bold flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                    {batch.leadChef}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Weekly Production Volume vs Raw Material Consumption Line Chart */}
      <WeeklyProductionTrendsChart
        requisitions={requisitions}
        rawMaterials={rawMaterials}
      />
    </div>
  );
};
