import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RawMaterial } from '../../types';
import {
  convertQuantity,
  formatSmartUnit,
  normalizeUnitString,
  STANDARD_UNITS,
  getUnitCategory
} from '../../services/unitConversionService';
import { UnitConverterModal } from './UnitConverterModal';
import { Scale, ArrowRight, Sparkles } from 'lucide-react';

interface UnitConversionBadgeProps {
  quantity: number;
  unit: string;
  material?: RawMaterial | null;
  targetUnit?: string;
  className?: string;
  showModalOnClick?: boolean;
}

export const UnitConversionBadge: React.FC<UnitConversionBadgeProps> = ({
  quantity,
  unit,
  material,
  targetUnit,
  className = '',
  showModalOnClick = true,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const normUnit = normalizeUnitString(unit);
  const cat = getUnitCategory(normUnit);

  // Determine complementary unit (e.g. if kg -> g, if g -> kg, if L -> mL, if mL -> L, if bags -> kg)
  const defaultTarget = targetUnit || (
    normUnit === 'kg' ? 'g' :
    normUnit === 'g' ? 'kg' :
    normUnit === 'L' ? 'mL' :
    normUnit === 'mL' ? 'L' :
    normUnit === 'bags' ? 'kg' :
    normUnit === 'boxes' ? 'kg' :
    normUnit === 'trays' ? 'units' :
    'kg'
  );

  if (normUnit === defaultTarget && cat === 'UNKNOWN') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold text-slate-700 ${className}`}>
        {quantity} {unit}
      </span>
    );
  }

  const result = convertQuantity(quantity, normUnit, defaultTarget, {
    rawMaterialName: material?.name,
    rawMaterialCategory: material?.category,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (showModalOnClick) setIsModalOpen(true);
        }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all border ${
          showModalOnClick ? 'hover:scale-105 active:scale-95 cursor-pointer bg-amber-500/10 text-amber-900 border-amber-300 hover:bg-amber-500/20' : 'bg-slate-100 text-slate-700 border-slate-200'
        } ${className}`}
        title={t('unitConverter.clickToConvert', 'Cliquer pour ouvrir le convertisseur d\'unités')}
      >
        <Scale className="w-3 h-3 text-amber-600 shrink-0" />
        <span className="font-bold">{quantity} {normUnit}</span>
        <span className="text-amber-500 font-bold">≈</span>
        <span className="font-extrabold text-amber-800">
          {result.targetQuantity.toFixed(2).replace(/\.?0+$/, '')} {defaultTarget}
        </span>
      </button>

      {showModalOnClick && (
        <UnitConverterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialMaterial={material}
          initialQuantity={quantity}
          initialFromUnit={normUnit}
          initialToUnit={defaultTarget}
        />
      )}
    </>
  );
};
