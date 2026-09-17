import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RawMaterial, MaterialUnit } from '../../types';
import { getRawMaterials, saveRawMaterials, addActivityLog, notifyToast } from '../../services/storage';
import { upsertRawMaterialToSupabase } from '../../services/supabaseService';
import { db } from '../../db/database';
import {
  Boxes,
  Plus,
  X,
  AlertCircle,
  Tag,
  Scale,
  DollarSign,
  PackageCheck,
  ShieldAlert,
  Barcode
} from 'lucide-react';

interface AddRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS: { label: string; value: RawMaterial['category'] }[] = [
  { label: 'Farines & Céréales (Flour & Grains)', value: 'Flour & Grains' },
  { label: 'Produits Laitiers & Œufs (Dairy & Eggs)', value: 'Dairy & Eggs' },
  { label: 'Sucres & Édulcorants (Sugars & Sweeteners)', value: 'Sugars & Sweeteners' },
  { label: 'Matières Grasses & Huiles (Fats & Oils)', value: 'Fats & Oils' },
  { label: 'Chocolat & Cacao (Chocolate & Cocoa)', value: 'Chocolate & Cocoa' },
  { label: 'Fruits & Fruits Secs (Fruits & Nuts)', value: 'Fruits & Nuts' },
  { label: 'Arômes, Épices & Levures (Flavorings & Vanilla)', value: 'Flavorings & Vanilla' },
  { label: 'Emballages & Packaging (Packaging)', value: 'Packaging' },
  { label: 'Autres Matières Premières (Other)', value: 'Other' },
];

const UNIT_OPTIONS: { label: string; value: MaterialUnit }[] = [
  { label: 'Kilogramme (kg)', value: 'kg' },
  { label: 'Gramme (g)', value: 'g' },
  { label: 'Litre (L)', value: 'L' },
  { label: 'Millilitre (mL)', value: 'mL' },
  { label: 'Unités / Pièces (units)', value: 'units' },
  { label: 'Sacs / Sachets (bags)', value: 'bags' },
  { label: 'Boîtes / Cartons (boxes)', value: 'boxes' },
];

export const AddRawMaterialModal: React.FC<AddRawMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<RawMaterial['category']>('Flour & Grains');
  const [unit, setUnit] = useState<MaterialUnit>('kg');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [currentAvgCost, setCurrentAvgCost] = useState<string>('0.00');
  const [reorderLevel, setReorderLevel] = useState<string>('10');
  const [barcode, setBarcode] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCategory('Flour & Grains');
    setUnit('kg');
    setCurrentStock('0');
    setCurrentAvgCost('0.00');
    setReorderLevel('10');
    setBarcode('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errs.name = t('inventory.rawMaterials') + ' ' + t('common.required');
    } else {
      // Check duplicate
      const existing = getRawMaterials();
      const duplicate = existing.find(
        (m) => m.name.toLowerCase().trim() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        errs.name = `${duplicate.name} (${t('inventory.inStock')})`;
      }
    }

    const stockNum = parseFloat(currentStock);
    if (isNaN(stockNum) || stockNum < 0) {
      errs.currentStock = '≥ 0';
    }

    const costNum = parseFloat(currentAvgCost);
    if (isNaN(costNum) || costNum < 0) {
      errs.currentAvgCost = '≥ 0';
    }

    const reorderNum = parseFloat(reorderLevel);
    if (isNaN(reorderNum) || reorderNum < 0) {
      errs.reorderLevel = '≥ 0';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const existingMaterials = getRawMaterials();

      // Generate SKU code
      const catCode = category.substring(0, 3).toUpperCase();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const skuCode = `RM-${catCode}-${randomSuffix}`;

      const stockVal = Math.max(0, parseFloat(currentStock) || 0);
      const costVal = Math.max(0, parseFloat(currentAvgCost) || 0);
      const reorderVal = Math.max(0, parseFloat(reorderLevel) || 10);

      const trimmedName = name.trim();

      const newMaterialPayload: RawMaterial = {
        id: `rm-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: trimmedName,
        sku: skuCode,
        barcode: barcode.trim() || undefined,
        category,
        unit,
        currentStock: stockVal,
        currentAvgCost: costVal,
        reorderLevel: reorderVal,
        min_reorder_level: reorderVal,
        totalPurchasedQty: stockVal,
        lastUpdated: new Date().toISOString(),
      };

      // Save directly to Supabase table
      const savedMaterial = await upsertRawMaterialToSupabase(newMaterialPayload);

      // Also sync to Dexie IndexedDB
      try {
        await db.raw_materials.put({
          id: savedMaterial.id,
          code: savedMaterial.sku || `MP-${savedMaterial.id}`,
          name: savedMaterial.name,
          category: savedMaterial.category || 'Matières Premières',
          unit: savedMaterial.unit || 'kg',
          currentStock: savedMaterial.currentStock,
          stockQuantity: savedMaterial.currentStock,
          unitCost: savedMaterial.currentAvgCost,
          costPerUnit: savedMaterial.currentAvgCost,
          pamp: savedMaterial.currentAvgCost,
          currentAvgCost: savedMaterial.currentAvgCost,
          minStockAlert: savedMaterial.reorderLevel ?? 10,
          storeId: 'lab_central',
          isActive: true,
          updatedAt: new Date().toISOString()
        });
      } catch (dexieErr) {
        console.warn('Could not put new material into Dexie:', dexieErr);
      }

      // Also sync to local storage cache without duplicating
      const freshMaterials = getRawMaterials().filter((m) => m.id !== savedMaterial.id);
      saveRawMaterials([savedMaterial, ...freshMaterials]);

      // Add activity log entry
      addActivityLog({
        type: 'STOCK_ADJUSTED',
        title: `${t('inventory.addMaterial')} (Supabase)`,
        description: `"${trimmedName}" (${stockVal} ${unit} @ ${costVal} ${t('common.currencyDa')}/${unit})`,
        actor: t('nav.labTitle'),
        badgeText: 'SUPABASE',
        severity: 'info',
      });

      // Notify success toast
      notifyToast({
        type: 'success',
        title: t('toast.savedSuccess'),
        message: `"${trimmedName}"`,
      });

      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error adding raw material to Supabase:', err);
      notifyToast({
        type: 'error',
        title: t('common.error'),
        message: err.message || t('toast.errorOccurred'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shadow-xs">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {t('inventory.addMaterial')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t('inventory.rawStockDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Material Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('inventory.colRawSku')}</span>
              <span className="text-rose-500 font-black">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder={t('inventory.searchRawPlaceholder')}
              className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                  : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Category & Unit (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('inventory.colCategory')}</span>
                <span className="text-rose-500 font-black">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RawMaterial['category'])}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit of Measure */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('common.unit')}</span>
                <span className="text-rose-500 font-black">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {UNIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock & Cost (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Initial Stock */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('inventory.colCurrentStock')} ({unit})</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentStock}
                onChange={(e) => {
                  setCurrentStock(e.target.value);
                  if (errors.currentStock) setErrors((prev) => ({ ...prev, currentStock: '' }));
                }}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.currentStock
                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
              {errors.currentStock && (
                <p className="text-[11px] font-bold text-rose-600">{errors.currentStock}</p>
              )}
            </div>

            {/* Unit Cost */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('inventory.colUnitCost')} ({t('common.currencyDa')} / {unit})</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentAvgCost}
                onChange={(e) => {
                  setCurrentAvgCost(e.target.value);
                  if (errors.currentAvgCost) setErrors((prev) => ({ ...prev, currentAvgCost: '' }));
                }}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.currentAvgCost
                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
              {errors.currentAvgCost && (
                <p className="text-[11px] font-bold text-rose-600">{errors.currentAvgCost}</p>
              )}
            </div>
          </div>

          {/* Reorder Level & Barcode Optional (Two columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Minimum Reorder Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('inventory.colReorderThreshold')} ({unit})</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={reorderLevel}
                onChange={(e) => {
                  setReorderLevel(e.target.value);
                  if (errors.reorderLevel) setErrors((prev) => ({ ...prev, reorderLevel: '' }));
                }}
                className={`w-full px-3.5 py-2 text-xs bg-slate-50 border rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 ${
                  errors.reorderLevel
                    ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
              {errors.reorderLevel && (
                <p className="text-[11px] font-bold text-rose-600">{errors.reorderLevel}</p>
              )}
            </div>

            {/* Optional Barcode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('inventory.barcode')} ({t('common.optional')})</span>
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 6130001234567"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{t('inventory.addMaterial')}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
