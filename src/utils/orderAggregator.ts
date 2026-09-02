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
  StoreLocation,
} from '../types';

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

export const PRODUCTION_ROOMS: RoomMetadata[] = [
  {
    id: 'gateaux_secs',
    nameKey: 'rooms.gateauxSecs',
    nameFr: 'Gâteaux Secs',
    nameAr: 'حلويات جافة وبسكويت',
    categoryFr: 'Biscuiterie & Sablés',
    categoryAr: 'بسكويت وصابلي تقليدي',
    descriptionFr: 'Sablés confiture, croquets aux amandes, cookies artisanaux, petits fours secs et galettes bretonnes.',
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
  {
    id: 'mille_feuille',
    nameKey: 'rooms.milleFeuille',
    nameFr: 'Mille-Feuille / Feuilletage',
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
  {
    id: 'viennoiserie',
    nameKey: 'rooms.viennoiserie',
    nameFr: 'Viennoiserie & Briocherie',
    nameAr: 'كرواسون ومخبوزات فرنسية',
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
  {
    id: 'patisserie_fine',
    nameKey: 'rooms.patisserieFine',
    nameFr: 'Pâtisseries Fines',
    nameAr: 'حلويات فاخرة وعصرية',
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
  {
    id: 'piece_montee',
    nameKey: 'rooms.pieceMontee',
    nameFr: 'Pièces Montées & Événements',
    nameAr: 'كيك المناسبات وأعراس',
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
  {
    id: 'trompe_oeil',
    nameKey: 'rooms.trompeOeil',
    nameFr: 'Trompe-l’œil & Créations',
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
    description: 'Feuilletage maison au smen, farce généreuse aux amandes fraîches et sirop au miel.',
  },
  {
    id: 'prod-go-2',
    name: 'Makroud El Louz Cœur Moelleux Citron',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.10,
    sellingPrice: 3.20,
    sku: 'ORI-MAKR-02',
    standardBatchSize: 50,
    prepTimeMinutes: 60,
    description: 'Pâte d’amande fine parfumée au zeste de citron et enrobée de sucre glace.',
  },
  {
    id: 'prod-go-3',
    name: 'Dziriette Traditionnelle Fleur d’Oranger',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.30,
    sellingPrice: 3.80,
    sku: 'ORI-DZIR-03',
    standardBatchSize: 40,
    prepTimeMinutes: 75,
    description: 'Corbeille fine pincée à la main et farce amandes moelleuse.',
  },
  {
    id: 'prod-go-4',
    name: 'Tcharek El Aryane aux Amandes Effilées',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 0.95,
    sellingPrice: 2.80,
    sku: 'ORI-TCHA-04',
    standardBatchSize: 45,
    prepTimeMinutes: 60,
    description: 'Croissants orientaux sablés dorés aux amandes croustillantes.',
  },
  {
    id: 'prod-go-5',
    name: 'M’chewek Moelleux aux Noisettes & Pistaches',
    category: 'Gâteaux Orientaux',
    roomId: 'gateaux_orientaux',
    unit: 'pieces',
    unitEstimatedCost: 1.15,
    sellingPrice: 3.40,
    sku: 'ORI-MCHE-05',
    standardBatchSize: 50,
    prepTimeMinutes: 50,
    description: 'Boules d’amandes roulées dans des éclats de pistaches grillées.',
  },

  // 3. Mille-Feuille
  {
    id: 'prod-mf-1',
    name: 'Mille-Feuille Classique Vanille Bourbon',
    category: 'Mille-Feuille',
    roomId: 'mille_feuille',
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
    category: 'Mille-Feuille',
    roomId: 'mille_feuille',
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
    category: 'Mille-Feuille',
    roomId: 'mille_feuille',
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
    category: 'Mille-Feuille',
    roomId: 'mille_feuille',
    unit: 'pieces',
    unitEstimatedCost: 0.50,
    sellingPrice: 1.80,
    sku: 'MIL-PALM-04',
    standardBatchSize: 50,
    prepTimeMinutes: 40,
    description: 'Feuilletage replié au sucre roux croustillant.',
  },

  // 4. Viennoiserie
  {
    id: 'prod-vn-1',
    name: 'Artisan Butter Croissant (Pur Beurre)',
    category: 'Croissants & Pastries',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 0.95,
    sellingPrice: 3.80,
    sku: 'VN-CROIS-01',
    standardBatchSize: 50,
    prepTimeMinutes: 60,
    description: 'Feuilletage croustillant au beurre AOP Isigny et mie alvéolée.',
  },
  {
    id: 'prod-vn-2',
    name: 'Valrhona Pain au Chocolat (Chocolatine)',
    category: 'Croissants & Pastries',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.15,
    sellingPrice: 4.40,
    sku: 'VN-PAINCH-02',
    standardBatchSize: 50,
    prepTimeMinutes: 60,
    description: 'Double bâton de chocolat noir Valrhona en pâte levée feuilletée.',
  },
  {
    id: 'prod-vn-3',
    name: 'Double Almond Cream Croissant',
    category: 'Croissants & Pastries',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.40,
    sellingPrice: 4.90,
    sku: 'VN-ALMCROIS-03',
    standardBatchSize: 30,
    prepTimeMinutes: 45,
    description: 'Croissant imbibé au sirop fleur d’oranger et crème frangipane.',
  },
  {
    id: 'prod-vn-4',
    name: 'Brioche Tressée Pur Beurre au Sucre Perlé',
    category: 'Viennoiserie & Briocherie',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.50,
    sellingPrice: 5.00,
    sku: 'VN-BRIOCH-04',
    standardBatchSize: 20,
    prepTimeMinutes: 90,
    description: 'Brioche moelleuse longue fermentation dorée au jaune d’œuf.',
  },
  {
    id: 'prod-vn-5',
    name: 'Pain Suisse Pépites Chocolat & Crème Pâtissière',
    category: 'Croissants & Pastries',
    roomId: 'viennoiserie',
    unit: 'units',
    unitEstimatedCost: 1.25,
    sellingPrice: 4.20,
    sku: 'VN-SUISSE-05',
    standardBatchSize: 35,
    prepTimeMinutes: 50,
    description: 'Brioche feuilletée garnie de crème vanille et pépites.',
  },

  // 5. Pâtisserie Fine
  {
    id: 'prod-pf-1',
    name: 'Madagascar Vanilla Bean Éclair',
    category: 'Tart Shells & Desserts',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 1.60,
    sellingPrice: 5.50,
    sku: 'PF-ECLAIR-01',
    standardBatchSize: 30,
    prepTimeMinutes: 55,
    description: 'Pâte à choux croustillante et crème diplomate aux grains de vanille.',
  },
  {
    id: 'prod-pf-2',
    name: 'Fresh Raspberry Almond Tartlet 4"',
    category: 'Tart Shells & Desserts',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 2.20,
    sellingPrice: 6.80,
    sku: 'PF-RASPTART-02',
    standardBatchSize: 24,
    prepTimeMinutes: 65,
    description: 'Fond sablé sucré, crème d’amande et framboises fraîches.',
  },
  {
    id: 'prod-pf-3',
    name: 'Pistachio Paris-Brest Choux Shells',
    category: 'Finished Desserts',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 2.80,
    sellingPrice: 7.50,
    sku: 'PF-PARISBR-03',
    standardBatchSize: 20,
    prepTimeMinutes: 70,
    description: 'Couronne de choux parsemée d’amandes et mousseline pistache.',
  },
  {
    id: 'prod-pf-4',
    name: 'Opera Cake Slice Prestige',
    category: 'Cakes & Tortes',
    roomId: 'patisserie_fine',
    unit: 'slices',
    unitEstimatedCost: 2.30,
    sellingPrice: 7.20,
    sku: 'PF-OPERA-04',
    standardBatchSize: 24,
    prepTimeMinutes: 90,
    description: 'Biscuit joconde imbibé café, ganache chocolat et crème au beurre café.',
  },
  {
    id: 'prod-pf-5',
    name: 'Tarte Citron Meringuée Bio',
    category: 'Finished Desserts',
    roomId: 'patisserie_fine',
    unit: 'units',
    unitEstimatedCost: 1.90,
    sellingPrice: 6.00,
    sku: 'PF-CITRON-05',
    standardBatchSize: 24,
    prepTimeMinutes: 60,
    description: 'Crémeux citron jaune vif et meringue italienne flambée.',
  },

  // 6. Pièce Montée
  {
    id: 'prod-pm-1',
    name: 'Pièce Montée Pyramide Choux & Nougatine Caramel',
    category: 'Pièce Montée',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 3.50,
    sellingPrice: 9.50,
    sku: 'PM-CHOUX-01',
    standardBatchSize: 40,
    prepTimeMinutes: 180,
    description: 'Choux caramélisés garnis vanille montés sur socle nougatine décoré.',
  },
  {
    id: 'prod-pm-2',
    name: 'Wedding Cake 3 Étages Pâte à Sucre & Fleurs',
    category: 'Pièce Montée',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 4.80,
    sellingPrice: 14.00,
    sku: 'PM-WEDD-02',
    standardBatchSize: 50,
    prepTimeMinutes: 240,
    description: 'Gâteau d’apparat aux finitions soignées et fleurs en sucre.',
  },
  {
    id: 'prod-pm-3',
    name: 'Number Cake / Letter Cake Fruits Rouges & Macarons',
    category: 'Pièce Montée',
    roomId: 'piece_montee',
    unit: 'parts',
    unitEstimatedCost: 3.20,
    sellingPrice: 8.50,
    sku: 'PM-NUMB-03',
    standardBatchSize: 25,
    prepTimeMinutes: 120,
    description: 'Sablé amande découpé garni de crème mascarpone et fruits frais.',
  },

  // 7. Trompe-l’œil
  {
    id: 'prod-to-1',
    name: 'Trompe-l’œil Citron Cédrat & Menthe Fraîche',
    category: 'Trompe-l’œil',
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.20,
    sellingPrice: 9.00,
    sku: 'TO-CITR-01',
    standardBatchSize: 20,
    prepTimeMinutes: 120,
    description: 'Coque chocolat blanc veloutée, mousse yuzu et confit cédrat acidulé.',
  },
  {
    id: 'prod-to-2',
    name: 'Trompe-l’œil Noisette Cœur Praliné Coulant',
    category: 'Trompe-l’œil',
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.50,
    sellingPrice: 9.50,
    sku: 'TO-NOIS-02',
    standardBatchSize: 20,
    prepTimeMinutes: 130,
    description: 'Coque ciselée noisette, praliné 100% pur Piémont et ganache montée.',
  },
  {
    id: 'prod-to-3',
    name: 'Trompe-l’œil Mangue & Fruit de la Passion',
    category: 'Trompe-l’œil',
    roomId: 'trompe_oeil',
    unit: 'pieces',
    unitEstimatedCost: 3.40,
    sellingPrice: 9.20,
    sku: 'TO-MANG-03',
    standardBatchSize: 20,
    prepTimeMinutes: 120,
    description: 'Création exotique aux reflets dorés et cœur gélifié mangue.',
  },
  {
    id: 'prod-to-4',
    name: 'Trompe-l’œil Avocat Chocolat & Guacamole Sucré',
    category: 'Trompe-l’œil',
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
 */
export function getProductRoomId(productName: string, category?: string): ProductionRoomId {
  const normName = (productName || '').toLowerCase().trim();
  const normCat = (category || '').toLowerCase().trim();

  // 1. Direct match in Catalog
  const matched = MASTER_PRODUCT_CATALOG.find(
    (p) => p.name.toLowerCase() === normName || normName.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(normName)
  );
  if (matched) {
    return matched.roomId;
  }

  // 2. Keyword heuristics for Trompe-l'œil
  if (
    normName.includes('trompe') ||
    normCat.includes('trompe') ||
    normName.includes('illusion') ||
    normName.includes('cédrat') ||
    normName.includes('noisette cœur')
  ) {
    return 'trompe_oeil';
  }

  // 3. Keyword heuristics for Pièces Montées
  if (
    normName.includes('pièce montée') ||
    normName.includes('piece montee') ||
    normName.includes('wedding cake') ||
    normName.includes('mariage') ||
    normName.includes('number cake') ||
    normName.includes('letter cake') ||
    normName.includes('gâteau d’anniversaire') ||
    normName.includes('gateau d\'anniversaire') ||
    normCat.includes('pièce montée') ||
    normCat.includes('piece montee') ||
    normCat.includes('wedding')
  ) {
    return 'piece_montee';
  }

  // 4. Keyword heuristics for Gâteaux Orientaux
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

  // 5. Keyword heuristics for Mille-Feuille
  if (
    normName.includes('mille-feuille') ||
    normName.includes('millefeuille') ||
    normName.includes('mille feuille') ||
    normName.includes('palmier') ||
    normName.includes('feuilletage') ||
    normCat.includes('mille-feuille') ||
    normCat.includes('millefeuille')
  ) {
    return 'mille_feuille';
  }

  // 6. Keyword heuristics for Viennoiserie
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
    normCat.includes('bread & savory')
  ) {
    return 'viennoiserie';
  }

  // 7. Keyword heuristics for Gâteaux Secs
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

  // 8. Keyword heuristics for Pâtisserie Fine (Entremets, Tartes, Éclairs, etc.)
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
    normName.includes('entremets') ||
    normName.includes('choux') ||
    normName.includes('macaron') ||
    normCat.includes('cakes & tortes') ||
    normCat.includes('tart shells') ||
    normCat.includes('finished desserts') ||
    normCat.includes('patisserie')
  ) {
    return 'patisserie_fine';
  }

  // Default fallback
  return 'patisserie_fine';
}

export interface AggregationOptions {
  targetDate?: string; // YYYY-MM-DD or 'ALL'
  storeId?: string; // specific store ID or 'ALL'
  statusFilter?: string[]; // e.g. ['PENDING', 'APPROVED', 'PROCESSING', 'IN_PRODUCTION']
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
 * Consolidates store orders across all retail locations,
 * groups items by roomId, computes batch targets, and tracks store breakdown.
 */
export function aggregateStoreOrders(
  orders: (Requisition | StoreOrder)[],
  options: AggregationOptions = {}
): AggregatedLabProductionResult {
  const targetDate = options.targetDate || 'ALL';
  const selectedStoreId = options.storeId || 'ALL';
  const statusFilter = options.statusFilter || ['PENDING', 'APPROVED', 'PROCESSING', 'IN_PRODUCTION', 'READY_FOR_DISPATCH'];

  // 1. Filter Orders
  const filteredOrders = orders.filter((order) => {
    // Status filter
    if (order.status && statusFilter.length > 0 && !statusFilter.includes(order.status)) {
      return false;
    }
    // Store filter
    if (selectedStoreId !== 'ALL' && order.storeId !== selectedStoreId) {
      return false;
    }
    // Date filter
    if (targetDate !== 'ALL') {
      const orderDate = order.dateNeeded || order.dateRequested || '';
      if (orderDate !== targetDate) {
        return false;
      }
    }
    return true;
  });

  // 2. Prepare empty reports for all 7 rooms
  const reportsMap: Record<ProductionRoomId, RoomProductionReport> = {} as any;
  const itemsByRoomAndProduct: Record<ProductionRoomId, Map<string, AggregatedProductionItem>> = {
    gateaux_secs: new Map(),
    gateaux_orientaux: new Map(),
    mille_feuille: new Map(),
    viennoiserie: new Map(),
    patisserie_fine: new Map(),
    piece_montee: new Map(),
    trompe_oeil: new Map(),
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

  // 3. Process every order line
  filteredOrders.forEach((order) => {
    const storeId = order.storeId || 'unknown-store';
    const storeName = order.storeName || 'Store Location';
    const orderId = order.id;
    const orderNumber =
      ('requisitionNumber' in order ? order.requisitionNumber : undefined) ||
      ('orderNumber' in order ? order.orderNumber : undefined) ||
      order.id;

    if (!storesMap.has(storeId)) {
      storesMap.set(storeId, { id: storeId, name: storeName, totalRequested: 0 });
    }

    const orderItems = order.items || [];
    orderItems.forEach((item: RequisitionItem | StoreOrderItem) => {
      const productName = item.productName || 'Unnamed Pastry';
      const quantity = Number(item.quantityRequested) || 0;
      if (quantity <= 0) return;

      const unit = item.unit || 'units';
      const estimatedCost = Number(item.unitEstimatedCost) || 1.0;
      const category = item.category || 'General';

      // Determine roomId
      const itemRoomId = 'roomId' in item ? item.roomId : undefined;
      const roomId = itemRoomId || getProductRoomId(productName, category);

      // Find catalog specs if available
      const catalogItem = MASTER_PRODUCT_CATALOG.find(
        (p) => p.name.toLowerCase() === productName.toLowerCase()
      );
      const standardBatchSize = catalogItem?.standardBatchSize || 24;
      const unitCost = catalogItem?.unitEstimatedCost || estimatedCost;

      // Update store overall count
      const storeStat = storesMap.get(storeId)!;
      storeStat.totalRequested += quantity;

      // Group in room
      const roomMap = itemsByRoomAndProduct[roomId];
      const productKey = productName.toLowerCase().trim();

      if (!roomMap.has(productKey)) {
        roomMap.set(productKey, {
          productId: catalogItem?.id || `prod-${productKey.replace(/\s+/g, '-').slice(0, 20)}`,
          productName,
          category: catalogItem?.category || category,
          roomId,
          unit,
          unitEstimatedCost: unitCost,
          totalQuantityRequired: 0,
          standardBatchSize,
          totalBatchesNeeded: 0,
          storeBreakdown: [],
          completedQuantity: 0,
          status: 'PENDING',
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
    const itemsList = Array.from(roomMap.values());

    // Sort items by highest required quantity
    itemsList.sort((a, b) => b.totalQuantityRequired - a.totalQuantityRequired);

    let roomUnits = 0;
    let roomCost = 0;
    const roomParticipatingStores = new Set<string>();

    itemsList.forEach((item) => {
      // Calculate total batches
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
  return (
    PRODUCTION_ROOMS.find((r) => r.id === roomId) ||
    PRODUCTION_ROOMS[0]
  );
}
