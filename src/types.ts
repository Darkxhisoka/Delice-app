export type UserRole = 'RETAIL_STORE' | 'CENTRAL_LAB';

export interface UserSession {
  isAuthenticated: boolean;
  user: {
    id?: string;
    name: string;
    role: UserRole;
    raw_role?: string;
    secret_role?: string;
    is_central_lab?: boolean;
    storeId?: string;
    store_id?: string;
    storeName?: string;
    loginTime?: string;
  } | null;
}

export interface StoreLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  managerName: string;
  phone: string;
}

export type MaterialUnit = 'kg' | 'L' | 'g' | 'mL' | 'units' | 'bags' | 'boxes';

export interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: 'Flour & Grains' | 'Dairy & Eggs' | 'Sugars & Sweeteners' | 'Fats & Oils' | 'Chocolate & Cocoa' | 'Fruits & Nuts' | 'Flavorings & Vanilla' | 'Packaging' | 'Other';
  unit: MaterialUnit;
  currentStock: number;
  currentAvgCost: number; // calculated moving average cost per unit
  reorderLevel: number;
  min_reorder_level?: number; // threshold for automated supplier reordering
  totalPurchasedQty: number;
  lastUpdated: string;
  density?: number; // Density in kg/L for volume/mass conversion
  packagingSpec?: { weightKg?: number; piecesCount?: number; description?: string };
}

export interface ReceiptItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  unit: MaterialUnit;
  quantity: number;
  unitPrice: number;
  totalCost: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  recordedAt: string;
  items: ReceiptItem[];
  totalAmount: number;
  notes?: string;
  recordedBy: string;
}

// --- CENTRAL LAB 7 PRODUCTION ROOMS ---
export type ProductionRoomId = 
  | 'gateaux_secs'
  | 'gateaux_orientaux'
  | 'mille_feuille'
  | 'viennoiserie'
  | 'patisserie_fine'
  | 'piece_montee'
  | 'trompe_oeil';

export interface Product {
  id: string;
  name: string;
  category: string;
  roomId: ProductionRoomId;
  unit: string;
  unitEstimatedCost: number;
  sellingPrice?: number;
  sku?: string;
  description?: string;
  standardBatchSize?: number;
  prepTimeMinutes?: number;
  imageIcon?: string;
}

export interface StoreOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  category?: string;
  roomId?: ProductionRoomId;
  quantityRequested: number;
  fulfilledQuantity?: number;
  unit: string;
  unitEstimatedCost?: number;
  notes?: string;
}

export interface StoreOrder {
  id: string;
  requisitionNumber?: string;
  orderNumber?: string;
  storeId: string;
  storeName: string;
  requestedBy?: string;
  dateRequested: string;
  dateNeeded: string;
  status: RequisitionStatus | string;
  items: (RequisitionItem | StoreOrderItem)[];
  totalEstimatedCost?: number;
  notes?: string;
}

export interface StoreQuantityBreakdown {
  storeId: string;
  storeName: string;
  quantity: number;
  orderId?: string;
  orderNumber?: string;
  notes?: string;
}

export interface AggregatedProductionItem {
  productId: string;
  productName: string;
  category: string;
  roomId: ProductionRoomId;
  unit: string;
  unitEstimatedCost: number;
  totalQuantityRequired: number;
  standardBatchSize: number;
  totalBatchesNeeded: number;
  storeBreakdown: StoreQuantityBreakdown[];
  completedQuantity?: number;
  status?: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
}

export interface RoomProductionReport {
  roomId: ProductionRoomId;
  roomNameKey: string;
  roomNameFr: string;
  roomNameAr: string;
  roomDescriptionFr?: string;
  roomDescriptionAr?: string;
  iconName: string;
  colorTheme: {
    primary: string;
    accent: string;
    bgLight: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    gradient: string;
    headerBg?: string;
    borderActive?: string;
  };
  totalProductsCount: number;
  totalUnitsToProduce: number;
  totalEstimatedCost: number;
  participatingStoresCount: number;
  items: AggregatedProductionItem[];
  targetDate: string;
  generatedAt: string;
}

export type RequisitionStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'IN_PRODUCTION' 
  | 'READY_FOR_DISPATCH' 
  | 'IN_TRANSIT' 
  | 'DELIVERED' 
  | 'REJECTED'
  | 'PROCESSING'
  | 'DISPATCHED';

export type RequisitionItemType = 'finished' | 'raw';

export interface RequisitionItem {
  id: string;
  itemId: string;
  itemType: RequisitionItemType;
  itemTitle: string;
  productName: string;
  category:
    | 'Croissants & Pastries'
    | 'Cakes & Tortes'
    | 'Tart Shells & Bases'
    | 'Fillings & Creams'
    | 'Finished Desserts'
    | 'Bread & Savory'
    | 'Gâteaux Secs'
    | 'Gâteaux Orientaux'
    | 'Mille-Feuille'
    | 'Viennoiserie & Briocherie'
    | 'Pâtisseries Fines'
    | 'Pièce Montée'
    | "Trompe-l'œil"
    | 'Tart Shells & Desserts'
    | 'Flour & Grains'
    | 'Dairy & Eggs'
    | 'Sugars & Sweeteners'
    | 'Fats & Oils'
    | 'Chocolate & Cocoa'
    | 'Fruits & Nuts'
    | 'Flavorings & Vanilla'
    | 'Packaging'
    | 'Other'
    | string;
  quantityRequested: number;
  fulfilledQuantity?: number;
  unit: string;
  unitEstimatedCost: number;
  roomId?: ProductionRoomId;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  storeId: string;
  storeName: string;
  requestedBy: string;
  dateRequested: string;
  dateNeeded: string;
  status: RequisitionStatus;
  items: RequisitionItem[];
  totalEstimatedCost: number;
  notes?: string;
  rejectionReason?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  manifestId?: string;
}

export type ProductClassification = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD';

export type RecipeType = 'FINISHED' | 'SEMI_FINISHED';

export interface RecipeIngredient {
  type?: 'RAW_MATERIAL' | 'SEMI_FINISHED';
  rawMaterialId?: string;
  semiFinishedRecipeId?: string;
  quantity: number; // in base unit or sub-recipe unit
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  recipeType?: RecipeType; // 'FINISHED' or 'SEMI_FINISHED'
  classification?: ProductClassification;
  yieldUnits: number; // e.g. 24 Croissants or 10 kg
  unitName: string; // e.g., 'units', 'kg', 'L', 'trays'
  prepTimeMinutes: number;
  ingredients: RecipeIngredient[];
  suggestedSellingPrice?: number;
  retail_selling_price?: number;
  instructions?: string;
}

export interface SemiFinishedStockItem {
  id: string;
  recipeId: string;
  recipeName: string;
  category: string;
  currentStock: number; // in recipe's unitName (e.g. kg or L)
  unit: string;
  minStockLevel: number;
  lastUpdated: string;
}

export interface ProductionSubRunRequirement {
  recipeId: string;
  recipeName: string;
  unit: string;
  requiredQty: number;
  availableStock: number;
  deficitQty: number;
  status: 'IN_STOCK' | 'AUTO_PRODUCING' | 'INSUFFICIENT_RAW';
  rawMaterialsNeeded: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    quantityNeeded: number;
    currentStock: number;
    hasEnough: boolean;
  }>;
}

export interface ProductionCascadePreview {
  finishedRecipe: Recipe;
  targetQuantity: number;
  batchCount: number;
  semiFinishedRequirements: ProductionSubRunRequirement[];
  directRawMaterialsNeeded: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    quantityNeeded: number;
    currentStock: number;
    hasEnough: boolean;
  }>;
  totalRawMaterialsSummary: Array<{
    materialId: string;
    materialName: string;
    unit: string;
    directQty: number;
    subRunQty: number;
    totalNeeded: number;
    currentStock: number;
    hasEnough: boolean;
  }>;
  canExecute: boolean;
  blockers: string[];
}

export interface ProductionCascadeExecutionResult {
  finishedBatchCode: string;
  finishedRecipeName: string;
  targetQuantity: number;
  unitName: string;
  timestamp: string;
  subRunsExecuted: Array<{
    batchCode: string;
    recipeName: string;
    quantityProduced: number;
    unit: string;
    rawMaterialsDeducted: Array<{ name: string; qty: number; unit: string }>;
  }>;
  directMaterialsDeducted: Array<{ name: string; qty: number; unit: string }>;
  semiFinishedDeducted: Array<{ name: string; qty: number; unit: string }>;
  logs: string[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  categoriesProvided: string[];
  paymentTerms: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

export type ActivityType = 
  | 'RECEIPT_CREATED' 
  | 'REQUISITION_CREATED' 
  | 'REQUISITION_STATUS_UPDATED' 
  | 'SUPPLIER_ADDED' 
  | 'RECIPE_CREATED'
  | 'SEMI_FINISHED_PRODUCED'
  | 'STOCK_ADJUSTED'
  | 'SALE_RECORDED'
  | 'UNSOLD_LOGGED'
  | 'WASTE_LOGGED'
  | 'RECONCILIATION_CLOSED'
  | 'DELIVERY_MANIFEST_CREATED'
  | 'PACKAGING_DISPATCHED'
  | 'PACKAGING_REQUISITION'
  | 'DAILY_PLAN_UPDATED'
  | 'SYSTEM_EVENT';

export interface ActivityLogItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO string format
  actor: string;
  sourceInterface?: 'STORE' | 'LAB' | 'SYSTEM';
  badgeText?: string;
  severity?: 'info' | 'success' | 'warning' | 'purple' | 'danger';
  metadata?: {
    amount?: number;
    storeId?: string;
    storeName?: string;
    previousName?: string;
    referenceNumber?: string;
    supplierName?: string;
    recipeName?: string;
    status?: string;
    itemCount?: number;
    sourceInterface?: 'STORE' | 'LAB' | 'SYSTEM';
    notes?: string;
  };
}

export type FinishedProductCategory =
  | 'G\u00e2teaux Secs'
  | 'G\u00e2teaux Orientaux'
  | 'Mille-Feuille & Feuilletage'
  | 'Viennoiserie & Briocherie'
  | 'P\u00e2tisseries Fines'
  | 'Pi\u00e8ces Mont\u00e9es'
  | 'Trompe-l\u2019\u0153il';

export type RetailCategory = FinishedProductCategory;

export interface RetailProduct {
  id: string;
  name: string;
  category: RetailCategory;
  price: number;
  costPrice: number;
  retail_selling_price?: number;
  unit: string;
  sku: string;
  imageIcon?: string;
  description?: string;
}

export interface RetailStoreStock {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  category: RetailCategory;
  currentStock: number;
  unit: string;
  price: number;
  costPrice: number;
  lastUpdated: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: RetailCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'CONTACTLESS' | 'MOBILE_PAY';

export interface SaleTransaction {
  id: string;
  transactionNumber: string;
  storeId: string;
  storeName: string;
  cashierName: string;
  timestamp: string;
  paymentMethod: PaymentMethod;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  cashTendered?: number;
  changeGiven?: number;
  notes?: string;
}

export type UnsoldLogReason = 
  | 'EXPIRED_WASTE' 
  | 'DAMAGED_DISPLAY' 
  | 'STAFF_TASTING' 
  | 'CLEARANCE_MARKDOWN' 
  | 'CARRIED_OVER';

export interface UnsoldProductLog {
  id: string;
  logNumber: string;
  storeId: string;
  storeName: string;
  recordedBy: string;
  recordedAt: string;
  productId: string;
  productName: string;
  category: RetailCategory;
  quantity: number;
  unit: string;
  unitCost: number;
  sellingPrice: number;
  totalLossValue: number;
  reason: UnsoldLogReason;
  notes?: string;
}

export type WasteReason = 
  | 'EXPIRED' 
  | 'PRODUCTION_FAILURE' 
  | 'ACCIDENTAL_SPOILAGE' 
  | 'QUALITY_DEFECT' 
  | 'STORAGE_TEMPERATURE_FAULT' 
  | 'OTHER';

export interface LabWasteLog {
  id: string;
  logCode: string;
  itemType: 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD';
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalFinancialLoss: number;
  reason: WasteReason;
  recordedBy: string;
  timestamp: string;
  notes?: string;
  actionTaken?: string;
}

export interface DailyStoreInventory {
  id: string;
  storeId: string;
  storeName: string;
  date: string; // YYYY-MM-DD
  pastryId: string;
  pastryName: string;
  category: RetailCategory;
  unit: string;
  unitPrice: number;
  unitCostPrice: number;
  openingStock: number; // leftover from previous day
  receivedRequisitions: number; // total units received today from Central Lab fulfilled orders
  totalSales: number; // total units sold today via cash register/POS logs
  expectedClosingStock: number; // openingStock + receivedRequisitions - totalSales
  actualClosingStock: number; // optional physical count input if different
  unaccountedWasteVariance: number; // expectedClosingStock - actualClosingStock
  status: 'DRAFT' | 'CLOSED';
  closedAt?: string;
  closedBy?: string;
  notes?: string;
}

export interface DeliveryManifestItem {
  id: string;
  requisitionId: string;
  requisitionNumber: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  category: string;
  quantityRequested: number;
  quantityDispatched: number;
  quantityReceived?: number;
  quantityDamaged?: number;
  quantityMissing?: number;
  unit: string;
  unitCost: number;
  sellingPrice: number;
}

export interface DeliveryManifest {
  id: string;
  manifestNumber: string; // e.g., MAN-2026-0805-001
  date: string; // YYYY-MM-DD
  driverName: string;
  driverPhone?: string;
  vehiclePlate?: string;
  routeArea?: string; // e.g. "North Metro Route"
  status: 'DRAFT' | 'READY_FOR_DISPATCH' | 'IN_TRANSIT' | 'DELIVERED';
  requisitionIds: string[];
  storeIds: string[];
  storeNames: string[];
  items: DeliveryManifestItem[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  verifiedByStoreWorker?: string;
  driverSignature?: string;
  receiverSignature?: string;
}

export interface TransitWasteLog {
  id: string;
  logCode: string;
  manifestId: string;
  manifestNumber: string;
  requisitionId: string;
  requisitionNumber: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  category: string;
  unit: string;
  dispatchedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  totalLossValue: number;
  reason: 'TRANSIT_DAMAGE' | 'TRANSIT_MISSING' | 'TEMPERATURE_SPOILAGE' | 'PACKAGING_CRUSHED' | 'OTHER';
  reportedBy: string;
  reportedAt: string;
  notes?: string;
}

// --- SUPPLIER REORDERING & PO GENERATION ---
export interface PurchaseOrderItem {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  category: string;
  unit: MaterialUnit;
  currentStock: number;
  minReorderLevel: number;
  quantityToOrder: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; // e.g. PO-2026-0805-01
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDeliveryDate?: string;
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: number;
  createdBy: string;
  notes?: string;
}

// --- DAILY PRODUCTION PLAN & KITCHEN TASK LIST ---
export type BatchStatus = 'PLANNED' | 'IN_PREPARATION' | 'BAKING' | 'READY_FOR_PACKING' | 'COMPLETED';

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  recipeId?: string;
  recipeName: string;
  plannedQuantity: number;
  actualQuantity?: number;
  unit?: string;
  productionDate: string;
  expiryDate?: string;
  supervisorName?: string;
  status: BatchStatus;
  size?: number;
  updatedAt?: string;
  bakerName?: string;
  notes?: string;
  ingredientsUsed?: Array<{
    materialId: string;
    materialName: string;
    quantityDeducted: number;
    unit: string;
  }>;
}

export interface MasterProductionItem {
  id: string;
  productName: string;
  category: string;
  totalQuantityNeeded: number;
  unit: string;
  storeBreakdown: Array<{ storeId: string; storeName: string; quantity: number }>;
  standardBatchSize: number;
  totalBatches: number;
  batches: ProductionBatch[];
  assignedBaker?: string;
}

// --- FOOD SAFETY & QA LOGBOOK ---
export interface TemperatureLog {
  id: string;
  unitName: string; // e.g. "Walk-In Freezer #1", "Display Fridge #2"
  locationType: 'CENTRAL_LAB' | 'RETAIL_STORE';
  storeId?: string;
  storeName?: string;
  temperatureCelsius: number;
  targetMinCelsius: number;
  targetMaxCelsius: number;
  isCompliant: boolean;
  recordedBy: string;
  timestamp: string;
  notes?: string;
}

export interface QualityInspection {
  id: string;
  manifestId?: string;
  manifestNumber?: string;
  inspectorName: string;
  coldStorageCompliant: boolean;
  visualInspectionPassed: boolean;
  packagingSealsPassed: boolean;
  dispatchTemperatureCelsius: number;
  overallPassed: boolean;
  timestamp: string;
  notes?: string;
}

// --- PACKAGING & EMBALLAGE DISPATCH MANAGEMENT ---
export interface PackagingMaterial {
  id: string;
  code?: string;
  name: string; // e.g., "Boîte à Gâteau 6P", "Sac Croissant Grand", "Sac Croissant Petit", "Boîte Tartes 8P"
  category?: string; // Boxes, Bags, Boards, Accessories
  unit_type: 'piece' | 'pack of 100' | 'bundle' | string;
  central_stock_qty: number;
  unit_cost: number;
  min_alert_qty: number;
}

export interface StorePackagingInventory {
  id: string;
  store_id: string;
  store_name?: string;
  packaging_id: string;
  packaging_name?: string;
  quantity_on_hand: number;
}

export type PackagingDispatchStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';

export interface PackagingDispatchItem {
  id: string;
  dispatch_id?: string;
  packaging_id: string;
  packaging_name: string;
  unit_type: string;
  quantity_sent: number;
  quantity_received?: number;
  notes?: string;
}

export interface PackagingDispatch {
  id: string;
  dispatch_number: string;
  target_store_id: string;
  target_store_name: string;
  status: PackagingDispatchStatus;
  created_at: string;
  created_by: string;
  received_at?: string;
  received_by?: string;
  items: PackagingDispatchItem[];
  notes?: string;
  from_requisition_id?: string;
}

export interface PackagingRequisitionItem {
  packaging_id: string;
  packaging_name: string;
  unit_type: string;
  quantity_requested: number;
}

export interface PackagingRequisition {
  id: string;
  requisition_number: string;
  store_id: string;
  store_name: string;
  requested_by: string;
  created_at: string;
  status: 'PENDING' | 'DISPATCHED' | 'FULFILLED' | 'CANCELLED';
  items: PackagingRequisitionItem[];
  notes?: string;
}

// --- RAW MATERIAL DESTOCKING & INVENTORY WRITE-OFF ---
export type DestockingReasonCategory = 
  | 'EXPIRED' 
  | 'QUALITY_DAMAGE' 
  | 'RANDOM_DISTRIBUTION' 
  | 'SPILLAGE_WASTE' 
  | 'INVENTORY_CORRECTION';

export interface InventoryAdjustment {
  id: string;
  raw_material_id: string;
  raw_material_name: string;
  unit: MaterialUnit | string;
  quantity_removed: number;
  unit_cost_at_time: number;
  total_loss_value: number;
  reason_category: DestockingReasonCategory;
  notes?: string;
  created_by: string;
  created_at: string;
}

// --- NEW ADVANCED MODULE TYPES ---

// 1. Production Planning & Lab Intelligence
export interface DailyPastryProductionForecast {
  recipeId: string;
  recipeName: string;
  category: string;
  recommendedBatchQty: number;
  historicalAvgDailySales: number;
  dayOfWeekMultiplier: number;
  currentFinishedStockAcrossStores: number;
  estimatedRawCost: number;
  estimatedRetailValue: number;
  priority: 'HIGH' | 'MEDIUM' | 'STANDARD';
  unitName: string;
}

export interface ColdRoomBatchExpiryItem {
  id: string;
  rawMaterialId: string;
  materialName: string;
  category: string;
  batchNumber: string;
  storageLocation: string; // e.g. "Chambre Froide Positive 3°C", "Réserve Sèche"
  quantity: number;
  unit: MaterialUnit;
  receivedDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'EXPIRED' | 'CRITICAL' | 'EXPIRING_SOON' | 'FRESH';
  storageTempCelsius?: number;
}

export interface IngredientCostSimulation {
  materialId: string;
  materialName: string;
  currentCost: number;
  simulatedCost: number;
  percentChange: number;
}

// 2. Custom Cake & Event Pre-Orders
export type CustomOrderStatus = 'NEW_DEPOSIT_PAID' | 'IN_PASTRY_LAB' | 'READY_FOR_PICKUP' | 'COLLECTED' | 'CANCELLED';

export interface CustomCakeOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupDate: string;
  pickupTime: string;
  cakeType: string;
  flavor: string;
  servings: number; // e.g. 12, 24, 50 parts
  customMessage?: string;
  specialDietaryNotes?: string;
  totalPrice: number;
  depositAmount: number;
  remainingBalance: number;
  paymentMethod: 'CASH' | 'CARD' | 'EDAHABIA' | 'CIB';
  status: CustomOrderStatus;
  assignedChef?: string;
  createdAt: string;
}

// 3. Customer Loyalty & VIP Profiles
export interface CustomerLoyaltyProfile {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'SILVER' | 'GOLD' | 'VIP_PLATINUM';
  totalSpent: number;
  visitsCount: number;
  favoritePastry: string;
  registeredStoreId: string;
  registeredStoreName: string;
  birthday?: string;
  createdAt: string;
  lastVisit: string;
}

// 4. End-of-Day Cash Drawer Reconciliation (Z-Report)
export interface CashDrawerZReport {
  id: string;
  reportNumber: string;
  storeId: string;
  storeName: string;
  closingDate: string;
  openedAt: string;
  closedAt: string;
  cashierName: string;
  openingFloat: number; // Fond de caisse initial
  expectedCashSales: number;
  actualCashCounted: number;
  cashVariance: number; // Écart (surplus/manquant)
  cardTotalTerminal: number;
  edahabiaTotal: number;
  cibTotal: number;
  totalRevenue: number;
  totalTransactions: number;
  discountsGiven: number;
  managerNotes?: string;
  status: 'BALANCED' | 'DISCREPANCY_MINOR' | 'DISCREPANCY_MAJOR';
  isSignedOff: boolean;
}

// 5. Returns & Damaged Goods Workflow
export type ReturnReason = 'UNSOLD_DAY_OLD' | 'TRANSIT_DAMAGE' | 'TEMPERATURE_EXCURSION' | 'CUSTOMER_COMPLAINT' | 'RECIPE_FLAW';
export type ReturnAction = 'REPURPOSE_PUDDING_CRUMB' | 'DESTROY_COMPOST' | 'DONATION' | 'INVESTIGATE_LAB';

export interface StoreReturnVoucher {
  id: string;
  voucherNumber: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalLossValue: number;
  reason: ReturnReason;
  actionTaken: ReturnAction;
  notes?: string;
  status: 'PENDING_COLLECTION' | 'RECEIVED_AT_LAB' | 'FINALIZED';
  inspectedBy?: string;
}

// 6. Hands-Free Chef Voice Notes & Recipe Modifications
export type VoiceNoteCategory = 
  | 'RECIPE_MODIFICATION' 
  | 'PRODUCTION_RUN' 
  | 'OVEN_INCIDENT' 
  | 'RAW_MATERIAL_QUALITY' 
  | 'HYGIENE_HACCP' 
  | 'GENERAL';

export type ChefStation = 
  | 'TOURNAGE_VIENNOISERIE' 
  | 'PATISSERIE_FINE' 
  | 'ENTREMETS_GLACES' 
  | 'FOURS_CUISSON' 
  | 'TRAITEUR_SALÉ' 
  | 'LABO_CENTRAL';

export interface ChefVoiceNote {
  id: string;
  noteNumber: string;
  chefName: string;
  station: ChefStation;
  category: VoiceNoteCategory;
  recipeId?: string;
  recipeName?: string;
  batchId?: string;
  transcript: string;
  audioBlobUrl?: string;
  durationSeconds?: number;
  tags: string[];
  severity?: 'normal' | 'important' | 'critical';
  status: 'PENDING_REVIEW' | 'APPLIED_TO_RECIPE' | 'RESOLVED' | 'ARCHIVED';
  createdAt: string;
  appliedAt?: string;
  appliedBy?: string;
  actionTakenNotes?: string;
}




