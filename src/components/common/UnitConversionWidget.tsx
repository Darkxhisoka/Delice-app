import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RawMaterial } from '../../types';
import { getRawMaterials } from '../../services/storage';
import {
  convertQuantity,
  convertCost,
  normalizeUnitString,
  STANDARD_UNITS,
  formatSmartUnit
} from '../../services/unitConversionService';
import {
  Scale,
  ArrowRightLeft,
  DollarSign,
  Boxes,
  Sparkles,
  Check,
  Copy,
  Layers
} from 'lucide-react';

interface UnitConversionWidgetProps {
  className?: string;
  defaultMaterialId?: string;
}

export const UnitConversionWidget: React.FC<UnitConversionWidgetProps> = ({
  className = '',
  defaultMaterialId,
}) => {
  const { t } = useTranslation();
  const rawMaterials = useMemo(() => getRawMaterials(), []);

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(defaultMaterialId || 'NONE');
  const [sourceQty, setSourceQty] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState<string>('kg');
  const [toUnit, setToUnit] = useState<string>('g');
  const [copied, setCopied] = useState<boolean>(false);

  const activeMaterial = useMemo(() => {
    if (selectedMaterialId === 'NONE') return null;
    return rawMaterials.find((m) => m.id === selectedMaterialId) || null;
  }, [selectedMaterialId, rawMaterials]);

  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    if (matId === 'NONE') return;
    const found = rawMaterials.find((m) => m.id === matId);
    if (found) {
      setFromUnit(found.unit);
      setToUnit(found.unit === 'kg' ? 'g' : found.unit === 'g' ? 'kg' : found.unit === 'L' ? 'mL' : 'kg');
    }
  };

  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const conversion = useMemo(() => {
    return convertQuantity(sourceQty, fromUnit, toUnit, {
      rawMaterialName: activeMaterial?.name,
      rawMaterialCategory: activeMaterial?.category,
    });
  }, [sourceQty, fromUnit, toUnit, activeMaterial]);

  const costEquivalent = useMemo(() => {
    if (!activeMaterial || activeMaterial.currentAvgCost <= 0) return null;
    const costInToUnit = convertCost(activeMaterial.currentAvgCost, activeMaterial.unit, toUnit, {
      rawMaterialName: activeMaterial.name,
      rawMaterialCategory: activeMaterial.category,
    });
    return {
      baseCost: activeMaterial.currentAvgCost,
      baseUnit: activeMaterial.unit,
      targetCost: costInToUnit,
      targetUnit: toUnit,
      totalBatch: sourceQty * (fromUnit === activeMaterial.unit ? activeMaterial.currentAvgCost : convertCost(activeMaterial.currentAvgCost, activeMaterial.unit, fromUnit)),
    };
  }, [activeMaterial, toUnit, fromUnit, sourceQty]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${conversion.targetQuantity.toFixed(4).replace(/\.?0+$/, '')} ${toUnit}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 text-white shadow-lg space-y-3 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">{t('unitConverter.quickWidgetTitle', 'Calculateur d\'Unités & Coûts')}</h4>
            <p className="text-[10px] text-slate-400">{t('unitConverter.quickWidgetSubtitle', 'Conversions directes MP & Réquisitions')}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Auto-Sync
        </span>
      </div>

      {/* Select Material */}
      <div className="space-y-1">
        <select
          value={selectedMaterialId}
          onChange={(e) => handleMaterialChange(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
        >
          <option value="NONE">{t('unitConverter.selectMaterialOpt', '— Sélectionner une Matière Première (Optionnel) —')}</option>
          {rawMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.sku}) • {m.currentStock} {m.unit}
            </option>
          ))}
        </select>
      </div>

      {/* Converter inputs & swap */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Source */}
        <div className="flex flex-col gap-1">
          <input
            type="number"
            min="0"
            step="any"
            value={sourceQty}
            onChange={(e) => setSourceQty(parseFloat(e.target.value) || 0)}
            className="w-full px-2.5 py-1.5 text-xs font-black bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="w-full px-1.5 py-1 text-[11px] font-bold bg-slate-800 border border-slate-700 rounded-lg text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value="kg">kg (Kilo)</option>
            <option value="g">g (Gramme)</option>
            <option value="L">L (Litre)</option>
            <option value="mL">mL (Millilitre)</option>
            <option value="bags">Sacs (25kg)</option>
            <option value="boxes">Cartons</option>
            <option value="trays">Plaques (30pcs)</option>
            <option value="units">Pièces (Units)</option>
          </select>
        </div>

        {/* Swap button */}
        <button
          type="button"
          onClick={handleSwap}
          className="p-1.5 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 rounded-lg transition-all active:scale-90 cursor-pointer self-center"
          title="Inverser"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>

        {/* Target */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-black bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300">
            <span className="truncate">{conversion.targetQuantity.toFixed(3).replace(/\.?0+$/, '')}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[10px] text-slate-400 hover:text-white ms-1 cursor-pointer"
              title="Copier"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <select
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value)}
            className="w-full px-1.5 py-1 text-[11px] font-bold bg-slate-800 border border-slate-700 rounded-lg text-amber-300 focus:outline-none cursor-pointer"
          >
            <option value="g">g (Gramme)</option>
            <option value="kg">kg (Kilo)</option>
            <option value="mL">mL (Millilitre)</option>
            <option value="L">L (Litre)</option>
            <option value="bags">Sacs (25kg)</option>
            <option value="boxes">Cartons</option>
            <option value="trays">Plaques (30pcs)</option>
            <option value="units">Pièces (Units)</option>
          </select>
        </div>
      </div>

      {/* Result Formula & Cost Summary */}
      <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] space-y-1">
        <div className="font-mono text-slate-300">
          {conversion.formulaDescription}
        </div>
        {costEquivalent && (
          <div className="text-[10px] text-emerald-400 flex items-center justify-between border-t border-slate-800/80 pt-1">
            <span>Coût calculé : {costEquivalent.targetCost.toFixed(4)} DZD / {toUnit}</span>
            <span className="font-bold text-amber-300">Total : {costEquivalent.totalBatch.toFixed(2)} DZD</span>
          </div>
        )}
      </div>

    </div>
  );
};
