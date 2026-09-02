import { RawMaterial, MaterialUnit } from '../types';

export type UnitCategory = 'MASS' | 'VOLUME' | 'COUNT' | 'UNKNOWN';

export interface UnitDefinition {
  code: string;
  nameKey: string;
  category: UnitCategory;
  factorToBase: number; // For MASS -> factor to kg, For VOLUME -> factor to L, For COUNT -> factor to 1 unit
  symbol: string;
  isBaseUnit?: boolean;
}

export interface UnitConversionOptions {
  density?: number; // kg per Liter (e.g., 1.03 for milk, 0.92 for oil, 1.42 for honey)
  pieceWeightGrams?: number; // Weight in grams per unit (for count <-> mass conversion)
  piecesPerBox?: number; // Pieces in 1 box/carton (for count <-> packaging)
  packWeightKg?: number; // Weight in kg per bag/box (e.g., 25 kg per flour bag)
  rawMaterialName?: string;
  rawMaterialCategory?: string;
}

export interface ConversionResult {
  sourceQuantity: number;
  sourceUnit: string;
  targetQuantity: number;
  targetUnit: string;
  factor: number;
  isExact: boolean;
  notes?: string;
  formulaDescription: string;
}

export interface RequisitionUnitMatch {
  requestedQuantity: number;
  requestedUnit: string;
  inventoryBaseQuantity: number;
  inventoryBaseUnit: string;
  conversionRatio: number;
  isCompatible: boolean;
  unitCostInRequestedUnit: number;
  totalCost: number;
  statusText: string;
  conversionExplanation: string;
}

/**
 * Standard Unit Definitions
 */
export const STANDARD_UNITS: Record<string, UnitDefinition> = {
  // MASS (Base: kg)
  kg: { code: 'kg', nameKey: 'units.kilogram', category: 'MASS', factorToBase: 1, symbol: 'kg', isBaseUnit: true },
  g: { code: 'g', nameKey: 'units.gram', category: 'MASS', factorToBase: 0.001, symbol: 'g' },
  mg: { code: 'mg', nameKey: 'units.milligram', category: 'MASS', factorToBase: 0.000001, symbol: 'mg' },
  t: { code: 't', nameKey: 'units.metricTon', category: 'MASS', factorToBase: 1000, symbol: 't' },
  lb: { code: 'lb', nameKey: 'units.pound', category: 'MASS', factorToBase: 0.45359237, symbol: 'lb' },
  oz: { code: 'oz', nameKey: 'units.ounce', category: 'MASS', factorToBase: 0.02834952, symbol: 'oz' },

  // VOLUME (Base: L)
  L: { code: 'L', nameKey: 'units.liter', category: 'VOLUME', factorToBase: 1, symbol: 'L', isBaseUnit: true },
  dL: { code: 'dL', nameKey: 'units.deciliter', category: 'VOLUME', factorToBase: 0.1, symbol: 'dL' },
  cL: { code: 'cL', nameKey: 'units.centiliter', category: 'VOLUME', factorToBase: 0.01, symbol: 'cL' },
  mL: { code: 'mL', nameKey: 'units.milliliter', category: 'VOLUME', factorToBase: 0.001, symbol: 'mL' },

  // COUNT / PACKAGING (Base: units)
  units: { code: 'units', nameKey: 'units.pieces', category: 'COUNT', factorToBase: 1, symbol: 'pcs', isBaseUnit: true },
  doz: { code: 'doz', nameKey: 'units.dozen', category: 'COUNT', factorToBase: 12, symbol: 'dz' },
  trays: { code: 'trays', nameKey: 'units.trayEggs', category: 'COUNT', factorToBase: 30, symbol: 'plaq' },
  bags: { code: 'bags', nameKey: 'units.bagSack', category: 'COUNT', factorToBase: 1, symbol: 'sac' },
  boxes: { code: 'boxes', nameKey: 'units.boxCarton', category: 'COUNT', factorToBase: 1, symbol: 'ctn' },
  packs: { code: 'packs', nameKey: 'units.packet', category: 'COUNT', factorToBase: 1, symbol: 'pqt' },
  portions: { code: 'portions', nameKey: 'units.portion', category: 'COUNT', factorToBase: 1, symbol: 'port' },
};

/**
 * Common Pastry & Bakery Ingredient Densities (kg per Liter / g per mL)
 */
export const INGREDIENT_DENSITIES: Record<string, number> = {
  water: 1.0,
  eau: 1.0,
  milk: 1.03,
  lait: 1.03,
  'lait entier': 1.03,
  'lait demi-écrémé': 1.03,
  'cream 35%': 0.99,
  'crème liquide': 0.99,
  'crème fleurette': 0.99,
  'crème fraîche': 0.98,
  'vegetable oil': 0.92,
  'huile de tournesol': 0.92,
  'huile végétale': 0.92,
  'huile': 0.92,
  'olive oil': 0.915,
  'huile d\'olive': 0.915,
  honey: 1.42,
  miel: 1.42,
  'sirop de glucose': 1.40,
  glucose: 1.40,
  'sirop d\'érable': 1.33,
  'egg whites': 1.03,
  'blancs d\'oeufs': 1.03,
  'egg yolks': 1.02,
  'jaunes d\'oeufs': 1.02,
  'liquid eggs': 1.03,
  'oeufs entiers liquides': 1.03,
  'melted butter': 0.91,
  'beurre fondu': 0.91,
  'melted chocolate': 1.30,
  'chocolat fondu': 1.30,
  'sucre semoule': 0.85,
  'sucre': 0.85,
  'sucre glace': 0.60,
  'farine t55': 0.55,
  'farine t45': 0.55,
  'farine': 0.55,
  'cacao en poudre': 0.52,
};

/**
 * Standard Bakery Packaging Defaults (e.g. 1 sac de farine = 25 kg)
 */
export const STANDARD_PACKAGING_DEFAULTS: Array<{
  keywords: string[];
  unit: 'bags' | 'boxes' | 'packs' | 'trays';
  weightKg?: number;
  volumeL?: number;
  piecesCount?: number;
  description: string;
}> = [
  {
    keywords: ['farine', 'flour', 'semoule', 'semolina'],
    unit: 'bags',
    weightKg: 25,
    description: '1 Sac Standard de Farine / Semoule = 25 kg',
  },
  {
    keywords: ['sucre', 'sugar'],
    unit: 'bags',
    weightKg: 25,
    description: '1 Sac Standard de Sucre = 25 kg',
  },
  {
    keywords: ['beurre', 'butter', 'margarine', 'tourage'],
    unit: 'boxes',
    weightKg: 10,
    description: '1 Carton de Beurre / Margarine = 10 kg',
  },
  {
    keywords: ['chocolat', 'chocolate', 'cacao', 'couverture'],
    unit: 'boxes',
    weightKg: 5,
    description: '1 Carton de Pépites / Couverture Chocolat = 5 kg',
  },
  {
    keywords: ['levure', 'yeast'],
    unit: 'packs',
    weightKg: 0.5, // 500g
    description: '1 Paquet de Levure Fraîche / Sèche = 500 g (0.5 kg)',
  },
  {
    keywords: ['oeuf', 'egg', 'oeufs'],
    unit: 'trays',
    piecesCount: 30,
    description: '1 Plaque d\'Œufs = 30 unités (Pièces)',
  },
  {
    keywords: ['boîte', 'carton', 'gobelet', 'emballage', 'packaging', 'sachet', 'sac'],
    unit: 'boxes',
    piecesCount: 500,
    description: '1 Carton d\'Emballage = 500 pièces',
  },
];

/**
 * Normalize input unit aliases to standard system unit code
 */
export function normalizeUnitString(rawInput?: string | null): string {
  if (!rawInput) return 'kg';
  const clean = rawInput.trim().toLowerCase();

  // Mass aliases
  if (['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilogramme', 'kilogrammes', 'كغ', 'كلغ', 'كيلوغرام'].includes(clean)) {
    return 'kg';
  }
  if (['g', 'gr', 'grs', 'gram', 'grams', 'gramme', 'grammes', 'غ', 'غم', 'غرام'].includes(clean)) {
    return 'g';
  }
  if (['mg', 'milligram', 'milligramme', 'ملغ', 'مليغرام'].includes(clean)) {
    return 'mg';
  }
  if (['t', 'tonne', 'tonnes', 'ton', 'tons', 'ط', 'طن'].includes(clean)) {
    return 't';
  }
  if (['lb', 'lbs', 'pound', 'pounds', 'livre', 'livres'].includes(clean)) {
    return 'lb';
  }
  if (['oz', 'ounce', 'ounces', 'once', 'onces', 'أونصة'].includes(clean)) {
    return 'oz';
  }

  // Volume aliases
  if (['l', 'liter', 'liters', 'litre', 'litres', 'ل', 'لتر', 'ليتر'].includes(clean)) {
    return 'L';
  }
  if (['ml', 'mls', 'milliliter', 'millilitre', 'millilitres', 'مل', 'ملل', 'مليلتر'].includes(clean)) {
    return 'mL';
  }
  if (['cl', 'centiliter', 'centilitre', 'centilitres', 'سل', 'سنتيلتر'].includes(clean)) {
    return 'cL';
  }
  if (['dl', 'deciliter', 'decilitre', 'decilitres', 'دل', 'ديسيلتر'].includes(clean)) {
    return 'dL';
  }

  // Count & Packaging aliases
  if (['units', 'unit', 'u', 'pcs', 'pc', 'piece', 'pieces', 'pièce', 'pièces', 'unite', 'unites', 'unité', 'unités', 'حبة', 'قطعة', 'قطع', 'وحدة', 'وحدات'].includes(clean)) {
    return 'units';
  }
  if (['doz', 'dozen', 'dozens', 'douzaine', 'douzaines', 'درزن', 'دستة'].includes(clean)) {
    return 'doz';
  }
  if (['trays', 'tray', 'plaque', 'plaques', 'plateau', 'plateaux', 'طبق', 'طابق'].includes(clean)) {
    return 'trays';
  }
  if (['bags', 'bag', 'sac', 'sacs', 'sachet', 'sachets', 'كيس', 'أكياس'].includes(clean)) {
    return 'bags';
  }
  if (['boxes', 'box', 'boite', 'boites', 'boîte', 'boîtes', 'carton', 'cartons', 'علبة', 'علب', 'صندوق', 'كرتون'].includes(clean)) {
    return 'boxes';
  }
  if (['packs', 'pack', 'paquet', 'paquets', 'packet', 'packets', 'باقة', 'باكيت', 'رزمة'].includes(clean)) {
    return 'packs';
  }
  if (['portions', 'portion', 'part', 'parts', 'حصص', 'حصة'].includes(clean)) {
    return 'portions';
  }

  return rawInput;
}

/**
 * Determine the category of a unit code
 */
export function getUnitCategory(unitStr: string): UnitCategory {
  const norm = normalizeUnitString(unitStr);
  const def = STANDARD_UNITS[norm];
  if (def) return def.category;
  return 'UNKNOWN';
}

/**
 * Check if two units are directly compatible without density or packaging specs
 */
export function areUnitsDirectlyCompatible(unitA: string, unitB: string): boolean {
  const catA = getUnitCategory(unitA);
  const catB = getUnitCategory(unitB);
  if (catA === 'UNKNOWN' || catB === 'UNKNOWN') return false;
  return catA === catB;
}

/**
 * Lookup estimated density for a material name or category
 */
export function getIngredientDensity(materialNameOrCategory?: string): number | null {
  if (!materialNameOrCategory) return null;
  const nameLower = materialNameOrCategory.toLowerCase().trim();

  for (const [key, density] of Object.entries(INGREDIENT_DENSITIES)) {
    if (nameLower.includes(key)) {
      return density;
    }
  }

  // General heuristic defaults
  if (nameLower.includes('lait') || nameLower.includes('milk') || nameLower.includes('crème')) return 1.02;
  if (nameLower.includes('huile') || nameLower.includes('oil')) return 0.92;
  if (nameLower.includes('sirop') || nameLower.includes('miel') || nameLower.includes('honey')) return 1.40;
  if (nameLower.includes('farine') || nameLower.includes('flour')) return 0.55;
  if (nameLower.includes('sucre') || nameLower.includes('sugar')) return 0.85;

  return null;
}

/**
 * Lookup standard packaging weight or piece count for a raw material
 */
export function getStandardPackagingSpec(
  materialNameOrCategory: string,
  packUnit: string
): { weightKg?: number; piecesCount?: number; description: string } | null {
  const nameLower = materialNameOrCategory.toLowerCase().trim();
  const normUnit = normalizeUnitString(packUnit);

  for (const preset of STANDARD_PACKAGING_DEFAULTS) {
    if (preset.unit === normUnit) {
      const match = preset.keywords.some((kw) => nameLower.includes(kw));
      if (match) {
        return {
          weightKg: preset.weightKg,
          piecesCount: preset.piecesCount,
          description: preset.description,
        };
      }
    }
  }

  // Fallback defaults
  if (normUnit === 'bags') return { weightKg: 25, description: '1 Sac = 25 kg (Standard)' };
  if (normUnit === 'boxes') return { weightKg: 10, piecesCount: 100, description: '1 Carton = 10 kg / 100 pcs (Standard)' };
  if (normUnit === 'packs') return { weightKg: 0.5, description: '1 Paquet = 0.5 kg (500g)' };
  if (normUnit === 'trays') return { piecesCount: 30, description: '1 Plaque = 30 pièces' };

  return null;
}

/**
 * Core Universal Unit Converter
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  options?: UnitConversionOptions
): ConversionResult {
  const normFrom = normalizeUnitString(fromUnit);
  const normTo = normalizeUnitString(toUnit);

  // Identity conversion
  if (normFrom === normTo) {
    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: quantity,
      targetUnit: normTo,
      factor: 1,
      isExact: true,
      formulaDescription: `${quantity} ${normFrom} = ${quantity} ${normTo}`,
    };
  }

  const defFrom = STANDARD_UNITS[normFrom];
  const defTo = STANDARD_UNITS[normTo];

  // If both are standard units in the same category (e.g. g -> kg, L -> mL, etc.)
  if (defFrom && defTo && defFrom.category === defTo.category && defFrom.category !== 'COUNT') {
    const qtyInBase = quantity * defFrom.factorToBase;
    const targetQty = qtyInBase / defTo.factorToBase;
    const factor = defFrom.factorToBase / defTo.factorToBase;

    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: targetQty,
      targetUnit: normTo,
      factor,
      isExact: true,
      formulaDescription: `${quantity} ${normFrom} × ${factor} = ${targetQty.toFixed(4).replace(/\.?0+$/, '')} ${normTo}`,
    };
  }

  // Cross-category conversion: MASS <-> VOLUME (Requires density)
  const isMassToVolume = defFrom?.category === 'MASS' && defTo?.category === 'VOLUME';
  const isVolumeToMass = defFrom?.category === 'VOLUME' && defTo?.category === 'MASS';

  if (isMassToVolume || isVolumeToMass) {
    const density = options?.density || getIngredientDensity(options?.rawMaterialName || options?.rawMaterialCategory) || 1.0; // Default 1.0 kg/L (water)

    if (isMassToVolume) {
      // 1. Convert source mass to kg
      const massInKg = quantity * (defFrom?.factorToBase || 1);
      // 2. Volume in Liters = Mass (kg) / Density (kg/L)
      const volumeInL = massInKg / density;
      // 3. Convert Liters to target volume unit
      const targetQty = volumeInL / (defTo?.factorToBase || 1);
      const factor = (defFrom?.factorToBase || 1) / (density * (defTo?.factorToBase || 1));

      return {
        sourceQuantity: quantity,
        sourceUnit: normFrom,
        targetQuantity: targetQty,
        targetUnit: normTo,
        factor,
        isExact: density === 1.0,
        notes: `Densité appliquée : ${density.toFixed(2)} kg/L (${options?.rawMaterialName || 'Ingrédient'})`,
        formulaDescription: `(${quantity} ${normFrom} × ${defFrom?.factorToBase} kg) / (${density} kg/L) = ${targetQty.toFixed(4).replace(/\.?0+$/, '')} ${normTo}`,
      };
    } else {
      // Volume to Mass
      // 1. Convert source volume to Liters
      const volumeInL = quantity * (defFrom?.factorToBase || 1);
      // 2. Mass in kg = Volume (L) * Density (kg/L)
      const massInKg = volumeInL * density;
      // 3. Convert kg to target mass unit
      const targetQty = massInKg / (defTo?.factorToBase || 1);
      const factor = ((defFrom?.factorToBase || 1) * density) / (defTo?.factorToBase || 1);

      return {
        sourceQuantity: quantity,
        sourceUnit: normFrom,
        targetQuantity: targetQty,
        targetUnit: normTo,
        factor,
        isExact: density === 1.0,
        notes: `Densité appliquée : ${density.toFixed(2)} kg/L (${options?.rawMaterialName || 'Ingrédient'})`,
        formulaDescription: `(${quantity} ${normFrom} × ${defFrom?.factorToBase} L) × (${density} kg/L) = ${targetQty.toFixed(4).replace(/\.?0+$/, '')} ${normTo}`,
      };
    }
  }

  // Count/Packaging conversions (e.g. bags -> kg, boxes -> units, trays -> units)
  const spec = options?.packWeightKg
    ? { weightKg: options.packWeightKg, description: `Spécification personnalisée: ${options.packWeightKg} kg` }
    : getStandardPackagingSpec(options?.rawMaterialName || options?.rawMaterialCategory || '', normFrom === 'units' || normFrom === 'doz' || normFrom === 'trays' ? normTo : normFrom);

  // Bag/Box/Pack to Mass (kg, g, etc.)
  if ((['bags', 'boxes', 'packs'].includes(normFrom)) && defTo?.category === 'MASS') {
    const packWeight = options?.packWeightKg || spec?.weightKg || 25; // Default 25kg
    const totalKg = quantity * packWeight;
    const targetQty = totalKg / defTo.factorToBase;
    const factor = packWeight / defTo.factorToBase;

    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: targetQty,
      targetUnit: normTo,
      factor,
      isExact: true,
      notes: spec?.description || `Conditionnement : ${packWeight} kg par ${normFrom}`,
      formulaDescription: `${quantity} ${normFrom} × ${packWeight} kg = ${targetQty.toFixed(4).replace(/\.?0+$/, '')} ${normTo}`,
    };
  }

  // Mass (kg, g) to Bag/Box/Pack
  if (defFrom?.category === 'MASS' && (['bags', 'boxes', 'packs'].includes(normTo))) {
    const packWeight = options?.packWeightKg || spec?.weightKg || 25;
    const massInKg = quantity * defFrom.factorToBase;
    const targetQty = massInKg / packWeight;
    const factor = defFrom.factorToBase / packWeight;

    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: targetQty,
      targetUnit: normTo,
      factor,
      isExact: true,
      notes: spec?.description || `Conditionnement : ${packWeight} kg par ${normTo}`,
      formulaDescription: `${quantity} ${normFrom} / ${packWeight} kg = ${targetQty.toFixed(3)} ${normTo}`,
    };
  }

  // Trays / Dozen to Units
  if (normFrom === 'trays' && normTo === 'units') {
    const count = quantity * 30;
    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: count,
      targetUnit: normTo,
      factor: 30,
      isExact: true,
      formulaDescription: `${quantity} plateaux × 30 = ${count} unités`,
    };
  }
  if (normFrom === 'units' && normTo === 'trays') {
    const count = quantity / 30;
    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: count,
      targetUnit: normTo,
      factor: 1 / 30,
      isExact: true,
      formulaDescription: `${quantity} unités / 30 = ${count.toFixed(2)} plateaux`,
    };
  }

  if (normFrom === 'doz' && normTo === 'units') {
    const count = quantity * 12;
    return {
      sourceQuantity: quantity,
      sourceUnit: normFrom,
      targetQuantity: count,
      targetUnit: normTo,
      factor: 12,
      isExact: true,
      formulaDescription: `${quantity} douzaines × 12 = ${count} unités`,
    };
  }

  // Fallback 1:1 if unknown
  return {
    sourceQuantity: quantity,
    sourceUnit: normFrom,
    targetQuantity: quantity,
    targetUnit: normTo,
    factor: 1,
    isExact: false,
    notes: 'Conversion directe sans ratio spécifique (1:1 fallback).',
    formulaDescription: `${quantity} ${normFrom} ≈ ${quantity} ${normTo}`,
  };
}

/**
 * Convert Unit Price based on Unit Conversion
 * E.g., Flour is 120 DZD/kg -> what is the cost per gram? 0.12 DZD/g
 * E.g., Butter is 1200 DZD/kg -> what is the cost for a 10kg box? 12,000 DZD/box
 */
export function convertCost(
  costPerFromUnit: number,
  fromUnit: string,
  toUnit: string,
  options?: UnitConversionOptions
): number {
  if (costPerFromUnit <= 0) return 0;
  // 1 unit of toUnit corresponds to how many of fromUnit?
  const conversion = convertQuantity(1, toUnit, fromUnit, options);
  return Number((costPerFromUnit * conversion.targetQuantity).toFixed(4));
}

/**
 * Store Requisitions & Inventory Reconciler
 * Computes exact inventory deduction and ensures stores can requisition in grams or pieces
 * while Central Lab inventory is tracked in kilograms, boxes, or liters.
 */
export function reconcileStoreRequisitionUnits(item: {
  quantityRequested: number;
  requestedUnit: string;
  rawMaterial?: RawMaterial | null;
  unitEstimatedCost?: number;
}): RequisitionUnitMatch {
  const reqUnit = normalizeUnitString(item.requestedUnit);
  const invUnit = item.rawMaterial ? normalizeUnitString(item.rawMaterial.unit) : reqUnit;
  const baseCost = item.rawMaterial ? item.rawMaterial.currentAvgCost : (item.unitEstimatedCost || 0);

  const conversion = convertQuantity(item.quantityRequested, reqUnit, invUnit, {
    rawMaterialName: item.rawMaterial?.name,
    rawMaterialCategory: item.rawMaterial?.category,
  });

  const isCompatible = areUnitsDirectlyCompatible(reqUnit, invUnit) || conversion.factor !== 1 || reqUnit === invUnit;
  const unitCostInReqUnit = convertCost(baseCost, invUnit, reqUnit, {
    rawMaterialName: item.rawMaterial?.name,
    rawMaterialCategory: item.rawMaterial?.category,
  });

  const totalCost = Number((item.quantityRequested * unitCostInReqUnit).toFixed(2));

  let statusText = 'Parfaitement calibré';
  let explanation = `${item.quantityRequested} ${reqUnit} = ${conversion.targetQuantity.toFixed(3)} ${invUnit} en stock labo.`;

  if (reqUnit !== invUnit) {
    explanation = `${item.quantityRequested} ${reqUnit} sera automatiquement déduit comme ${conversion.targetQuantity.toFixed(3)} ${invUnit} dans le stock central.`;
  }

  return {
    requestedQuantity: item.quantityRequested,
    requestedUnit: reqUnit,
    inventoryBaseQuantity: Number(conversion.targetQuantity.toFixed(4)),
    inventoryBaseUnit: invUnit,
    conversionRatio: conversion.factor,
    isCompatible,
    unitCostInRequestedUnit: unitCostInReqUnit,
    totalCost,
    statusText,
    conversionExplanation: explanation,
  };
}

/**
 * Intelligent Auto-Scaling Formatter for Clean Display
 * (e.g. 0.05 kg -> "50 g", 1500 g -> "1.5 kg", 0.25 L -> "250 mL", 2500 mL -> "2.5 L")
 */
export function formatSmartUnit(
  quantity: number,
  unitStr: string,
  options?: { lang?: string; precision?: number }
): string {
  const norm = normalizeUnitString(unitStr);
  const precision = options?.precision ?? 2;

  if (norm === 'kg') {
    if (quantity > 0 && quantity < 0.1) {
      const g = quantity * 1000;
      return `${g.toFixed(0)} g`;
    }
    if (quantity >= 1000) {
      const t = quantity / 1000;
      return `${t.toFixed(precision)} t`;
    }
    return `${quantity.toFixed(precision).replace(/\.?0+$/, '')} kg`;
  }

  if (norm === 'g') {
    if (quantity >= 1000) {
      const kg = quantity / 1000;
      return `${kg.toFixed(precision).replace(/\.?0+$/, '')} kg`;
    }
    if (quantity > 0 && quantity < 0.01) {
      const mg = quantity * 1000;
      return `${mg.toFixed(0)} mg`;
    }
    return `${quantity.toFixed(precision).replace(/\.?0+$/, '')} g`;
  }

  if (norm === 'L') {
    if (quantity > 0 && quantity < 0.1) {
      const ml = quantity * 1000;
      return `${ml.toFixed(0)} mL`;
    }
    return `${quantity.toFixed(precision).replace(/\.?0+$/, '')} L`;
  }

  if (norm === 'mL') {
    if (quantity >= 1000) {
      const l = quantity / 1000;
      return `${l.toFixed(precision).replace(/\.?0+$/, '')} L`;
    }
    return `${quantity.toFixed(precision).replace(/\.?0+$/, '')} mL`;
  }

  return `${quantity.toFixed(precision).replace(/\.?0+$/, '')} ${norm}`;
}

/**
 * Get all available units compatible with a given unit
 */
export function getCompatibleUnits(unitStr: string): Array<{ unit: string; labelKey: string; symbol: string; category: UnitCategory }> {
  const norm = normalizeUnitString(unitStr);
  const cat = getUnitCategory(norm);

  const list: Array<{ unit: string; labelKey: string; symbol: string; category: UnitCategory }> = [];

  for (const [code, def] of Object.entries(STANDARD_UNITS)) {
    // If same category or count/packaging, include
    if (cat === 'UNKNOWN' || def.category === cat || (cat === 'MASS' && ['bags', 'boxes', 'packs'].includes(code)) || (cat === 'VOLUME' && ['L', 'dL', 'cL', 'mL'].includes(code))) {
      list.push({
        unit: code,
        labelKey: def.nameKey,
        symbol: def.symbol,
        category: def.category,
      });
    }
  }

  return list;
}
