import { ProductionRoomId } from '../types';

export interface PastryCategoryDefinition {
  id: string;
  categoryName: string;
  nameFr: string;
  nameAr: string;
  roomId: ProductionRoomId;
  iconName: string;
  descriptionFr: string;
  descriptionAr: string;
  color: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * The 7 canonical pastry categories for Central Lab Production & Dispatching.
 * Every recipe created in "Fiche de Production" must be mapped to one of these 7 categories.
 */
export const PASTRY_CATEGORIES: PastryCategoryDefinition[] = [
  {
    id: 'viennoiserie',
    categoryName: 'Viennoiserie & Brioche',
    nameFr: 'Viennoiserie & Brioche',
    nameAr: 'كرواسون وفطائر بريوش',
    roomId: 'viennoiserie',
    iconName: 'Flame',
    descriptionFr: 'Croissants pur beurre AOP, pains au chocolat, brioches feuilletées, pains suisses.',
    descriptionAr: 'كرواسون زبدة، خبز شوكولاتة، بريوش مورق ومخبوزات فرنسية.',
    color: '#ca8a04',
    badgeBg: 'bg-yellow-500/20',
    badgeText: 'text-yellow-400',
  },
  {
    id: 'gateaux_secs',
    categoryName: 'Gâteaux Secs',
    nameFr: 'Gâteaux Secs',
    nameAr: 'حلويات جافة وبسكويت',
    roomId: 'gateaux_secs',
    iconName: 'Cookie',
    descriptionFr: 'Sablés confiture, croquets aux amandes, cookies artisanaux, petits fours secs.',
    descriptionAr: 'صابلي بالمربى، كروكي باللوز والسمسم، كوكيز وبسكويت جاف.',
    color: '#d97706',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
  },
  {
    id: 'gateaux_orientaux',
    categoryName: 'Gâteaux Orientaux',
    nameFr: 'Gâteaux Orientaux',
    nameAr: 'حلويات تقليدية وشرقية',
    roomId: 'gateaux_orientaux',
    iconName: 'Crown',
    descriptionFr: 'Baklawa royale, Makroud el louz, Dziriette, Tcharek, Cornes de gazelle, M’chewek.',
    descriptionAr: 'بقلاوة ملكية، مقروط اللوز، دزيريات، تشارك وقرن الغزال.',
    color: '#059669',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
  },
  {
    id: 'feuilletage',
    categoryName: 'Feuilletage & Mille-Feuille',
    nameFr: 'Feuilletage & Mille-Feuille',
    nameAr: 'ميل فوي وعجائن مورقة',
    roomId: 'feuilletage',
    iconName: 'Layers',
    descriptionFr: 'Mille-feuilles traditionnels vanille Bourbon, mille-feuilles praliné, chaussons et palmiers.',
    descriptionAr: 'ميل فوي الفانيليا والبراليني، شوسون وبالمي مكرمل.',
    color: '#ea580c',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
  },
  {
    id: 'patisserie_fine',
    categoryName: 'Pâtisseries Fines',
    nameFr: 'Pâtisseries Fines',
    nameAr: 'حلويات راقية وفاخرة',
    roomId: 'patisserie_fine',
    iconName: 'Sparkles',
    descriptionFr: 'Éclairs, tartes fruits frais, Paris-Brest, Opéra, entremets individuels.',
    descriptionAr: 'إكلير، تارت الفواكه، باريس بريست، أوبرا وكعكات فاخرة.',
    color: '#9333ea',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-400',
  },
  {
    id: 'piece_montee',
    categoryName: 'Pièces Montées',
    nameFr: 'Pièces Montées',
    nameAr: 'كعكات المناسبات والأعراس',
    roomId: 'piece_montee',
    iconName: 'Award',
    descriptionFr: 'Pyramides de choux nougatine, Wedding cakes prestige, Number cakes.',
    descriptionAr: 'هياكل شوكولاتة ونوغاتين، كعكات أعراس ملكية متعددة الطوابق.',
    color: '#e11d48',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
  },
  {
    id: 'trompe_oeil',
    categoryName: "Trompe-l'œil",
    nameFr: "Trompe-l'œil",
    nameAr: 'حلويات الخداع البصري',
    roomId: 'trompe_oeil',
    iconName: 'Eye',
    descriptionFr: 'Sculptures fruits illusion: Citron cédrat, Noisette cœur coulant, Mangue passion.',
    descriptionAr: 'فواكه الخداع البصري: ليمون، بندق براليني ومانجو.',
    color: '#0891b2',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-400',
  },
];

/**
 * Direct category string to ProductionRoomId mapping table
 */
export const CATEGORY_TO_ROOM_MAP: Record<string, ProductionRoomId> = {
  // Category 1: Viennoiserie & Brioche
  'viennoiserie & brioche': 'viennoiserie',
  'viennoiserie': 'viennoiserie',
  'viennoiseries': 'viennoiserie',
  'brioche': 'viennoiserie',
  'croissants & pastries': 'viennoiserie',
  'bread & savory': 'viennoiserie',

  // Category 2: Gâteaux Secs
  'gâteaux secs': 'gateaux_secs',
  'gateaux secs': 'gateaux_secs',
  'gateaux-secs': 'gateaux_secs',
  'sablés': 'gateaux_secs',
  'sables': 'gateaux_secs',
  'biscuits': 'gateaux_secs',

  // Category 3: Gâteaux Orientaux
  'gâteaux orientaux': 'gateaux_orientaux',
  'gateaux orientaux': 'gateaux_orientaux',
  'gateaux-orientaux': 'gateaux_orientaux',
  'oriental': 'gateaux_orientaux',
  'traditionnel': 'gateaux_orientaux',

  // Category 4: Feuilletage & Mille-Feuille
  'feuilletage & mille-feuille': 'feuilletage',
  'feuilletage': 'feuilletage',
  'mille-feuille': 'feuilletage',
  'mille feuille': 'feuilletage',
  'millefeuille': 'feuilletage',

  // Category 5: Pâtisseries Fines
  'pâtisseries fines': 'patisserie_fine',
  'patisseries fines': 'patisserie_fine',
  'patisserie fine': 'patisserie_fine',
  'pâtisserie': 'patisserie_fine',
  'patisserie': 'patisserie_fine',
  'cakes & tortes': 'patisserie_fine',
  'tart shells & bases': 'patisserie_fine',
  'finished desserts': 'patisserie_fine',

  // Category 6: Pièces Montées
  'pièces montées': 'piece_montee',
  'pieces montees': 'piece_montee',
  'pièce montée': 'piece_montee',
  'piece montee': 'piece_montee',
  'wedding cakes': 'piece_montee',

  // Category 7: Trompe-l'œil
  "trompe-l'œil": 'trompe_oeil',
  "trompe-l'oeil": 'trompe_oeil',
  "trompe l'oeil": 'trompe_oeil',
  'trompe-oeil': 'trompe_oeil',
  'trompe oeil': 'trompe_oeil',
};

/**
 * Safe resolver to map any category name to its designated laboratory room.
 * Defaults gracefully to 'patisserie_fine'.
 */
export function getRoomIdFromCategory(category?: string): ProductionRoomId {
  if (!category) return 'patisserie_fine';
  const clean = category.toLowerCase().trim();

  // Direct map lookup
  if (CATEGORY_TO_ROOM_MAP[clean]) {
    return CATEGORY_TO_ROOM_MAP[clean];
  }

  // Partial match lookups
  if (clean.includes('trompe') || clean.includes('illusion')) return 'trompe_oeil';
  if (clean.includes('montée') || clean.includes('montee') || clean.includes('wedding')) return 'piece_montee';
  if (clean.includes('oriental') || clean.includes('baklawa') || clean.includes('makroud')) return 'gateaux_orientaux';
  if (clean.includes('feuillet') || clean.includes('mille-feuille') || clean.includes('mille feuille') || clean.includes('millefeuille')) return 'feuilletage';
  if (clean.includes('viennois') || clean.includes('croissant') || clean.includes('brioche')) return 'viennoiserie';
  if (clean.includes('sec') || clean.includes('sablé') || clean.includes('sable') || clean.includes('biscuit') || clean.includes('croquet')) return 'gateaux_secs';
  if (clean.includes('fine') || clean.includes('éclair') || clean.includes('tarte') || clean.includes('entremet')) return 'patisserie_fine';

  return 'patisserie_fine';
}

/**
 * Normalizes any room ID (including legacy 'mille_feuille')
 */
export function normalizeRoomId(roomId?: string): ProductionRoomId {
  if (!roomId) return 'patisserie_fine';
  if (roomId === 'mille_feuille') return 'feuilletage';
  const validIds: ProductionRoomId[] = [
    'viennoiserie',
    'gateaux_secs',
    'gateaux_orientaux',
    'feuilletage',
    'patisserie_fine',
    'piece_montee',
    'trompe_oeil',
  ];
  return validIds.includes(roomId as ProductionRoomId) ? (roomId as ProductionRoomId) : 'patisserie_fine';
}
