import React, { useState, useEffect, useMemo } from 'react';
import {
  getRecipes,
  getRawMaterials,
  getSemiFinishedStock,
  getRetailProducts,
  calculateProductionCascadePreview,
  executeProductionCascade,
  subscribeToStoreChanges,
  getActivityLogs
} from '../../services/storage';
import {
  Recipe,
  ProductionCascadePreview,
  ProductionCascadeExecutionResult,
  ActivityLogItem
} from '../../types';
import {
  Factory,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Boxes,
  ChefHat,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
  Check,
  ShieldAlert,
  History,
  TrendingUp,
  PackageCheck,
  Plus,
  Minus,
  Calculator,
  Coins,
  ChevronDown,
  ChevronUp,
  PieChart,
  Percent,
  DollarSign
} from 'lucide-react';

interface ProductionRunnerProps {
  initialRecipeId?: string;
  onCloseModal?: () => void;
}

export const ProductionRunner: React.FC<ProductionRunnerProps> = ({
  initialRecipeId,
  onCloseModal,
}) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [targetQuantity, setTargetQuantity] = useState<number>(50);
  const [preview, setPreview] = useState<ProductionCascadePreview | null>(null);
  const [executionResult, setExecutionResult] = useState<ProductionCascadeExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [recentLogs, setRecentLogs] = useState<ActivityLogItem[]>([]);
  const [showCostDetails, setShowCostDetails] = useState<boolean>(false);

  // Filter finished product recipes
  const finishedRecipes = useMemo(
    () => recipes.filter((r) => (r.recipeType || 'FINISHED') === 'FINISHED'),
    [recipes]
  );

  const rawMaterials = useMemo(() => getRawMaterials(), [recipes]);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId),
    [recipes, selectedRecipeId]
  );

  // Cost Simulation computation (Simulateur de Coût de Revient)
  const costSimulation = useMemo(() => {
    if (!preview || !selectedRecipe) return null;

    let totalRawMaterialCost = 0;
    const breakdown: Array<{ name: string; qty: number; unit: string; avgCost: number; totalCost: number }> = [];

    preview.totalRawMaterialsSummary.forEach((item) => {
      const mat = rawMaterials.find((m) => m.id === item.materialId);
      const avgCost = mat ? mat.currentAvgCost : 0;
      const itemCost = item.totalNeeded * avgCost;
      totalRawMaterialCost += itemCost;

      breakdown.push({
        name: item.materialName,
        qty: item.totalNeeded,
        unit: item.unit,
        avgCost,
        totalCost: itemCost,
      });
    });

    const estimatedUnitCost = targetQuantity > 0 ? totalRawMaterialCost / targetQuantity : 0;

    // Retrieve corresponding retail sale price if matched
    const retailProducts = getRetailProducts();
    const matchedRetail = retailProducts.find(
      (p) => p.name.toLowerCase() === selectedRecipe.name.toLowerCase() || p.sku === selectedRecipe.id
    );

    const retailPrice = matchedRetail ? matchedRetail.price : ((selectedRecipe as any).sellingPrice || estimatedUnitCost * 2.2);
    const totalSimulatedRevenue = retailPrice * targetQuantity;
    const totalGrossProfit = totalSimulatedRevenue - totalRawMaterialCost;
    const marginPercent = totalSimulatedRevenue > 0 ? (totalGrossProfit / totalSimulatedRevenue) * 100 : 0;

    return {
      totalRawMaterialCost,
      estimatedUnitCost,
      breakdown,
      retailPrice,
      totalSimulatedRevenue,
      totalGrossProfit,
      marginPercent,
      hasRetailMatch: !!matchedRetail,
    };
  }, [preview, selectedRecipe, targetQuantity, rawMaterials]);

  const loadData = () => {
    const recs = getRecipes();
    setRecipes(recs);
    const logs = getActivityLogs().filter((l) => l.type === 'SEMI_FINISHED_PRODUCED');
    setRecentLogs(logs.slice(0, 5));
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  useEffect(() => {
    if (initialRecipeId) {
      setSelectedRecipeId(initialRecipeId);
      const r = recipes.find((item) => item.id === initialRecipeId);
      if (r) {
        setTargetQuantity(r.yieldUnits || 50);
      }
    } else if (finishedRecipes.length > 0 && !selectedRecipeId) {
      setSelectedRecipeId(finishedRecipes[0].id);
      setTargetQuantity(finishedRecipes[0].yieldUnits || 50);
    }
  }, [initialRecipeId, finishedRecipes, recipes]);

  // Recalculate cascade preview on selection or quantity change
  useEffect(() => {
    if (selectedRecipeId && targetQuantity > 0) {
      const p = calculateProductionCascadePreview(selectedRecipeId, targetQuantity);
      setPreview(p);
    } else {
      setPreview(null);
    }
  }, [selectedRecipeId, targetQuantity, recipes]);

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const r = recipes.find((item) => item.id === recipeId);
    if (r) {
      setTargetQuantity(r.yieldUnits || 50);
    }
    setExecutionResult(null);
  };

  const handleLaunchProduction = () => {
    if (!selectedRecipeId || targetQuantity <= 0) return;
    setIsExecuting(true);

    setTimeout(() => {
      const result = executeProductionCascade(selectedRecipeId, targetQuantity);
      setExecutionResult(result);
      setIsExecuting(false);
      loadData();
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl p-6 text-white shadow-lg border border-purple-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">Automated Production Launch & Cascade Engine</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Multi-Level BOM
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Auto-detects missing semi-finished goods, calculates raw material deficits, and auto-launches sub-production runs in a single cascade.
              </p>
            </div>
          </div>

          {onCloseModal && (
            <button
              onClick={onCloseModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              Close Runner
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Recipe Selection & Cascade Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Config Panel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-indigo-600" />
              <span>Target Finished Product</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Step 1 of 2
            </span>
          </div>

          {/* Select Finished Product Recipe */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Recette du Produit Fini
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[48px]"
            >
              {finishedRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.yieldUnits} {r.unitName} / lot standard)
                </option>
              ))}
            </select>
          </div>

          {/* Target Production Yield - Touch Ergonomic Numeric Stepper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Quantité Cible à Produire ({selectedRecipe?.unitName || 'unités'})
              </label>
              {selectedRecipe && (
                <span className="text-[11px] font-medium text-slate-500">
                  Lot de Base: {selectedRecipe.yieldUnits} {selectedRecipe.unitName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetQuantity(Math.max(1, targetQuantity - 10))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 flex items-center justify-center shrink-0 transition-colors shadow-xs touch-manipulation font-bold text-lg"
                title="-10"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="1"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border-2 border-indigo-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-center text-lg font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[48px]"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400 pointer-events-none">
                  {selectedRecipe?.unitName || 'pcs'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setTargetQuantity(targetQuantity + 10)}
                className="w-12 h-12 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0 transition-colors shadow-xs touch-manipulation font-bold text-lg"
                title="+10"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Multiplier Touch Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[25, 50, 100, 200, 500].map((qty) => (
                <button
                  key={qty}
                  onClick={() => setTargetQuantity(qty)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center touch-manipulation ${
                    targetQuantity === qty
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {qty} {selectedRecipe?.unitName || 'pcs'}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Price Simulator Card (Simulateur de Coût de Revient) */}
          {selectedRecipe && preview && costSimulation && (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 rounded-2xl p-4 border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Simulateur de Coût de Revient</h4>
                    <p className="text-[10px] text-slate-500">Consommation réelle MP & Sous-lots</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Aide à la Décision
                </span>
              </div>

              {/* Cost Metric Highlight Cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 font-semibold block">Coût Unitaire Estimé</span>
                  <div className="text-sm font-black text-amber-700 font-mono mt-0.5">
                    {costSimulation.estimatedUnitCost.toFixed(2)} DZD
                  </div>
                  <span className="text-[9px] text-slate-400">par {selectedRecipe.unitName || 'unité'}</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] text-slate-500 font-semibold block">Coût Total du Lot</span>
                  <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                    {costSimulation.totalRawMaterialCost.toFixed(2)} DZD
                  </div>
                  <span className="text-[9px] text-emerald-600 font-semibold">{targetQuantity} {selectedRecipe.unitName} produits</span>
                </div>
              </div>

              {/* Margin & Profit Simulation Row */}
              <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] font-medium">Prix Vente Détail :</span>
                  <span className="font-bold text-slate-900 font-mono">{costSimulation.retailPrice.toFixed(2)} DZD</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-600 font-medium">Marge Brute Estimée :</span>
                  <span className={`font-mono font-extrabold ${costSimulation.marginPercent >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    +{costSimulation.marginPercent.toFixed(1)}% (+{costSimulation.totalGrossProfit.toFixed(0)} DZD)
                  </span>
                </div>
              </div>

              {/* Collapsible Detailed Material Consumption Breakdown */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowCostDetails(!showCostDetails)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-700 hover:text-amber-700 transition-colors py-1 px-1 rounded-lg"
                >
                  <span className="flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-amber-600" />
                    Consommation Détaillée MP ({costSimulation.breakdown.length} matières)
                  </span>
                  {showCostDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                {showCostDetails && (
                  <div className="mt-2 space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                    {costSimulation.breakdown.map((item, idx) => (
                      <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 block">{item.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {item.qty} {item.unit} × {item.avgCost.toFixed(2)} DZD/{item.unit}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">{item.totalCost.toFixed(2)} DZD</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Launch Action Button */}
          <button
            onClick={handleLaunchProduction}
            disabled={!preview || !preview.canExecute || isExecuting}
            className={`w-full py-3.5 px-4 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all ${
              preview && preview.canExecute
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md hover:shadow-lg active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Production Cascade...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-slate-950" />
                <span>⚡ Launch Cascading Production Run</span>
              </>
            )}
          </button>

          {!preview?.canExecute && preview?.blockers && preview.blockers.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Production Blocked</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {preview.blockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Right Column: Multi-Level BOM & Cascading Tree Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Level 1: Semi-Finished Base Requirements */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Level 1: Semi-Finished Stock Depots</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Checks available stock in `semi_finished_stock`. Auto-triggers sub-production if deficit exists.
                </p>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                Dual Stock Pool
              </span>
            </div>

            {preview && preview.semiFinishedRequirements.length > 0 ? (
              <div className="space-y-3">
                {preview.semiFinishedRequirements.map((req) => (
                  <div
                    key={req.recipeId}
                    className={`rounded-xl p-4 border transition-all ${
                      req.status === 'IN_STOCK'
                        ? 'bg-emerald-50/50 border-emerald-200/80'
                        : req.status === 'AUTO_PRODUCING'
                        ? 'bg-purple-50/70 border-purple-300 shadow-xs'
                        : 'bg-rose-50/60 border-rose-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{req.recipeName}</h4>
                          {req.status === 'IN_STOCK' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              In Stock
                            </span>
                          )}
                          {req.status === 'AUTO_PRODUCING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 text-purple-700" />
                              ⚡ Auto-Producing Missing Base (+{req.deficitQty} {req.unit})
                            </span>
                          )}
                          {req.status === 'INSUFFICIENT_RAW' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              ⚠️ Insufficient Raw Material
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-600 mt-1">
                          <span>Required: <strong className="text-slate-900">{req.requiredQty} {req.unit}</strong></span>
                          <span>In Stock: <strong className="text-slate-900">{req.availableStock} {req.unit}</strong></span>
                          {req.deficitQty > 0 && (
                            <span className="text-purple-700 font-bold">Deficit: {req.deficitQty} {req.unit}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block">Depot Source</span>
                        <span className="text-xs font-extrabold text-slate-800">`semi_finished_stock`</span>
                      </div>
                    </div>

                    {/* Sub-run Raw Materials Breakdown if Auto-Producing */}
                    {req.deficitQty > 0 && req.rawMaterialsNeeded.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200/60 bg-white/60 rounded-lg p-2.5 space-y-1.5">
                        <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider block">
                          Sub-Run Raw Materials Needed for Deficit:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {req.rawMaterialsNeeded.map((mat) => (
                            <div
                              key={mat.materialId}
                              className={`flex items-center justify-between text-[11px] p-1.5 rounded-md ${
                                mat.hasEnough ? 'bg-slate-100/80 text-slate-700' : 'bg-rose-100 text-rose-900 font-bold'
                              }`}
                            >
                              <span>{mat.materialName}</span>
                              <span className="font-bold">
                                {mat.quantityNeeded} {mat.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                This recipe uses direct raw materials only (no semi-finished sub-recipes required).
              </div>
            )}
          </div>

          {/* Level 2: Direct & Indirect Raw Material Requirements */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-indigo-600" />
                  <span>Level 2: Raw Material Inventory Requirements</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Consolidated raw material demands for direct batch + sub-production auto-runs.
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                `raw_material_stock`
              </span>
            </div>

            {preview && preview.totalRawMaterialsSummary.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {preview.totalRawMaterialsSummary.map((mat) => (
                  <div
                    key={mat.materialId}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                      mat.hasEnough
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{mat.materialName}</span>
                        {mat.hasEnough ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            OK
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                            DEFICIT
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                        {mat.directQty > 0 && <div>Direct Need: <strong>{mat.directQty} {mat.unit}</strong></div>}
                        {mat.subRunQty > 0 && <div className="text-purple-700 font-semibold">Sub-Run Need: <strong>+{mat.subRunQty} {mat.unit}</strong></div>}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total Need / Avail:</span>
                      <span className="font-black text-slate-900">
                        {mat.totalNeeded} / {mat.currentStock} {mat.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                No raw materials calculated yet.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Execution Results Dialog */}
      {executionResult && (
        <div className="bg-emerald-950 text-white rounded-2xl p-6 border border-emerald-800 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black">Production Cascade Successfully Executed!</h3>
                <p className="text-xs text-emerald-300">
                  Batch Code: <strong className="text-white">{executionResult.finishedBatchCode}</strong> • Produced {executionResult.targetQuantity} {executionResult.unitName} of {executionResult.finishedRecipeName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExecutionResult(null)}
              className="text-xs text-emerald-300 hover:text-white px-3 py-1 bg-white/10 rounded-lg"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step-by-Step Cascade Audit Logs:</h4>
            <div className="bg-slate-950/80 rounded-xl p-4 border border-emerald-900/60 space-y-2 font-mono text-xs">
              {executionResult.logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 text-emerald-200">
                  <span className="text-emerald-500 shrink-0">[{idx + 1}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span>Central Lab Cascade Audit Trail</span>
          </h3>
          <span className="text-xs text-slate-500">Live Activity Feed</span>
        </div>

        <div className="space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{log.title}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-900">
                    {log.badgeText}
                  </span>
                </div>
                <p className="text-slate-600">{log.description}</p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
