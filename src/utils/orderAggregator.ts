import {
  ProductionRoomId,
  Product,
  StoreOrder,
  Requisition,
  RequisitionItem,
  StoreOrderItem,
  RoomProductionReport,
  AggregatedProductionItem,
  StoreQuantityBreakdown,
} from '../types';
import {
  PASTRY_CATEGORIES,
  getRoomIdFromCategory,
  normalizeRoomId,
} from '../constants/categories';
import { db, DexieProduct, DexieRawMaterial } from '../db/database';
import { getRawMaterials, getRetailProducts } from '../services/storage';
import { INITIAL_RAW_MATERIALS } from '../data/mockData';

export interface RoomMetadata {
  id: ProductionRoomId;
  nameKey: string;
  nameFr: string;
  nameAr: string;
  categoryFr: string;
  categoryAr: string;
  descriptionFr: string;
  descriptionAr: string;
  iconName: string;
  theme: {
    primary: string;
    accent: string;
    bgLight: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    headerBg: string;
    gradient: string;
    accentGlow: string;
    borderActive: string;
  };
}

/**
 * The 7 Specialized Laboratory Workstations (Production Rooms)
 * Aligned with the 7 pastry categories.
 */
export const PRODUCTION_ROOMS: RoomMetadata[] = [
  // Room 1: Viennoiserie & Brioche
  {
    id: 'viennoiserie',
    nameKey: 'rooms.viennoiserie',
    nameFr: 'Viennoiserie & Brioche',
    nameAr: 'كرواسون وفطائر بريوش',
    categoryFr: 'Pâte Levée Feuilletée & Tourage',
    categoryAr: 'عجينة مورقة مخمرة وبريوش طازج',
    descriptionFr: 'Croissants pur beurre AOP, Pains au chocolat Valrhona, Croissants amandes, Brioches tressées et Suisses.',
    descriptionAr: 'كرواسون زبدة ممتازة، خبز الشوكولاتة فالرونا، بريوش مضفور ومخبوزات فرنسية طازجة.',
    iconName: 'Flame',
    theme: {
      primary: 'yellow',
      accent: '#ca8a04',
      bgLight: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      headerBg: 'bg-gradient-to-r from-yellow-950/50 via-yellow-900/30 to-zinc-900',
      gradient: 'from-yellow-600 to-amber-500',
      accentGlow: 'shadow-yellow-500/10',
      borderActive: 'border-yellow-500',
    },
  },

  // Room 2: Gâteaux Secs
  {
    id: 'gateaux_secs',
    nameKey: 'rooms.gateauxSecs',
    nameFr: 'Gâteaux Secs',
    nameAr: 'حلويات جافة وبسكويت',
    categoryFr: 'Biscuiterie & Sablés',
    categoryAr: 'بسكويت وصابلي تقليدي',
    descriptionFr: 'Sablés confiture, croquets aux amandes, cookies artisanaux, petits fours secs et galettes.',
    descriptionAr: 'صابلي بالمربى، كروكي باللوز والسمسم، كوكيز حرفي وحلويات جافة للشاي والقهوة.',
    iconName: 'Cookie',
    theme: {
      primary: 'amber',
      accent: '#d97706',
      bgLight: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-400',
      headerBg: 'bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-zinc-900',
      gradient: 'from-amber-600 to-yellow-500',
      accentGlow: 'shadow-amber-500/10',
      borderActive: 'border-amber-500',
    },
  },

  // Room 3: Gâteaux Orientaux
  {
    id: 'gateaux_orientaux',
    nameKey: 'rooms.gateauxOrientaux',
    nameFr: 'Gâteaux Orientaux',
    nameAr: 'حلويات تقليدية وشرقية',
    categoryFr: 'Pâtisserie Traditionnelle & Miel',
    categoryAr: 'حلويات عسل ومكسرات جزائرية',
    descriptionFr: 'Baklawa royale, Makroud el louz, Dziriette, Tcharek, Cornes de gazelle, M’chewek et Knidlettes.',
    descriptionAr: 'بقلاوة ملكية، مقروط اللوز، دزيريات، تشارك العريان والمسكر، قرن الغزال ومشوك بالمكسرات.',
    iconName: 'Crown',
    theme: {
      primary: 'emerald',
      accent: '#059669',
      bgLight: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-400',
      headerBg: 'bg-gradient-to-r from-emerald-950/50 via-emerald-900/30 to-zinc-900',
      gradient: 'from-emerald-600 to-teal-500',
      accentGlow: 'shadow-emerald-500/10',
      borderActive: 'border-emerald-500',
    },
  },

  // Room 4: Feuilletage & Mille-Feuille
  {
    id: 'feuilletage',
    nameKey: 'rooms.milleFeuille',
    nameFr: 'Feuilletage & Mille-Feuille',
    nameAr: 'ميل فوي وعجائن مورقة',
    categoryFr: 'Feuilletage Inversé & Glaçage',
    categoryAr: 'توريق كلاسيكي وفوندان فرنسي',
    descriptionFr: 'Mille-feuilles traditionnels vanille Bourbon, mille-feuilles praliné croustillant, chaussons et palmiers.',
    descriptionAr: 'ميل فوي الفانيليا البوربون، ميل فوي براليني مقرمش، شوسون التفاح وبالمي مكرمل.',
    iconName: 'Layers',
    theme: {
      primary: 'orange',
      accent: '#ea580c',
      bgLight: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      headerBg: 'bg-gradient-to-r from-orange-950/50 via-orange-900/30 to-zinc-900',
      gradient: 'from-orange-600 to-amber-500',
      accentGlow: 'shadow-orange-500/10',
      borderActive: 'border-orange-500',
    },
  },

  // Room 5: Pâtisseries Fines
  {
    id: 'patisserie_fine',
    nameKey: 'rooms.patisserieFine',
    nameFr: 'Pâtisseries Fines',
    nameAr: 'حلويات راقية وفاخرة',
    categoryFr: 'Entremets, Tartes & Éclairs',
    categoryAr: 'إكلير وتارت الفواكه وأنترومي ملكي',
    descriptionFr: 'Éclairs vanille de Madagascar, Tartes framboise amande, Paris-Brest pistache, Opéra et Fraisiers.',
    descriptionAr: 'إكلير فانيليا، تارت توت العليق الطازج، باريس بريست بالفستق، أوبرا وكعكات الشوكولاتة الفاخرة.',
    iconName: 'Sparkles',
    theme: {
      primary: 'purple',
      accent: '#9333ea',
      bgLight: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-400',
      headerBg: 'bg-gradient-to-r from-purple-950/50 via-purple-900/30 to-zinc-900',
      gradient: 'from-purple-600 to-pink-500',
      accentGlow: 'shadow-purple-500/10',
      borderActive: 'border-purple-500',
    },
  },

  // Room 6: Pièces Montées
  {
    id: 'piece_montee',
    nameKey: 'rooms.pieceMontee',
    nameFr: 'Pièces Montées',
    nameAr: 'كعكات المناسبات والأعراس',
    categoryFr: 'Cakes Prestige, Choux Caramel & Mariages',
    categoryAr: 'تورتات زفاف وهياكل الكراميل الملكية',
    descriptionFr: 'Pièces montées pyramide choux nougatine, Wedding cakes sur mesure, Number cakes et créations anniversaires.',
    descriptionAr: 'هياكل شوكولاتة ونوغاتين مكرملة، كيك أعراس فاخر متعدد الطوابق وكيك مناسبات خاصة.',
    iconName: 'Award',
    theme: {
      primary: 'rose',
      accent: '#e11d48',
      bgLight: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-400',
      headerBg: 'bg-gradient-to-r from-rose-950/50 via-rose-900/30 to-zinc-900',
      gradient: 'from-rose-600 to-pink-600',
      accentGlow: 'shadow-rose-500/10',
      borderActive: 'border-rose-500',
    },
  },

  // Room 7: Trompe-l'œil
  {
    id: 'trompe_oeil',
    nameKey: 'rooms.trompeOeil',
    nameFr: "Trompe-l'œil",
    nameAr: 'حلويات الخداع البصري',
    categoryFr: 'Sculptures Fruits & Chocolat Illusion',
    categoryAr: 'فواكه وهمية وشوكولاتة نحت فني',
    descriptionFr: 'Trompe-l’œil Citron Cédrat, Noisette cœur coulant praliné, Mangue passion et Avocat illusion chocolat.',
    descriptionAr: 'ليمون سيترون، بندق بقلب البراليني السائل، مانجو باشون فروت وخداع بصري متقن.',
    iconName: 'Eye',
    theme: {
      primary: 'cyan',
      accent: '#0891b2',
      bgLight: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-400',
      headerBg: 'bg-gradient-to-r from-cyan-950/50 via-cyan-900/30 to-zinc-900',
      gradient: 'from-cyan-600 to-blue-500',
      accentGlow: 'shadow-cyan-500/10',
      borderActive: 'border-cyan-500',
    },
  },
];

/**
 * Standard Catalog with pre-mapped rooms and batch sizes
 */
export const MASTER_PRODUCT_CATALOG: Product[] = [
  // 1. Gâteaux Secs
  {
    id: 'prod-gs-1',
    name: 'Sablé Traditionnel Confiture Fraise / Abricot',
    category: 'Gâteaux Secs',
    roomId: 'gateaux_secs',
    unit: 'pieces',
    unitEstimatedCost: 0.45,
    sellingPrice: 1.50,
    sku: 'SEC-SABLE-01',
    standardBatchSize: 60,
    prepTimeMinutes: 40,
    description: 'Sablé fondant pur beurre fourré à la confiture artisanale.',
  },
  {
    id: 'prod-gs-2',
    name: 'Croquets Croquants aux Amandes & Sésame',
    category: 'Gâteaux Secs',
    roomId: 'gateaux_secs',
    unit: 'pieces',
    unitEstimatedCost: 0.50,
    sellingPrice: 1.60,
    sku: 'SEC-CROQ-02',
    standardBatchSize: 50,
    prepTimeMinutes: 45,
    description: 'Biscottes croquantes traditionnelles algériennes parfumées à l’anis.',
  },
  {
    id: 'prod-gs-3',
    name: 'Cookies Artisanaux Pépites Chocolat Noir 70%',
    category: 'Gâteaux Secs',
    roomId: 'gateaux_secs',
    unit: 'pieces',
    unitEstimatedCost: 0.65,
    sellingPrice: 2.20,
    sku: 'SEC-COOK-03',
    standardBatchSize: 40,
    prepTimeMinutes: 30,
    description: 'Cœur moelleux et pépites fondantes Valrhona.',
  },
  {
    id: 'prod-gs-4',
    name: 'Petits Fours Secs Assortis Prestige',
    category: 'Gâteaux Secs',
    roomId: 'gateaux_secs',
    unit: 'boxes',
    unitEstimatedCost: 4.20,
    sellingPrice: 12.00,
    sku: 'SEC-PF-04',
    standardBatchSize: 15,
    prepTimeMinutes: 60,
    description: 'Assortiment de 12 biscuits sablés et damiers.',
  },

  // 2. Gâteaux Orientaux
  {
    id: 'prod-go-1',
    name: 'Baklawa Royale aux Amandes & Miel Pur',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.20,
    sellingPrice: 3.50,
    sku: 'ORI-BAKL-01',
    standardBatchSize: 48,
    prepTimeMinutes: 90,
    description: 'Feuilles fines étirées main, amandes torréfiées et miel de fleur d’oranger.',
  },
  {
    id: 'prod-go-2',
    name: 'Makroud El Louz au Zeste de Citron',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.10,
    sellingPrice: 3.20,
    sku: 'ORI-MAKR-02',
    standardBatchSize: 50,
    prepTimeMinutes: 60,
    description: 'Pâte d’amandes blanche fondante trempée dans le sirop et sucre glace.',
  },
  {
    id: 'prod-go-3',
    name: 'Tcharek El Ariane aux Amandes Effilées',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 0.95,
    sellingPrice: 2.80,
    sku: 'ORI-TCHA-03',
    standardBatchSize: 45,
    prepTimeMinutes: 70,
    description: 'Croissants orientaux dorés parsemés d’amandes effilées croustillantes.',
  },
  {
    id: 'prod-go-4',
    name: 'M’chewek Croustillant aux Pistaches d’Iran',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.30,
    sellingPrice: 3.60,
    sku: 'ORI-MCHE-04',
    standardBatchSize: 40,
    prepTimeMinutes: 50,
    description: 'Boules d’amandes roulées dans des éclats de pistaches grillées.',
  },

  // 3. Feuilletage & Mille-Feuille
  {
    id: 'prod-mf-1',
    name: 'Mille-Feuille Classique Vanille Bourbon',
    category: 'Feuilletage & Mille-Feuille',
    roomId: 'feuilletage',
    unit: 'pieces',
    unitEstimatedCost: 0.90,
    sellingPrice: 3.00,
    sku: 'MIL-CLAS-01',
    standardBatchSize: 36,
    prepTimeMinutes: 70,
    description: 'Trois couches de feuilletage caramélisé et crème diplomate vanille.',
  },
  {
    id: 'prod-mf-2',
    name: 'Mille-Feuille Praliné Noisette Croustillant',
    category: 'Feuilletage & Mille-Feuille',
    roomId: 'feuilletage',
    unit: 'pieces',
    unitEstimatedCost: 1.25,
    sellingPrice: 3.80,
    sku: 'MIL-PRAL-02',
    standardBatchSize: 30,
    prepTimeMinutes: 80,
    description: 'Feuilletage inversé avec ganache montée praliné noisette Piémont.',
  },
  {
    id: 'prod-mf-3',
    name: 'Mille-Feuille Chocolat Grand Cru Valrhona',
    category: 'Feuilletage & Mille-Feuille',
    roomId: 'feuilletage',
    unit: 'pieces',
    unitEstimatedCost: 1.35,
    sellingPrice: 4.00,
    sku: 'MIL-CHOC-03',
    standardBatchSize: 30,
    prepTimeMinutes: 75,
    description: 'Crème soyeuse chocolat noir Guanaja 70% et glaçage marbré.',
  },
  {
    id: 'prod-mf-4',
    name: 'Palmiers Feuilletés Pur Beurre Caramélisés',
    category: 'Feuilletage & Mille-Feuille',
    roomId: 'feuilletage',
    unit: 'pieces',
    unitEstimatedCost: 0.50,
    sellingPrice: 1.80,
    sku: 'MIL-PALM-04',
    standardBatchSize: 50,
    prepTimeMinutes: 40,
    description: 'Feuilletage replié au sucre roux croustillant.',
  },

  // 4. Viennoiserie & Brioche
  {
    id: 'prod-vn-1',
    name: 'Artisan Butter Croissant (Pur Beurre)',
    category: 'Viennoiserie & Brioche',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 0.95,
    sellingPrice: 2.20,
    sku: 'VIE-CROI-01',
    standardBatchSize: 48,
    prepTimeMinutes: 120,
    description: 'Feuilletage 24 tours au beurre AOP Charentes-Poitou.',
  },
  {
    id: 'prod-vn-2',
    name: 'Valrhona Pain au Chocolat (Chocolatine)',
    category: 'Viennoiserie & Brioche',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.15,
    sellingPrice: 2.50,
    sku: 'VIE-PAIN-02',
    standardBatchSize: 48,
    prepTimeMinutes: 120,
    description: 'Deux bâtons chocolat noir pur beurre de cacao.',
  },
  {
    id: 'prod-vn-3',
    name: 'Pain Suisse Crème Pâtissière & Pépites Chocolat',
    category: 'Viennoiserie & Brioche',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.25,
    sellingPrice: 2.80,
    sku: 'VIE-SUIS-03',
    standardBatchSize: 36,
    prepTimeMinutes: 110,
    description: 'Pâte briochée feuilletée généreusement garnie.',
  },
  {
    id: 'prod-vn-4',
    name: 'Brioche Tressée Pur Beurre à la Fleur d’Oranger',
    category: 'Viennoiserie & Brioche',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 2.20,
    sellingPrice: 5.50,
    sku: 'VIE-BRIO-04',
    standardBatchSize: 20,
    prepTimeMinutes: 150,
    description: 'Mie filante dorée aux perles de sucre croquantes.',
  },

  // 5. Pâtisseries Fines
  {
    id: 'prod-pf-1',
    name: 'Madagascar Vanilla Bean Éclair',
    category: 'Pâtisseries Fines',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 1.60,
    sellingPrice: 3.50,
    sku: 'FIN-ECLA-01',
    standardBatchSize: 32,
    prepTimeMinutes: 60,
    description: 'Pâte à choux croustillante, crème pâtissière grains de vanille Bourbon.',
  },
  {
    id: 'prod-pf-2',
    name: 'Pistachio Paris-Brest Choux Shells',
    category: 'Pâtisseries Fines',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 2.80,
    sellingPrice: 5.50,
    sku: 'FIN-PB-02',
    standardBatchSize: 24,
    prepTimeMinutes: 80,
    description: 'Couronne de choux craquelin, mousseline pistache pure d’Iran.',
  },
  {
    id: 'prod-pf-3',
    name: 'Tartelette Framboise Pérou & Amande Frangipane',
    category: 'Pâtisseries Fines',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 2.20,
    sellingPrice: 4.80,
    sku: 'FIN-TART-03',
    standardBatchSize: 28,
    prepTimeMinutes: 70,
    description: 'Fond sablé croustillant, crème d’amande et framboises fraîches.',
  },
  {
    id: 'prod-pf-4',
    name: 'Opéra Traditionnel Café & Ganache Chocolat Noir',
    category: 'Pâtisseries Fines',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 2.50,
    sellingPrice: 5.00,
    sku: 'FIN-OPER-04',
    standardBatchSize: 24,
    prepTimeMinutes: 90,
    description: 'Biscuit Joconde imbibé de café, crème au beurre café et ganache 70%.',
  },

  // 6. Pièces Montées
  {
    id: 'prod-pm-1',
    name: 'Pièce Montée Pyramide Choux & Nougatine Caramel',
    category: 'Pièces Montées',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 45.00,
    sellingPrice: 120.00,
    sku: 'MON-PYRA-01',
    standardBatchSize: 1,
    prepTimeMinutes: 240,
    description: 'Choux glacés au caramel doré sur socle de nougatine amande.',
  },
  {
    id: 'prod-pm-2',
    name: 'Wedding Cake Prestige 3 Étages Vanille Framboise',
    category: 'Pièces Montées',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 65.00,
    sellingPrice: 180.00,
    sku: 'MON-WEDD-02',
    standardBatchSize: 1,
    prepTimeMinutes: 300,
    description: 'Gâteau de mariage contemporain recouvert de crème velours et fleurs fraîches.',
  },
  {
    id: 'prod-pm-3',
    name: 'Number Cake Anniversaire Fruits Rouges & Macarons',
    category: 'Pièces Montées',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 22.00,
    sellingPrice: 60.00,
    sku: 'MON-NUMB-03',
    standardBatchSize: 2,
    prepTimeMinutes: 150,
    description: 'Sablé breton sculpté en chiffres avec ganache vanille et macarons.',
  },

  // 7. Trompe-l'œil
  {
    id: 'prod-to-1',
    name: 'Trompe-l’œil Citron Cédrat & Menthe Fraîche',
    category: "Trompe-l'œil",
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.20,
    sellingPrice: 8.50,
    sku: 'TO-CITR-01',
    standardBatchSize: 24,
    prepTimeMinutes: 120,
    description: 'Insert marmelade citron jaune, ganache yuzu et coque chocolat texturée.',
  },
  {
    id: 'prod-to-2',
    name: 'Trompe-l’œil Noisette Cœur Praliné Coulant',
    category: "Trompe-l'œil",
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.50,
    sellingPrice: 9.00,
    sku: 'TO-NOIS-02',
    standardBatchSize: 24,
    prepTimeMinutes: 130,
    description: 'Cœur praliné noisette coulant, mousse noisette grillée et coque velours.',
  },
  {
    id: 'prod-to-3',
    name: 'Trompe-l’œil Mangue Passion Fruits Exotiques',
    category: "Trompe-l'œil",
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.40,
    sellingPrice: 8.80,
    sku: 'TO-MANG-03',
    standardBatchSize: 20,
    prepTimeMinutes: 120,
    description: 'Compotée mangue Alphonso, ganache passion et flocage velouté.',
  },
  {
    id: 'prod-to-4',
    name: 'Trompe-l’œil Avocat Surprise Chocolat & Citron Vert',
    category: "Trompe-l'œil",
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.80,
    sellingPrice: 10.00,
    sku: 'TO-AVOC-04',
    standardBatchSize: 18,
    prepTimeMinutes: 140,
    description: 'Noyau praliné chocolat noir et mousse avocat citron vert.',
  },
];

/**
 * Intelligent Room Resolver
 * Resolves the assigned ProductionRoomId for any product name or category.
 * Defaults gracefully to 'patisserie_fine' so no item disappears from the dispatcher.
 */
export function getProductRoomId(productName: string, category?: string): ProductionRoomId {
  const normName = (productName || '').toLowerCase().trim();
  const normCat = (category || '').toLowerCase().trim();

  // 1. Direct Category Mapping via canonical constants
  if (category) {
    const fromCat = getRoomIdFromCategory(category);
    if (fromCat && fromCat !== 'patisserie_fine') {
      return fromCat;
    }
  }

  // 2. Direct match in Catalog
  const matched = MASTER_PRODUCT_CATALOG.find(
    (p) =>
      p.name.toLowerCase() === normName ||
      normName.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(normName)
  );
  if (matched) {
    return normalizeRoomId(matched.roomId);
  }

  // 3. Keyword heuristics for Trompe-l'œil
  if (
    normName.includes('trompe') ||
    normCat.includes('trompe') ||
    normName.includes('illusion') ||
    normName.includes('cédrat') ||
    normName.includes('cedrat') ||
    normName.includes('noisette cœur') ||
    normName.includes('noisette coeur')
  ) {
    return 'trompe_oeil';
  }

  // 4. Keyword heuristics for Pièces Montées
  if (
    normName.includes('pièce montée') ||
    normName.includes('piece montee') ||
    normName.includes('wedding cake') ||
    normName.includes('mariage') ||
    normName.includes('number cake') ||
    normName.includes('letter cake') ||
    normName.includes('gâteau d’anniversaire') ||
    normName.includes("gateau d'anniversaire") ||
    normCat.includes('pièce montée') ||
    normCat.includes('piece montee') ||
    normCat.includes('wedding')
  ) {
    return 'piece_montee';
  }

  // 5. Keyword heuristics for Gâteaux Orientaux
  if (
    normName.includes('baklawa') ||
    normName.includes('makroud') ||
    normName.includes('dziriette') ||
    normName.includes('tcharek') ||
    normName.includes('corne de gazelle') ||
    normName.includes('cornes de gazelle') ||
    normName.includes('m’chewek') ||
    normName.includes('mchewek') ||
    normName.includes('knidlette') ||
    normName.includes('griwech') ||
    normName.includes('samsa') ||
    normName.includes('oriental') ||
    normCat.includes('oriental') ||
    normCat.includes('traditionnel')
  ) {
    return 'gateaux_orientaux';
  }

  // 6. Keyword heuristics for Feuilletage & Mille-Feuille
  if (
    normName.includes('mille-feuille') ||
    normName.includes('millefeuille') ||
    normName.includes('mille feuille') ||
    normName.includes('palmier') ||
    normName.includes('chausson') ||
    normName.includes('feuilletage') ||
    normCat.includes('mille-feuille') ||
    normCat.includes('millefeuille') ||
    normCat.includes('feuilletage')
  ) {
    return 'feuilletage';
  }

  // 7. Keyword heuristics for Viennoiserie & Brioche
  if (
    normName.includes('croissant') ||
    normName.includes('chocolatine') ||
    normName.includes('pain au chocolat') ||
    normName.includes('pain suisse') ||
    normName.includes('brioche') ||
    normName.includes('viennoiserie') ||
    normName.includes('roulé cannelle') ||
    normName.includes('cinnamon roll') ||
    normCat.includes('croissants & pastries') ||
    normCat.includes('viennoiserie') ||
    normCat.includes('brioche') ||
    normCat.includes('bread & savory')
  ) {
    return 'viennoiserie';
  }

  // 8. Keyword heuristics for Gâteaux Secs
  if (
    normName.includes('sablé') ||
    normName.includes('sable') ||
    normName.includes('croquet') ||
    normName.includes('cookie') ||
    normName.includes('petit four sec') ||
    normName.includes('petits fours secs') ||
    normName.includes('biscuit') ||
    normName.includes('galette') ||
    normCat.includes('gâteaux secs') ||
    normCat.includes('gateaux secs') ||
    normCat.includes('biscuits')
  ) {
    return 'gateaux_secs';
  }

  // 9. Keyword heuristics for Pâtisseries Fines (Éclairs, Paris-Brest, Tartes, Entremets)
  if (
    normName.includes('éclair') ||
    normName.includes('eclair') ||
    normName.includes('tarte') ||
    normName.includes('tartlet') ||
    normName.includes('paris-brest') ||
    normName.includes('opéra') ||
    normName.includes('opera') ||
    normName.includes('fraisier') ||
    normName.includes('forêt noire') ||
    normName.includes('foret noire') ||
    normName.includes('entremets') ||
    normName.includes('choux') ||
    normName.includes('macaron') ||
    normCat.includes('cakes & tortes') ||
    normCat.includes('tart shells') ||
    normCat.includes('finished desserts') ||
    normCat.includes('patisserie') ||
    normCat.includes('pâtisseries fines')
  ) {
    return 'patisserie_fine';
  }

  // Default graceful fallback to prevent any item from disappearing
  return 'patisserie_fine';
}

// In-memory caches to support instant synchronous lookup across db.products & db.raw_materials
const dbProductsCache = new Map<string, DexieProduct>();
const dbRawMaterialsCache = new Map<string, DexieRawMaterial>();
let isDexieCachePreloaded = false;

// Populate static default catalogs synchronously so synchronous lookups never fail
function populateStaticCaches() {
  try {
    MASTER_PRODUCT_CATALOG.forEach((p) => {
      if (p.id) dbProductsCache.set(p.id, p as any);
      if (p.name) dbProductsCache.set(p.name.toLowerCase().trim(), p as any);
    });
    getRetailProducts().forEach((p) => {
      if (p.id) dbProductsCache.set(p.id, p as any);
      if (p.name) dbProductsCache.set(p.name.toLowerCase().trim(), p as any);
    });
    INITIAL_RAW_MATERIALS.forEach((m: any) => {
      if (m.id) dbRawMaterialsCache.set(m.id, m);
      if (m.sku) dbRawMaterialsCache.set(m.sku.toLowerCase().trim(), m);
      if (m.name) dbRawMaterialsCache.set(m.name.toLowerCase().trim(), m);
    });
    getRawMaterials().forEach((m: any) => {
      if (m.id) dbRawMaterialsCache.set(m.id, m);
      if (m.sku) dbRawMaterialsCache.set(m.sku.toLowerCase().trim(), m);
      if (m.code) dbRawMaterialsCache.set(m.code.toLowerCase().trim(), m);
      if (m.name) dbRawMaterialsCache.set(m.name.toLowerCase().trim(), m);
    });
  } catch (err) {
    // Non-blocking fallback
  }
}
populateStaticCaches();

export async function preloadCatalogForDispatcher(): Promise<void> {
  try {
    const [products, materials] = await Promise.all([
      db.products.toArray().catch(() => [] as DexieProduct[]),
      db.raw_materials.toArray().catch(() => [] as DexieRawMaterial[]),
    ]);

    products.forEach((p) => {
      if (p.id) dbProductsCache.set(p.id, p);
      if (p.code) dbProductsCache.set(p.code.toLowerCase().trim(), p);
      if (p.name) dbProductsCache.set(p.name.toLowerCase().trim(), p);
    });

    materials.forEach((m) => {
      if (m.id) dbRawMaterialsCache.set(m.id, m);
      if (m.code) dbRawMaterialsCache.set(m.code.toLowerCase().trim(), m);
      if (m.name) dbRawMaterialsCache.set(m.name.toLowerCase().trim(), m);
    });

    isDexieCachePreloaded = true;
    console.log('[orderAggregator] 📦 Preloaded Dexie catalog cache:', {
      productsCount: products.length,
      rawMaterialsCount: materials.length,
    });
  } catch (err) {
    console.warn('[orderAggregator] Notice preloading Dexie catalog for dispatcher:', err);
  }
}

// Automatically initiate catalog preload on client
if (typeof window !== 'undefined') {
  preloadCatalogForDispatcher();
}

/**
 * Case-insensitively checks if a requisition status corresponds to an approved/validated state.
 * Matches: 'approved', 'approuvé', 'approuve', 'validated', 'validé', 'valide'.
 */
export function isStatusApproved(status: string | undefined): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'approved' ||
    s === 'approuvé' ||
    s === 'approuve' ||
    s === 'validated' ||
    s === 'validé' ||
    s === 'valide'
  );
}

export interface AggregationOptions {
  targetDate?: string; // YYYY-MM-DD or 'ALL'
  storeId?: string; // specific store ID or 'ALL'
  statusFilter?: string[]; // e.g. ['approved'] or ['approved', 'processing']
  customProducts?: Product[];
}

export interface GlobalLabProductionSummary {
  totalOrdersAggregated: number;
  totalUnitsAcrossAllRooms: number;
  totalEstimatedCost: number;
  activeRoomsCount: number;
  participatingStoresCount: number;
  storesInvolved: Array<{ id: string; name: string; totalRequested: number }>;
  topDemandedProducts: Array<{ name: string; quantity: number; unit: string; roomNameFr: string }>;
  targetDate: string;
}

export interface AggregatedLabProductionResult {
  reports: Record<ProductionRoomId, RoomProductionReport>;
  orderedReports: RoomProductionReport[];
  summary: GlobalLabProductionSummary;
}

/**
 * Consolidates store requisitions across all retail locations.
 * Filters approved requisitions, extracts items from both req.lines and req.items,
 * performs unified lookup across db.products and db.raw_materials,
 * maps raw materials missing a roomId to a default workstation room ('gateaux_secs'),
 * aggregates quantities, and calculates store distributions.
 */
export function aggregateStoreOrders(
  orders: (Requisition | StoreOrder)[],
  options: AggregationOptions = {}
): AggregatedLabProductionResult {
  const targetDate = options.targetDate || 'ALL';
  const selectedStoreId = options.storeId || 'ALL';

  // Status Filter: Normalize to lowercase.
  // Defaults to accepting all approved/validated forms
  const filterList = options.statusFilter && options.statusFilter.length > 0
    ? options.statusFilter.map((s) => s.toLowerCase().trim())
    : ['approved', 'approuvé', 'approuve', 'validated', 'valide', 'validé'];

  console.log('[orderAggregator] 🚀 Starting Order Aggregation Pipeline');
  console.log('[orderAggregator] Filter Params:', {
    totalRawOrders: orders.length,
    targetDate,
    selectedStoreId,
    statusFilter: filterList,
  });

  // 1. Filter Orders
  const filteredOrders = orders.filter((order) => {
    const rawStatus = String(order.status || '').toLowerCase().trim();

    // Case-insensitive status matching with support for 'approved', 'approuvé', 'validated'
    if (filterList.length > 0 && !filterList.includes('all')) {
      const isDirectMatch = filterList.includes(rawStatus);
      const isApprovedMatch =
        (filterList.includes('approved') ||
          filterList.includes('approuvé') ||
          filterList.includes('approuve') ||
          filterList.includes('validated') ||
          filterList.includes('validé') ||
          filterList.includes('valide')) &&
        isStatusApproved(rawStatus);

      if (!isDirectMatch && !isApprovedMatch) {
        return false;
      }
    }

    // Store filter
    if (selectedStoreId !== 'ALL' && order.storeId !== selectedStoreId) {
      return false;
    }

    // Date filter
    if (targetDate !== 'ALL') {
      const orderDate = order.dateNeeded || order.dateRequested || (order as any).targetDate || '';
      if (orderDate && orderDate !== targetDate) {
        return false;
      }
    }

    return true;
  });

  console.log(`[orderAggregator] ✅ Matched ${filteredOrders.length} approved/valid requisitions out of ${orders.length}`);

  // 2. Prepare empty reports for all 7 specialized rooms
  const reportsMap: Record<ProductionRoomId, RoomProductionReport> = {} as any;
  const itemsByRoomAndProduct: Record<ProductionRoomId, Map<string, AggregatedProductionItem>> = {
    viennoiserie: new Map(),
    gateaux_secs: new Map(),
    gateaux_orientaux: new Map(),
    feuilletage: new Map(),
    patisserie_fine: new Map(),
    piece_montee: new Map(),
    trompe_oeil: new Map(),
    mille_feuille: new Map(), // legacy alias support
  };

  PRODUCTION_ROOMS.forEach((room) => {
    reportsMap[room.id] = {
      roomId: room.id,
      roomNameKey: room.nameKey,
      roomNameFr: room.nameFr,
      roomNameAr: room.nameAr,
      roomDescriptionFr: room.descriptionFr,
      roomDescriptionAr: room.descriptionAr,
      iconName: room.iconName,
      colorTheme: room.theme,
      totalProductsCount: 0,
      totalUnitsToProduce: 0,
      totalEstimatedCost: 0,
      participatingStoresCount: 0,
      items: [],
      targetDate,
      generatedAt: new Date().toISOString(),
    };
  });

  // Track stores across the aggregation
  const storesMap = new Map<string, { id: string; name: string; totalRequested: number }>();

  // Valid canonical workstation rooms in the central lab
  const VALID_PRODUCTION_ROOMS: ProductionRoomId[] = [
    'viennoiserie',
    'gateaux_secs',
    'gateaux_orientaux',
    'feuilletage',
    'patisserie_fine',
    'piece_montee',
    'trompe_oeil',
  ];

  // 3. Process every requisition line item (supporting both req.lines and req.items)
  filteredOrders.forEach((order, oIdx) => {
    const storeId = order.storeId || 'unknown-store';
    const storeName = order.storeName || 'Magasin';
    const orderId = order.id;
    const orderNumber =
      ('requisitionNumber' in order ? order.requisitionNumber : undefined) ||
      ('orderNumber' in order ? order.orderNumber : undefined) ||
      order.id;

    if (!storesMap.has(storeId)) {
      storesMap.set(storeId, { id: storeId, name: storeName, totalRequested: 0 });
    }

    // Support BOTH req.lines and req.items array formats (safely merge if both exist)
    const rawLines = (order as any).lines;
    const rawItems = (order as any).items;
    let orderItems: any[] = [];

    if (Array.isArray(rawLines) && Array.isArray(rawItems) && rawLines.length > 0 && rawItems.length > 0) {
      const seen = new Set<string>();
      [...rawLines, ...rawItems].forEach((it) => {
        const key = it.itemId || it.id || (it.itemTitle || it.productName || '') + (it.requestedQty || it.quantity || 0);
        if (!seen.has(key)) {
          seen.add(key);
          orderItems.push(it);
        }
      });
    } else if (Array.isArray(rawLines) && rawLines.length > 0) {
      orderItems = rawLines;
    } else if (Array.isArray(rawItems) && rawItems.length > 0) {
      orderItems = rawItems;
    } else if (Array.isArray(rawLines)) {
      orderItems = rawLines;
    } else if (Array.isArray(rawItems)) {
      orderItems = rawItems;
    }

    console.log(
      `[orderAggregator] 📦 [Req #${oIdx + 1}] ID: ${orderNumber} | Store: ${storeName} | Status: ${order.status} | Lines Count: ${orderItems.length} (${Array.isArray(rawLines) && rawLines.length > 0 ? 'req.lines' : 'req.items'})`
    );

    orderItems.forEach((item: any) => {
      const itemId = String(item.itemId || item.productId || item.id || '').trim();
      const productName = item.itemTitle || item.productName || item.name || 'Article Pâtisserie';
      const normName = productName.toLowerCase().trim();
      const quantity = Number(item.requestedQty ?? item.quantityRequested ?? item.quantity ?? item.qty ?? 0);
      if (quantity <= 0) return;

      // 1. UNIFIED DISPATCHER LOOKUP: Search both db.products and db.raw_materials
      const rawMatFromDb =
        (itemId ? dbRawMaterialsCache.get(itemId) : undefined) ||
        (itemId ? dbRawMaterialsCache.get(itemId.toLowerCase()) : undefined) ||
        dbRawMaterialsCache.get(normName) ||
        getRawMaterials().find((rm) => rm.id === itemId || rm.name.toLowerCase().trim() === normName) ||
        INITIAL_RAW_MATERIALS.find((rm) => rm.id === itemId || rm.name.toLowerCase().trim() === normName);

      const prodFromDb =
        (itemId ? dbProductsCache.get(itemId) : undefined) ||
        (itemId ? dbProductsCache.get(itemId.toLowerCase()) : undefined) ||
        dbProductsCache.get(normName) ||
        MASTER_PRODUCT_CATALOG.find((p) => p.id === itemId || p.name.toLowerCase().trim() === normName) ||
        getRetailProducts().find((rp) => rp.id === itemId || rp.name.toLowerCase().trim() === normName);

      // Determine itemType: 'finished_product' | 'raw_material'
      const rawTypeStr = String(item.itemType || (item as any).type || '').toLowerCase().trim();
      const explicitType: 'finished_product' | 'raw_material' | undefined =
        rawTypeStr === 'raw_material' || rawTypeStr === 'raw' || rawTypeStr === 'matiere_premiere'
          ? 'raw_material'
          : rawTypeStr === 'finished_product' || rawTypeStr === 'finished' || rawTypeStr === 'produit_fini'
          ? 'finished_product'
          : undefined;

      const isRawMaterial =
        explicitType === 'raw_material' ||
        Boolean(rawMatFromDb) ||
        (item.category && (
          item.category.toLowerCase().includes('matière') ||
          item.category.toLowerCase().includes('matiere') ||
          item.category.toLowerCase().includes('flour') ||
          item.category.toLowerCase().includes('grain') ||
          item.category.toLowerCase().includes('fat') ||
          item.category.toLowerCase().includes('oil') ||
          item.category.toLowerCase().includes('dairy') ||
          item.category.toLowerCase().includes('sugar') ||
          item.category.toLowerCase().includes('cocoa') ||
          item.category.toLowerCase().includes('chocolate & cocoa') ||
          item.category.toLowerCase().includes('nut') ||
          item.category.toLowerCase().includes('yeast')
        )) ||
        normName.startsWith('farine') ||
        normName.startsWith('beurre') ||
        normName.startsWith('sucre') ||
        normName.startsWith('levure') ||
        normName.startsWith('chocolat valrhona') ||
        normName.startsWith('poudre d’amande') ||
        normName.startsWith('poudre d\'amande') ||
        normName.startsWith('œufs') ||
        normName.startsWith('oeufs');

      const itemType: 'finished_product' | 'raw_material' = isRawMaterial
        ? 'raw_material'
        : (explicitType || 'finished_product');

      const unit = item.unit || rawMatFromDb?.unit || prodFromDb?.unit || (isRawMaterial ? 'kg' : 'pcs');
      const estimatedCost = Number(
        item.unitEstimatedCost ??
        item.cost ??
        item.price ??
        (rawMatFromDb as any)?.costPerUnit ??
        (rawMatFromDb as any)?.currentAvgCost ??
        (prodFromDb as any)?.costPrice ??
        (prodFromDb as any)?.unitEstimatedCost ??
        1.0
      );
      const category = item.category || rawMatFromDb?.category || (prodFromDb as any)?.category || (isRawMaterial ? 'Matières Premières' : 'Pâtisseries Fines');

      // 2. ROOM ASSIGNMENT:
      // Check explicit roomId
      let assignedRoom: ProductionRoomId | undefined = undefined;
      const rawRoomCandidate = item.roomId ? normalizeRoomId(item.roomId) : undefined;

      if (rawRoomCandidate && VALID_PRODUCTION_ROOMS.includes(rawRoomCandidate)) {
        assignedRoom = rawRoomCandidate;
      }

      if (!assignedRoom) {
        if (isRawMaterial) {
          // Assign raw materials missing a roomId to a default workstation room ('gateaux_secs') so raw material requests are NEVER omitted
          assignedRoom = 'gateaux_secs';
        } else {
          assignedRoom = getProductRoomId(productName, category);
          if (!VALID_PRODUCTION_ROOMS.includes(assignedRoom)) {
            assignedRoom = 'patisserie_fine';
          }
        }
      }

      // Canonical room mapping (e.g. mille_feuille -> feuilletage)
      const canonicalRoomId: ProductionRoomId = normalizeRoomId(assignedRoom);

      // Find catalog specs if available
      const standardBatchSize = Number(
        item.standardBatchSize ||
        (prodFromDb as any)?.standardBatchSize ||
        (isRawMaterial ? 10 : 24)
      );
      const unitCost = estimatedCost;

      // Update store overall count
      const storeStat = storesMap.get(storeId)!;
      storeStat.totalRequested += quantity;

      // Group in room (safe fallback to gateaux_secs so no request is EVER omitted)
      let roomMap = itemsByRoomAndProduct[canonicalRoomId];
      if (!roomMap) {
        console.warn(`[orderAggregator] Unknown roomId "${canonicalRoomId}", safely falling back to gateaux_secs`);
        roomMap = itemsByRoomAndProduct['gateaux_secs'];
      }

      // Unique product key distinguishing finished products from raw materials
      const productKey = `${itemType}_${productName.toLowerCase().trim()}`;

      if (!roomMap.has(productKey)) {
        roomMap.set(productKey, {
          productId: itemId || prodFromDb?.id || rawMatFromDb?.id || `prod-${productKey.replace(/\s+/g, '-').slice(0, 20)}`,
          productName,
          category,
          roomId: canonicalRoomId,
          unit,
          unitEstimatedCost: unitCost,
          totalQuantityRequired: 0,
          standardBatchSize,
          totalBatchesNeeded: 0,
          storeBreakdown: [],
          completedQuantity: 0,
          status: 'PENDING',
          itemType,
        });
      }

      const aggItem = roomMap.get(productKey)!;
      aggItem.totalQuantityRequired += quantity;

      // Check if store already has an entry for this item in this room
      const existingStoreEntry = aggItem.storeBreakdown.find((sb) => sb.storeId === storeId);
      if (existingStoreEntry) {
        existingStoreEntry.quantity += quantity;
      } else {
        aggItem.storeBreakdown.push({
          storeId,
          storeName,
          quantity,
          orderId,
          orderNumber,
        });
      }
    });
  });

  // 4. Calculate per-room metrics and fill reports
  let globalUnits = 0;
  let globalCost = 0;
  let activeRooms = 0;
  const allAggregatedProducts: Array<{ name: string; quantity: number; unit: string; roomNameFr: string }> = [];

  PRODUCTION_ROOMS.forEach((room) => {
    const roomMap = itemsByRoomAndProduct[room.id];
    const itemsList = roomMap ? Array.from(roomMap.values()) : [];

    // Sort items by highest required quantity
    itemsList.sort((a, b) => b.totalQuantityRequired - a.totalQuantityRequired);

    let roomUnits = 0;
    let roomCost = 0;
    const roomParticipatingStores = new Set<string>();

    itemsList.forEach((item) => {
      // Calculate total batches needed
      item.totalBatchesNeeded = Math.ceil(item.totalQuantityRequired / (item.standardBatchSize || 1));
      roomUnits += item.totalQuantityRequired;
      roomCost += item.totalQuantityRequired * item.unitEstimatedCost;

      item.storeBreakdown.forEach((sb) => roomParticipatingStores.add(sb.storeId));

      allAggregatedProducts.push({
        name: item.productName,
        quantity: item.totalQuantityRequired,
        unit: item.unit,
        roomNameFr: room.nameFr,
      });
    });

    reportsMap[room.id].items = itemsList;
    reportsMap[room.id].totalProductsCount = itemsList.length;
    reportsMap[room.id].totalUnitsToProduce = roomUnits;
    reportsMap[room.id].totalEstimatedCost = Number(roomCost.toFixed(2));
    reportsMap[room.id].participatingStoresCount = roomParticipatingStores.size;

    globalUnits += roomUnits;
    globalCost += roomCost;
    if (itemsList.length > 0) {
      activeRooms++;
    }
  });

  // Top demanded products across the whole lab
  allAggregatedProducts.sort((a, b) => b.quantity - a.quantity);
  const topDemanded = allAggregatedProducts.slice(0, 6);

  const orderedReports = PRODUCTION_ROOMS.map((r) => reportsMap[r.id]);

  const summary: GlobalLabProductionSummary = {
    totalOrdersAggregated: filteredOrders.length,
    totalUnitsAcrossAllRooms: globalUnits,
    totalEstimatedCost: Number(globalCost.toFixed(2)),
    activeRoomsCount: activeRooms,
    participatingStoresCount: storesMap.size,
    storesInvolved: Array.from(storesMap.values()).sort((a, b) => b.totalRequested - a.totalRequested),
    topDemandedProducts: topDemanded,
    targetDate,
  };

  console.log('[orderAggregator] 🏁 Aggregation Results Summary:', {
    ordersAggregated: filteredOrders.length,
    totalUnits: globalUnits,
    activeRooms,
    storesCount: storesMap.size,
    roomBreakdown: {
      viennoiserie: reportsMap.viennoiserie?.totalUnitsToProduce || 0,
      gateaux_secs: reportsMap.gateaux_secs?.totalUnitsToProduce || 0,
      gateaux_orientaux: reportsMap.gateaux_orientaux?.totalUnitsToProduce || 0,
      feuilletage: reportsMap.feuilletage?.totalUnitsToProduce || 0,
      patisserie_fine: reportsMap.patisserie_fine?.totalUnitsToProduce || 0,
      piece_montee: reportsMap.piece_montee?.totalUnitsToProduce || 0,
      trompe_oeil: reportsMap.trompe_oeil?.totalUnitsToProduce || 0,
    },
  });

  return {
    reports: reportsMap,
    orderedReports,
    summary,
  };
}

/**
 * Format store breakdown into an easily readable badge string
 * e.g. "Douera 01: 50 • Douera 02: 40 • Oued Terfa: 30"
 */
export function formatStoreBreakdown(breakdown: StoreQuantityBreakdown[]): string {
  if (!breakdown || breakdown.length === 0) return '—';
  return breakdown.map((b) => `${b.storeName}: ${b.quantity}`).join(' • ');
}

/**
 * Get Room metadata helper by ID
 */
export function getRoomMetadata(roomId: ProductionRoomId): RoomMetadata {
  const normId = normalizeRoomId(roomId);
  return (
    PRODUCTION_ROOMS.find((r) => r.id === normId) ||
    PRODUCTION_ROOMS[0]
  );
}
