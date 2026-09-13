import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  RotateCcw,
  Wrench,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Package,
  Layers
} from 'lucide-react';
import {
  db,
  Product,
  DexieRawMaterial,
  DexieProductIngredient,
  cleanAndSyncRecipeIngredients,
  validateRecipeIngredients
} from '../../db/database';
import { resetAndSeedRawMaterials } from '../../db/dbSeeder';
import { IngredientsDiagnosticView } from './IngredientsDiagnosticView';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FicheTechniqueEditorProps {
  initialProductId?: string;
  onSaved?: (product: Product) => void;
  onClose?: () => void;
  className?: string;
}

export type RecipeIngredientRow = DexieProductIngredient;

// Helper to reliably extract PAMP (Prix Moyen Pondéré) from a raw material
export const getRawMaterialPamp = (rm: DexieRawMaterial): number => {
  return rm.unitCost ?? rm.costPerUnit ?? rm.currentAvgCost ?? rm.pamp ?? 0;
};

// Helper to reliably extract current stock quantity from a raw material
export const getRawMaterialStock = (rm: DexieRawMaterial): number => {
  return rm.currentStock ?? rm.stockQuantity ?? 0;
};

// Helper to format dropdown option label: "Farine T45 (Stock: 100 kg) — 120 DZD/kg"
export const formatRawMaterialOptionLabel = (rm: DexieRawMaterial): string => {
  const stock = getRawMaterialStock(rm);
  const unit = rm.unit || 'kg';
  const pamp = getRawMaterialPamp(rm);
  const formattedCost = pamp > 0 ? `${pamp.toFixed(2)} DZD/${unit}` : `0 DZD/${unit}`;
  return `${rm.name} (Stock: ${stock} ${unit}) — ${formattedCost}`;
};

// ============================================================================
// Main Component: FicheTechniqueEditor
// ============================================================================

export function FicheTechniqueEditor({
  initialProductId,
  onSaved,
  onClose,
  className = ''
}: FicheTechniqueEditorProps = {}) {
  // --------------------------------------------------------------------------
  // 1. Single Source of Truth: exact query as Raw Material Inventory page
  // --------------------------------------------------------------------------
  const rawMaterials = useLiveQuery(() => db.raw_materials.toArray()) || [];
  const finishedProducts = useLiveQuery(() => db.products.where('type').equals('finished_good').toArray()) || [];

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Pâtisseries Fines');
  const [roomId, setRoomId] = useState<string>('patisserie_fine');
  const [yieldPerBatch, setYieldPerBatch] = useState<number>(20);
  const [batchUnit, setBatchUnit] = useState<string>('pièces');
  const [sellingPrice, setSellingPrice] = useState<number>(150);
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([]);

  // UI state
  const [showDiagnostic, setShowDiagnostic] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fast map lookup for live raw materials by ID and by lowercase trimmed name
  const rawMaterialMap = useMemo(() => {
    const map = new Map<string, DexieRawMaterial>();
    for (const rm of rawMaterials) {
      map.set(rm.id, rm);
      map.set(rm.name.toLowerCase().trim(), rm);
    }
    return map;
  }, [rawMaterials]);

  // Sync with initialProductId when finished products load
  useEffect(() => {
    if (initialProductId && finishedProducts.length > 0) {
      handleSelectProduct(initialProductId);
    }
  }, [initialProductId, finishedProducts.length]);

  // Load an existing product into the form
  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setSaveFeedback(null);

    const prod = finishedProducts.find((p) => p.id?.toString() === productId);
    if (prod) {
      setName(prod.name || '');
      setCategory(prod.category || 'Pâtisseries Fines');
      setRoomId(prod.roomId || 'patisserie_fine');
      setYieldPerBatch(prod.yieldPerBatch || 20);
      setBatchUnit(prod.batchUnit || 'pièces');
      setSellingPrice(prod.sellingPrice || prod.price || 150);

      // Normalize ingredients: bind to db.raw_materials
      const existingIngredients: DexieProductIngredient[] = (prod.ingredients || prod.ficheTechnique || []).map((ing) => {
        const matched = rawMaterialMap.get(ing.rawMaterialId) || rawMaterialMap.get(ing.name.toLowerCase().trim());
        const unitCost = matched ? getRawMaterialPamp(matched) : (ing.unitCost || 0);
        const qty = ing.quantityPerBatch || 0;

        return {
          rawMaterialId: matched ? matched.id : ing.rawMaterialId,
          name: matched ? matched.name : ing.name,
          quantityPerBatch: qty,
          unit: matched ? matched.unit : (ing.unit || 'kg'),
          category: matched ? matched.category : ing.category,
          unitCost: unitCost,
          totalCost: Number((qty * unitCost).toFixed(2)),
          type: 'RAW_MATERIAL',
        };
      });

      setIngredients(existingIngredients);
    } else {
      setName('');
      setIngredients([]);
    }
  };

  // --------------------------------------------------------------------------
  // 2. Unified Data Mapping: Add Ingredient directly linked to db.raw_materials
  // --------------------------------------------------------------------------
  const handleAddIngredient = () => {
    if (rawMaterials.length === 0) {
      alert("Aucune matière première trouvée dans la table db.raw_materials.");
      return;
    }

    // Pick first available raw material not yet added, or fallback to first
    const unusedRm = rawMaterials.find((rm) => !ingredients.some((ing) => ing.rawMaterialId === rm.id)) || rawMaterials[0];
    const liveCost = getRawMaterialPamp(unusedRm);
    const defaultQty = 1;

    const newRow: RecipeIngredientRow = {
      rawMaterialId: unusedRm.id,
      name: unusedRm.name,
      quantityPerBatch: defaultQty,
      unit: unusedRm.unit || 'kg',
      category: unusedRm.category,
      unitCost: liveCost,
      totalCost: Number((defaultQty * liveCost).toFixed(2)),
      type: 'RAW_MATERIAL',
    };

    setIngredients([...ingredients, newRow]);
  };

  // --------------------------------------------------------------------------
  // Change Ingredient Selection: dynamically bind ID, name, unit & live PAMP
  // --------------------------------------------------------------------------
  const handleIngredientChange = (index: number, selectedId: string) => {
    const matchedRm = rawMaterials.find((rm) => rm.id === selectedId);
    if (!matchedRm) return;

    const liveCost = getRawMaterialPamp(matchedRm);
    const currentQty = ingredients[index]?.quantityPerBatch ?? 1;

    const updated = [...ingredients];
    updated[index] = {
      ...updated[index],
      rawMaterialId: matchedRm.id,
      name: matchedRm.name,
      unit: matchedRm.unit || 'kg',
      category: matchedRm.category,
      unitCost: liveCost,
      totalCost: Number((currentQty * liveCost).toFixed(2)),
      type: 'RAW_MATERIAL',
    };

    setIngredients(updated);
  };

  // Change Quantity per batch
  const handleQuantityChange = (index: number, rawQty: number) => {
    const qty = isNaN(rawQty) ? 0 : Math.max(0, rawQty);
    const updated = [...ingredients];
    const unitCost = updated[index]?.unitCost || 0;

    updated[index] = {
      ...updated[index],
      quantityPerBatch: qty,
      totalCost: Number((qty * unitCost).toFixed(2)),
    };

    setIngredients(updated);
  };

  // Remove Ingredient Row
  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Quick sync: Refresh all recipe ingredient unit costs to current live PAMP in db.raw_materials
  const handleRefreshAllPamp = () => {
    let updatedCount = 0;
    const synced = ingredients.map((ing) => {
      const matched = rawMaterialMap.get(ing.rawMaterialId) || rawMaterialMap.get(ing.name.toLowerCase().trim());
      if (matched) {
        const liveCost = getRawMaterialPamp(matched);
        const lineTotal = Number((ing.quantityPerBatch * liveCost).toFixed(2));
        if (ing.unitCost !== liveCost) updatedCount++;
        return {
          ...ing,
          rawMaterialId: matched.id,
          name: matched.name,
          unit: matched.unit || ing.unit,
          unitCost: liveCost,
          totalCost: lineTotal,
          type: 'RAW_MATERIAL' as const,
        };
      }
      return ing;
    });

    setIngredients(synced);
    setSaveFeedback(
      updatedCount > 0
        ? `✅ ${updatedCount} ingrédient(s) actualisé(s) avec les derniers coûts PAMP du stock.`
        : '✨ Tous les ingrédients étaient déjà parfaitement synchronisés avec les PAMP live.'
    );
  };

  // --------------------------------------------------------------------------
  // Live Financial & COGS Calculations
  // --------------------------------------------------------------------------
  const totalBatchCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + (ing.quantityPerBatch || 0) * (ing.unitCost || 0), 0);
  }, [ingredients]);

  const unitCost = useMemo(() => {
    return yieldPerBatch > 0 ? totalBatchCost / yieldPerBatch : 0;
  }, [totalBatchCost, yieldPerBatch]);

  const marginAmount = useMemo(() => {
    return sellingPrice - unitCost;
  }, [sellingPrice, unitCost]);

  const marginPercentage = useMemo(() => {
    return sellingPrice > 0 ? (marginAmount / sellingPrice) * 100 : 0;
  }, [marginAmount, sellingPrice]);

  // --------------------------------------------------------------------------
  // Save into db.products (Single Source of Truth) with Strict UI Validation
  // --------------------------------------------------------------------------
  const handleSave = async () => {
    setValidationErrors([]);

    if (!name.trim()) {
      setValidationErrors(['Veuillez saisir un nom de produit fini valide.']);
      return;
    }

    // STRICT VALIDATION: Ensure EVERY ingredient is explicitly bound to a valid existing rawId from db.raw_materials
    const validation = validateRecipeIngredients(ingredients, rawMaterials);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    const calculatedTotalBatchCost = Number(totalBatchCost.toFixed(2));
    const calculatedUnitCost = Number(unitCost.toFixed(2));
    const calculatedMargin = Number(marginPercentage.toFixed(2));
    const calculatedMarginAmount = Number(marginAmount.toFixed(2));
    const nowIso = new Date().toISOString();

    // Clean ingredients array strictly with verified type RAW_MATERIAL
    const finalIngredients: DexieProductIngredient[] = ingredients.map((ing) => {
      const matched = rawMaterialMap.get(ing.rawMaterialId);
      const livePamp = matched ? getRawMaterialPamp(matched) : (ing.unitCost || 0);
      const qty = ing.quantityPerBatch || 0;

      return {
        rawMaterialId: matched ? matched.id : ing.rawMaterialId,
        name: matched ? matched.name : ing.name,
        quantityPerBatch: qty,
        unit: matched ? matched.unit : (ing.unit || 'kg'),
        category: matched ? matched.category : ing.category,
        unitCost: livePamp,
        totalCost: Number((qty * livePamp).toFixed(2)),
        type: 'RAW_MATERIAL',
      };
    });

    const productData: Partial<Product> = {
      name: name.trim(),
      category,
      roomId,
      type: 'finished_good',
      yieldPerBatch,
      batchUnit,
      ingredients: finalIngredients,
      ficheTechnique: finalIngredients,
      totalBatchCost: calculatedTotalBatchCost,
      unitCost: calculatedUnitCost,
      cogsUnitCost: calculatedUnitCost,
      costPrice: calculatedUnitCost,
      price: sellingPrice,
      sellingPrice,
      marginAmount: calculatedMarginAmount,
      marginPercentage: calculatedMargin,
      updatedAt: nowIso,
    };

    try {
      let savedProduct: Product | undefined;

      if (selectedProductId) {
        const existing = await db.products.get(selectedProductId);
        if (existing) {
          await db.products.update(selectedProductId, productData);
          savedProduct = await db.products.get(selectedProductId);
        } else {
          const fallbackProduct = {
            id: selectedProductId,
            code: `PF-${Date.now().toString().slice(-4)}`,
            price: sellingPrice,
            currentStock: 0,
            minStockAlert: 5,
            storeId: 'lab_central',
            isActive: true,
            ...productData,
          } as Product;
          await db.products.put(fallbackProduct);
          savedProduct = fallbackProduct;
        }
        setSaveFeedback(`Fiche technique "${name}" validée et enregistrée avec succès.`);
      } else {
        const newId = `prod_${Date.now()}`;
        const newProduct: Product = {
          id: newId,
          code: `PF-${Date.now().toString().slice(-4)}`,
          price: sellingPrice,
          currentStock: 0,
          minStockAlert: 5,
          storeId: 'lab_central',
          isActive: true,
          ...productData,
        } as Product;
        await db.products.add(newProduct);
        setSelectedProductId(newId);
        savedProduct = newProduct;
        setSaveFeedback(`Nouveau produit fini "${name}" créé avec une fiche technique 100% conforme.`);
      }

      if (onSaved && savedProduct) {
        onSaved(savedProduct);
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la fiche technique:", err);
      alert("Une erreur est survenue lors de l'enregistrement de la fiche technique.");
    }
  };

  // Migration & Master Sync Utility: Runs cleanAndSyncRecipeIngredients across all products
  const handleRunFullMigration = async () => {
    const confirmRun = window.confirm(
      "🔄 Lancer la synchronisation et migration complète ?\n\n" +
      "• Analyse toutes les fiches techniques dans db.products.\n" +
      "• Corrige les ingrédients orphelins ou mal typés.\n" +
      "• Rétablit les correspondances avec db.raw_materials ou crée automatiquement les matières manquantes.\n" +
      "• Recalcule les coûts COGS avec les PAMP live."
    );
    if (!confirmRun) return;

    try {
      setIsMigrating(true);
      const res = await cleanAndSyncRecipeIngredients();

      // Refresh current form if a product is currently open
      if (selectedProductId) {
        handleSelectProduct(selectedProductId);
      }

      setSaveFeedback(
        `✅ Migration réussie : ${res.ingredientsRepaired} ingrédient(s) réparé(s), ${res.rawMaterialsCreated} matière(s) créée(s), ${res.productsUpdated} produit(s) mis à jour.`
      );
      setValidationErrors([]);
    } catch (err: any) {
      console.error('Erreur durant la migration:', err);
      alert('Erreur lors de la migration : ' + (err.message || String(err)));
    } finally {
      setIsMigrating(false);
    }
  };

  // Reset & Seed raw materials utility
  const handleResetRawMaterials = async () => {
    const confirmed = window.confirm(
      "⚠️ Réinitialiser la table des matières premières ?\n\nCette action va synchroniser 'raw_materials' avec le catalogue officiel de laboratoire (stocks réels et coûts PAMP)."
    );
    if (!confirmed) return;

    try {
      setIsResetting(true);
      await resetAndSeedRawMaterials();
      setSaveFeedback('✅ Table db.raw_materials réinitialisée avec succès.');
    } catch (err) {
      console.error('Erreur lors de la réinitialisation des matières premières:', err);
      alert('❌ Erreur lors de la réinitialisation des matières premières.');
    } finally {
      setIsResetting(false);
    }
  };

  // Group raw materials by category for structured dropdown navigation
  const groupedRawMaterials = useMemo(() => {
    const groups: { [cat: string]: DexieRawMaterial[] } = {};
    for (const rm of rawMaterials) {
      const cat = rm.category || 'Autres Matières';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(rm);
    }
    // Sort items within each category alphabetically
    Object.keys(groups).forEach((cat) => {
      groups[cat].sort((a, b) => a.name.localeCompare(b.name));
    });
    return groups;
  }, [rawMaterials]);

  return (
    <div className={`p-6 max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-stone-200 space-y-6 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-stone-200 pb-4">
        <div className="flex items-center space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition text-sm font-medium cursor-pointer"
              title="Fermer / Retour"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              Éditeur Fiche Technique & COGS
            </h2>
            <p className="text-xs text-stone-500">
              Synchronisé en temps réel avec le stock de matières premières ({rawMaterials.length} MP enregistrées)
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Migration & Cleanup Button */}
          <button
            type="button"
            onClick={handleRunFullMigration}
            disabled={isMigrating}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 border border-emerald-800 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Nettoyer, lier et synchroniser automatiquement toutes les recettes avec db.raw_materials"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMigrating ? 'animate-spin' : ''}`} />
            <span>{isMigrating ? 'Migration...' : 'Migration & Synchro Stock'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDiagnostic(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition cursor-pointer"
            title="Ouvrir le diagnostic des ingrédients vs stock matières premières"
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diagnostic Stock MP</span>
          </button>

          <button
            type="button"
            onClick={handleResetRawMaterials}
            disabled={isResetting}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer disabled:opacity-50"
            title="Recharger le stock standard des matières premières"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-amber-600' : ''}`} />
            <span>{isResetting ? 'Reset...' : 'Recharger MP Stock'}</span>
          </button>

          <select
            className="border border-stone-300 rounded-lg px-3 py-2 bg-stone-50 hover:bg-white text-stone-800 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            value={selectedProductId}
            onChange={(e) => handleSelectProduct(e.target.value)}
          >
            <option value="">+ Créer un nouveau produit</option>
            {finishedProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code || 'PF'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Strict UI Validation Error Banner */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Validation Stricte : Impossible d'enregistrer la fiche technique</span>
          </div>
          <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <p className="text-[11px] text-rose-700 italic">
            Chaque ingrédient doit être obligatoirement sélectionné dans la liste des matières premières enregistrées en stock (db.raw_materials).
          </p>
        </div>
      )}

      {/* Save / Sync Notification Banner */}
      {saveFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-sm text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
          <button
            onClick={() => setSaveFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs px-2 py-0.5 rounded font-semibold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Informations Générales Produit Fini */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-stone-50/60 p-4 rounded-xl border border-stone-200/80">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Nom du Produit Fini
          </label>
          <input
            type="text"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Mille-Feuille Vanille Varsovie"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Atelier / Salle
          </label>
          <select
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            <option value="patisserie_fine">Pâtisserie Fine</option>
            <option value="viennoiserie">Viennoiserie & Feuilletage</option>
            <option value="gateaux_orientaux">Gâteaux Orientaux</option>
            <option value="boulangerie">Boulangerie Traditionnelle</option>
            <option value="chocolaterie">Chocolaterie & Confiserie</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Catégorie
          </label>
          <input
            type="text"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Pâtisseries Fines"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Rendement par Tour (Batch)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="1"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              value={yieldPerBatch}
              onChange={(e) => setYieldPerBatch(Math.max(1, Number(e.target.value)))}
            />
            <input
              type="text"
              className="w-24 border border-stone-300 rounded-lg px-2 py-2 text-sm bg-stone-100 text-stone-600 text-center"
              value={batchUnit}
              onChange={(e) => setBatchUnit(e.target.value)}
              placeholder="pièces"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
            Prix de Vente Public (TTC)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="5"
              className="w-full border border-stone-300 rounded-lg pl-3 pr-14 py-2 text-sm bg-white font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Math.max(0, Number(e.target.value)))}
            />
            <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-medium">DZD</span>
          </div>
        </div>
      </div>

      {/* Composition / Table des Ingrédients liée à db.raw_materials */}
      <div className="space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Composition de la Recette (Matières Premières)
            </h3>
            <p className="text-xs text-stone-500">
              Chaque ligne est directement connectée à une référence du stock de matières premières avec son PAMP actuel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {ingredients.length > 0 && (
              <button
                type="button"
                onClick={handleRefreshAllPamp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition cursor-pointer"
                title="Actualiser les coûts unitaires de tous les ingrédients avec le dernier PAMP du stock"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>Actualiser PAMP Live</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAddIngredient}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Ingrédient</span>
            </button>
          </div>
        </div>

        {/* Empty state or Table */}
        {rawMaterials.length === 0 ? (
          <div className="p-8 text-center bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <div className="text-sm font-semibold text-amber-900">
              Aucune matière première disponible dans la base locale (db.raw_materials).
            </div>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              Veuillez importer des matières premières ou cliquer sur le bouton ci-dessous pour injecter le catalogue standard.
            </p>
            <button
              type="button"
              onClick={handleResetRawMaterials}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Initialiser le Stock Standard
            </button>
          </div>
        ) : (
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-stone-100/80 text-stone-600 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-[45%]">Matière Première (Stock & PAMP)</th>
                    <th className="p-3 w-[20%]">Dosage / Tour</th>
                    <th className="p-3 w-[15%]">PAMP Unitaire</th>
                    <th className="p-3 w-[15%]">Coût Ligne</th>
                    <th className="p-3 w-[5%] text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-sm">
                  {ingredients.map((ing, index) => {
                    const matchedRm = rawMaterials.find((rm) => rm.id === ing.rawMaterialId);
                    const isOrphan = !matchedRm;
                    const stock = matchedRm ? getRawMaterialStock(matchedRm) : 0;
                    const isLowStock = matchedRm && stock < (ing.quantityPerBatch || 0);
                    const lineCost = (ing.quantityPerBatch || 0) * (ing.unitCost || 0);

                    return (
                      <tr
                        key={`${ing.rawMaterialId || 'new'}-${index}`}
                        className={`transition-colors ${
                          isOrphan ? 'bg-rose-50/80 hover:bg-rose-100/70 border-l-4 border-l-rose-500' : 'hover:bg-stone-50/70'
                        }`}
                      >
                        {/* Dropdown column: 100% dynamic & unified with db.raw_materials */}
                        <td className="p-3 align-top">
                          <select
                            className={`w-full border rounded-lg px-2.5 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden ${
                              isOrphan
                                ? 'border-rose-400 bg-rose-50 text-rose-900 font-semibold'
                                : 'border-stone-300 bg-white text-stone-900'
                            }`}
                            value={ing.rawMaterialId}
                            onChange={(e) => handleIngredientChange(index, e.target.value)}
                          >
                            {/* Orphan warning if ID is not found in db.raw_materials */}
                            {isOrphan && (
                              <option value={ing.rawMaterialId} disabled>
                                ⚠️ {ing.name || 'Ingrédient sans nom'} (Non lié dans db.raw_materials - Sélection requise)
                              </option>
                            )}

                            <option value="" disabled>-- Sélectionner une matière première enregistrée --</option>

                            {Object.entries(groupedRawMaterials).map(([catName, items]) => (
                              <optgroup key={catName} label={`📁 ${catName}`}>
                                {items.map((rm) => (
                                  <option key={rm.id} value={rm.id}>
                                    {formatRawMaterialOptionLabel(rm)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>

                          {/* Live Stock & Status Pills */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {matchedRm ? (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                    isLowStock
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {isLowStock ? (
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  )}
                                  <span>
                                    Stock disponible: {stock} {matchedRm.unit}
                                  </span>
                                </span>

                                {matchedRm.code && (
                                  <span className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                                    {matchedRm.code}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-medium">
                                ⚠️ Veuillez sélectionner une matière première valide
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Quantity per batch */}
                        <td className="p-3 align-top">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              className="w-24 border border-stone-300 rounded-lg px-2.5 py-1.5 text-sm bg-white font-medium text-stone-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                              value={ing.quantityPerBatch}
                              onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value))}
                            />
                            <span className="text-xs font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-1.5 rounded-lg">
                              {ing.unit || 'kg'}
                            </span>
                          </div>
                        </td>

                        {/* Unit Cost PAMP */}
                        <td className="p-3 align-top text-stone-700">
                          <div className="font-medium text-xs">
                            {(ing.unitCost || 0).toFixed(2)} DZD
                          </div>
                          <div className="text-[10px] text-stone-400">
                            par {ing.unit || 'kg'}
                          </div>
                        </td>

                        {/* Total Line Cost */}
                        <td className="p-3 align-top font-bold text-stone-900 text-sm">
                          {lineCost.toFixed(2)} DZD
                        </td>

                        {/* Action: Delete */}
                        <td className="p-3 align-top text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(index)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Supprimer cet ingrédient de la recette"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-stone-400 text-sm">
                        Aucun ingrédient dans cette fiche technique.
                        <br />
                        <span className="text-xs text-stone-500">
                          Cliquez sur "+ Ajouter un Ingrédient" ci-dessus pour composer votre recette.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Synthèse Financière & COGS en Temps Réel */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <span className="text-xs font-semibold text-stone-500 block uppercase tracking-wider">
            Coût Total Matières (Batch)
          </span>
          <span className="text-lg font-bold text-stone-900">
            {totalBatchCost.toFixed(2)} DZD
          </span>
          <span className="text-[11px] text-stone-400 block">
            Pour 1 tour de {yieldPerBatch} {batchUnit}
          </span>
        </div>

        <div>
          <span className="text-xs font-semibold text-stone-500 block uppercase tracking-wider">
            Coût de Revient Unitaire (COGS)
          </span>
          <span className="text-lg font-bold text-amber-600">
            {unitCost.toFixed(2)} DZD / {batchUnit}
          </span>
          <span className="text-[11px] text-stone-400 block">
            Coût matières premières unitaire
          </span>
        </div>

        <div>
          <span className="text-xs font-semibold text-stone-500 block uppercase tracking-wider">
            Marge Brute Unitaire
          </span>
          <span
            className={`text-lg font-bold ${
              marginAmount >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {marginAmount.toFixed(2)} DZD
          </span>
          <span className="text-[11px] text-stone-400 block">
            Prix public - Coût unitaire
          </span>
        </div>

        <div>
          <span className="text-xs font-semibold text-stone-500 block uppercase tracking-wider">
            Taux de Marge
          </span>
          <span
            className={`text-lg font-bold ${
              marginPercentage >= 50
                ? 'text-emerald-700'
                : marginPercentage >= 25
                ? 'text-amber-700'
                : 'text-red-600'
            }`}
          >
            {marginPercentage.toFixed(1)}%
          </span>
          <span className="text-[11px] text-stone-400 block">
            {marginPercentage >= 50 ? 'Rentabilité optimale' : 'À surveiller'}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-stone-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>
            Données persistées dans <code className="text-stone-700 font-mono">db.products</code> & synchronisées avec <code className="text-stone-700 font-mono">db.raw_materials</code>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md transition cursor-pointer text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Enregistrer la Fiche Technique & COGS</span>
        </button>
      </div>

      {/* Modal: Diagnostic Ingrédients vs Matières Premières */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-stone-50 rounded-2xl max-w-7xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-stone-200">
            <IngredientsDiagnosticView onClose={() => setShowDiagnostic(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default FicheTechniqueEditor;
