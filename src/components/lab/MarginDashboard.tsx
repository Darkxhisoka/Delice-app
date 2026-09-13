import React, { useState, useEffect } from 'react';
import {
  getFinishedProductProfitability,
  updateFinishedProductSellingPrice,
  ProductMarginItem,
  subscribeToStoreChanges,
  getRawMaterials
} from '../../services/storage';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  Edit2,
  Save,
  X,
  PieChart,
  ArrowUpRight,
  Info,
  RefreshCw,
  Percent
} from 'lucide-react';

export const MarginDashboard: React.FC = () => {
  const [products, setProducts] = useState<ProductMarginItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [rawMaterials, setRawMaterials] = useState(getRawMaterials());

  const loadData = () => {
    const items = getFinishedProductProfitability();
    setProducts(items);
    setRawMaterials(getRawMaterials());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const handleStartEdit = (prod: ProductMarginItem) => {
    setEditingId(prod.id);
    setEditPriceValue(prod.retailSellingPrice.toString());
  };

  const handleSavePrice = (prodId: string) => {
    const newPrice = parseFloat(editPriceValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      updateFinishedProductSellingPrice(prodId, newPrice);
      setEditingId(null);
    }
  };

  const handleApplyRecommendedPrice = (prodId: string, unitCost: number) => {
    // Target 30% food cost means Selling Price = Unit Cost / 0.30
    const recPrice = Number((unitCost / 0.30).toFixed(2));
    updateFinishedProductSellingPrice(prodId, recPrice);
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || prod.statusBadge === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate summary stats
  const totalCount = products.length;
  const targetCount = products.filter((p) => p.statusBadge === 'TARGET').length;
  const warningCount = products.filter((p) => p.statusBadge === 'WARNING').length;
  const alertCount = products.filter((p) => p.statusBadge === 'CRITICAL_ALERT').length;
  const spikeAlerts = products.filter((p) => p.hasPriceSpikeAlert || p.statusBadge === 'CRITICAL_ALERT');

  const avgFoodCost = totalCount > 0
    ? (products.reduce((acc, p) => acc + p.foodCostPercentage, 0) / totalCount).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      
      {/* Top Header Title & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Module 1 : Tableaux de Marge & Profitabilité Pâtisserie</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calcul dynamique des coûts de production unitaires (matières premières directes + sous-recettes semi-finies) et suivi du pourcentage de Food Cost (Cible ≤ 30%).
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Actualiser Marge Dynamique</span>
        </button>
      </div>

      {/* Analytics KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Pâtisseries Surveillées</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-400 font-medium">Fiches Actives</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Food Cost Moyen</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${parseFloat(avgFoodCost) <= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {avgFoodCost}%
            </span>
            <span className="text-xs text-slate-400 font-medium">Obj. 30.0%</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Objectif Conforme (≤30%)
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-900">{targetCount}</span>
            <span className="text-xs text-emerald-700 font-semibold">{totalCount > 0 ? Math.round((targetCount / totalCount) * 100) : 0}% du catalogue</span>
          </div>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Seuil d'Attention (31-35%)
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">{warningCount}</span>
            <span className="text-xs text-amber-700 font-semibold">À surveiller</span>
          </div>
        </div>

        <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-200">
          <p className="text-xs font-bold text-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Alerte Rouge (&gt;35%)
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-900">{alertCount}</span>
            <span className="text-xs text-rose-700 font-semibold">Action Recommandée</span>
          </div>
        </div>

      </div>

      {/* Price Fluctuation Alert System Banner */}
      {spikeAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-rose-700/80">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-bold text-rose-100 flex items-center gap-2">
                  <span>Système d'Alerte Fluctuation des Prix Matières Premières</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase">
                    {spikeAlerts.length} Produit(s) Impacté(s)
                  </span>
                </h3>
              </div>
              <p className="text-xs text-rose-200/90 mt-1">
                La hausse récente des prix d'achat de certaines matières premières (beurre, chocolat, vanille) a fait chuter la profitabilité de ces références sous l'objectif de 30% Food Cost.
              </p>

              {/* Alert items horizontal cards */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {spikeAlerts.slice(0, 3).map((prod) => {
                  const targetPrice = Number((prod.unitProductionCost / 0.30).toFixed(2));
                  return (
                    <div key={prod.id} className="bg-slate-950/70 border border-rose-500/40 rounded-xl p-3 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white truncate max-w-[170px]">{prod.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {prod.foodCostPercentage}% Food Cost
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-300">
                          <span>Coût unitaire : <strong className="text-white">{prod.unitProductionCost.toFixed(2)} DZD</strong></span>
                          <span>Prix actuel : <strong className="text-amber-300">{prod.retailSellingPrice.toFixed(2)} DZD</strong></span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-emerald-300">
                          Prix cible 30% : <strong>{targetPrice.toFixed(2)} DZD</strong>
                        </span>
                        <button
                          onClick={() => handleApplyRecommendedPrice(prod.id, prod.unitProductionCost)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shrink-0"
                        >
                          Ajuster à {targetPrice.toFixed(2)} DZD
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une pâtisserie ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <span className="px-2 font-semibold text-slate-500">Catégorie:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Toutes ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <span className="px-2 font-semibold text-slate-500">Statut Margin:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="TARGET">Conforme (≤30%)</option>
              <option value="WARNING">Attention (31-35%)</option>
              <option value="CRITICAL_ALERT">Alerte Rouge (&gt;35%)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Margin & Profitability Data View (Desktop Table + Mobile Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Multi-column Table (≥ 768px) */}
        <div className="hidden md:block overflow-x-auto webkit-overflow-scrolling-touch">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Pâtisserie & Catégorie</th>
                <th className="py-3.5 px-4">Prix de Vente (DZD)</th>
                <th className="py-3.5 px-4">Coût de Production (DZD)</th>
                <th className="py-3.5 px-4">Répartition Coûts</th>
                <th className="py-3.5 px-4">Marge Brute (DZD)</th>
                <th className="py-3.5 px-4">% Food Cost</th>
                <th className="py-3.5 px-4 text-center">Statut Seuil</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <p className="font-semibold">Aucun produit ne correspond aux filtres actuels.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isEditing = editingId === prod.id;
                  
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Product Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{prod.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500">{prod.category}</span>
                          <span className="text-[10px] text-slate-400 font-mono">[{prod.sku}]</span>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-bold text-xs">DZD</span>
                            <input
                              type="number"
                              step="0.10"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="w-20 px-2 py-1 rounded-lg border border-indigo-400 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePrice(prod.id)}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Enregistrer"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                              title="Annuler"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span className="font-black text-slate-900 text-sm">{prod.retailSellingPrice.toFixed(2)} DZD</span>
                            <button
                              onClick={() => handleStartEdit(prod)}
                              className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
                              title="Modifier le prix de vente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Unit Production Cost */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{prod.unitProductionCost.toFixed(2)} DZD / {prod.unit}</div>
                        <div className="text-[10px] text-slate-400">Calculé en temps réel</div>
                      </td>

                      {/* Cost Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>MP directes:</span>
                            <span className="font-semibold">{prod.costBreakdown.directRawMaterialsCost.toFixed(2)} DZD</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Sous-recettes:</span>
                            <span className="font-semibold">{prod.costBreakdown.semiFinishedComponentsCost.toFixed(2)} DZD</span>
                          </div>
                        </div>
                      </td>

                      {/* Gross Profit Margin */}
                      <td className="py-3.5 px-4">
                        <div className={`font-black text-sm ${prod.grossProfitMargin > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          +{prod.grossProfitMargin.toFixed(2)} DZD
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {prod.retailSellingPrice > 0 ? Math.round((prod.grossProfitMargin / prod.retailSellingPrice) * 100) : 0}% Marge
                        </div>
                      </td>

                      {/* Food Cost Percentage */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-extrabold text-sm ${
                            prod.foodCostPercentage <= 30
                              ? 'text-emerald-600'
                              : prod.foodCostPercentage <= 35
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}>
                            {prod.foodCostPercentage}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              prod.foodCostPercentage <= 30
                                ? 'bg-emerald-500'
                                : prod.foodCostPercentage <= 35
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(prod.foodCostPercentage, 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {prod.statusBadge === 'TARGET' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cible (≤30%)
                          </span>
                        )}
                        {prod.statusBadge === 'WARNING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" /> Attention (31-35%)
                          </span>
                        )}
                        {prod.statusBadge === 'CRITICAL_ALERT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Alerte Rouge (&gt;35%)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleStartEdit(prod)}
                          className="px-3 py-1.5 min-h-[44px] rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Prix</span>
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards Layout (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-200 bg-slate-50/50 p-3 space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-semibold text-xs">
              Aucun produit ne correspond aux filtres actuels.
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const isEditing = editingId === prod.id;
              return (
                <div key={prod.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{prod.name}</h4>
                      <p className="text-xs text-slate-500">{prod.category} • <span className="font-mono text-slate-400">[{prod.sku}]</span></p>
                    </div>
                    {prod.statusBadge === 'TARGET' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ≤30% Food Cost
                      </span>
                    )}
                    {prod.statusBadge === 'WARNING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        31-35%
                      </span>
                    )}
                    {prod.statusBadge === 'CRITICAL_ALERT' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        &gt;35% Alerte
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Prix Vente</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            step="0.10"
                            value={editPriceValue}
                            onChange={(e) => setEditPriceValue(e.target.value)}
                            className="w-20 px-2 py-1 rounded border border-indigo-400 text-xs font-bold text-base min-h-[44px]"
                          />
                          <button onClick={() => handleSavePrice(prod.id)} className="p-2 bg-emerald-600 text-white rounded min-h-[44px] min-w-[44px] flex items-center justify-center">
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-black text-slate-900 text-sm">{prod.retailSellingPrice.toFixed(2)} DZD</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Coût Production</span>
                      <span className="font-bold text-slate-800 text-sm">{prod.unitProductionCost.toFixed(2)} DZD</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Marge Brute</span>
                      <span className={`font-black text-xs ${prod.grossProfitMargin > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        +{prod.grossProfitMargin.toFixed(2)} DZD
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">% Food Cost</span>
                      <span className={`font-black text-xs ${prod.foodCostPercentage <= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {prod.foodCostPercentage}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      MP: {prod.costBreakdown.directRawMaterialsCost.toFixed(2)} DZD • Sous-recettes: {prod.costBreakdown.semiFinishedComponentsCost.toFixed(2)} DZD
                    </span>
                    <button
                      onClick={() => handleStartEdit(prod)}
                      className="px-3 py-2 min-h-[44px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Modifier
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};
