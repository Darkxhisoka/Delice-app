import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { PackagingMaterial } from '../../types';
import { upsertPackagingMaterialToSupabase } from '../../services/supabaseService';
import { notifyToast } from '../../services/storage';
import { Package, X, Check, Loader2 } from 'lucide-react';

interface PackagingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: PackagingMaterial | null;
  onSuccess: () => Promise<void> | void;
}

export const PackagingFormModal: React.FC<PackagingFormModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [pkgCode, setPkgCode] = useState('');
  const [pkgName, setPkgName] = useState('');
  const [pkgCategory, setPkgCategory] = useState('Boxes');
  const [pkgUnit, setPkgUnit] = useState('piece');
  const [pkgCentralStock, setPkgCentralStock] = useState<number>(0);
  const [pkgUnitCost, setPkgUnitCost] = useState<number>(0);
  const [pkgMinAlert, setPkgMinAlert] = useState<number>(100);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingItem) {
        setPkgCode(editingItem.code || `PKG-${editingItem.id.slice(-6)}`);
        setPkgName(editingItem.name);
        setPkgCategory(editingItem.category || 'Boxes');
        setPkgUnit(editingItem.unit_type || 'piece');
        setPkgCentralStock(editingItem.central_stock_qty ?? 0);
        setPkgUnitCost(editingItem.unit_cost ?? 0);
        setPkgMinAlert(editingItem.min_alert_qty ?? 100);
      } else {
        setPkgCode(`PKG-BOX-${Math.floor(100 + Math.random() * 900)}`);
        setPkgName('');
        setPkgCategory('Boxes');
        setPkgUnit('piece');
        setPkgCentralStock(0);
        setPkgUnitCost(0);
        setPkgMinAlert(100);
      }
    }
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) {
      notifyToast({
        type: 'error',
        title: 'Champ Requis',
        message: "Veuillez saisir le nom de l'emballage.",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem?.id) {
        // Edit existing material in Supabase
        const { error } = await supabase
          .from('packaging_materials')
          .update({
            name: pkgName.trim(),
            category: pkgCategory,
            unit_type: pkgUnit,
            unit: pkgUnit,
            central_stock_qty: Number(pkgCentralStock),
            unit_cost: Number(pkgUnitCost),
            min_alert_qty: Number(pkgMinAlert),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingItem.id);

        if (error) {
          console.warn('Supabase update warning, falling back to upsertPackagingMaterialToSupabase:', error.message);
          await upsertPackagingMaterialToSupabase({
            id: editingItem.id,
            code: pkgCode,
            name: pkgName.trim(),
            category: pkgCategory,
            unit_type: pkgUnit,
            central_stock_qty: Number(pkgCentralStock),
            unit_cost: Number(pkgUnitCost),
            min_alert_qty: Number(pkgMinAlert),
          });
        }
      } else {
        // Insert new material in Supabase
        const { error: insertErr } = await supabase
          .from('packaging_materials')
          .insert({
            code: pkgCode || `PKG-${Date.now().toString().slice(-6)}`,
            name: pkgName.trim(),
            category: pkgCategory,
            unit_type: pkgUnit,
            unit: pkgUnit,
            central_stock_qty: Number(pkgCentralStock),
            unit_cost: Number(pkgUnitCost),
            min_alert_qty: Number(pkgMinAlert),
            updated_at: new Date().toISOString(),
          });

        if (insertErr) {
          console.warn('Direct insert failed, using upsertPackagingMaterialToSupabase helper:', insertErr.message);
          await upsertPackagingMaterialToSupabase({
            code: pkgCode,
            name: pkgName.trim(),
            category: pkgCategory,
            unit_type: pkgUnit,
            central_stock_qty: Number(pkgCentralStock),
            unit_cost: Number(pkgUnitCost),
            min_alert_qty: Number(pkgMinAlert),
          });
        }
      }

      // Re-fetch packaging inventory immediately from Supabase via state-management hook callback
      await onSuccess();

      notifyToast({
        type: 'success',
        title: editingItem ? 'Emballage Modifié' : 'Emballage Créé',
        message: `L'article d'emballage "${pkgName.trim()}" a été enregistré et le stock réactualisé depuis Supabase.`,
      });

      onClose();
    } catch (err: any) {
      console.error('Error in PackagingFormModal submission:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Enregistrement',
        message: err.message || "Impossible d'enregistrer l'emballage.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 text-start">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                {editingItem ? t('packagingModal.editTitle', "Modifier l'Article d'Emballage") : t('packagingModal.addTitle', 'Ajouter un Nouvel Emballage')}
              </h3>
              <p className="text-xs text-slate-500">
                {editingItem
                  ? t('packagingModal.editSubtitle', 'Mettre à jour les paramètres de la référence dans Supabase')
                  : t('packagingModal.addSubtitle', "Créer une référence d'emballage dans le catalogue Supabase")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Code / SKU */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
              {t('packagingModal.codeSku', 'Code / SKU')} {editingItem && <span className="text-slate-400 font-normal">{t('packagingModal.nonEditable', '(Non modifiable)')}</span>}
            </label>
            <input
              type="text"
              value={pkgCode}
              onChange={(e) => setPkgCode(e.target.value)}
              disabled={Boolean(editingItem)}
              placeholder="Ex: PKG-BOX-XL"
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 disabled:opacity-60 disabled:bg-slate-100 text-start"
              required
            />
          </div>

          {/* Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
              {t('packagingModal.packagingName', "Nom de l'Emballage")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={pkgName}
              onChange={(e) => setPkgName(e.target.value)}
              placeholder="Ex: Boîte à Gâteau XL"
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-indigo-500 text-start"
              required
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {t('packagingModal.category', 'Catégorie')}
              </label>
              <select
                value={pkgCategory}
                onChange={(e) => setPkgCategory(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
              >
                <option value="Boxes">{t('packagingModal.boxes', 'Boxes (Boîtes)')}</option>
                <option value="Bags">{t('packagingModal.bags', 'Bags (Sacs)')}</option>
                <option value="Boards">{t('packagingModal.boards', 'Boards (Supports/Semelles)')}</option>
                <option value="Accessories">{t('packagingModal.accessories', 'Accessories (Accessoires)')}</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {t('packagingModal.unitPackaging', 'Unité Conditionnement')}
              </label>
              <select
                value={pkgUnit}
                onChange={(e) => setPkgUnit(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
              >
                <option value="piece">{t('packagingModal.piece', 'piece (pièce)')}</option>
                <option value="pack">{t('packagingModal.pack', 'pack (paquet)')}</option>
                <option value="roll">{t('packagingModal.roll', 'roll (rouleau)')}</option>
                <option value="box">{t('packagingModal.box', 'box (carton)')}</option>
              </select>
            </div>
          </div>

          {/* Central Stock Qty, Unit Cost, Min Alert Threshold */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {t('packagingModal.centralStock', 'Stock Central')}
              </label>
              <input
                type="number"
                min="0"
                value={pkgCentralStock}
                onChange={(e) => setPkgCentralStock(parseInt(e.target.value) || 0)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-start"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {t('packagingModal.unitCostDa', 'Coût Unitaire (DA)')}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={pkgUnitCost}
                onChange={(e) => setPkgUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-start"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                {t('packagingModal.minAlertThreshold', 'Seuil Alerte Min')}
              </label>
              <input
                type="number"
                min="0"
                value={pkgMinAlert}
                onChange={(e) => setPkgMinAlert(parseInt(e.target.value) || 0)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 text-start"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors cursor-pointer"
            >
              {t('packagingModal.cancel', 'Annuler')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{editingItem ? t('packagingModal.update', 'Mettre à jour') : t('packagingModal.save', 'Enregistrer')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
