import React, { useState, useEffect, useMemo } from 'react';
import {
  getLabWasteLogs,
  recordLabWasteLog,
  deleteLabWasteLog,
  getRawMaterials,
  getSemiFinishedStock,
  getRecipes,
  getRecipeUnitCost,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  LabWasteLog,
  WasteReason,
  RawMaterial,
  SemiFinishedStockItem,
  Recipe
} from '../../types';
import {
  AlertTriangle,
  Trash2,
  TrendingDown,
  PlusCircle,
  Plus,
  Minus,
  Search,
  Filter,
  Layers,
  DollarSign,
  Package,
  Boxes,
  ChefHat,
  Calendar,
  Clock,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Sparkles
} from 'lucide-react';

export const WasteLossManager: React.FC = () => {
  const [wasteLogs, setWasteLogs] = useState<LabWasteLog[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [semiFinishedStock, setSemiFinishedStock] = useState<SemiFinishedStockItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Form Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  
  // Form Inputs
  const [itemType, setItemType] = useState<'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD'>('RAW_MATERIAL');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [reason, setReason] = useState<WasteReason>('EXPIRED');
  const [recordedBy, setRecordedBy] = useState<string>('Head Pastry Chef');
  const [notes, setNotes] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');

  const loadData = () => {
    setWasteLogs(getLabWasteLogs());
    setRawMaterials(getRawMaterials());
    setSemiFinishedStock(getSemiFinishedStock());
    setRecipes(getRecipes());
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  // Update selected item default cost and defaults when itemType or selectedItemId changes
  useEffect(() => {
    if (itemType === 'RAW_MATERIAL') {
      if (rawMaterials.length > 0) {
        const item = rawMaterials.find((m) => m.id === selectedItemId) || rawMaterials[0];
        if (item && item.id !== selectedItemId) setSelectedItemId(item.id);
        if (item) {
          setUnitCost(item.currentAvgCost || 0);
        }
      }
    } else if (itemType === 'SEMI_FINISHED') {
      if (semiFinishedStock.length > 0) {
        const item = semiFinishedStock.find((s) => s.id === selectedItemId || s.recipeId === selectedItemId) || semiFinishedStock[0];
        if (item && item.id !== selectedItemId) setSelectedItemId(item.id);
        if (item) {
          const sfRecipe = recipes.find((r) => r.id === item.recipeId);
          const cost = sfRecipe ? getRecipeUnitCost(sfRecipe, recipes, rawMaterials) : 5.0;
          setUnitCost(cost);
        }
      }
    } else if (itemType === 'FINISHED_GOOD') {
      const finishedRecipes = recipes.filter((r) => (r.recipeType || 'FINISHED') === 'FINISHED');
      if (finishedRecipes.length > 0) {
        const item = finishedRecipes.find((r) => r.id === selectedItemId) || finishedRecipes[0];
        if (item && item.id !== selectedItemId) setSelectedItemId(item.id);
        if (item) {
          const cost = getRecipeUnitCost(item, recipes, rawMaterials);
          setUnitCost(cost);
        }
      }
    }
  }, [itemType, selectedItemId, rawMaterials, semiFinishedStock, recipes]);

  // Selected item reference for display details
  const selectedItemDetails = useMemo(() => {
    if (itemType === 'RAW_MATERIAL') {
      const mat = rawMaterials.find((m) => m.id === selectedItemId);
      return mat ? { name: mat.name, unit: mat.unit, category: mat.category, currentStock: mat.currentStock } : null;
    } else if (itemType === 'SEMI_FINISHED') {
      const sf = semiFinishedStock.find((s) => s.id === selectedItemId || s.recipeId === selectedItemId);
      return sf ? { name: sf.recipeName, unit: sf.unit, category: sf.category, currentStock: sf.currentStock } : null;
    } else {
      const rec = recipes.find((r) => r.id === selectedItemId);
      return rec ? { name: rec.name, unit: rec.unitName, category: rec.category, currentStock: 0 } : null;
    }
  }, [itemType, selectedItemId, rawMaterials, semiFinishedStock, recipes]);

  const totalFinancialLoss = useMemo(() => Number((quantity * unitCost).toFixed(2)), [quantity, unitCost]);

  const handleRecordWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantity <= 0 || !selectedItemDetails) return;

    recordLabWasteLog({
      itemType,
      itemId: selectedItemId,
      itemName: selectedItemDetails.name,
      category: selectedItemDetails.category,
      quantity,
      unit: selectedItemDetails.unit,
      unitCost,
      totalFinancialLoss,
      reason,
      recordedBy,
      notes,
      actionTaken
    });

    // Reset form
    setQuantity(1);
    setNotes('');
    setActionTaken('');
    setShowLogModal(false);
    loadData();
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Are you sure you want to remove this waste & loss record from the audit history?')) {
      deleteLabWasteLog(id);
      loadData();
    }
  };

  // KPI Calculations
  const totalLossVal = useMemo(
    () => wasteLogs.reduce((sum, log) => sum + log.totalFinancialLoss, 0),
    [wasteLogs]
  );

  const totalIncidents = wasteLogs.length;

  const topReason = useMemo(() => {
    if (wasteLogs.length === 0) return 'None';
    const counts: Record<string, number> = {};
    wasteLogs.forEach((l) => {
      counts[l.reason] = (counts[l.reason] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0][0].replace(/_/g, ' ');
  }, [wasteLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return wasteLogs.filter((log) => {
      const matchesSearch =
        log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.logCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.recordedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'ALL' || log.itemType === typeFilter;
      const matchesReason = reasonFilter === 'ALL' || log.reason === reasonFilter;

      return matchesSearch && matchesType && matchesReason;
    });
  }, [wasteLogs, searchTerm, typeFilter, reasonFilter]);

  const formatReasonBadge = (r: WasteReason) => {
    switch (r) {
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">Expired</span>;
      case 'PRODUCTION_FAILURE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">Production Failure</span>;
      case 'STORAGE_TEMPERATURE_FAULT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">Temp Fault</span>;
      case 'ACCIDENTAL_SPOILAGE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">Accidental Spoilage</span>;
      case 'QUALITY_DEFECT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-900 border border-orange-300">Quality Defect</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-300">Other</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & KPI Cards */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-rose-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Central Lab Waste & Loss Register</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Inventory Auto-Deduction
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Log production batches spoiled, expired raw materials, or temperature faults. Adjusts inventory pools and reflects total financial loss in audit trail.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record New Waste Log</span>
          </button>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-rose-900/60">
          <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-rose-200 text-xs font-semibold">
              <span>Total Financial Loss</span>
              <DollarSign className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {totalLossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
            </div>
            <span className="text-[10px] text-rose-300 mt-1 block">Accumulated Cost Write-Off</span>
          </div>

          <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-rose-200 text-xs font-semibold">
              <span>Total Waste Incidents</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {totalIncidents}
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block">Recorded Write-Off Logs</span>
          </div>

          <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-rose-200 text-xs font-semibold">
              <span>Primary Waste Reason</span>
              <ShieldAlert className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-black text-white capitalize mt-1 truncate">
              {topReason}
            </div>
            <span className="text-[10px] text-slate-300 mt-1 block">Most Frequent Driver</span>
          </div>

          <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-rose-200 text-xs font-semibold">
              <span>Stock Pool Impact</span>
              <Boxes className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xs font-bold text-white mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300">Raw Materials:</span>
                <span className="font-mono text-emerald-400">
                  {wasteLogs.filter((l) => l.itemType === 'RAW_MATERIAL').length} logs
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Semi-Finished:</span>
                <span className="font-mono text-purple-400">
                  {wasteLogs.filter((l) => l.itemType === 'SEMI_FINISHED').length} logs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-rose-600" />
              <span>Waste & Loss History</span>
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredLogs.length} Records
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search item, code or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none w-48 sm:w-64"
              />
            </div>

            {/* Item Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">All Item Types</option>
              <option value="RAW_MATERIAL">Raw Materials</option>
              <option value="SEMI_FINISHED">Semi-Finished Bases</option>
              <option value="FINISHED_GOOD">Finished Recipes</option>
            </select>

            {/* Reason Filter */}
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="ALL">All Reasons</option>
              <option value="EXPIRED">Expired</option>
              <option value="PRODUCTION_FAILURE">Production Failure</option>
              <option value="STORAGE_TEMPERATURE_FAULT">Temp Fault</option>
              <option value="ACCIDENTAL_SPOILAGE">Accidental Spoilage</option>
              <option value="QUALITY_DEFECT">Quality Defect</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Log Code</th>
                <th className="py-3 px-3">Date / Time</th>
                <th className="py-3 px-3">Item Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Total Cost Loss</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Recorded By</th>
                <th className="py-3 px-3">Notes & Action</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {log.logCode}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()}{' '}
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {log.itemName}
                      <span className="block text-[10px] font-normal text-slate-500">{log.category}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        log.itemType === 'RAW_MATERIAL'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : log.itemType === 'SEMI_FINISHED'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}>
                        {log.itemType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {log.unitCost.toFixed(2)} DZD
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-600">
                      {log.totalFinancialLoss.toFixed(2)} DZD
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {formatReasonBadge(log.reason)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {log.recordedBy}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs">
                      {log.notes && <p className="truncate text-slate-800 font-medium">{log.notes}</p>}
                      {log.actionTaken && (
                        <p className="text-[10px] text-purple-700 font-semibold truncate">
                          Action: {log.actionTaken}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                    No waste or loss logs found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Log Modal Overlay */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl relative my-8">
            
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Record Central Lab Waste & Loss</h3>
                <p className="text-xs text-slate-500">
                  Write off damaged stock, expired materials, or failed batch runs. Inventory will automatically decrease.
                </p>
              </div>
            </div>

            <form onSubmit={handleRecordWaste} className="space-y-4 mt-4">
              
              {/* Item Classification Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Item Pool / Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType('RAW_MATERIAL')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      itemType === 'RAW_MATERIAL'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Raw Materials
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType('SEMI_FINISHED')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      itemType === 'SEMI_FINISHED'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semi-Finished Base
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType('FINISHED_GOOD')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                      itemType === 'FINISHED_GOOD'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Finished Good
                  </button>
                </div>
              </div>

              {/* Item Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Item to Write Off
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {itemType === 'RAW_MATERIAL' &&
                    rawMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Stock: {m.currentStock} {m.unit} • Avg Cost: {m.currentAvgCost.toFixed(2)} DZD)
                      </option>
                    ))}

                  {itemType === 'SEMI_FINISHED' &&
                    semiFinishedStock.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.recipeName} (Stock: {s.currentStock} {s.unit})
                      </option>
                    ))}

                  {itemType === 'FINISHED_GOOD' &&
                    recipes
                      .filter((r) => (r.recipeType || 'FINISHED') === 'FINISHED')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category})
                        </option>
                      ))}
                </select>
              </div>

              {/* Quantity and Unit Cost Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">Quantité Perdue</label>
                    {selectedItemDetails && (
                      <span className="text-[11px] text-slate-500">
                        Unité: <strong>{selectedItemDetails.unit}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(0.1, Number((quantity - 1).toFixed(2))))}
                      className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200 transition-colors touch-manipulation font-bold"
                      title="-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      step="0.01"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-center text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(Number((quantity + 1).toFixed(2)))}
                      className="w-11 h-11 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 transition-colors touch-manipulation font-bold"
                      title="+1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Coût Unitaire (DZD)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9.]*"
                    step="0.01"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              {/* Total Financial Loss Display */}
              <div className="bg-rose-50 rounded-xl p-3 border border-rose-200 flex items-center justify-between text-xs">
                <span className="font-bold text-rose-900">Total Financial Cost Loss:</span>
                <span className="font-black text-rose-700 text-sm font-mono">
                  {totalFinancialLoss.toFixed(2)} DZD
                </span>
              </div>

              {/* Waste Reason */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Primary Reason for Waste</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as WasteReason)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="EXPIRED">Expired Goods / Ingredients</option>
                  <option value="PRODUCTION_FAILURE">Production Failure (Scorched, Scorched, Batch Defect)</option>
                  <option value="STORAGE_TEMPERATURE_FAULT">Storage / Cooler Temperature Fault</option>
                  <option value="ACCIDENTAL_SPOILAGE">Accidental Spoilage / Contamination</option>
                  <option value="QUALITY_DEFECT">Quality Defect / Texture Out of Specs</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              {/* Recorded By */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Recorded By (Staff Member)</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Notes & Preventative Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Incident Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe how the loss occurred..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">Action Taken / Prevention</label>
                  <textarea
                    rows={2}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Steps taken to prevent recurrence..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Write-Off & Deduct Inventory</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
