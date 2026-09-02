import React, { useState } from 'react';
import { getRawMaterials, getRecipes } from '../../services/storage';
import { RawMaterial, Recipe } from '../../types';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  Scale
} from 'lucide-react';

export const PriceInflationSimulator: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>(getRawMaterials());
  const [recipes, setRecipes] = useState<Recipe[]>(getRecipes());
  
  // Custom inflation adjustments map (materialId -> percentChange e.g. +15%)
  const [inflationMap, setInflationMap] = useState<Record<string, number>>({
    'rm-1': 15, // Beurre AOP +15%
    'rm-2': 10, // Farine T45 +10%
    'rm-6': 20, // Chocolat Valrhona +20%
    'rm-8': 25, // Gousses Vanille +25%
  });

  const [globalPercent, setGlobalPercent] = useState<number>(0);

  const handleMaterialChange = (matId: string, percent: number) => {
    setInflationMap(prev => ({
      ...prev,
      [matId]: percent
    }));
  };

  const handleApplyGlobalInflation = (percent: number) => {
    setGlobalPercent(percent);
    const updated: Record<string, number> = {};
    materials.forEach(m => {
      updated[m.id] = percent;
    });
    setInflationMap(updated);
  };

  const handleReset = () => {
    setInflationMap({});
    setGlobalPercent(0);
  };

  // Helper to calculate recipe cost under baseline vs simulated prices
  const calculateRecipeCosts = (recipe: Recipe) => {
    let baseCost = 0;
    let simulatedCost = 0;

    recipe.ingredients.forEach(ing => {
      const mat = materials.find(m => m.id === ing.rawMaterialId);
      if (mat) {
        const qty = ing.quantity || 0;
        const currentPrice = mat.currentAvgCost || 0;
        const inflationPercent = inflationMap[mat.id] || 0;
        const simPrice = currentPrice * (1 + inflationPercent / 100);

        baseCost += qty * currentPrice;
        simulatedCost += qty * simPrice;
      }
    });

    const currentCostPerUnit = recipe.yieldUnits > 0 ? baseCost / recipe.yieldUnits : 0;
    const simulatedCostPerUnit = recipe.yieldUnits > 0 ? simulatedCost / recipe.yieldUnits : 0;
    const sellingPrice = recipe.retail_selling_price || recipe.suggestedSellingPrice || (currentCostPerUnit * 3);

    const baseMargin = sellingPrice > 0 ? ((sellingPrice - currentCostPerUnit) / sellingPrice) * 100 : 0;
    const simulatedMargin = sellingPrice > 0 ? ((sellingPrice - simulatedCostPerUnit) / sellingPrice) * 100 : 0;
    const recommendedPriceToKeepMargin = baseMargin > 0 ? simulatedCostPerUnit / (1 - baseMargin / 100) : sellingPrice;

    return {
      baseCostPerUnit: currentCostPerUnit,
      simulatedCostPerUnit,
      costIncreasePercent: currentCostPerUnit > 0 ? ((simulatedCostPerUnit - currentCostPerUnit) / currentCostPerUnit) * 100 : 0,
      sellingPrice,
      baseMargin,
      simulatedMargin,
      marginErosion: baseMargin - simulatedMargin,
      recommendedPrice: Math.ceil(recommendedPriceToKeepMargin / 10) * 10 // Rounded to 10 DZD
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 border border-amber-800/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-400" /> Simulateur Économique & COGS
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Aide à la Décision Tarifaire
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Simulateur d'Inflation Matières Premières & Impact Marges
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Modélisez l'impact des hausses des cours mondiaux (beurre, chocolat, vanille, farine) sur le coût de revient de vos recettes et préservez vos marges bénéficiaires.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Global Preset Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-amber-900/50 flex-wrap">
          <span className="text-xs font-bold text-amber-200">Scénarios Rapides :</span>
          <button
            onClick={() => handleApplyGlobalInflation(5)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
          >
            +5% Général
          </button>
          <button
            onClick={() => handleApplyGlobalInflation(10)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
          >
            +10% Inflation Modérée
          </button>
          <button
            onClick={() => handleApplyGlobalInflation(20)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
          >
            +20% Choc Énergétique / Crise Matières
          </button>
        </div>
      </div>

      {/* Main Grid: Ingredient Sliders (Left) vs Recipe Margins (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Key Ingredients Inflation Inputs */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" /> Variations par Matière
            </h2>
            <span className="text-xs font-bold text-slate-500">{materials.length} Ingrédients</span>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {materials.map((mat) => {
              const currentVal = inflationMap[mat.id] || 0;
              const simPrice = mat.currentAvgCost * (1 + currentVal / 100);

              return (
                <div key={mat.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 block">{mat.name}</span>
                      <span className="text-xs text-slate-500">{mat.currentAvgCost.toLocaleString('fr-DZ')} DZD / {mat.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        currentVal > 0 ? 'bg-rose-100 text-rose-700' : currentVal < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {currentVal > 0 ? `+${currentVal}%` : `${currentVal}%`}
                      </span>
                      <span className="block text-[11px] font-bold text-slate-600">
                        = {simPrice.toFixed(1)} DZD
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="-20"
                      max="60"
                      step="5"
                      value={currentVal}
                      onChange={(e) => handleMaterialChange(mat.id, parseInt(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recipe Impact & Recommended Prices */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" /> Impact sur les Recettes & Prix Conseillés
            </h2>
            <span className="text-xs font-bold text-slate-500">Mise à jour en temps réel</span>
          </div>

          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
            {recipes.map((recipe) => {
              const metrics = calculateRecipeCosts(recipe);

              return (
                <div key={recipe.id} className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/80 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{recipe.name}</h3>
                      <span className="text-xs font-semibold text-slate-500">{recipe.category} • Rendement : {recipe.yieldUnits} {recipe.unitName}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-500 block">Prix Boutique Actuel</span>
                      <span className="text-base font-black text-slate-900">{metrics.sellingPrice.toLocaleString('fr-DZ')} DZD</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Coût Réel vs Simulé</span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className="text-xs text-slate-500 line-through">{metrics.baseCostPerUnit.toFixed(1)}</span>
                        <span className="text-xs font-black text-rose-600">➔ {metrics.simulatedCostPerUnit.toFixed(1)} DZD</span>
                      </div>
                      {metrics.costIncreasePercent > 0 && (
                        <span className="text-[10px] font-bold text-rose-600">+{metrics.costIncreasePercent.toFixed(1)}%</span>
                      )}
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-slate-100 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Marge Brute</span>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className="text-xs text-slate-500">{metrics.baseMargin.toFixed(1)}%</span>
                        <span className={`text-xs font-black ${metrics.simulatedMargin < 50 ? 'text-amber-600' : 'text-indigo-600'}`}>
                          ➔ {metrics.simulatedMargin.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">(-{metrics.marginErosion.toFixed(1)} pts)</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                      <span className="text-[10px] font-black text-emerald-800 uppercase block">Prix Conseillé</span>
                      <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                        {metrics.recommendedPrice.toLocaleString('fr-DZ')} DZD
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600">Pour garder marge {metrics.baseMargin.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
