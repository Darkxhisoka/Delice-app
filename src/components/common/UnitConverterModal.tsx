import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RawMaterial } from '../../types';
import { getRawMaterials } from '../../services/storage';
import {
  STANDARD_UNITS,
  STANDARD_PACKAGING_DEFAULTS,
  INGREDIENT_DENSITIES,
  convertQuantity,
  convertCost,
  normalizeUnitString,
  getUnitCategory,
  formatSmartUnit,
  ConversionResult
} from '../../services/unitConversionService';
import {
  Scale,
  ArrowRightLeft,
  X,
  Copy,
  Check,
  Boxes,
  DollarSign,
  Droplet,
  Package,
  Layers,
  Sparkles,
  Info,
  Calculator,
  RotateCcw
} from 'lucide-react';

interface UnitConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: RawMaterial | null;
  initialQuantity?: number;
  initialFromUnit?: string;
  initialToUnit?: string;
  onApplyConversion?: (convertedQty: number, targetUnit: string) => void;
}

const PRESET_CONVERSIONS = [
  { label: '1 kg → 1,000 g', from: 'kg', to: 'g', qty: 1 },
  { label: '500 g → 0.5 kg', from: 'g', to: 'kg', qty: 500 },
  { label: '1 L → 1,000 mL', from: 'L', to: 'mL', qty: 1 },
  { label: '250 mL → 0.25 L', from: 'mL', to: 'L', qty: 250 },
  { label: '1 Sac (Farine) → 25 kg', from: 'bags', to: 'kg', qty: 1, matName: 'Farine T55' },
  { label: '1 Carton (Beurre) → 10 kg', from: 'boxes', to: 'kg', qty: 1, matName: 'Beurre 82%' },
  { label: '1 Plaque (Œufs) → 30 pcs', from: 'trays', to: 'units', qty: 1, matName: 'Œufs Frais' },
  { label: '1 Carton (Chocolat) → 5 kg', from: 'boxes', to: 'kg', qty: 1, matName: 'Chocolat Noir' },
];

export const UnitConverterModal: React.FC<UnitConverterModalProps> = ({
  isOpen,
  onClose,
  initialMaterial,
  initialQuantity = 1,
  initialFromUnit = 'kg',
  initialToUnit = 'g',
  onApplyConversion,
}) => {
  const { t } = useTranslation();
  const rawMaterials = useMemo(() => getRawMaterials(), []);

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterial?.id || 'NONE');
  const [sourceQuantity, setSourceQuantity] = useState<number>(initialQuantity);
  const [fromUnit, setFromUnit] = useState<string>(initialFromUnit);
  const [toUnit, setToUnit] = useState<string>(initialToUnit);
  const [customDensity, setCustomDensity] = useState<string>('');
  const [customPackWeight, setCustomPackWeight] = useState<string>('');
  const [unitCost, setUnitCost] = useState<number>(initialMaterial?.currentAvgCost || 0);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync when initial material changes
  React.useEffect(() => {
    if (initialMaterial) {
      setSelectedMaterialId(initialMaterial.id);
      setFromUnit(initialMaterial.unit);
      setToUnit(initialMaterial.unit === 'kg' ? 'g' : initialMaterial.unit === 'g' ? 'kg' : initialMaterial.unit === 'L' ? 'mL' : 'kg');
      setUnitCost(initialMaterial.currentAvgCost);
    }
  }, [initialMaterial]);

  const activeMaterial = useMemo(() => {
    if (selectedMaterialId === 'NONE') return null;
    return rawMaterials.find((m) => m.id === selectedMaterialId) || null;
  }, [selectedMaterialId, rawMaterials]);

  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    if (matId === 'NONE') {
      setUnitCost(0);
      setCustomDensity('');
      setCustomPackWeight('');
      return;
    }
    const found = rawMaterials.find((m) => m.id === matId);
    if (found) {
      setFromUnit(found.unit);
      const defaultTarget = found.unit === 'kg' ? 'g' : found.unit === 'g' ? 'kg' : found.unit === 'L' ? 'mL' : 'kg';
      setToUnit(defaultTarget);
      setUnitCost(found.currentAvgCost);
    }
  };

  const handleSwapUnits = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  }, [fromUnit, toUnit]);

  const conversionResult: ConversionResult = useMemo(() => {
    const densityNum = parseFloat(customDensity) || undefined;
    const packWeightNum = parseFloat(customPackWeight) || undefined;

    return convertQuantity(sourceQuantity, fromUnit, toUnit, {
      rawMaterialName: activeMaterial?.name,
      rawMaterialCategory: activeMaterial?.category,
      density: densityNum,
      packWeightKg: packWeightNum,
    });
  }, [sourceQuantity, fromUnit, toUnit, activeMaterial, customDensity, customPackWeight]);

  const costCalculations = useMemo(() => {
    if (unitCost <= 0) return null;

    const densityNum = parseFloat(customDensity) || undefined;
    const packWeightNum = parseFloat(customPackWeight) || undefined;

    const costInTargetUnit = convertCost(unitCost, fromUnit, toUnit, {
      rawMaterialName: activeMaterial?.name,
      rawMaterialCategory: activeMaterial?.category,
      density: densityNum,
      packWeightKg: packWeightNum,
    });

    const totalBatchCost = sourceQuantity * unitCost;

    return {
      costPerFromUnit: unitCost,
      costPerToUnit: costInTargetUnit,
      totalBatchCost,
    };
  }, [unitCost, fromUnit, toUnit, sourceQuantity, activeMaterial, customDensity, customPackWeight]);

  const handleCopyResult = () => {
    const textToCopy = `${conversionResult.targetQuantity.toFixed(4).replace(/\.?0+$/, '')} ${toUnit}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPreset = (preset: typeof PRESET_CONVERSIONS[0]) => {
    setSourceQuantity(preset.qty);
    setFromUnit(preset.from);
    setToUnit(preset.to);
    if (preset.matName) {
      const match = rawMaterials.find((m) => m.name.toLowerCase().includes(preset.matName.toLowerCase()));
      if (match) {
        setSelectedMaterialId(match.id);
        setUnitCost(match.currentAvgCost);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl text-white space-y-5 my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 rounded-2xl shadow-md font-black">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {t('unitConverter.title', 'Convertisseur Universel d\'Unités')}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t('unitConverter.badge', 'Précision Labo')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('unitConverter.subtitle', 'Conversions instantanées masse, volume, conditionnement & coûts pour MP')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Quick-Click Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{t('unitConverter.quickPresets', 'Raccourcis Fréquents')}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_CONVERSIONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-amber-300 whitespace-nowrap transition-all active:scale-95 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Material Selection (Optional Context Binding) */}
        <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('unitConverter.linkMaterial', 'Lier à une Matière Première (Optionnel pour Densité & Coûts)')}</span>
          </label>
          <select
            value={selectedMaterialId}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
          >
            <option value="NONE">{t('unitConverter.genericMode', '— Mode Générique (Sans ingrédient spécifique) —')}</option>
            {rawMaterials.map((mat) => (
              <option key={mat.id} value={mat.id}>
                {mat.name} ({mat.sku}) • Stock: {mat.currentStock} {mat.unit} • {mat.currentAvgCost.toFixed(2)} DZD/{mat.unit}
              </option>
            ))}
          </select>
        </div>

        {/* Main Conversion Interactive Card */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-2xl p-4 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* SOURCE INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{t('unitConverter.from', 'De')}</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-700 bg-slate-950 focus-within:ring-2 focus-within:ring-amber-400">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sourceQuantity}
                  onChange={(e) => setSourceQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-black text-white bg-transparent focus:outline-none"
                />
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="bg-slate-800 text-xs font-bold text-amber-300 px-2.5 py-2 border-s border-slate-700 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Masse">
                    <option value="kg">kg (Kilogramme)</option>
                    <option value="g">g (Gramme)</option>
                    <option value="mg">mg (Milligramme)</option>
                    <option value="t">t (Tonne Métrique)</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="L">L (Litre)</option>
                    <option value="dL">dL (Décilitre)</option>
                    <option value="cL">cL (Centilitre)</option>
                    <option value="mL">mL (Millilitre)</option>
                  </optgroup>
                  <optgroup label="Conditionnement / Unités">
                    <option value="units">Unités (Pièces)</option>
                    <option value="bags">Sacs (Bags)</option>
                    <option value="boxes">Cartons (Boxes)</option>
                    <option value="packs">Paquets (Packs)</option>
                    <option value="trays">Plaques (Trays)</option>
                    <option value="doz">Douzaines</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* SWAP BUTTON */}
            <div className="flex justify-center pt-4 sm:pt-4">
              <button
                type="button"
                onClick={handleSwapUnits}
                title="Inverser les unités"
                className="p-2.5 rounded-full bg-slate-700/80 hover:bg-amber-400 hover:text-slate-950 text-slate-300 transition-all active:scale-90 cursor-pointer shadow-sm"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* TARGET RESULT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">{t('unitConverter.to', 'Vers')}</label>
              <div className="flex rounded-xl overflow-hidden border border-amber-500/50 bg-amber-500/10 focus-within:ring-2 focus-within:ring-amber-400">
                <input
                  type="text"
                  readOnly
                  value={conversionResult.targetQuantity.toFixed(4).replace(/\.?0+$/, '')}
                  className="w-full px-3 py-2 text-sm font-black text-amber-300 bg-transparent focus:outline-none"
                />
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="bg-slate-800 text-xs font-bold text-amber-300 px-2.5 py-2 border-s border-slate-700 focus:outline-none cursor-pointer"
                >
                  <optgroup label="Masse">
                    <option value="kg">kg (Kilogramme)</option>
                    <option value="g">g (Gramme)</option>
                    <option value="mg">mg (Milligramme)</option>
                    <option value="t">t (Tonne Métrique)</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="L">L (Litre)</option>
                    <option value="dL">dL (Décilitre)</option>
                    <option value="cL">cL (Centilitre)</option>
                    <option value="mL">mL (Millilitre)</option>
                  </optgroup>
                  <optgroup label="Conditionnement / Unités">
                    <option value="units">Unités (Pièces)</option>
                    <option value="bags">Sacs (Bags)</option>
                    <option value="boxes">Cartons (Boxes)</option>
                    <option value="packs">Paquets (Packs)</option>
                    <option value="trays">Plaques (Trays)</option>
                    <option value="doz">Douzaines</option>
                  </optgroup>
                </select>
              </div>
            </div>

          </div>

          {/* Result Banner Highlight */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs text-slate-400 font-medium">{t('unitConverter.equivalentResult', 'Équivalence Calculée :')}</div>
              <div className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                <span>{sourceQuantity} {fromUnit} = {conversionResult.targetQuantity.toFixed(4).replace(/\.?0+$/, '')} {toUnit}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {conversionResult.formulaDescription}
              </div>
              {conversionResult.notes && (
                <div className="text-[11px] text-indigo-300 flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>{conversionResult.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCopyResult}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? t('common.copied', 'Copié !') : t('common.copy', 'Copier')}</span>
              </button>
            </div>
          </div>

          {/* Unit Cost & Valuation Breakdown (If cost is provided) */}
          {costCalculations && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1.5 text-xs text-emerald-300">
              <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                <DollarSign className="w-4 h-4" />
                <span>{t('unitConverter.costConversion', 'Conversion des Coûts & Valorisation')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 bg-slate-900/80 rounded-lg">
                  <span className="text-slate-400 block">{t('unitConverter.costInSource', 'Coût / Unité Source')} :</span>
                  <span className="font-black text-white">{costCalculations.costPerFromUnit.toFixed(2)} DZD / {fromUnit}</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg">
                  <span className="text-slate-400 block">{t('unitConverter.costInTarget', 'Coût / Unité Cible')} :</span>
                  <span className="font-black text-emerald-400">{costCalculations.costPerToUnit.toFixed(4)} DZD / {toUnit}</span>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg">
                  <span className="text-slate-400 block">{t('unitConverter.batchValuation', 'Valeur Totale')} :</span>
                  <span className="font-black text-amber-400">{costCalculations.totalBatchCost.toFixed(2)} DZD</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('common.close', 'Fermer')}
          </button>

          {onApplyConversion && (
            <button
              type="button"
              onClick={() => {
                onApplyConversion(conversionResult.targetQuantity, toUnit);
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{t('unitConverter.applyToForm', 'Appliquer la Quantité Convertie')}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
