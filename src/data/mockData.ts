import { StoreLocation, RawMaterial, Supplier, Receipt, Requisition, Recipe, ActivityLogItem, SemiFinishedStockItem, RetailProduct, RetailStoreStock, SaleTransaction, UnsoldProductLog, LabWasteLog, DailyStoreInventory, DeliveryManifest, TransitWasteLog, PackagingMaterial, StorePackagingInventory, PackagingDispatch, PackagingRequisition, InventoryAdjustment, ChefVoiceNote } from '../types';

export const INITIAL_STORES: StoreLocation[] = [
  {
    id: 'store-1',
    name: 'Douera 01',
    code: 'STR-DOU-01',
    address: 'Centre Ville, Douera 01',
    managerName: 'Hamza',
    phone: '(023) 12-34-56',
  },
  {
    id: 'store-2',
    name: 'Douera 02',
    code: 'STR-DOU-02',
    address: 'Avenue Principale, Douera 02',
    managerName: 'Billal',
    phone: '(023) 23-45-67',
  },
  {
    id: 'store-3',
    name: 'Oued Terfa',
    code: 'STR-OT-03',
    address: 'Cité Oued Terfa, El Achour',
    managerName: 'Ryad',
    phone: '(023) 34-56-78',
  },
  {
    id: 'store-4',
    name: 'El Achour',
    code: 'STR-EA-04',
    address: 'Boulevard El Achour, Alger',
    managerName: 'Ryad',
    phone: '(023) 45-67-89',
  },
  {
    id: 'store-5',
    name: 'Blida',
    code: 'STR-BLD-05',
    address: 'Centre Ville, Blida',
    managerName: 'Khaled',
    phone: '(025) 56-78-90',
  },
  {
    id: 'store-6',
    name: 'Boufarik',
    code: 'STR-BFK-06',
    address: 'Rue Principale, Boufarik',
    managerName: 'Ahmed',
    phone: '(025) 67-89-01',
  },
];

export const INITIAL_RAW_MATERIALS: RawMaterial[] = [
  {
    id: 'rm_farine_t45',
    name: 'Farine T45',
    sku: 'MP-001',
    category: 'Flour & Grains',
    unit: 'kg',
    currentStock: 100,
    currentAvgCost: 120,
    reorderLevel: 20,
    min_reorder_level: 20,
    totalPurchasedQty: 450,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_beurre_tourage_84',
    name: 'Beurre de Feuilletage 84%',
    sku: 'MP-002',
    category: 'Fats & Oils',
    unit: 'kg',
    currentStock: 50,
    currentAvgCost: 900,
    reorderLevel: 15,
    min_reorder_level: 15,
    totalPurchasedQty: 250,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_sucre_cristal',
    name: 'Sucre Cristal',
    sku: 'MP-003',
    category: 'Sugars & Sweeteners',
    unit: 'kg',
    currentStock: 80,
    currentAvgCost: 100,
    reorderLevel: 20,
    min_reorder_level: 20,
    totalPurchasedQty: 300,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_sucre_glace',
    name: 'Sucre Glace',
    sku: 'MP-004',
    category: 'Sugars & Sweeteners',
    unit: 'kg',
    currentStock: 30,
    currentAvgCost: 140,
    reorderLevel: 10,
    min_reorder_level: 10,
    totalPurchasedQty: 150,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_oeufs_frais',
    name: 'Œufs Frais',
    sku: 'MP-005',
    category: 'Dairy & Eggs',
    unit: 'units',
    currentStock: 300,
    currentAvgCost: 25,
    reorderLevel: 50,
    min_reorder_level: 50,
    totalPurchasedQty: 1200,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_lait_entier_uht',
    name: 'Lait Entier UHT',
    sku: 'MP-006',
    category: 'Dairy & Eggs',
    unit: 'L',
    currentStock: 60,
    currentAvgCost: 150,
    reorderLevel: 15,
    min_reorder_level: 15,
    totalPurchasedQty: 200,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_chocolat_noir_55',
    name: 'Chocolat Noir 55%',
    sku: 'MP-007',
    category: 'Chocolate & Cocoa',
    unit: 'kg',
    currentStock: 30,
    currentAvgCost: 1800,
    reorderLevel: 10,
    min_reorder_level: 10,
    totalPurchasedQty: 120,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_amandes_poudre',
    name: 'Amandes Poudre',
    sku: 'MP-008',
    category: 'Fruits & Nuts',
    unit: 'kg',
    currentStock: 25,
    currentAvgCost: 2200,
    reorderLevel: 5,
    min_reorder_level: 5,
    totalPurchasedQty: 80,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_sel_fin',
    name: 'Sel Fin',
    sku: 'MP-009',
    category: 'Other',
    unit: 'kg',
    currentStock: 25,
    currentAvgCost: 80,
    reorderLevel: 5,
    min_reorder_level: 5,
    totalPurchasedQty: 100,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_levure_boulangere',
    name: 'Levure Boulangère',
    sku: 'MP-010',
    category: 'Other',
    unit: 'kg',
    currentStock: 15,
    currentAvgCost: 600,
    reorderLevel: 5,
    min_reorder_level: 5,
    totalPurchasedQty: 60,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_creme_liquide_35',
    name: 'Crème Liquide 35% MG',
    sku: 'MP-011',
    category: 'Dairy & Eggs',
    unit: 'L',
    currentStock: 40,
    currentAvgCost: 780,
    reorderLevel: 10,
    min_reorder_level: 10,
    totalPurchasedQty: 120,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_poudre_creme',
    name: 'Poudre à Crème Vanillée',
    sku: 'MP-012',
    category: 'Flavorings & Vanilla',
    unit: 'kg',
    currentStock: 20,
    currentAvgCost: 480,
    reorderLevel: 5,
    min_reorder_level: 5,
    totalPurchasedQty: 50,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_gousse_vanille_bourbon',
    name: 'Gousses de Vanille Bourbon',
    sku: 'MP-013',
    category: 'Flavorings & Vanilla',
    unit: 'units',
    currentStock: 100,
    currentAvgCost: 380,
    reorderLevel: 20,
    min_reorder_level: 20,
    totalPurchasedQty: 300,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rm_fondant_blanc',
    name: 'Fondant Pâtissier Blanc',
    sku: 'MP-014',
    category: 'Sugars & Sweeteners',
    unit: 'kg',
    currentStock: 40,
    currentAvgCost: 360,
    reorderLevel: 10,
    min_reorder_level: 10,
    totalPurchasedQty: 100,
    lastUpdated: new Date().toISOString(),
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Les Grands Moulins de Paris',
    contactPerson: 'Henri Laurent',
    email: 'orders@grmoulins.fr',
    phone: '+33 1 45 67 89 00',
    categoriesProvided: ['Flour & Grains'],
    paymentTerms: 'Net 30 Days',
  },
  {
    id: 'sup-2',
    name: 'Isigny Sainte-Mère Dairy Co-op',
    contactPerson: 'Sylvie Dupont',
    email: 'supply@isigny-ste-mere.com',
    phone: '+33 2 31 51 63 00',
    categoriesProvided: ['Fats & Oils', 'Dairy & Eggs'],
    paymentTerms: 'Net 15 Days',
  },
  {
    id: 'sup-3',
    name: 'Valrhona Grand Chocolat Supply',
    contactPerson: 'Antoine Mercier',
    email: 'pro-sales@valrhona.com',
    phone: '+33 4 75 07 60 00',
    categoriesProvided: ['Chocolate & Cocoa'],
    paymentTerms: 'Net 30 Days',
  },
  {
    id: 'sup-4',
    name: 'SunFresh Organics & Fruits',
    contactPerson: 'Maria Rodriguez',
    email: 'orders@sunfreshorganics.com',
    phone: '(555) 987-6543',
    categoriesProvided: ['Fruits & Nuts', 'Dairy & Eggs'],
    paymentTerms: 'Net 7 Days',
  },
  {
    id: 'sup-5',
    name: 'Global Spice & Extract Imports',
    contactPerson: 'Vikram Patel',
    email: 'imports@globalspicenet.com',
    phone: '(555) 876-5432',
    categoriesProvided: ['Flavorings & Vanilla', 'Sugars & Sweeteners'],
    paymentTerms: 'Prepaid',
  },
];

export const INITIAL_RECEIPTS: Receipt[] = [
  {
    id: 'rec-1001',
    receiptNumber: 'REC-2026-0801-01',
    supplierId: 'sup-2',
    supplierName: 'Isigny Sainte-Mère Dairy Co-op',
    invoiceNumber: 'INV-ISG-98441',
    purchaseDate: '2026-08-01',
    recordedAt: '2026-08-01T14:30:00Z',
    items: [
      {
        id: 'ri-1',
        rawMaterialId: 'rm-3',
        rawMaterialName: 'AOP Isigny Dry Sheet Butter 84%',
        unit: 'kg',
        quantity: 50,
        unitPrice: 9.80,
        totalCost: 490.00,
      },
      {
        id: 'ri-2',
        rawMaterialId: 'rm-10',
        rawMaterialName: 'Heavy Cream 35% Fat',
        unit: 'L',
        quantity: 40,
        unitPrice: 4.80,
        totalCost: 192.00,
      },
    ],
    totalAmount: 682.00,
    notes: 'Chilled delivery received in excellent condition at 3°C.',
    recordedBy: 'Head Chef Chef Pierre',
  },
  {
    id: 'rec-1002',
    receiptNumber: 'REC-2026-0801-02',
    supplierId: 'sup-1',
    supplierName: 'Les Grands Moulins de Paris',
    invoiceNumber: 'INV-GMP-33420',
    purchaseDate: '2026-08-01',
    recordedAt: '2026-08-01T16:15:00Z',
    items: [
      {
        id: 'ri-3',
        rawMaterialId: 'rm-1',
        rawMaterialName: 'High-Protein Bread Flour (T65)',
        unit: 'kg',
        quantity: 200,
        unitPrice: 1.45,
        totalCost: 290.00,
      },
      {
        id: 'ri-4',
        rawMaterialId: 'rm-7',
        rawMaterialName: 'Fine Granulated Sugar',
        unit: 'kg',
        quantity: 100,
        unitPrice: 1.10,
        totalCost: 110.00,
      },
    ],
    totalAmount: 400.00,
    notes: 'Pallet drop delivered to central lab unloading bay.',
    recordedBy: 'Inventory Lead Mark',
  },
];

export const INITIAL_REQUISITIONS: Requisition[] = [
  {
    id: 'req-2001',
    requisitionNumber: 'REQ-2026-0802-001',
    storeId: 'store-1',
    storeName: 'Douera 01',
    requestedBy: 'Hamza (Gérant Douera 01)',
    dateRequested: '2026-08-02',
    dateNeeded: '2026-08-03',
    status: 'PENDING',
    items: [
      {
        id: 'rqi-1',
        productName: 'Butter Croissants (Raw Laminated Frozen Batches)',
        category: 'Croissants & Pastries',
        quantityRequested: 150,
        unit: 'units',
        unitEstimatedCost: 0.95,
      },
      {
        id: 'rqi-2',
        productName: 'Pain au Chocolat (Frozen Ready-to-Bake)',
        category: 'Croissants & Pastries',
        quantityRequested: 100,
        unit: 'units',
        unitEstimatedCost: 1.15,
      },
      {
        id: 'rqi-3',
        productName: 'Valrhona Dark Chocolate Ganache Base',
        category: 'Fillings & Creams',
        quantityRequested: 10,
        unit: 'kg',
        unitEstimatedCost: 14.20,
      },
    ],
    totalEstimatedCost: 400.00,
    notes: 'Forte affluence matinale attendue; livraison demandée avant 06h30.',
  },
  {
    id: 'req-2002',
    requisitionNumber: 'REQ-2026-0801-004',
    storeId: 'store-2',
    storeName: 'Douera 02',
    requestedBy: 'Billal (Gérant Douera 02)',
    dateRequested: '2026-08-01',
    dateNeeded: '2026-08-02',
    status: 'PROCESSING',
    items: [
      {
        id: 'rqi-4',
        productName: 'Raspberry Almond Tart Shells (Pre-baked 8")',
        category: 'Tart Shells & Bases',
        quantityRequested: 24,
        unit: 'units',
        unitEstimatedCost: 3.40,
      },
      {
        id: 'rqi-5',
        productName: 'Vanilla Bean Diplomat Pastry Cream',
        category: 'Fillings & Creams',
        quantityRequested: 15,
        unit: 'kg',
        unitEstimatedCost: 6.80,
      },
    ],
    totalEstimatedCost: 183.60,
    notes: 'Réassort vitrine pour le weekend.',
  },
  {
    id: 'req-2003',
    requisitionNumber: 'REQ-2026-0731-002',
    storeId: 'store-3',
    storeName: 'Oued Terfa',
    requestedBy: 'Ryad (Gérant Oued Terfa)',
    dateRequested: '2026-07-31',
    dateNeeded: '2026-08-01',
    status: 'DELIVERED',
    deliveredAt: '2026-08-01T07:15:00Z',
    items: [
      {
        id: 'rqi-6',
        productName: 'Butter Croissants (Raw Laminated Frozen Batches)',
        category: 'Croissants & Pastries',
        quantityRequested: 200,
        fulfilledQuantity: 200,
        unit: 'units',
        unitEstimatedCost: 0.95,
      },
      {
        id: 'rqi-7',
        productName: 'Pistachio Paris-Brest Choux Shells',
        category: 'Finished Desserts',
        quantityRequested: 40,
        fulfilledQuantity: 40,
        unit: 'units',
        unitEstimatedCost: 2.80,
      },
    ],
    totalEstimatedCost: 302.00,
    notes: 'Réceptionné conforme par l’équipe du matin.',
  },
  {
    id: 'req-2004',
    requisitionNumber: 'REQ-2026-0802-002',
    storeId: 'store-4',
    storeName: 'El Achour',
    requestedBy: 'Ryad (Gérant El Achour)',
    dateRequested: '2026-08-02',
    dateNeeded: '2026-08-03',
    status: 'APPROVED',
    items: [
      {
        id: 'rqi-8',
        productName: 'Pain au Chocolat (Frozen Ready-to-Bake)',
        category: 'Croissants & Pastries',
        quantityRequested: 120,
        unit: 'units',
        unitEstimatedCost: 1.15,
      },
      {
        id: 'rqi-9',
        productName: 'Eco Pastry Boxes (Window 6x6")',
        category: 'Finished Desserts',
        quantityRequested: 150,
        unit: 'units',
        unitEstimatedCost: 0.45,
      },
    ],
    totalEstimatedCost: 205.50,
    notes: 'Commandes traiteur et coffrets cadeaux.',
  },
  {
    id: 'req-2005',
    requisitionNumber: 'REQ-2026-0803-001',
    storeId: 'store-5',
    storeName: 'Blida',
    requestedBy: 'Khaled (Gérant Blida)',
    dateRequested: '2026-08-03',
    dateNeeded: '2026-08-04',
    status: 'PENDING',
    items: [
      {
        id: 'rqi-10',
        productName: 'Artisan Butter Croissant (Pur Beurre)',
        category: 'Croissants & Pastries',
        quantityRequested: 180,
        unit: 'units',
        unitEstimatedCost: 0.95,
      },
      {
        id: 'rqi-11',
        productName: 'Mille-Feuille Classique Vanille Bourbon',
        category: 'Mille-Feuille',
        quantityRequested: 60,
        unit: 'pieces',
        unitEstimatedCost: 0.90,
      },
      {
        id: 'rqi-11b',
        productName: 'Baklawa Royale aux Amandes & Miel Pur',
        category: 'Gâteaux Orientaux',
        quantityRequested: 80,
        unit: 'pieces',
        unitEstimatedCost: 1.20,
      },
    ],
    totalEstimatedCost: 321.00,
    notes: 'Livraison circuit Mitidja matinée.',
  },
  {
    id: 'req-2006',
    requisitionNumber: 'REQ-2026-0803-002',
    storeId: 'store-6',
    storeName: 'Boufarik',
    requestedBy: 'Ahmed (Gérant Boufarik)',
    dateRequested: '2026-08-03',
    dateNeeded: '2026-08-04',
    status: 'APPROVED',
    items: [
      {
        id: 'rqi-12',
        productName: 'Pistachio Paris-Brest Choux Shells',
        category: 'Finished Desserts',
        quantityRequested: 60,
        unit: 'units',
        unitEstimatedCost: 2.80,
      },
      {
        id: 'rqi-12b',
        productName: 'Sablé Traditionnel Confiture Fraise / Abricot',
        category: 'Gâteaux Secs',
        quantityRequested: 100,
        unit: 'pieces',
        unitEstimatedCost: 0.45,
      },
      {
        id: 'rqi-12c',
        productName: 'Trompe-l’œil Citron Cédrat & Menthe Fraîche',
        category: 'Trompe-l’œil',
        quantityRequested: 25,
        unit: 'pieces',
        unitEstimatedCost: 3.20,
      },
    ],
    totalEstimatedCost: 293.00,
    notes: 'Réassort spécial viennoiseries, gâteaux secs et créations trompe-l’œil.',
  },
  {
    id: 'req-2007',
    requisitionNumber: 'REQ-2026-0804-001',
    storeId: 'store-1',
    storeName: 'Douera 01',
    requestedBy: 'Hamza (Gérant Douera 01)',
    dateRequested: '2026-08-04',
    dateNeeded: '2026-08-05',
    status: 'approved',
    items: [
      {
        id: 'rqi-13',
        productName: 'Artisan Butter Croissant (Pur Beurre)',
        category: 'Croissants & Pastries',
        quantityRequested: 120,
        unit: 'units',
        unitEstimatedCost: 0.95,
      },
      {
        id: 'rqi-14',
        productName: 'Valrhona Pain au Chocolat (Chocolatine)',
        category: 'Croissants & Pastries',
        quantityRequested: 90,
        unit: 'units',
        unitEstimatedCost: 1.15,
      },
      {
        id: 'rqi-15',
        productName: 'Mille-Feuille Classique Vanille Bourbon',
        category: 'Mille-Feuille',
        quantityRequested: 50,
        unit: 'pieces',
        unitEstimatedCost: 0.90,
      },
      {
        id: 'rqi-16',
        productName: 'Baklawa Royale aux Amandes & Miel Pur',
        category: 'Gâteaux Orientaux',
        quantityRequested: 50,
        unit: 'pieces',
        unitEstimatedCost: 1.20,
      },
      {
        id: 'rqi-17',
        productName: 'Sablé Traditionnel Confiture Fraise / Abricot',
        category: 'Gâteaux Secs',
        quantityRequested: 80,
        unit: 'pieces',
        unitEstimatedCost: 0.45,
      },
      {
        id: 'rqi-18',
        productName: 'Trompe-l’œil Noisette Cœur Praliné Coulant',
        category: 'Trompe-l’œil',
        quantityRequested: 20,
        unit: 'pieces',
        unitEstimatedCost: 3.50,
      },
    ],
    totalEstimatedCost: 428.50,
    notes: 'Commande journalière consolidée pour Douera 01.',
  },
  {
    id: 'req-2008',
    requisitionNumber: 'REQ-2026-0804-002',
    storeId: 'store-2',
    storeName: 'Douera 02',
    requestedBy: 'Billal (Gérant Douera 02)',
    dateRequested: '2026-08-04',
    dateNeeded: '2026-08-05',
    status: 'approved',
    items: [
      {
        id: 'rqi-19',
        productName: 'Artisan Butter Croissant (Pur Beurre)',
        category: 'Croissants & Pastries',
        quantityRequested: 80,
        unit: 'units',
        unitEstimatedCost: 0.95,
      },
      {
        id: 'rqi-20',
        productName: 'Mille-Feuille Classique Vanille Bourbon',
        category: 'Mille-Feuille',
        quantityRequested: 40,
        unit: 'pieces',
        unitEstimatedCost: 0.90,
      },
      {
        id: 'rqi-21',
        productName: 'Madagascar Vanilla Bean Éclair',
        category: 'Tart Shells & Desserts',
        quantityRequested: 35,
        unit: 'units',
        unitEstimatedCost: 1.60,
      },
      {
        id: 'rqi-22',
        productName: 'Pièce Montée Pyramide Choux & Nougatine Caramel',
        category: 'Pièce Montée',
        quantityRequested: 1,
        unit: 'parts',
        unitEstimatedCost: 45.00,
      },
    ],
    totalEstimatedCost: 213.00,
    notes: 'Comprend 1 pièce montée réservée pour un banquet client.',
  },
  {
    id: 'req-2009',
    requisitionNumber: 'REQ-2026-0804-003',
    storeId: 'store-3',
    storeName: 'Oued Terfa',
    requestedBy: 'Ryad (Gérant Oued Terfa)',
    dateRequested: '2026-08-04',
    dateNeeded: '2026-08-05',
    status: 'PENDING',
    items: [
      {
        id: 'rqi-23',
        productName: 'Makroud El Louz Cœur Moelleux Citron',
        category: 'Gâteaux Orientaux',
        quantityRequested: 60,
        unit: 'pieces',
        unitEstimatedCost: 1.10,
      },
      {
        id: 'rqi-24',
        productName: 'Baklawa Royale aux Amandes & Miel Pur',
        category: 'Gâteaux Orientaux',
        quantityRequested: 40,
        unit: 'pieces',
        unitEstimatedCost: 1.20,
      },
      {
        id: 'rqi-25',
        productName: 'Valrhona Pain au Chocolat (Chocolatine)',
        category: 'Croissants & Pastries',
        quantityRequested: 70,
        unit: 'units',
        unitEstimatedCost: 1.15,
      },
      {
        id: 'rqi-26',
        productName: 'Mille-Feuille Praliné Noisette Croustillant',
        category: 'Mille-Feuille',
        quantityRequested: 30,
        unit: 'pieces',
        unitEstimatedCost: 1.25,
      },
    ],
    totalEstimatedCost: 232.50,
    notes: 'Réassort rayon oriental et viennoiserie.',
  },
];

export const INITIAL_RECIPES: Recipe[] = [
  // SEMI-FINISHED SUB-RECIPES
  {
    id: 'sf-recipe-1',
    name: 'Vanilla Bean Crème Pâtissière (Pastry Cream)',
    category: 'Creams & Fillings',
    recipeType: 'SEMI_FINISHED',
    yieldUnits: 10,
    unitName: 'kg',
    prepTimeMinutes: 45,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-10', quantity: 6.0 }, // Heavy Cream / Milk
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-7', quantity: 1.5 },  // Sugar
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-9', quantity: 30 },   // Eggs
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-2', quantity: 0.8 },  // T45 Flour
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-11', quantity: 20 },  // Vanilla Pods
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-4', quantity: 0.5 },  // Butter
    ],
    suggestedSellingPrice: 0,
    instructions: 'Scald milk with vanilla bean paste. Whisk yolks with sugar and T45 flour. Temper and cook until thick paste forms, finish with cold butter. Chill quickly.',
  },
  {
    id: 'sf-recipe-2',
    name: 'Valrhona 70% Dark Chocolate Ganache Base',
    category: 'Creams & Fillings',
    recipeType: 'SEMI_FINISHED',
    yieldUnits: 8,
    unitName: 'kg',
    prepTimeMinutes: 30,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-5', quantity: 4.0 }, // Valrhona 70% Chocolate
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-10', quantity: 3.5 }, // Heavy Cream
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-4', quantity: 0.5 },  // Artisan Butter
    ],
    suggestedSellingPrice: 0,
    instructions: 'Emulsify scalded cream over Valrhona chocolate pistolles in 3 stages. Add cubed cold butter at 40°C and immersion blend for glossy sheen.',
  },
  {
    id: 'sf-recipe-3',
    name: 'Laminated Feuilletage Butter Dough Base',
    category: 'Dough & Bases',
    recipeType: 'SEMI_FINISHED',
    yieldUnits: 15,
    unitName: 'kg',
    prepTimeMinutes: 120,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-1', quantity: 8.0 }, // T65 Flour
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-3', quantity: 4.5 }, // Isigny Sheet Butter
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-7', quantity: 0.8 }, // Sugar
    ],
    suggestedSellingPrice: 0,
    instructions: 'Mix détrempe dough, rest chilled 4 hours. Encase Isigny butter block, perform 3 single envelope folds with 1-hour chilled rests between folds.',
  },
  {
    id: 'sf-recipe-4',
    name: 'Almond Frangipane Cream Base',
    category: 'Creams & Fillings',
    recipeType: 'SEMI_FINISHED',
    yieldUnits: 6,
    unitName: 'kg',
    prepTimeMinutes: 25,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-12', quantity: 2.5 }, // Almond Flour
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-8', quantity: 1.5 },  // Icing Sugar
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-4', quantity: 1.2 },  // Butter
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-9', quantity: 18 },   // Eggs
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-11', quantity: 10 },  // Vanilla
    ],
    suggestedSellingPrice: 0,
    instructions: 'Cream soft butter with icing sugar. Gradually incorporate egg volume, fold in almond flour and vanilla extract. Store chilled.',
  },

  // FINISHED PRODUCTS
  {
    id: 'recipe-1',
    name: 'Artisan French Butter Croissants',
    category: 'Viennoiserie',
    recipeType: 'FINISHED',
    yieldUnits: 50,
    unitName: 'croissants',
    prepTimeMinutes: 180,
    ingredients: [
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-3', quantity: 3.5 }, // 3.5 kg Laminated Dough
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-3', quantity: 0.5 },                 // 0.5 kg Isigny Butter for lamination glaze
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-9', quantity: 4 },                   // Egg wash
    ],
    suggestedSellingPrice: 4.50,
    instructions: 'Sheet laminated dough to 3.5mm. Cut 110g triangles, roll snugly. Proof 2.5 hours at 26°C with 80% humidity. Egg wash twice and bake at 190°C for 16 mins.',
  },
  {
    id: 'recipe-2',
    name: 'Valrhona 70% Dark Chocolate Tart',
    category: 'Tarts & Entremets',
    recipeType: 'FINISHED',
    yieldUnits: 12,
    unitName: '8" tarts',
    prepTimeMinutes: 120,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-2', quantity: 1.8 },                  // T45 Flour for crust
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-4', quantity: 0.9 },                  // Butter for crust
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-8', quantity: 0.5 },                  // Sugar for crust
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-2', quantity: 2.5 },  // Valrhona Ganache Base
    ],
    suggestedSellingPrice: 38.00,
    instructions: 'Blind bake sweet pastry shell at 160°C until golden. Warm semi-finished Valrhona ganache base to 38°C and pour smoothly into cooled shells.',
  },
  {
    id: 'recipe-3',
    name: 'Madagascar Vanilla & Raspberry Macarons',
    category: 'Macarons & Small Treats',
    recipeType: 'FINISHED',
    yieldUnits: 100,
    unitName: 'macarons',
    prepTimeMinutes: 90,
    ingredients: [
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-12', quantity: 1.0 },                 // Almond Flour
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-8', quantity: 1.0 },                  // Powdered Sugar
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-9', quantity: 24 },                  // Egg Whites
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-13', quantity: 0.8 },                 // Raspberries
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-1', quantity: 1.2 },  // Vanilla Crème Pâtissière
    ],
    suggestedSellingPrice: 2.80,
    instructions: 'Italian meringue macaronage. Pipe shells onto silicon mats, rest 30 mins. Sandwich with vanilla crème pâtissière and raspberry center.',
  },
  {
    id: 'recipe-4',
    name: 'Vanilla Bean & Almond Mille-Feuille',
    category: 'Pâtisserie',
    recipeType: 'FINISHED',
    yieldUnits: 20,
    unitName: 'portions',
    prepTimeMinutes: 110,
    ingredients: [
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-3', quantity: 2.5 },  // Laminated Dough
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-1', quantity: 2.0 },  // Vanilla Crème Pâtissière
      { type: 'SEMI_FINISHED', semiFinishedRecipeId: 'sf-recipe-4', quantity: 1.0 },  // Almond Frangipane
      { type: 'RAW_MATERIAL', rawMaterialId: 'rm-8', quantity: 0.4 },                  // Powdered Sugar
    ],
    suggestedSellingPrice: 8.50,
    instructions: 'Bake caramelized puff pastry sheets under heavy trays at 190°C. Pipe 3 layers of vanilla crème pâtissière & frangipane cream, dust top with fondant icing.',
  },
];

export const INITIAL_SEMI_FINISHED_STOCK: SemiFinishedStockItem[] = [
  {
    id: 'sf-stock-1',
    recipeId: 'sf-recipe-1',
    recipeName: 'Vanilla Bean Crème Pâtissière (Pastry Cream)',
    category: 'Creams & Fillings',
    currentStock: 24.5,
    unit: 'kg',
    minStockLevel: 10.0,
    lastUpdated: '2026-08-02',
  },
  {
    id: 'sf-stock-2',
    recipeId: 'sf-recipe-2',
    recipeName: 'Valrhona 70% Dark Chocolate Ganache Base',
    category: 'Creams & Fillings',
    currentStock: 16.0,
    unit: 'kg',
    minStockLevel: 5.0,
    lastUpdated: '2026-08-01',
  },
  {
    id: 'sf-stock-3',
    recipeId: 'sf-recipe-3',
    recipeName: 'Laminated Feuilletage Butter Dough Base',
    category: 'Dough & Bases',
    currentStock: 35.0,
    unit: 'kg',
    minStockLevel: 15.0,
    lastUpdated: '2026-08-02',
  },
  {
    id: 'sf-stock-4',
    recipeId: 'sf-recipe-4',
    recipeName: 'Almond Frangipane Cream Base',
    category: 'Creams & Fillings',
    currentStock: 12.0,
    unit: 'kg',
    minStockLevel: 5.0,
    lastUpdated: '2026-07-31',
  },
];

export const CATALOG_PRODUCTS = [
  { name: 'Butter Croissants (Raw Laminated Frozen Batches)', category: 'Croissants & Pastries' as const, unit: 'units', unitEstimatedCost: 0.95 },
  { name: 'Pain au Chocolat (Frozen Ready-to-Bake)', category: 'Croissants & Pastries' as const, unit: 'units', unitEstimatedCost: 1.15 },
  { name: 'Almond Twice-Baked Croissant Base', category: 'Croissants & Pastries' as const, unit: 'units', unitEstimatedCost: 1.40 },
  { name: 'Raspberry Almond Tart Shells (Pre-baked 8")', category: 'Tart Shells & Bases' as const, unit: 'units', unitEstimatedCost: 3.40 },
  { name: 'Valrhona Dark Chocolate Tart Shells (Pre-baked 8")', category: 'Tart Shells & Bases' as const, unit: 'units', unitEstimatedCost: 3.80 },
  { name: 'Vanilla Bean Diplomat Pastry Cream', category: 'Fillings & Creams' as const, unit: 'kg', unitEstimatedCost: 6.80 },
  { name: 'Valrhona Dark Chocolate Ganache Base', category: 'Fillings & Creams' as const, unit: 'kg', unitEstimatedCost: 14.20 },
  { name: 'Pistachio Paris-Brest Choux Shells', category: 'Finished Desserts' as const, unit: 'units', unitEstimatedCost: 2.80 },
  { name: 'Assorted Macaron Shell Trays (100 count)', category: 'Finished Desserts' as const, unit: 'trays', unitEstimatedCost: 22.00 },
  { name: 'Eco Pastry Boxes (Window 6x6")', category: 'Finished Desserts' as const, unit: 'units', unitEstimatedCost: 0.45 },
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: 'act-101',
    type: 'REQUISITION_CREATED',
    title: 'New Store Requisition Submitted',
    description: 'Douera 01 submitted requisition REQ-2026-0802-001 (3 items, est. 400.00 DZD)',
    timestamp: '2026-08-02T10:15:00Z',
    actor: 'Hamza (Gérant Douera 01)',
    badgeText: 'PENDING',
    severity: 'info',
    metadata: {
      amount: 400.00,
      storeName: 'Douera 01',
      referenceNumber: 'REQ-2026-0802-001',
      itemCount: 3,
    },
  },
  {
    id: 'act-102',
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Requisition Approved',
    description: 'Central Lab Head Chef approved REQ-2026-0802-002 for El Achour.',
    timestamp: '2026-08-02T09:30:00Z',
    actor: 'Chef Hakim',
    badgeText: 'APPROVED',
    severity: 'purple',
    metadata: {
      amount: 205.50,
      storeName: 'El Achour',
      referenceNumber: 'REQ-2026-0802-002',
      status: 'APPROVED',
    },
  },
  {
    id: 'act-103',
    type: 'RECEIPT_CREATED',
    title: 'Raw Material Purchase Received',
    description: 'Recorded receipt REC-2026-0801-01 from Isigny Sainte-Mère Dairy Co-op (682.00 DZD total). Stock & weighted unit costs auto-updated.',
    timestamp: '2026-08-01T14:30:00Z',
    actor: 'Chef Hakim',
    badgeText: 'PURCHASE',
    severity: 'success',
    metadata: {
      amount: 682.00,
      supplierName: 'Isigny Sainte-Mère Dairy Co-op',
      referenceNumber: 'REC-2026-0801-01',
      itemCount: 2,
    },
  },
  {
    id: 'act-104',
    type: 'RECEIPT_CREATED',
    title: 'Flour & Grain Shipment Received',
    description: 'Recorded receipt REC-2026-0801-02 from Les Grands Moulins de Paris (400.00 DZD total). 200kg T65 Flour added.',
    timestamp: '2026-08-01T16:15:00Z',
    actor: 'Inventory Lead Mark',
    badgeText: 'PURCHASE',
    severity: 'success',
    metadata: {
      amount: 400.00,
      supplierName: 'Les Grands Moulins de Paris',
      referenceNumber: 'REC-2026-0801-02',
      itemCount: 2,
    },
  },
  {
    id: 'act-105',
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Requisition Marked Delivered',
    description: 'Requisition REQ-2026-0731-002 was fulfilled & successfully delivered to Oued Terfa.',
    timestamp: '2026-08-01T07:15:00Z',
    actor: 'Logistics Team',
    badgeText: 'DELIVERED',
    severity: 'success',
    metadata: {
      amount: 302.00,
      storeName: 'Oued Terfa',
      referenceNumber: 'REQ-2026-0731-002',
      status: 'DELIVERED',
    },
  },
  {
    id: 'act-106',
    type: 'SUPPLIER_ADDED',
    title: 'Approved Vendor Registered',
    description: 'Global Spice & Extract Imports added as approved vendor for Flavorings & Vanilla.',
    timestamp: '2026-07-30T11:00:00Z',
    actor: 'Purchasing Department',
    badgeText: 'VENDOR',
    severity: 'info',
    metadata: {
      supplierName: 'Global Spice & Extract Imports',
    },
  },
];

export const INITIAL_RETAIL_PRODUCTS: RetailProduct[] = [
  {
    id: 'prod-1',
    name: 'Artisan Butter Croissant',
    category: 'Croissants & Pastries',
    price: 3.80,
    costPrice: 0.95,
    unit: 'units',
    sku: 'PAST-CROIS-01',
    description: 'Laminated French AOP butter croissant, golden crispy crust with airy honeycomb crumb.',
  },
  {
    id: 'prod-2',
    name: 'Valrhona Pain au Chocolat',
    category: 'Croissants & Pastries',
    price: 4.40,
    costPrice: 1.15,
    unit: 'units',
    sku: 'PAST-PAINCHOC-02',
    description: 'Double Valrhona dark chocolate baton wrapped in flaky French puff pastry.',
  },
  {
    id: 'prod-3',
    name: 'Double Almond Cream Croissant',
    category: 'Croissants & Pastries',
    price: 4.90,
    costPrice: 1.40,
    unit: 'units',
    sku: 'PAST-ALMCROIS-03',
    description: 'Twice-baked croissant loaded with rich frangipane almond cream and toasted almonds.',
  },
  {
    id: 'prod-4',
    name: 'Fresh Raspberry Almond Tartlet 4"',
    category: 'Tart Shells & Desserts',
    price: 6.80,
    costPrice: 2.20,
    unit: 'units',
    sku: 'TART-RASP-04',
    description: 'Crisp sweet pastry shell, almond frangipane, vanilla pastry cream & fresh raspberries.',
  },
  {
    id: 'prod-5',
    name: 'Madagascar Vanilla Bean Éclair',
    category: 'Tart Shells & Desserts',
    price: 5.50,
    costPrice: 1.60,
    unit: 'units',
    sku: 'DESS-ECLAIR-05',
    description: 'Crisp choux pastry filled with real Madagascar vanilla diplomat cream and fondant glaze.',
  },
  {
    id: 'prod-6',
    name: 'Pistachio Paris-Brest',
    category: 'Tart Shells & Desserts',
    price: 7.50,
    costPrice: 2.80,
    unit: 'units',
    sku: 'DESS-PARISBR-06',
    description: 'Choux ring topped with sliced almonds and piped with roasted pistachio mousseline cream.',
  },
  {
    id: 'prod-7',
    name: 'Opera Cake Slice',
    category: 'Cakes & Tortes',
    price: 7.20,
    costPrice: 2.30,
    unit: 'slices',
    sku: 'CAKE-OPERA-07',
    description: 'Almond sponge soaked in espresso coffee, layered with dark chocolate ganache and coffee buttercream.',
  },
  {
    id: 'prod-8',
    name: 'Signature Macaron Gift Box (6 pcs)',
    category: 'Macarons & Sweets',
    price: 15.00,
    costPrice: 4.50,
    unit: 'boxes',
    sku: 'SWEET-MAC-08',
    description: 'Handcrafted macaron assortment: Salted Caramel, Pistachio, Raspberry, Chocolate, Vanilla, Lemon.',
  },
  {
    id: 'prod-9',
    name: 'French Sourdough Country Loaf',
    category: 'Savory & Bread',
    price: 6.50,
    costPrice: 1.80,
    unit: 'units',
    sku: 'BREAD-SOURD-09',
    description: 'Slow-fermented artisan sourdough bread with crackling crust and rich chewy interior.',
  },
  {
    id: 'prod-10',
    name: 'Spinach & Goat Cheese Quiche Slice',
    category: 'Savory & Bread',
    price: 6.90,
    costPrice: 2.10,
    unit: 'slices',
    sku: 'SAVR-QUICHE-10',
    description: 'Flaky butter crust with rich egg custard, fresh organic spinach, and French goat cheese.',
  },
  {
    id: 'prod-11',
    name: 'Double Shot Espresso / Americano',
    category: 'Beverages & Coffee',
    price: 3.80,
    costPrice: 0.60,
    unit: 'cups',
    sku: 'BEV-ESPR-11',
    description: 'Artisan single-origin Ethiopian coffee beans roasted locally.',
  },
  {
    id: 'prod-12',
    name: 'Iced Matcha Oat Latte',
    category: 'Beverages & Coffee',
    price: 5.80,
    costPrice: 1.10,
    unit: 'cups',
    sku: 'BEV-MATCHA-12',
    description: 'Ceremonial grade Uji Japanese green tea matcha whisked with creamy oat milk.',
  }
];

export const INITIAL_RETAIL_STORE_STOCK: RetailStoreStock[] = [
  // Store 1 (Downtown Flagship)
  { id: 'stk-1-1', storeId: 'store-1', productId: 'prod-1', productName: 'Artisan Butter Croissant', category: 'Croissants & Pastries', currentStock: 48, unit: 'units', price: 3.80, costPrice: 0.95, lastUpdated: '2026-08-02' },
  { id: 'stk-1-2', storeId: 'store-1', productId: 'prod-2', productName: 'Valrhona Pain au Chocolat', category: 'Croissants & Pastries', currentStock: 35, unit: 'units', price: 4.40, costPrice: 1.15, lastUpdated: '2026-08-02' },
  { id: 'stk-1-3', storeId: 'store-1', productId: 'prod-3', productName: 'Double Almond Cream Croissant', category: 'Croissants & Pastries', currentStock: 18, unit: 'units', price: 4.90, costPrice: 1.40, lastUpdated: '2026-08-02' },
  { id: 'stk-1-4', storeId: 'store-1', productId: 'prod-4', productName: 'Fresh Raspberry Almond Tartlet 4"', category: 'Tart Shells & Desserts', currentStock: 12, unit: 'units', price: 6.80, costPrice: 2.20, lastUpdated: '2026-08-02' },
  { id: 'stk-1-5', storeId: 'store-1', productId: 'prod-5', productName: 'Madagascar Vanilla Bean Éclair', category: 'Tart Shells & Desserts', currentStock: 15, unit: 'units', price: 5.50, costPrice: 1.60, lastUpdated: '2026-08-02' },
  { id: 'stk-1-6', storeId: 'store-1', productId: 'prod-6', productName: 'Pistachio Paris-Brest', category: 'Tart Shells & Desserts', currentStock: 8, unit: 'units', price: 7.50, costPrice: 2.80, lastUpdated: '2026-08-02' },
  { id: 'stk-1-7', storeId: 'store-1', productId: 'prod-7', productName: 'Opera Cake Slice', category: 'Cakes & Tortes', currentStock: 10, unit: 'slices', price: 7.20, costPrice: 2.30, lastUpdated: '2026-08-02' },
  { id: 'stk-1-8', storeId: 'store-1', productId: 'prod-8', productName: 'Signature Macaron Gift Box (6 pcs)', category: 'Macarons & Sweets', currentStock: 22, unit: 'boxes', price: 15.00, costPrice: 4.50, lastUpdated: '2026-08-02' },
  { id: 'stk-1-9', storeId: 'store-1', productId: 'prod-9', productName: 'French Sourdough Country Loaf', category: 'Savory & Bread', currentStock: 14, unit: 'units', price: 6.50, costPrice: 1.80, lastUpdated: '2026-08-02' },
  { id: 'stk-1-10', storeId: 'store-1', productId: 'prod-10', productName: 'Spinach & Goat Cheese Quiche Slice', category: 'Savory & Bread', currentStock: 9, unit: 'slices', price: 6.90, costPrice: 2.10, lastUpdated: '2026-08-02' },
  { id: 'stk-1-11', storeId: 'store-1', productId: 'prod-11', productName: 'Double Shot Espresso / Americano', category: 'Beverages & Coffee', currentStock: 200, unit: 'cups', price: 3.80, costPrice: 0.60, lastUpdated: '2026-08-02' },
  { id: 'stk-1-12', storeId: 'store-1', productId: 'prod-12', productName: 'Iced Matcha Oat Latte', category: 'Beverages & Coffee', currentStock: 150, unit: 'cups', price: 5.80, costPrice: 1.10, lastUpdated: '2026-08-02' },

  // Store 2 (Uptown Mall)
  { id: 'stk-2-1', storeId: 'store-2', productId: 'prod-1', productName: 'Artisan Butter Croissant', category: 'Croissants & Pastries', currentStock: 30, unit: 'units', price: 3.80, costPrice: 0.95, lastUpdated: '2026-08-02' },
  { id: 'stk-2-2', storeId: 'store-2', productId: 'prod-2', productName: 'Valrhona Pain au Chocolat', category: 'Croissants & Pastries', currentStock: 25, unit: 'units', price: 4.40, costPrice: 1.15, lastUpdated: '2026-08-02' },
  { id: 'stk-2-4', storeId: 'store-2', productId: 'prod-4', productName: 'Fresh Raspberry Almond Tartlet 4"', category: 'Tart Shells & Desserts', currentStock: 16, unit: 'units', price: 6.80, costPrice: 2.20, lastUpdated: '2026-08-02' },
  { id: 'stk-2-8', storeId: 'store-2', productId: 'prod-8', productName: 'Signature Macaron Gift Box (6 pcs)', category: 'Macarons & Sweets', currentStock: 15, unit: 'boxes', price: 15.00, costPrice: 4.50, lastUpdated: '2026-08-02' },

  // Store 3 (Westside)
  { id: 'stk-3-1', storeId: 'store-3', productId: 'prod-1', productName: 'Artisan Butter Croissant', category: 'Croissants & Pastries', currentStock: 60, unit: 'units', price: 3.80, costPrice: 0.95, lastUpdated: '2026-08-02' },
  { id: 'stk-3-6', storeId: 'store-3', productId: 'prod-6', productName: 'Pistachio Paris-Brest', category: 'Tart Shells & Desserts', currentStock: 20, unit: 'units', price: 7.50, costPrice: 2.80, lastUpdated: '2026-08-02' },
];

export const INITIAL_SALE_TRANSACTIONS: SaleTransaction[] = [
  {
    id: 'sal-101',
    transactionNumber: 'SAL-STR01-20260802-001',
    storeId: 'store-1',
    storeName: 'Douera 01',
    cashierName: 'Hamza (Gérant Douera 01)',
    timestamp: '2026-08-02T08:14:22Z',
    paymentMethod: 'CONTACTLESS',
    items: [
      { productId: 'prod-1', productName: 'Artisan Butter Croissant', category: 'Croissants & Pastries', quantity: 2, unitPrice: 3.80, totalPrice: 7.60, costPrice: 0.95 },
      { productId: 'prod-11', productName: 'Double Shot Espresso / Americano', category: 'Beverages & Coffee', quantity: 2, unitPrice: 3.80, totalPrice: 7.60, costPrice: 0.60 }
    ],
    subtotal: 15.20,
    discount: 0,
    tax: 1.22,
    totalAmount: 16.42,
    notes: 'Vente matinale au comptoir'
  },
  {
    id: 'sal-102',
    transactionNumber: 'SAL-STR01-20260802-002',
    storeId: 'store-1',
    storeName: 'Douera 01',
    cashierName: 'Hamza (Gérant Douera 01)',
    timestamp: '2026-08-02T09:45:10Z',
    paymentMethod: 'CARD',
    items: [
      { productId: 'prod-2', productName: 'Valrhona Pain au Chocolat', category: 'Croissants & Pastries', quantity: 3, unitPrice: 4.40, totalPrice: 13.20, costPrice: 1.15 },
      { productId: 'prod-4', productName: 'Fresh Raspberry Almond Tartlet 4"', category: 'Tart Shells & Desserts', quantity: 2, unitPrice: 6.80, totalPrice: 13.60, costPrice: 2.20 },
      { productId: 'prod-12', productName: 'Iced Matcha Oat Latte', category: 'Beverages & Coffee', quantity: 2, unitPrice: 5.80, totalPrice: 11.60, costPrice: 1.10 }
    ],
    subtotal: 38.40,
    discount: 0,
    tax: 3.07,
    totalAmount: 41.47
  },
  {
    id: 'sal-103',
    transactionNumber: 'SAL-STR01-20260802-003',
    storeId: 'store-1',
    storeName: 'Douera 01',
    cashierName: 'Hamza (Gérant Douera 01)',
    timestamp: '2026-08-02T11:20:00Z',
    paymentMethod: 'CASH',
    cashTendered: 30.00,
    changeGiven: 7.20,
    items: [
      { productId: 'prod-8', productName: 'Signature Macaron Gift Box (6 pcs)', category: 'Macarons & Sweets', quantity: 1, unitPrice: 15.00, totalPrice: 15.00, costPrice: 4.50 },
      { productId: 'prod-3', productName: 'Double Almond Cream Croissant', category: 'Croissants & Pastries', quantity: 1, unitPrice: 4.90, totalPrice: 4.90, costPrice: 1.40 },
      { productId: 'prod-11', productName: 'Double Shot Espresso / Americano', category: 'Beverages & Coffee', quantity: 1, unitPrice: 3.80, totalPrice: 3.80, costPrice: 0.60 }
    ],
    subtotal: 23.70,
    discount: 2.37, // 10% discount
    tax: 1.47,
    totalAmount: 22.80
  },
  {
    id: 'sal-104',
    transactionNumber: 'SAL-STR02-20260802-001',
    storeId: 'store-2',
    storeName: 'Douera 02',
    cashierName: 'Billal (Gérant Douera 02)',
    timestamp: '2026-08-02T10:05:00Z',
    paymentMethod: 'MOBILE_PAY',
    items: [
      { productId: 'prod-8', productName: 'Signature Macaron Gift Box (6 pcs)', category: 'Macarons & Sweets', quantity: 2, unitPrice: 15.00, totalPrice: 30.00, costPrice: 4.50 }
    ],
    subtotal: 30.00,
    discount: 0,
    tax: 2.40,
    totalAmount: 32.40
  }
];

export const INITIAL_UNSOLD_LOGS: UnsoldProductLog[] = [
  {
    id: 'uns-101',
    logNumber: 'UNS-STR01-20260801-001',
    storeId: 'store-1',
    storeName: 'Douera 01',
    recordedBy: 'Hamza (Gérant Douera 01)',
    recordedAt: '2026-08-01T19:30:00Z',
    productId: 'prod-1',
    productName: 'Artisan Butter Croissant',
    category: 'Croissants & Pastries',
    quantity: 4,
    unit: 'units',
    unitCost: 0.95,
    sellingPrice: 3.80,
    totalLossValue: 3.80, // cost value 4 * $0.95
    reason: 'EXPIRED_WASTE',
    notes: 'End of day unsold croissants written off for freshness compliance.'
  },
  {
    id: 'uns-102',
    logNumber: 'UNS-STR01-20260801-002',
    storeId: 'store-1',
    storeName: 'Douera 01',
    recordedBy: 'Hamza (Gérant Douera 01)',
    recordedAt: '2026-08-01T15:10:00Z',
    productId: 'prod-5',
    productName: 'Madagascar Vanilla Bean Éclair',
    category: 'Tart Shells & Desserts',
    quantity: 2,
    unit: 'units',
    unitCost: 1.60,
    sellingPrice: 5.50,
    totalLossValue: 3.20,
    reason: 'DAMAGED_DISPLAY',
    notes: 'Display tray knocked during midday restock.'
  },
  {
    id: 'uns-103',
    logNumber: 'UNS-STR02-20260801-001',
    storeId: 'store-2',
    storeName: 'Douera 02',
    recordedBy: 'Billal (Gérant Douera 02)',
    recordedAt: '2026-08-01T19:45:00Z',
    productId: 'prod-10',
    productName: 'Spinach & Goat Cheese Quiche Slice',
    category: 'Savory & Bread',
    quantity: 3,
    unit: 'slices',
    unitCost: 2.10,
    sellingPrice: 6.90,
    totalLossValue: 6.30,
    reason: 'EXPIRED_WASTE',
    notes: 'Unsold evening quiche slices.'
  }
];

export const INITIAL_LAB_WASTE_LOGS: LabWasteLog[] = [
  {
    id: 'lab-w-101',
    logCode: 'WST-LAB-20260802-001',
    itemType: 'RAW_MATERIAL',
    itemId: 'mat-2',
    itemName: 'AOP Beurre de Charente-Maritime (84% Fat)',
    category: 'Dairy & Eggs',
    quantity: 4.5,
    unit: 'kg',
    unitCost: 11.20,
    totalFinancialLoss: 50.40,
    reason: 'STORAGE_TEMPERATURE_FAULT',
    recordedBy: 'Chef Head Pastry',
    timestamp: '2026-08-02T08:15:00Z',
    notes: 'Walk-in cooler door left ajar overnight during heat wave.',
    actionTaken: 'Cooler seal replaced & temp sensor recalibrated.'
  },
  {
    id: 'lab-w-102',
    logCode: 'WST-LAB-20260802-002',
    itemType: 'SEMI_FINISHED',
    itemId: 'rec-2',
    itemName: 'Velvety Crème Patissière Base',
    category: 'Fillings & Creams',
    quantity: 8.0,
    unit: 'kg',
    unitCost: 4.85,
    totalFinancialLoss: 38.80,
    reason: 'PRODUCTION_FAILURE',
    recordedBy: 'Chef Head Pastry',
    timestamp: '2026-08-02T14:30:00Z',
    notes: 'Temper control fault caused custard scorching during pasteurization.',
    actionTaken: 'Batch discarded; induction pot timer serviced.'
  },
  {
    id: 'lab-w-103',
    logCode: 'WST-LAB-20260801-001',
    itemType: 'RAW_MATERIAL',
    itemId: 'mat-7',
    itemName: 'Valrhona Guanaja 70% Dark Chocolate Callets',
    category: 'Chocolate & Cocoa',
    quantity: 2.0,
    unit: 'kg',
    unitCost: 22.50,
    totalFinancialLoss: 45.00,
    reason: 'ACCIDENTAL_SPOILAGE',
    recordedBy: 'Sous Chef Jean',
    timestamp: '2026-08-01T11:00:00Z',
    notes: 'Water condensate dripped into tempering machine bowl.',
    actionTaken: 'Tempering machine hood fitted with drip guard.'
  }
];

export const INITIAL_DAILY_STORE_INVENTORY: DailyStoreInventory[] = [
  // Store 1 (Douera 01) - Yesterday's Closed Reconciliation
  {
    id: 'dsi-str1-001',
    storeId: 'store-1',
    storeName: 'Douera 01',
    date: '2026-08-03',
    pastryId: 'prod-1',
    pastryName: 'Artisan Butter Croissant',
    category: 'Croissants & Pastries',
    unit: 'units',
    unitPrice: 3.80,
    unitCostPrice: 0.95,
    openingStock: 10,
    receivedRequisitions: 50,
    totalSales: 48,
    expectedClosingStock: 12,
    actualClosingStock: 12,
    unaccountedWasteVariance: 0,
    status: 'CLOSED',
    closedAt: '2026-08-03T19:45:00Z',
    closedBy: 'Hamza (Gérant Douera 01)',
    notes: 'Journée normale, stock concordant à 100%'
  },
  {
    id: 'dsi-str1-002',
    storeId: 'store-1',
    storeName: 'Douera 01',
    date: '2026-08-03',
    pastryId: 'prod-2',
    pastryName: 'Valrhona Pain au Chocolat',
    category: 'Croissants & Pastries',
    unit: 'units',
    unitPrice: 4.40,
    unitCostPrice: 1.15,
    openingStock: 8,
    receivedRequisitions: 40,
    totalSales: 38,
    expectedClosingStock: 10,
    actualClosingStock: 9,
    unaccountedWasteVariance: 1,
    status: 'CLOSED',
    closedAt: '2026-08-03T19:45:00Z',
    closedBy: 'Hamza (Gérant Douera 01)',
    notes: '1 pain au chocolat tombé par terre lors de la mise en vitrine'
  },
  {
    id: 'dsi-str1-003',
    storeId: 'store-1',
    storeName: 'Douera 01',
    date: '2026-08-03',
    pastryId: 'prod-4',
    pastryName: 'Fresh Raspberry Almond Tartlet 4"',
    category: 'Tart Shells & Desserts',
    unit: 'units',
    unitPrice: 6.80,
    unitCostPrice: 2.20,
    openingStock: 4,
    receivedRequisitions: 15,
    totalSales: 13,
    expectedClosingStock: 6,
    actualClosingStock: 6,
    unaccountedWasteVariance: 0,
    status: 'CLOSED',
    closedAt: '2026-08-03T19:45:00Z',
    closedBy: 'Hamza (Gérant Douera 01)'
  },
  // Store 2 (Douera 02) - Yesterday's Closed
  {
    id: 'dsi-str2-001',
    storeId: 'store-2',
    storeName: 'Douera 02',
    date: '2026-08-03',
    pastryId: 'prod-1',
    pastryName: 'Artisan Butter Croissant',
    category: 'Croissants & Pastries',
    unit: 'units',
    unitPrice: 3.80,
    unitCostPrice: 0.95,
    openingStock: 5,
    receivedRequisitions: 35,
    totalSales: 28,
    expectedClosingStock: 12,
    actualClosingStock: 10,
    unaccountedWasteVariance: 2,
    status: 'CLOSED',
    closedAt: '2026-08-03T20:10:00Z',
    closedBy: 'Billal (Gérant Douera 02)'
  },
  {
    id: 'dsi-str2-002',
    storeId: 'store-2',
    storeName: 'Douera 02',
    date: '2026-08-03',
    pastryId: 'prod-8',
    pastryName: 'Signature Macaron Gift Box (6 pcs)',
    category: 'Macarons & Sweets',
    unit: 'boxes',
    unitPrice: 15.00,
    unitCostPrice: 4.50,
    openingStock: 6,
    receivedRequisitions: 20,
    totalSales: 18,
    expectedClosingStock: 8,
    actualClosingStock: 8,
    unaccountedWasteVariance: 0,
    status: 'CLOSED',
    closedAt: '2026-08-03T20:10:00Z',
    closedBy: 'Billal (Gérant Douera 02)'
  }
];

export const INITIAL_DELIVERY_MANIFESTS: DeliveryManifest[] = [
  {
    id: 'man-101',
    manifestNumber: 'MAN-2026-0804-001',
    date: '2026-08-04',
    driverName: 'Karim Bouzid',
    driverPhone: '(0550) 98-76-54',
    vehiclePlate: '16-342-99',
    routeArea: 'Circuit Alger Ouest (Douera 01 & Douera 02)',
    status: 'IN_TRANSIT',
    requisitionIds: ['req-2001', 'req-2002'],
    storeIds: ['store-1', 'store-2'],
    storeNames: ['Douera 01', 'Douera 02'],
    items: [
      {
        id: 'mitem-1',
        requisitionId: 'req-2001',
        requisitionNumber: 'REQ-2026-0802-001',
        storeId: 'store-1',
        storeName: 'Douera 01',
        productId: 'prod-1',
        productName: 'Artisan Butter Croissant',
        category: 'Croissants & Pastries',
        quantityRequested: 150,
        quantityDispatched: 150,
        unit: 'units',
        unitCost: 0.95,
        sellingPrice: 3.80
      },
      {
        id: 'mitem-2',
        requisitionId: 'req-2001',
        requisitionNumber: 'REQ-2026-0802-001',
        storeId: 'store-1',
        storeName: 'Douera 01',
        productId: 'prod-2',
        productName: 'Valrhona Pain au Chocolat',
        category: 'Croissants & Pastries',
        quantityRequested: 80,
        quantityDispatched: 80,
        unit: 'units',
        unitCost: 1.15,
        sellingPrice: 4.40
      },
      {
        id: 'mitem-3',
        requisitionId: 'req-2002',
        requisitionNumber: 'REQ-2026-0801-004',
        storeId: 'store-2',
        storeName: 'Douera 02',
        productId: 'prod-4',
        productName: 'Raspberry Almond Tartlet 4"',
        category: 'Tart Shells & Desserts',
        quantityRequested: 24,
        quantityDispatched: 24,
        unit: 'units',
        unitCost: 2.20,
        sellingPrice: 6.80
      }
    ],
    notes: 'Priorité livraison fraîcheur du matin. Camion frigorifique à 4°C.',
    createdBy: 'Chef Hakim',
    createdAt: '2026-08-04T05:30:00Z',
    dispatchedAt: '2026-08-04T06:00:00Z'
  }
];

export const INITIAL_TRANSIT_WASTE_LOGS: TransitWasteLog[] = [
  {
    id: 'twl-001',
    logCode: 'TRW-2026-0802-01',
    manifestId: 'man-100',
    manifestNumber: 'MAN-2026-0802-001',
    requisitionId: 'req-1999',
    requisitionNumber: 'REQ-2026-0801-001',
    storeId: 'store-3',
    storeName: 'Oued Terfa',
    productId: 'prod-4',
    productName: 'Fresh Raspberry Almond Tartlet 4"',
    category: 'Tart Shells & Desserts',
    unit: 'units',
    dispatchedQty: 20,
    receivedQty: 18,
    damagedQty: 2,
    missingQty: 0,
    unitCostPrice: 2.20,
    unitSellingPrice: 6.80,
    totalLossValue: 4.40,
    reason: 'PACKAGING_CRUSHED',
    reportedBy: 'Ryad (Gérant Oued Terfa)',
    reportedAt: '2026-08-02T08:15:00Z',
    notes: 'Boîte de transport écrasée durant le freinage du camion'
  }
];

export const INITIAL_PACKAGING_MATERIALS: PackagingMaterial[] = [
  {
    id: 'pkg-1',
    name: 'Boîte à Gâteau 6P',
    unit_type: 'piece',
    central_stock_qty: 3500,
    unit_cost: 45.00,
    min_alert_qty: 1000
  },
  {
    id: 'pkg-2',
    name: 'Sac Croissant Grand',
    unit_type: 'pack of 100',
    central_stock_qty: 450,
    unit_cost: 350.00,
    min_alert_qty: 100
  },
  {
    id: 'pkg-3',
    name: 'Sac Croissant Petit',
    unit_type: 'pack of 100',
    central_stock_qty: 80,
    unit_cost: 280.00,
    min_alert_qty: 150
  },
  {
    id: 'pkg-4',
    name: 'Boîte Tartes 8P',
    unit_type: 'piece',
    central_stock_qty: 1800,
    unit_cost: 65.00,
    min_alert_qty: 500
  },
  {
    id: 'pkg-5',
    name: 'Sac Papier Baguette',
    unit_type: 'bundle',
    central_stock_qty: 250,
    unit_cost: 520.00,
    min_alert_qty: 80
  },
  {
    id: 'pkg-6',
    name: 'Ruban Pâtisserie Satin',
    unit_type: 'piece',
    central_stock_qty: 120,
    unit_cost: 150.00,
    min_alert_qty: 30
  }
];

export const INITIAL_STORE_PACKAGING_INVENTORY: StorePackagingInventory[] = [
  // Douera 01 (Store 1)
  { id: 'spi-1-1', store_id: 'store-1', packaging_id: 'pkg-1', quantity_on_hand: 240 },
  { id: 'spi-1-2', store_id: 'store-1', packaging_id: 'pkg-2', quantity_on_hand: 25 },
  { id: 'spi-1-3', store_id: 'store-1', packaging_id: 'pkg-3', quantity_on_hand: 12 },
  { id: 'spi-1-4', store_id: 'store-1', packaging_id: 'pkg-4', quantity_on_hand: 180 },
  { id: 'spi-1-5', store_id: 'store-1', packaging_id: 'pkg-5', quantity_on_hand: 15 },

  // Douera 02 (Store 2)
  { id: 'spi-2-1', store_id: 'store-2', packaging_id: 'pkg-1', quantity_on_hand: 150 },
  { id: 'spi-2-2', store_id: 'store-2', packaging_id: 'pkg-2', quantity_on_hand: 18 },
  { id: 'spi-2-3', store_id: 'store-2', packaging_id: 'pkg-3', quantity_on_hand: 30 },
  { id: 'spi-2-4', store_id: 'store-2', packaging_id: 'pkg-4', quantity_on_hand: 90 },

  // Oued Terfa (Store 3)
  { id: 'spi-3-1', store_id: 'store-3', packaging_id: 'pkg-1', quantity_on_hand: 80 },
  { id: 'spi-3-2', store_id: 'store-3', packaging_id: 'pkg-2', quantity_on_hand: 8 },
  { id: 'spi-3-3', store_id: 'store-3', packaging_id: 'pkg-3', quantity_on_hand: 5 },

  // El Achour (Store 4)
  { id: 'spi-4-1', store_id: 'store-4', packaging_id: 'pkg-1', quantity_on_hand: 120 },
  { id: 'spi-4-2', store_id: 'store-4', packaging_id: 'pkg-2', quantity_on_hand: 15 },
  { id: 'spi-4-3', store_id: 'store-4', packaging_id: 'pkg-4', quantity_on_hand: 75 },

  // Blida (Store 5)
  { id: 'spi-5-1', store_id: 'store-5', packaging_id: 'pkg-1', quantity_on_hand: 190 },
  { id: 'spi-5-2', store_id: 'store-5', packaging_id: 'pkg-2', quantity_on_hand: 20 },
  { id: 'spi-5-3', store_id: 'store-5', packaging_id: 'pkg-3', quantity_on_hand: 25 },

  // Boufarik (Store 6)
  { id: 'spi-6-1', store_id: 'store-6', packaging_id: 'pkg-1', quantity_on_hand: 110 },
  { id: 'spi-6-2', store_id: 'store-6', packaging_id: 'pkg-2', quantity_on_hand: 12 },
  { id: 'spi-6-3', store_id: 'store-6', packaging_id: 'pkg-5', quantity_on_hand: 18 },
];

export const INITIAL_PACKAGING_DISPATCHES: PackagingDispatch[] = [
  {
    id: 'pdisp-1',
    dispatch_number: 'PKG-DISP-2026-0805-01',
    target_store_id: 'store-1',
    target_store_name: 'Douera 01',
    status: 'IN_TRANSIT',
    created_at: '2026-08-05T07:30:00Z',
    created_by: 'Chef Hakim',
    notes: 'Expédition urgente boîtes à gâteau et sacs viennoiseries',
    items: [
      {
        id: 'pdi-1',
        packaging_id: 'pkg-1',
        packaging_name: 'Boîte à Gâteau 6P',
        unit_type: 'piece',
        quantity_sent: 300
      },
      {
        id: 'pdi-2',
        packaging_id: 'pkg-2',
        packaging_name: 'Sac Croissant Grand',
        unit_type: 'pack of 100',
        quantity_sent: 10
      },
      {
        id: 'pdi-3',
        packaging_id: 'pkg-4',
        packaging_name: 'Boîte Tartes 8P',
        unit_type: 'piece',
        quantity_sent: 150
      }
    ]
  },
  {
    id: 'pdisp-2',
    dispatch_number: 'PKG-DISP-2026-0804-02',
    target_store_id: 'store-2',
    target_store_name: 'Douera 02',
    status: 'RECEIVED',
    created_at: '2026-08-04T09:15:00Z',
    created_by: 'Chef Hakim',
    received_at: '2026-08-04T11:20:00Z',
    received_by: 'Billal (Gérant Douera 02)',
    notes: 'Livraison hebdomadaire emballages',
    items: [
      {
        id: 'pdi-4',
        packaging_id: 'pkg-1',
        packaging_name: 'Boîte à Gâteau 6P',
        unit_type: 'piece',
        quantity_sent: 200,
        quantity_received: 200
      },
      {
        id: 'pdi-5',
        packaging_id: 'pkg-3',
        packaging_name: 'Sac Croissant Petit',
        unit_type: 'pack of 100',
        quantity_sent: 15,
        quantity_received: 15
      }
    ]
  }
];

export const INITIAL_PACKAGING_REQUISITIONS: PackagingRequisition[] = [
  {
    id: 'preq-1',
    requisition_number: 'PKG-REQ-2026-0805-01',
    store_id: 'store-3',
    store_name: 'Oued Terfa',
    requested_by: 'Ryad (Gérant Oued Terfa)',
    created_at: '2026-08-05T06:45:00Z',
    status: 'PENDING',
    notes: 'Stock emballages presque épuisé pour le weekend',
    items: [
      {
        packaging_id: 'pkg-1',
        packaging_name: 'Boîte à Gâteau 6P',
        unit_type: 'piece',
        quantity_requested: 250
      },
      {
        packaging_id: 'pkg-3',
        packaging_name: 'Sac Croissant Petit',
        unit_type: 'pack of 100',
        quantity_requested: 20
      }
    ]
  }
];

export const INITIAL_INVENTORY_ADJUSTMENTS: InventoryAdjustment[] = [
  {
    id: 'adj-1',
    raw_material_id: 'rm-1',
    raw_material_name: 'Farine T45 Label Rouge',
    unit: 'kg',
    quantity_removed: 25.0,
    unit_cost_at_time: 140.00,
    total_loss_value: 3500.00,
    reason_category: 'QUALITY_DAMAGE',
    notes: 'Sac percé et farine altérée pendant le stockage au labo central',
    created_by: 'Chef Hakim',
    created_at: '2026-08-04T10:30:00Z'
  },
  {
    id: 'adj-2',
    raw_material_id: 'rm-3',
    raw_material_name: 'Beurre Doux 82% AOP',
    unit: 'kg',
    quantity_removed: 5.0,
    unit_cost_at_time: 1250.00,
    total_loss_value: 6250.00,
    reason_category: 'EXPIRED',
    notes: 'Péremption lot #9082 resté en fond de chambre froide',
    created_by: 'Chef Hakim',
    created_at: '2026-08-03T14:15:00Z'
  },
  {
    id: 'adj-3',
    raw_material_id: 'rm-5',
    raw_material_name: 'Chocolat Noir 70% Valrhona',
    unit: 'kg',
    quantity_removed: 2.0,
    unit_cost_at_time: 2800.00,
    total_loss_value: 5600.00,
    reason_category: 'RANDOM_DISTRIBUTION',
    notes: 'Échantillons pour dégustation et tests d’association aromatique',
    created_by: 'Yacine Pâtissier',
    created_at: '2026-08-02T16:00:00Z'
  }
];

export const INITIAL_CHEF_VOICE_NOTES: ChefVoiceNote[] = [
  {
    id: 'vn-1',
    noteNumber: 'VN-20260818-01',
    chefName: 'Chef Hakim',
    station: 'TOURNAGE_VIENNOISERIE',
    category: 'RECIPE_MODIFICATION',
    recipeId: 'recp-1',
    recipeName: 'Croissant Pur Beurre',
    transcript: 'Ajustement recette croissant tournée du matin : température ambiante labo à 26°C. Réduire le pointage à 20 minutes au lieu de 35 minutes. Augmenter le beurre de tourage à 260g par pâton pour compenser la rétraction. Repos 45 min en chambre froide à 3°C.',
    tags: ['Croissant', 'Tourage', 'Chaleur Labo', 'Beurre AOP', 'Pointage'],
    severity: 'important',
    status: 'APPLIED_TO_RECIPE',
    createdAt: '2026-08-18T05:30:00Z',
    durationSeconds: 24,
    appliedAt: '2026-08-18T05:40:00Z',
    appliedBy: 'Chef Hakim',
    actionTakenNotes: 'Consignes de pointage et dosage beurre mis à jour sur la fiche technique.'
  },
  {
    id: 'vn-2',
    noteNumber: 'VN-20260818-02',
    chefName: 'Yacine Chef de Partie',
    station: 'ENTREMETS_GLACES',
    category: 'RECIPE_MODIFICATION',
    recipeId: 'recp-4',
    recipeName: 'Opéra Royal Chocolat',
    transcript: 'Pour le glaçage miroir noir de l’entremets chocolat : le nouveau lot de chocolat Valrhona 70% est légèrement plus dense. Ajouter 15ml d’eau minérale supplémentaire dans le sirop de sucre pour obtenir une brillance optimale sans bulles d’air. Température de coulage recommandée à 32°C.',
    tags: ['Glaçage Miroir', 'Chocolat Valrhona', 'Brillance', 'Entremets'],
    severity: 'normal',
    status: 'PENDING_REVIEW',
    createdAt: '2026-08-18T06:15:00Z',
    durationSeconds: 31
  },
  {
    id: 'vn-3',
    noteNumber: 'VN-20260818-03',
    chefName: 'Karim Cuiseur',
    station: 'FOURS_CUISSON',
    category: 'OVEN_INCIDENT',
    transcript: 'Alerte four à soles numéro 3 : légère surchauffe sur la sole arrière droite. Cuire les tartes aux fruits à 175°C au lieu de 185°C et faire une rotation de plaque à mi-cuisson à 12 minutes pour éviter le brunissement asymétrique.',
    tags: ['Four à Soles #3', 'Calibration', 'Cuisson Tartes', 'Alerte'],
    severity: 'critical',
    status: 'RESOLVED',
    createdAt: '2026-08-18T06:45:00Z',
    durationSeconds: 18,
    appliedAt: '2026-08-18T07:00:00Z',
    appliedBy: 'Chef Hakim',
    actionTakenNotes: 'Thermostat recalibré par le technicien et thermomètre laser vérifié.'
  },
  {
    id: 'vn-4',
    noteNumber: 'VN-20260818-04',
    chefName: 'Amine Pâtissier',
    station: 'PATISSERIE_FINE',
    category: 'RAW_MATERIAL_QUALITY',
    transcript: 'Contrôle qualité arrivage gousses de vanille Bourbon de Madagascar lot #V-99 : gousses très charnues et grasses, taux d’humidité supérieur à 35%. Réduire le dosage à 1 gousse et demie pour 1 litre de crème pâtissière au lieu de 2 gousses.',
    tags: ['Vanille Bourbon', 'Crème Pâtissière', 'Contrôle Arrivage', 'Économie COGS'],
    severity: 'important',
    status: 'PENDING_REVIEW',
    createdAt: '2026-08-18T07:10:00Z',
    durationSeconds: 22
  }
];





