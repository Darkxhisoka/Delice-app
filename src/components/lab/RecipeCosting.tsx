import React, { useState, useEffect } from 'react';
import {
  getRecipes,
  getRawMaterials,
  addRecipe,
  updateRecipe,
  deleteRecipe,
  subscribeToStoreChanges,
  notifyToast,
  getRecipeUnitCost
} from '../../services/storage';
import { Recipe, RawMaterial, RecipeIngredient, RecipeType } from '../../types';
import { ProductionRunner } from './ProductionRunner';
import {
  ChefHat,
  DollarSign,
  PieChart,
  Sparkles,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
  BookOpen,
  Layers,
  Box,
  Zap,
  Mic,
  MicOff
} from 'lucide-react';

export const RecipeCosting: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  
  // Recipe Category Tab: 'FINISHED' vs 'SEMI_FINISHED'
  const [activeTab, setActiveTab] = useState<RecipeType>('FINISHED');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showRunnerModal, setShowRunnerModal] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const dictationRef = React.useRef<any>(null);

  const toggleInstructionsDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notifyToast({
        type: 'warning',
        title: 'Non Supporté',
        message: 'La reconnaissance vocale Web Speech API n’est pas disponible sur ce navigateur.'
      });
      return;
    }

    if (isDictating) {
      if (dictationRef.current) {
        dictationRef.current.stop();
      }
      setIsDictating(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          }
        }
        if (final) {
          setInstructions((prev) => (prev ? `${prev} ${final.trim()}` : final.trim()));
        }
      };

      recognition.onerror = () => {
        setIsDictating(false);
      };

      recognition.onend = () => {
        setIsDictating(false);
      };

      try {
        recognition.start();
        dictationRef.current = recognition;
        setIsDictating(true);
        notifyToast({
          type: 'info',
          title: 'Microphone Activé',
          message: 'Dictez vos consignes de préparation mains-libres.'
        });
      } catch {
        setIsDictating(false);
      }
    }
  };

  // Form State
  const [recipeName, setRecipeName] = useState<string>('');
  const [recipeType, setRecipeType] = useState<RecipeType>('FINISHED');
  const [recipeCategory, setRecipeCategory] = useState<string>('Viennoiserie');
  const [yieldUnits, setYieldUnits] = useState<number>(50);
  const [unitName, setUnitName] = useState<string>('pieces');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number>(120);
  const [suggestedSellingPrice, setSuggestedSellingPrice] = useState<number>(3.50);
  const [instructions, setInstructions] = useState<string>('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    const loadData = () => {
      const recs = getRecipes();
      const mats = getRawMaterials();
      setRecipes(recs);
      setRawMaterials(mats);
    };
    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  // Filter recipes by Active Tab ('FINISHED' vs 'SEMI_FINISHED')
  const tabRecipes = recipes.filter((r) => {
    const rType = r.recipeType || 'FINISHED';
    return rType === activeTab;
  });

  const filteredRecipes = tabRecipes.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ensure valid selected recipe for current tab
  useEffect(() => {
    if (filteredRecipes.length > 0) {
      const exists = filteredRecipes.some((r) => r.id === selectedRecipeId);
      if (!exists) {
        setSelectedRecipeId(filteredRecipes[0].id);
      }
    } else {
      setSelectedRecipeId('');
    }
  }, [activeTab, searchTerm, recipes]);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || filteredRecipes[0];

  const semiFinishedRecipesList = recipes.filter((r) => (r.recipeType || 'FINISHED') === 'SEMI_FINISHED');

  // Modal Handlers
  const handleOpenAddModal = (presetType?: RecipeType) => {
    const typeToUse = presetType || activeTab;
    setEditingRecipe(null);
    setRecipeName('');
    setRecipeType(typeToUse);
    setRecipeCategory(typeToUse === 'SEMI_FINISHED' ? 'Creams & Fillings' : 'Viennoiserie');
    setYieldUnits(typeToUse === 'SEMI_FINISHED' ? 10 : 50);
    setUnitName(typeToUse === 'SEMI_FINISHED' ? 'kg' : 'pieces');
    setPrepTimeMinutes(60);
    setSuggestedSellingPrice(typeToUse === 'SEMI_FINISHED' ? 0 : 3.50);
    setInstructions('');

    if (rawMaterials.length > 0) {
      setIngredients([
        { type: 'RAW_MATERIAL', rawMaterialId: rawMaterials[0].id, quantity: 5.0 },
      ]);
    } else {
      setIngredients([]);
    }
    setShowModal(true);
  };

  const handleOpenEditModal = (recipeToEdit: Recipe) => {
    setEditingRecipe(recipeToEdit);
    setRecipeName(recipeToEdit.name);
    setRecipeType(recipeToEdit.recipeType || 'FINISHED');
    setRecipeCategory(recipeToEdit.category || 'Viennoiserie');
    setYieldUnits(recipeToEdit.yieldUnits);
    setUnitName(recipeToEdit.unitName);
    setPrepTimeMinutes(recipeToEdit.prepTimeMinutes);
    setSuggestedSellingPrice(recipeToEdit.suggestedSellingPrice || 0);
    setInstructions(recipeToEdit.instructions || '');
    
    // Normalize ingredients
    const normIngredients: RecipeIngredient[] = recipeToEdit.ingredients.map((ing) => {
      const ingType = ing.type || (ing.semiFinishedRecipeId ? 'SEMI_FINISHED' : 'RAW_MATERIAL');
      return {
        type: ingType,
        rawMaterialId: ing.rawMaterialId,
        semiFinishedRecipeId: ing.semiFinishedRecipeId,
        quantity: ing.quantity,
      };
    });
    setIngredients(normIngredients);
    setShowModal(true);
  };

  const handleAddIngredientLine = () => {
    if (rawMaterials.length > 0) {
      setIngredients([
        ...ingredients,
        { type: 'RAW_MATERIAL', rawMaterialId: rawMaterials[0].id, quantity: 1.0 },
      ]);
    } else if (semiFinishedRecipesList.length > 0) {
      setIngredients([
        ...ingredients,
        { type: 'SEMI_FINISHED', semiFinishedRecipeId: semiFinishedRecipesList[0].id, quantity: 1.0 },
      ]);
    }
  };

  const handleRemoveIngredientLine = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  const handleIngredientChange = (
    index: number,
    field: keyof RecipeIngredient,
    value: any
  ) => {
    const updated = [...ingredients];
    const cur = updated[index];

    if (field === 'type') {
      const newType = value as 'RAW_MATERIAL' | 'SEMI_FINISHED';
      if (newType === 'RAW_MATERIAL') {
        updated[index] = {
          type: 'RAW_MATERIAL',
          rawMaterialId: rawMaterials[0]?.id || '',
          quantity: cur.quantity || 1.0,
        };
      } else {
        updated[index] = {
          type: 'SEMI_FINISHED',
          semiFinishedRecipeId: semiFinishedRecipesList[0]?.id || '',
          quantity: cur.quantity || 1.0,
        };
      }
    } else {
      updated[index] = {
        ...cur,
        [field]: value,
      };
    }
    setIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;

    const validIngredients = ingredients.filter((ing) => {
      const isRaw = (ing.type || 'RAW_MATERIAL') === 'RAW_MATERIAL';
      if (isRaw) return !!ing.rawMaterialId && ing.quantity > 0;
      return !!ing.semiFinishedRecipeId && ing.quantity > 0;
    });

    if (editingRecipe) {
      const updated = updateRecipe(editingRecipe.id, {
        name: recipeName.trim(),
        recipeType,
        category: recipeCategory || 'Viennoiserie',
        yieldUnits: Number(yieldUnits) || 1,
        unitName: unitName.trim() || 'pieces',
        prepTimeMinutes: Number(prepTimeMinutes) || 0,
        suggestedSellingPrice: recipeType === 'SEMI_FINISHED' ? 0 : Number(suggestedSellingPrice) || 0,
        instructions: instructions.trim(),
        ingredients: validIngredients,
      });

      notifyToast({
        type: 'success',
        title: 'Recipe Updated',
        message: `Recipe "${recipeName}" updated successfully.`,
      });

      if (updated) setSelectedRecipeId(updated.id);
    } else {
      const newRec = addRecipe({
        name: recipeName.trim(),
        recipeType,
        category: recipeCategory || 'Viennoiserie',
        yieldUnits: Number(yieldUnits) || 1,
        unitName: unitName.trim() || 'pieces',
        prepTimeMinutes: Number(prepTimeMinutes) || 0,
        suggestedSellingPrice: recipeType === 'SEMI_FINISHED' ? 0 : Number(suggestedSellingPrice) || 0,
        instructions: instructions.trim(),
        ingredients: validIngredients,
      });

      notifyToast({
        type: 'success',
        title: 'Recipe Created',
        message: `New recipe "${newRec.name}" saved to Central Lab database.`,
      });

      setSelectedRecipeId(newRec.id);
    }

    setShowModal(false);
  };

  const handleDeleteRecipe = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the recipe "${name}"?`)) {
      deleteRecipe(id);
      notifyToast({
        type: 'info',
        title: 'Recipe Removed',
        message: `Recipe "${name}" was deleted from Central Lab.`,
      });
      const remaining = recipes.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        setSelectedRecipeId(remaining[0].id);
      }
    }
  };

  // Helper to calculate ingredient line item cost dynamically
  const getIngredientLineCost = (ing: RecipeIngredient) => {
    const isSemi = ing.type === 'SEMI_FINISHED' || (!ing.rawMaterialId && !!ing.semiFinishedRecipeId);
    if (isSemi && ing.semiFinishedRecipeId) {
      const subRec = recipes.find((r) => r.id === ing.semiFinishedRecipeId);
      if (subRec) {
        const uCost = getRecipeUnitCost(subRec, recipes, rawMaterials);
        return {
          name: subRec.name,
          category: subRec.category,
          unit: subRec.unitName || 'kg',
          isSemiFinished: true,
          unitCost: uCost,
          totalCost: ing.quantity * uCost,
        };
      }
      return { name: 'Unknown Sub-Recipe', category: 'Sub-Recipe', unit: 'unit', isSemiFinished: true, unitCost: 0, totalCost: 0 };
    } else if (ing.rawMaterialId) {
      const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      const uCost = mat ? mat.currentAvgCost : 0;
      return {
        name: mat ? mat.name : 'Unknown Raw Material',
        category: mat ? mat.category : 'Raw Material',
        unit: mat ? mat.unit : 'unit',
        isSemiFinished: false,
        unitCost: uCost,
        totalCost: ing.quantity * uCost,
      };
    }
    return { name: 'Unknown', category: 'General', unit: 'unit', isSemiFinished: false, unitCost: 0, totalCost: 0 };
  };

  // Helper for batch cost calculation
  const calculateBatchCost = (recipeIngredients: RecipeIngredient[]) => {
    return recipeIngredients.reduce((sum, ing) => {
      const line = getIngredientLineCost(ing);
      return sum + line.totalCost;
    }, 0);
  };

  // Selected Recipe Metrics
  const ingredientCostBreakdown = selectedRecipe
    ? selectedRecipe.ingredients.map((ing) => {
        const line = getIngredientLineCost(ing);
        return {
          ingredientName: line.name,
          category: line.category,
          isSemiFinished: line.isSemiFinished,
          quantity: ing.quantity,
          unit: line.unit,
          unitAvgCost: line.unitCost,
          totalCost: line.totalCost,
        };
      })
    : [];

  const totalBatchIngredientCost = ingredientCostBreakdown.reduce((sum, item) => sum + item.totalCost, 0);

  const costPerUnit =
    selectedRecipe && selectedRecipe.yieldUnits > 0 ? totalBatchIngredientCost / selectedRecipe.yieldUnits : 0;

  const sellingPrice = selectedRecipe ? selectedRecipe.suggestedSellingPrice || 0 : 0;
  const profitPerUnit = sellingPrice - costPerUnit;
  const grossMarginPct = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

  // Modal live calculations
  const modalBatchCost = calculateBatchCost(ingredients);
  const modalCostPerUnit = yieldUnits > 0 ? modalBatchCost / yieldUnits : 0;
  const modalProfitPerUnit = suggestedSellingPrice - modalCostPerUnit;
  const modalMarginPct = suggestedSellingPrice > 0 ? (modalProfitPerUnit / suggestedSellingPrice) * 100 : 0;

  return (
    <div className="space-y-6">
      
      {/* Category Level Switcher (Finished Products vs Semi-Finished Products) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('FINISHED');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'FINISHED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Finished Products</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'FINISHED' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {recipes.filter((r) => (r.recipeType || 'FINISHED') === 'FINISHED').length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('SEMI_FINISHED');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SEMI_FINISHED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Semi-Finished Stock Recipes</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'SEMI_FINISHED' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {recipes.filter((r) => r.recipeType === 'SEMI_FINISHED').length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pr-2">
          <button
            onClick={() => handleOpenAddModal(activeTab)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'FINISHED' ? 'Add Finished Recipe' : 'Add Semi-Finished Recipe'}
          </button>
        </div>
      </div>

      {/* Header Banner & Recipe Selection List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${
                  activeTab === 'FINISHED'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                {activeTab === 'FINISHED' ? 'Finished Retail Recipes' : 'Semi-Finished Sub-Recipes'}
              </span>
              <span className="text-xs text-slate-500 font-medium">Auto COGS Calculation</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {activeTab === 'FINISHED' ? 'Standard Pastry Finished Products' : 'Semi-Finished Component Base Recipes'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'FINISHED'
                ? 'Recipes requiring raw materials & semi-finished stock components. Costs cascade automatically.'
                : 'Intermediate recipes (creams, dough bases, fillings) produced in Central Lab and stocked as components.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search recipe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Recipe Selection Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 scrollbar-none">
          {filteredRecipes.map((r) => {
            const batchCost = calculateBatchCost(r.ingredients);
            const unitCost = r.yieldUnits > 0 ? batchCost / r.yieldUnits : 0;
            const isSelected = r.id === selectedRecipeId;

            return (
              <button
                key={r.id}
                onClick={() => setSelectedRecipeId(r.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                  isSelected
                    ? activeTab === 'FINISHED'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{r.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isSelected
                      ? activeTab === 'FINISHED' ? 'bg-amber-700 text-amber-100' : 'bg-indigo-700 text-indigo-100'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  ${unitCost.toFixed(2)}/{r.unitName ? r.unitName.slice(0, 3) : 'u'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRecipe && (
        <>
          {/* Active Recipe Header & Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    selectedRecipe.recipeType === 'SEMI_FINISHED'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {selectedRecipe.recipeType === 'SEMI_FINISHED' ? (
                    <Layers className="w-6 h-6" />
                  ) : (
                    <ChefHat className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedRecipe.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        selectedRecipe.recipeType === 'SEMI_FINISHED'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedRecipe.recipeType === 'SEMI_FINISHED' ? 'Semi-Finished Component' : 'Finished Product'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Category: <strong className="text-slate-800">{selectedRecipe.category}</strong></span>
                    <span>•</span>
                    <span>Batch Yield: <strong className="text-slate-800">{selectedRecipe.yieldUnits} {selectedRecipe.unitName}</strong></span>
                    <span>•</span>
                    <span>Prep Time: <strong className="text-slate-800">{selectedRecipe.prepTimeMinutes} mins</strong></span>
                    <span>•</span>
                    <span>Ingredients: <strong className="text-slate-800">{selectedRecipe.ingredients.length} items</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowRunnerModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" /> ⚡ Launch Production (BOM Cascade)
              </button>
              <button
                onClick={() => handleOpenEditModal(selectedRecipe)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDeleteRecipe(selectedRecipe.id, selectedRecipe.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>

          {/* Real-Time COGS KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Batch COGS</span>
              <div className="text-2xl font-black text-slate-900">{totalBatchIngredientCost.toFixed(2)} DZD</div>
              <p className="text-xs text-slate-500">For batch of {selectedRecipe.yieldUnits} {selectedRecipe.unitName}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Unit Cost (COGS)</span>
              <div className="text-2xl font-black text-indigo-700">{costPerUnit.toFixed(2)} DZD</div>
              <p className="text-xs text-slate-500">Calculated cost per {selectedRecipe.unitName || 'unit'}</p>
            </div>

            {selectedRecipe.recipeType !== 'SEMI_FINISHED' ? (
              <>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Retail Selling Price</span>
                  <div className="text-2xl font-black text-slate-900">{sellingPrice.toFixed(2)} DZD</div>
                  <p className="text-xs text-slate-500">Suggested retail price</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Gross Margin %</span>
                    {grossMarginPct >= 60 ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Optimal
                      </span>
                    ) : grossMarginPct >= 40 ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                        Healthy
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800">
                        Low Margin
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{grossMarginPct.toFixed(1)}%</div>
                  <p className="text-xs text-emerald-700 font-medium">+{profitPerUnit.toFixed(2)} DZD gross profit / unit</p>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">Sub-Recipe Component Status</span>
                  <p className="text-xs text-indigo-700 mt-1">
                    This semi-finished recipe is stocked in Central Lab inventory and used as an ingredient in finished pastry recipes.
                  </p>
                </div>
                <div className="p-3 bg-white text-indigo-700 rounded-xl shadow-2xs font-extrabold text-sm border border-indigo-100 shrink-0">
                  Unit Cost: {costPerUnit.toFixed(2)} DZD / {selectedRecipe.unitName}
                </div>
              </div>
            )}
          </div>

          {/* Ingredient Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                Raw Materials & Semi-Finished Ingredients Breakdown
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Live Prices from Inventory Receipts & Sub-Recipe Calculations
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-3">Ingredient Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Batch Qty Required</th>
                    <th className="p-3 text-right">Unit Calculated Cost</th>
                    <th className="p-3 text-right">Line Ingredient COGS</th>
                    <th className="p-3 text-right">% of Total Batch Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ingredientCostBreakdown.map((item, idx) => {
                    const pct = totalBatchIngredientCost > 0 ? (item.totalCost / totalBatchIngredientCost) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-900">{item.ingredientName}</td>
                        <td className="p-3">
                          {item.isSemiFinished ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-fit">
                              <Layers className="w-3 h-3" /> Semi-Finished Sub-Recipe
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                              <Box className="w-3 h-3" /> Raw Material
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-600">
                          {item.unitAvgCost.toFixed(2)} DZD / {item.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {item.totalCost.toFixed(2)} DZD
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-600 font-mono text-[11px] font-semibold">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <td colSpan={5} className="p-3 text-right uppercase text-[11px] text-slate-500">
                      Total Batch Ingredient COGS:
                    </td>
                    <td className="p-3 text-right text-sm text-indigo-700 font-black">
                      {totalBatchIngredientCost.toFixed(2)} DZD
                    </td>
                    <td className="p-3 text-right text-xs text-slate-500">100.0%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedRecipe.instructions && (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-slate-700 space-y-1">
                <strong className="font-bold text-amber-900 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Prep & Baking Instructions:
                </strong>
                <p className="whitespace-pre-line leading-relaxed">{selectedRecipe.instructions}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Recipe Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              
              {/* STICKY HEADER */}
              <div className="sticky top-0 z-10 bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      recipeType === 'SEMI_FINISHED'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {editingRecipe
                          ? `Modifier la Fiche : ${editingRecipe.name}`
                          : recipeType === 'SEMI_FINISHED'
                          ? 'Nouvelle Fiche de Production (Semi-Fini)'
                          : 'Nouvelle Fiche de Production (Produit Fini)'}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
                          recipeType === 'SEMI_FINISHED'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {recipeType === 'SEMI_FINISHED' ? 'Composant Base' : 'Pâtisserie Finie'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Fiche technique, ingrédients de nomenclature & calcul automatique du coût de revient
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 touch-manipulation"
                  title="Fermer la modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SCROLLABLE FORM CONTENT */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 bg-slate-50/40">
                
                {/* 1. Recipe Type Switcher */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Type de Fiche de Production
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipeType('FINISHED');
                        if (recipeCategory === 'Creams & Fillings') setRecipeCategory('Viennoiserie');
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        recipeType === 'FINISHED'
                          ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          recipeType === 'FINISHED' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs block text-slate-900">✨ Produit Fini / Vente</span>
                        <span className="text-[11px] text-slate-500 block truncate">Destiné à la vente directe en boutique</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecipeType('SEMI_FINISHED');
                        setRecipeCategory('Creams & Fillings');
                        setSuggestedSellingPrice(0);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        recipeType === 'SEMI_FINISHED'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-500/20 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          recipeType === 'SEMI_FINISHED' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs block text-slate-900">🥐 Base Semi-Finie / Composant</span>
                        <span className="text-[11px] text-slate-500 block truncate">Crème, pâte, garniture stockée au labo</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. General Information Responsive Grid */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-amber-600" />
                    <span>Paramètres & Informations de la Recette</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recipe Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nom de la Recette / Produit <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder={
                          recipeType === 'SEMI_FINISHED'
                            ? 'ex. Crème Pâtissière Vanille Bourbon'
                            : 'ex. Croissant Pur Beurre AOP'
                        }
                        className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px]"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Catégorie de Recette
                      </label>
                      <select
                        value={recipeCategory}
                        onChange={(e) => setRecipeCategory(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px] cursor-pointer"
                      >
                        <option value="Viennoiserie">Viennoiserie</option>
                        <option value="Pâtisserie">Pâtisserie</option>
                        <option value="Creams & Fillings">Crèmes & Garnitures</option>
                        <option value="Dough & Bases">Pâtes & Fonds de Tarte</option>
                        <option value="Gâteaux & Cakes">Gâteaux & Entremets</option>
                        <option value="Tarts & Pies">Tartes & Tartelettes</option>
                        <option value="Savoury">Salé & Traiteur</option>
                      </select>
                    </div>

                    {/* Batch Yield Quantity */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Rendement par Lot (Quantité Produite) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        required
                        value={yieldUnits}
                        onChange={(e) => setYieldUnits(Number(e.target.value))}
                        className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px]"
                      />
                    </div>

                    {/* Yield Unit Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Unité de Mesure du Lot <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="pièces, kg, litres, plaques..."
                        className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px]"
                      />
                    </div>

                    {/* Prep Time */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Temps de Préparation & Cuisson (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prepTimeMinutes}
                        onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                        placeholder="ex. 120"
                        className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px]"
                      />
                    </div>

                    {/* Suggested Retail Price (if Finished) */}
                    {recipeType === 'FINISHED' && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Prix de Vente Conseillé Boutique (DZD TTC / unité)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={suggestedSellingPrice}
                          onChange={(e) => setSuggestedSellingPrice(Number(e.target.value))}
                          className="w-full text-xs font-semibold bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all min-h-[44px]"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Ingredients & Sub-Recipes Section */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-amber-600" />
                        <span>Composition & Nomenclature ({ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Matières premières et sous-recettes semi-finies composant ce lot
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIngredientLine}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 px-3 py-2 rounded-xl transition-all shadow-2xs touch-manipulation cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Ajouter un Ingrédient
                    </button>
                  </div>

                  {ingredients.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                      <Box className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-600">Aucun ingrédient dans cette recette</p>
                      <button
                        type="button"
                        onClick={handleAddIngredientLine}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter le premier ingrédient
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {ingredients.map((ing, idx) => {
                        const isSemi = ing.type === 'SEMI_FINISHED';
                        const line = getIngredientLineCost(ing);

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                              {/* Type selector */}
                              <div className="sm:col-span-3">
                                <label className="sm:hidden text-[10px] font-bold text-slate-500 mb-1 block">Type</label>
                                <select
                                  value={ing.type || 'RAW_MATERIAL'}
                                  onChange={(e) => handleIngredientChange(idx, 'type', e.target.value)}
                                  className="w-full text-xs font-bold bg-white text-slate-800 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-amber-500 cursor-pointer min-h-[38px]"
                                >
                                  <option value="RAW_MATERIAL">📦 Matière Première</option>
                                  <option value="SEMI_FINISHED">🥐 Base Semi-Finie</option>
                                </select>
                              </div>

                              {/* Item selector */}
                              <div className="sm:col-span-4">
                                <label className="sm:hidden text-[10px] font-bold text-slate-500 mb-1 block">Article / Recette</label>
                                {isSemi ? (
                                  <select
                                    value={ing.semiFinishedRecipeId || ''}
                                    onChange={(e) => handleIngredientChange(idx, 'semiFinishedRecipeId', e.target.value)}
                                    className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-amber-500 cursor-pointer min-h-[38px]"
                                  >
                                    {semiFinishedRecipesList.length === 0 ? (
                                      <option value="">Aucune base semi-finie disponible</option>
                                    ) : (
                                      semiFinishedRecipesList.map((sf) => {
                                        const sfCost = getRecipeUnitCost(sf, recipes, rawMaterials);
                                        return (
                                          <option key={sf.id} value={sf.id}>
                                            {sf.name} ({sfCost.toFixed(2)} DZD/{sf.unitName})
                                          </option>
                                        );
                                      })
                                    )}
                                  </select>
                                ) : (
                                  <select
                                    value={ing.rawMaterialId || ''}
                                    onChange={(e) => handleIngredientChange(idx, 'rawMaterialId', e.target.value)}
                                    className="w-full text-xs font-medium bg-white text-slate-900 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-amber-500 cursor-pointer min-h-[38px]"
                                  >
                                    {rawMaterials.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name} ({m.currentAvgCost.toFixed(2)} DZD/{m.unit})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {/* Quantity & Unit */}
                              <div className="sm:col-span-2">
                                <label className="sm:hidden text-[10px] font-bold text-slate-500 mb-1 block">Quantité ({line.unit})</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.001"
                                    required
                                    value={ing.quantity}
                                    onChange={(e) => handleIngredientChange(idx, 'quantity', Number(e.target.value))}
                                    className="w-full text-xs font-bold bg-white text-slate-900 rounded-lg p-2 border border-slate-300 focus:ring-2 focus:ring-amber-500 text-center min-h-[38px]"
                                  />
                                  <span className="text-[11px] font-bold text-slate-600 shrink-0 w-8 truncate">
                                    {line.unit}
                                  </span>
                                </div>
                              </div>

                              {/* Calculated Cost Preview */}
                              <div className="sm:col-span-2 text-right">
                                <label className="sm:hidden text-[10px] font-bold text-slate-500 mb-1 block text-left">Coût Ligne</label>
                                <span className="text-xs font-black text-slate-900 block truncate">
                                  {line.totalCost.toFixed(2)} DZD
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  @{line.unitCost.toFixed(2)} / {line.unit}
                                </span>
                              </div>

                              {/* Action Delete */}
                              <div className="sm:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredientLine(idx)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 touch-manipulation"
                                  title="Supprimer la ligne"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Live Cost Calculation Card */}
                <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/60 border border-amber-200 rounded-2xl p-4 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80">
                      <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider block">Coût Total Matières (Lot)</span>
                      <strong className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
                        {modalBatchCost.toFixed(2)} DZD
                      </strong>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80">
                      <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider block">Coût Unitaire de Revient</span>
                      <strong className="text-base sm:text-lg font-black text-indigo-900 block mt-0.5">
                        {modalCostPerUnit.toFixed(2)} DZD <span className="text-xs font-semibold text-indigo-600">/ {unitName}</span>
                      </strong>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/80">
                      <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider block">
                        {recipeType === 'FINISHED' ? 'Marge Brute Estimée' : 'Type de Composant'}
                      </span>
                      <strong className="text-base sm:text-lg font-black text-emerald-900 block mt-0.5">
                        {recipeType === 'FINISHED' ? `${modalMarginPct.toFixed(1)}%` : 'Sous-Recette Intermédiaire'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 5. Instructions & Voice Dictation Section */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Consignes de Préparation & Cuisson</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleInstructionsDictation}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                        isDictating
                          ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-700" />}
                      <span>{isDictating ? 'Arrêter la dictée vocale' : '🎙️ Dictée vocale mains-libres'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="ex. Faire chauffer le lait avec la gousse de vanille. Blanchir les jaunes avec le sucre puis incorporer la maïzena..."
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-xl p-3 border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all leading-relaxed"
                  />
                </div>

              </div>

              {/* STICKY ACTION BUTTONS FOOTER */}
              <div className="sticky bottom-0 z-10 bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-xs">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Lot : <strong className="text-slate-800">{yieldUnits} {unitName}</strong></span>
                  <span>•</span>
                  <span>Coût unitaire : <strong className="text-indigo-700 font-bold">{modalCostPerUnit.toFixed(2)} DZD</strong></span>
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors min-h-[40px] touch-manipulation cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors min-h-[40px] touch-manipulation cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {editingRecipe ? 'Enregistrer les Modifications' : 'Enregistrer la Fiche de Production'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Production Runner Modal Overlay */}
      {showRunnerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-slate-100 rounded-2xl sm:rounded-3xl border border-slate-300 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            <div className="sticky top-0 z-10 bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Zap className="w-5 h-5 fill-amber-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold truncate">Lancement de Production & Cascade BOM</h3>
                  <p className="text-xs text-slate-400 truncate">Déduction automatique des matières et fabrication des sous-recettes</p>
                </div>
              </div>
              <button
                onClick={() => setShowRunnerModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors touch-manipulation"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <ProductionRunner
                initialRecipeId={selectedRecipeId}
                onCloseModal={() => setShowRunnerModal(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
