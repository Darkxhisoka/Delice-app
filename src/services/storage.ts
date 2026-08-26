import { syncToFirestore } from '../lib/firebaseSync';
import { enqueueOfflineAction } from './indexedDbQueue';
import {
  UserRole,
  UserSession,
  RawMaterial,
  Receipt,
  Requisition,
  RequisitionStatus,
  Supplier,
  Recipe,
  StoreLocation,
  ToastNotification,
  ReceiptItem,
  ActivityLogItem,
  SemiFinishedStockItem,
  RetailProduct,
  RetailStoreStock,
  SaleTransaction,
  UnsoldProductLog,
  SaleItem,
  ProductionSubRunRequirement,
  ProductionCascadePreview,
  ProductionCascadeExecutionResult,
  LabWasteLog,
  WasteReason,
  DailyStoreInventory,
  DeliveryManifest,
  DeliveryManifestItem,
  TransitWasteLog,
  PurchaseOrder,
  PurchaseOrderItem,
  BatchStatus,
  ProductionBatch,
  MasterProductionItem,
  TemperatureLog,
  QualityInspection,
  PackagingMaterial,
  StorePackagingInventory,
  PackagingDispatch,
  PackagingDispatchItem,
  PackagingRequisition,
  PackagingRequisitionItem,
  InventoryAdjustment,
  DestockingReasonCategory,
  DailyPastryProductionForecast,
  ColdRoomBatchExpiryItem,
  CustomCakeOrder,
  CustomerLoyaltyProfile,
  CashDrawerZReport,
  StoreReturnVoucher,
  ChefVoiceNote
} from '../types';
import {
  INITIAL_STORES
} from '../data/mockData';

const KEYS = {
  AUTH_SESSION: 'pastry_app_auth_session',
  ROLE: 'pastry_app_role',
  ACTIVE_STORE_ID: 'pastry_app_active_store_id',
  RAW_MATERIALS: 'pastry_app_raw_materials',
  RECEIPTS: 'pastry_app_receipts',
  REQUISITIONS: 'pastry_app_requisitions',
  SUPPLIERS: 'pastry_app_suppliers',
  RECIPES: 'pastry_app_recipes',
  STORES: 'pastry_app_stores',
  ACTIVITY_LOGS: 'pastry_app_activity_logs',
  SEMI_FINISHED_STOCK: 'pastry_app_semi_finished_stock',
  RETAIL_PRODUCTS: 'pastry_app_retail_products',
  RETAIL_STORE_STOCK: 'pastry_app_retail_store_stock',
  SALE_TRANSACTIONS: 'pastry_app_sale_transactions',
  UNSOLD_LOGS: 'pastry_app_unsold_logs',
  LAB_WASTE_LOGS: 'pastry_app_lab_waste_logs',
  DAILY_STORE_INVENTORY: 'pastry_app_daily_store_inventory',
  DELIVERY_MANIFESTS: 'pastry_app_delivery_manifests',
  TRANSIT_WASTE_LOGS: 'pastry_app_transit_waste_logs',
  PURCHASE_ORDERS: 'pastry_app_purchase_orders',
  PRODUCTION_BATCHES: 'pastry_app_production_batches',
  TEMPERATURE_LOGS: 'pastry_app_temperature_logs',
  QUALITY_INSPECTIONS: 'pastry_app_quality_inspections',
  PACKAGING_MATERIALS: 'pastry_app_packaging_materials',
  STORE_PACKAGING_INVENTORY: 'pastry_app_store_packaging_inventory',
  PACKAGING_DISPATCHES: 'pastry_app_packaging_dispatches',
  PACKAGING_REQUISITIONS: 'pastry_app_packaging_requisitions',
  INVENTORY_ADJUSTMENTS: 'pastry_app_inventory_adjustments',
  PRODUCTION_FORECASTS: 'pastry_app_production_forecasts',
  COLD_ROOM_BATCHES: 'pastry_app_cold_room_batches',
  CUSTOM_CAKE_ORDERS: 'pastry_app_custom_cake_orders',
  LOYALTY_PROFILES: 'pastry_app_loyalty_profiles',
  Z_REPORTS: 'pastry_app_z_reports',
  STORE_RETURNS: 'pastry_app_store_returns',
  CHEF_VOICE_NOTES: 'pastry_app_chef_voice_notes'
};

// Event emitter for state reactivity across components
type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

export function subscribeToStoreChanges(listener: ChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// Initialize local storage if empty
export function initStorage() {
  if (!localStorage.getItem(KEYS.ROLE)) {
    localStorage.setItem(KEYS.ROLE, 'RETAIL_STORE');
  }
  if (!localStorage.getItem(KEYS.ACTIVE_STORE_ID)) {
    localStorage.setItem(KEYS.ACTIVE_STORE_ID, INITIAL_STORES[0]?.id || 'store-1');
  }
  if (!localStorage.getItem(KEYS.STORES)) {
    localStorage.setItem(KEYS.STORES, JSON.stringify(INITIAL_STORES));
  }
}

// Activity Log Functions
export function getActivityLogs(): ActivityLogItem[] {
  initStorage();
  const data = localStorage.getItem(KEYS.ACTIVITY_LOGS);
  return data ? JSON.parse(data) : [];
}

export function addActivityLog(log: Omit<ActivityLogItem, 'id' | 'timestamp'>): ActivityLogItem {
  const logs = getActivityLogs();
  const newLog: ActivityLogItem = {
    ...log,
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  notifyListeners();
  return newLog;
}

// Role & Active Session Management
export function isCentralLabAdmin(session?: UserSession | null): boolean {
  const currentSession = session !== undefined ? session : getAuthSession();
  if (!currentSession?.isAuthenticated || !currentSession?.user) return false;
  return currentSession.user.is_central_lab === true || 
         currentSession.user.role === 'CENTRAL_LAB' || 
         currentSession.user.secret_role === 'LAB_EXECUTIVE_ADMIN' ||
         currentSession.user.raw_role === 'lab_admin';
}

export function getActiveRole(): UserRole {
  initStorage();
  const savedViewRole = localStorage.getItem(KEYS.ROLE) as UserRole | null;
  if (savedViewRole) {
    return savedViewRole;
  }
  const session = getAuthSession();
  if (session && session.user?.role) {
    return session.user.role;
  }
  return 'RETAIL_STORE';
}

export function setActiveRole(role: UserRole) {
  localStorage.setItem(KEYS.ROLE, role);
  notifyListeners();
}

export function getActiveViewContext(): string {
  initStorage();
  const role = getActiveRole();
  if (role === 'CENTRAL_LAB') {
    return 'LAB-CENTRAL';
  }
  return getActiveStoreId();
}

export function setActiveViewContext(context: string) {
  if (context === 'LAB-CENTRAL') {
    setActiveRole('CENTRAL_LAB');
  } else {
    setActiveRole('RETAIL_STORE');
    setActiveStoreId(context);
  }
  notifyListeners();
}

export function getAuthSession(): UserSession {
  initStorage();
  const data = localStorage.getItem(KEYS.AUTH_SESSION);
  if (data) {
    try {
      const parsed: UserSession = JSON.parse(data);
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        if (parsed.user) {
          if (parsed.user.role === 'CENTRAL_LAB' || parsed.user.secret_role === 'LAB_EXECUTIVE_ADMIN' || parsed.user.is_central_lab || parsed.user.raw_role === 'lab_admin') {
            parsed.user.is_central_lab = true;
          }
        }
        return parsed;
      }
    } catch {
      // Fallback if parsing fails
    }
  }

  // Default unauthenticated session for Supabase Auth enforcement
  return {
    isAuthenticated: false,
    user: undefined
  };
}

export function setAuthSession(session: UserSession | null) {
  if (!session || !session.isAuthenticated) {
    localStorage.removeItem(KEYS.AUTH_SESSION);
  } else {
    if (session.user) {
      if (session.user.role === 'CENTRAL_LAB' || session.user.secret_role === 'LAB_EXECUTIVE_ADMIN' || session.user.is_central_lab || session.user.raw_role === 'lab_admin') {
        session.user.is_central_lab = true;
      }
      const assignedStoreId = session.user.store_id || session.user.storeId;
      if (assignedStoreId) {
        session.user.storeId = assignedStoreId;
        session.user.store_id = assignedStoreId;
        if (!isCentralLabAdmin(session)) {
          localStorage.setItem(KEYS.ACTIVE_STORE_ID, assignedStoreId);
        }
      }
    }
    localStorage.setItem(KEYS.AUTH_SESSION, JSON.stringify(session));
    if (session.user?.role) {
      localStorage.setItem(KEYS.ROLE, session.user.role);
    }
  }
  notifyListeners();
}

export function logoutUser() {
  localStorage.removeItem(KEYS.AUTH_SESSION);
  try {
    import('../lib/supabaseClient').then(({ supabase }) => {
      supabase.auth.signOut();
    });
  } catch (err) {
    console.error('Error signing out of Supabase Auth:', err);
  }
  notifyListeners();
  notifyToast({
    type: 'info',
    title: 'Session Supabase Clôturée',
    message: 'Vous avez été déconnecté de votre session Supabase Auth.'
  });
}

export function getActiveStoreId(): string {
  initStorage();
  const data = localStorage.getItem(KEYS.AUTH_SESSION);
  if (data) {
    try {
      const session: UserSession = JSON.parse(data);
      if (session?.isAuthenticated && session?.user && !isCentralLabAdmin(session)) {
        const assignedStoreId = session.user.store_id || session.user.storeId;
        if (assignedStoreId) {
          return assignedStoreId;
        }
      }
    } catch {
      // Fallback
    }
  }
  return localStorage.getItem(KEYS.ACTIVE_STORE_ID) || INITIAL_STORES[0].id;
}

export function setActiveStoreId(storeId: string) {
  const data = localStorage.getItem(KEYS.AUTH_SESSION);
  if (data) {
    try {
      const session: UserSession = JSON.parse(data);
      if (session?.isAuthenticated && session?.user && !isCentralLabAdmin(session)) {
        const assignedStoreId = session.user.store_id || session.user.storeId;
        if (assignedStoreId) {
          localStorage.setItem(KEYS.ACTIVE_STORE_ID, assignedStoreId);
          notifyListeners();
          return;
        }
      }
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(KEYS.ACTIVE_STORE_ID, storeId);
  notifyListeners();
}

export function getStores(): StoreLocation[] {
  initStorage();
  const data = localStorage.getItem(KEYS.STORES);
  if (!data) {
    localStorage.setItem(KEYS.STORES, JSON.stringify(INITIAL_STORES));
    return INITIAL_STORES;
  }
  try {
    const parsed: StoreLocation[] = JSON.parse(data);
    // Check if stored stores are using old placeholder names or missing default locations
    const hasOutdatedData = parsed.some(
      (s) => s.name?.includes('Downtown') || s.name?.includes('Uptown') || s.name?.includes('Westside') || s.name?.includes('Store #1')
    );
    if (hasOutdatedData || parsed.length < INITIAL_STORES.length) {
      // Merge official stores with any newly created custom stores
      const officialIds = new Set(INITIAL_STORES.map((s) => s.id));
      const customStores = parsed.filter((s) => !officialIds.has(s.id) && !s.name?.includes('Downtown') && !s.name?.includes('Uptown') && !s.name?.includes('Westside'));
      const mergedStores = [...INITIAL_STORES, ...customStores];
      localStorage.setItem(KEYS.STORES, JSON.stringify(mergedStores));
      return mergedStores;
    }
    return parsed;
  } catch {
    localStorage.setItem(KEYS.STORES, JSON.stringify(INITIAL_STORES));
    return INITIAL_STORES;
  }
}

export function saveStores(stores: StoreLocation[]) {
  localStorage.setItem(KEYS.STORES, JSON.stringify(stores));
  notifyListeners();
}

export function resetStoresToDefault(): StoreLocation[] {
  localStorage.setItem(KEYS.STORES, JSON.stringify(INITIAL_STORES));
  notifyListeners();
  addActivityLog({
    type: 'SUPPLIER_ADDED',
    title: 'Stores Directory Reset',
    description: 'Reset store locations network to official 6 Algerian branch outlets.',
    actor: 'Central Lab Operations',
    badgeText: 'NETWORK SYNC',
    severity: 'info',
  });
  return INITIAL_STORES;
}

export function getActiveStore(): StoreLocation {
  const stores = getStores();
  const id = getActiveStoreId();
  return stores.find((s) => s.id === id) || stores[0];
}

export function addStore(storeData: Omit<StoreLocation, 'id'>): StoreLocation {
  const stores = getStores();
  const nextNum = stores.length + 1;
  const newStore: StoreLocation = {
    ...storeData,
    id: `store-${Date.now()}`,
    code: storeData.code ? storeData.code.toUpperCase().trim() : `STR-${nextNum.toString().padStart(3, '0')}`,
  };
  stores.push(newStore);
  localStorage.setItem(KEYS.STORES, JSON.stringify(stores));

  addActivityLog({
    type: 'SUPPLIER_ADDED',
    title: 'New Retail Store Registered',
    description: `Registered outlet ${newStore.name} (${newStore.code}) located at ${newStore.address}. Store Manager: ${newStore.managerName}.`,
    actor: 'Central Lab Operations',
    badgeText: 'RETAIL OUTLET',
    severity: 'info',
    metadata: {
      storeName: newStore.name,
    },
  });

  notifyListeners();
  return newStore;
}

export function updateStore(id: string, updatedFields: Partial<Omit<StoreLocation, 'id'>>): StoreLocation | null {
  const stores = getStores();
  const index = stores.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const oldStore = stores[index];
  const updatedStore = {
    ...stores[index],
    ...updatedFields,
  };
  stores[index] = updatedStore;
  localStorage.setItem(KEYS.STORES, JSON.stringify(stores));

  addActivityLog({
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Retail Store Information Updated',
    description: `Updated info for ${updatedStore.name} (${updatedStore.code}). Manager: ${updatedStore.managerName}, Tel: ${updatedStore.phone}.`,
    actor: 'Central Lab Operations',
    badgeText: 'STORE DIRECTORY',
    severity: 'info',
    metadata: {
      storeId: id,
      storeName: updatedStore.name,
      previousName: oldStore.name
    },
  });

  notifyListeners();
  return updatedStore;
}

export function deleteStore(id: string): boolean {
  const stores = getStores();
  const index = stores.findIndex((s) => s.id === id);
  if (index === -1) return false;

  const deletedStore = stores[index];
  const filtered = stores.filter((s) => s.id !== id);
  localStorage.setItem(KEYS.STORES, JSON.stringify(filtered));

  if (getActiveStoreId() === id && filtered.length > 0) {
    setActiveStoreId(filtered[0].id);
  }

  addActivityLog({
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Retail Store Removed',
    description: `Removed outlet ${deletedStore.name} (${deletedStore.code}) from active network directory.`,
    actor: 'Central Lab Operations',
    badgeText: 'OUTLET REMOVED',
    severity: 'warning',
    metadata: {
      storeId: id,
      storeName: deletedStore.name
    },
  });

  notifyListeners();
  return true;
}

// Raw Materials
export function getRawMaterials(): RawMaterial[] {
  initStorage();
  const data = localStorage.getItem(KEYS.RAW_MATERIALS);
  return data ? JSON.parse(data) : [];
}

export function saveRawMaterials(materials: RawMaterial[]) {
  localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(materials));
  notifyListeners();
  materials.forEach((mat) => {
    if (mat.id) {
      syncToFirestore('raw_materials', mat.id, mat);
    }
  });
}

export const setRawMaterials = saveRawMaterials;

// Suppliers
export function getSuppliers(): Supplier[] {
  initStorage();
  const data = localStorage.getItem(KEYS.SUPPLIERS);
  return data ? JSON.parse(data) : [];
}

export function addSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
  const suppliers = getSuppliers();
  const newSupplier: Supplier = {
    ...supplier,
    id: `sup-${Date.now()}`,
  };
  suppliers.push(newSupplier);
  localStorage.setItem(KEYS.SUPPLIERS, JSON.stringify(suppliers));

  addActivityLog({
    type: 'SUPPLIER_ADDED',
    title: 'New Supplier Added',
    description: `Added ${newSupplier.name} as an approved vendor (${newSupplier.categoriesProvided.join(', ')}).`,
    actor: 'Central Purchasing',
    badgeText: 'VENDOR',
    severity: 'info',
    metadata: {
      supplierName: newSupplier.name,
    },
  });

  notifyListeners();
  return newSupplier;
}

// Receipts & Purchasing Module (KEY FUNCTION)
export function getReceipts(): Receipt[] {
  initStorage();
  const data = localStorage.getItem(KEYS.RECEIPTS);
  return data ? JSON.parse(data) : [];
}

/**
 * Process Raw Material Receipt:
 * 1. Saves receipt record
 * 2. Updates central lab raw_materials inventory stock levels
 * 3. Automatically recalculates weighted moving average cost per unit (current_avg_cost)
 */
export function addReceipt(
  newReceiptData: Omit<Receipt, 'id' | 'receiptNumber' | 'recordedAt'>
): { receipt: Receipt; updatedMaterialsSummary: { name: string; oldStock: number; newStock: number; oldAvgCost: number; newAvgCost: number }[] } {
  const receipts = getReceipts();
  const rawMaterials = getRawMaterials();

  const receiptId = `rec-${Date.now()}`;
  const dateObj = new Date();
  const formattedDate = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
  const receiptNumber = `REC-${formattedDate}-${Math.floor(100 + Math.random() * 900)}`;

  const receipt: Receipt = {
    ...newReceiptData,
    id: receiptId,
    receiptNumber,
    recordedAt: new Date().toISOString(),
  };

  // Tracking summary for notification feedback
  const updatedMaterialsSummary: {
    name: string;
    oldStock: number;
    newStock: number;
    oldAvgCost: number;
    newAvgCost: number;
  }[] = [];

  // Update Raw Materials Stock & Weighted Average Cost
  const updatedMaterials = rawMaterials.map((mat) => {
    const itemInReceipt = receipt.items.find((ri) => ri.rawMaterialId === mat.id);
    if (!itemInReceipt) return mat;

    const oldStock = mat.currentStock;
    const oldAvgCost = mat.currentAvgCost;
    const receivedQty = itemInReceipt.quantity;
    const unitPricePaid = itemInReceipt.unitPrice;

    const newStock = oldStock + receivedQty;
    
    // Formula for Moving Weighted Average Unit Cost:
    // If oldStock was 0 or negative, current_avg_cost is simply the new purchase unit price.
    let newAvgCost = unitPricePaid;
    if (oldStock > 0 && newStock > 0) {
      newAvgCost = Number((((oldStock * oldAvgCost) + (receivedQty * unitPricePaid)) / newStock).toFixed(4));
    }

    updatedMaterialsSummary.push({
      name: mat.name,
      oldStock,
      newStock,
      oldAvgCost,
      newAvgCost,
    });

    return {
      ...mat,
      currentStock: newStock,
      currentAvgCost: newAvgCost,
      totalPurchasedQty: mat.totalPurchasedQty + receivedQty,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
  });

  receipts.unshift(receipt);

  localStorage.setItem(KEYS.RECEIPTS, JSON.stringify(receipts));
  localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(updatedMaterials));

  // Enqueue in IndexedDB Offline Queue
  enqueueOfflineAction({
    entityType: 'RECEIPT',
    actionType: 'CREATE',
    entityId: receipt.id,
    label: `Réception MP : ${receipt.receiptNumber}`,
    description: `Réception de ${receipt.supplierName} (${receipt.totalAmount.toFixed(2)} DZD) - ${receipt.items.length} lignes`,
    payload: receipt
  }).catch((err) => console.warn('IndexedDB enqueue receipt notice:', err));

  addActivityLog({
    type: 'RECEIPT_CREATED',
    title: 'Raw Material Receipt Recorded',
    description: `Recorded receipt ${receipt.receiptNumber} from ${receipt.supplierName} (${receipt.totalAmount.toFixed(2)} DZD total). Stock & unit costs updated.`,
    actor: receipt.recordedBy || 'Central Lab',
    badgeText: 'PURCHASE',
    severity: 'success',
    metadata: {
      amount: receipt.totalAmount,
      supplierName: receipt.supplierName,
      referenceNumber: receipt.receiptNumber,
      itemCount: receipt.items.length,
    },
  });

  notifyListeners();

  return { receipt, updatedMaterialsSummary };
}

// Requisitions Module
export function getRequisitions(): Requisition[] {
  initStorage();
  const data = localStorage.getItem(KEYS.REQUISITIONS);
  return data ? JSON.parse(data) : [];
}

export function getRequisitionsByStore(storeId: string): Requisition[] {
  const requisitions = getRequisitions();
  return requisitions.filter((r) => r.storeId === storeId);
}

export function addRequisition(
  reqData: Omit<Requisition, 'id' | 'requisitionNumber' | 'dateRequested' | 'status'>
): Requisition {
  const requisitions = getRequisitions();
  const reqId = `req-${Date.now()}`;
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const requisitionNumber = `REQ-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

  const newRequisition: Requisition = {
    ...reqData,
    id: reqId,
    requisitionNumber,
    dateRequested: new Date().toISOString().slice(0, 10),
    status: 'PENDING',
  };

  requisitions.unshift(newRequisition);
  localStorage.setItem(KEYS.REQUISITIONS, JSON.stringify(requisitions));

  // Enqueue in IndexedDB Offline Queue
  enqueueOfflineAction({
    entityType: 'REQUISITION',
    actionType: 'CREATE',
    entityId: newRequisition.id,
    label: `Demande Boutique : ${newRequisition.requisitionNumber}`,
    description: `${newRequisition.storeName} - ${newRequisition.items.length} article(s), estimation ${newRequisition.totalEstimatedCost.toFixed(2)} DZD`,
    payload: newRequisition
  }).catch((err) => console.warn('IndexedDB enqueue requisition notice:', err));

  addActivityLog({
    type: 'REQUISITION_CREATED',
    title: 'Store Requisition Submitted',
    description: `${newRequisition.storeName} submitted requisition ${newRequisition.requisitionNumber} (${newRequisition.items.length} items, est. ${newRequisition.totalEstimatedCost.toFixed(2)} DZD).`,
    actor: newRequisition.requestedBy || 'Store Manager',
    badgeText: 'PENDING',
    severity: 'info',
    metadata: {
      amount: newRequisition.totalEstimatedCost,
      storeName: newRequisition.storeName,
      referenceNumber: newRequisition.requisitionNumber,
      itemCount: newRequisition.items.length,
    },
  });

  notifyListeners();
  return newRequisition;
}

export function updateRequisitionStatus(
  reqId: string,
  newStatus: RequisitionStatus,
  options?: { rejectionReason?: string; fulfilledQuantities?: Record<string, number> }
): Requisition | null {
  const requisitions = getRequisitions();
  const reqIndex = requisitions.findIndex((r) => r.id === reqId);
  if (reqIndex === -1) return null;

  const targetReq = { ...requisitions[reqIndex] };
  targetReq.status = newStatus;

  if (newStatus === 'REJECTED' && options?.rejectionReason) {
    targetReq.rejectionReason = options.rejectionReason;
  }

  if (newStatus === 'DISPATCHED') {
    targetReq.dispatchedAt = new Date().toISOString();
  }

  if (newStatus === 'DELIVERED') {
    targetReq.deliveredAt = new Date().toISOString();
    // Auto replenish retail store stock
    const currentStoreStock = getRetailStoreStock(targetReq.storeId);
    targetReq.items.forEach((reqItem) => {
      const deliveredQty = reqItem.fulfilledQuantity ?? reqItem.quantityRequested;
      const stockIdx = currentStoreStock.findIndex(
        (s) =>
          s.productName.toLowerCase().includes(reqItem.productName.toLowerCase()) ||
          reqItem.productName.toLowerCase().includes(s.productName.toLowerCase())
      );
      if (stockIdx !== -1) {
        currentStoreStock[stockIdx].currentStock += deliveredQty;
        currentStoreStock[stockIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      }
    });
    saveRetailStoreStock(currentStoreStock);
  }

  if (options?.fulfilledQuantities) {
    targetReq.items = targetReq.items.map((item) => ({
      ...item,
      fulfilledQuantity: options.fulfilledQuantities?.[item.id] ?? item.quantityRequested,
    }));
  }

  requisitions[reqIndex] = targetReq;
  localStorage.setItem(KEYS.REQUISITIONS, JSON.stringify(requisitions));

  // Enqueue status change in IndexedDB Offline Queue
  enqueueOfflineAction({
    entityType: 'REQUISITION',
    actionType: 'UPDATE_STATUS',
    entityId: targetReq.id,
    label: `Statut Réquisition : ${targetReq.requisitionNumber} ➔ ${newStatus}`,
    description: `Mise à jour du statut pour ${targetReq.storeName} (${newStatus})`,
    payload: {
      reqId: targetReq.id,
      newStatus,
      options
    }
  }).catch((err) => console.warn('IndexedDB enqueue requisition status notice:', err));

  let severity: 'info' | 'success' | 'warning' | 'purple' = 'info';
  if (newStatus === 'APPROVED' || newStatus === 'PROCESSING') severity = 'purple';
  if (newStatus === 'DISPATCHED' || newStatus === 'DELIVERED') severity = 'success';
  if (newStatus === 'REJECTED') severity = 'warning';

  addActivityLog({
    type: 'REQUISITION_STATUS_UPDATED',
    title: `Requisition ${newStatus.replace('_', ' ')}`,
    description: `Requisition ${targetReq.requisitionNumber} for ${targetReq.storeName} status updated to ${newStatus}.${options?.rejectionReason ? ` Reason: ${options.rejectionReason}` : ''}`,
    actor: 'Central Lab',
    badgeText: newStatus,
    severity,
    metadata: {
      amount: targetReq.totalEstimatedCost,
      storeName: targetReq.storeName,
      referenceNumber: targetReq.requisitionNumber,
      status: newStatus,
    },
  });

  notifyListeners();
  return targetReq;
}

// Recipes
export function getRecipes(): Recipe[] {
  initStorage();
  const data = localStorage.getItem(KEYS.RECIPES);
  return data ? JSON.parse(data) : [];
}

export function addRecipe(recipeData: Omit<Recipe, 'id'>): Recipe {
  const recipes = getRecipes();
  const newRecipe: Recipe = {
    ...recipeData,
    id: `recp-${Date.now()}`,
  };
  recipes.push(newRecipe);
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));

  addActivityLog({
    type: 'RECIPE_CREATED',
    title: 'Standard Recipe Created',
    description: `Added standard recipe "${newRecipe.name}" yielding ${newRecipe.yieldUnits} ${newRecipe.unitName}.`,
    actor: 'Central Lab Chef',
    badgeText: 'RECIPE',
    severity: 'info',
    metadata: {
      recipeName: newRecipe.name,
    },
  });

  notifyListeners();
  return newRecipe;
}

export function updateRecipe(id: string, updatedFields: Partial<Omit<Recipe, 'id'>>): Recipe | null {
  const recipes = getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updated = {
    ...recipes[index],
    ...updatedFields,
  };
  recipes[index] = updated;
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
  notifyListeners();
  return updated;
}

export function deleteRecipe(id: string): boolean {
  const recipes = getRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  if (filtered.length === recipes.length) return false;

  localStorage.setItem(KEYS.RECIPES, JSON.stringify(filtered));
  notifyListeners();
  return true;
}

// Calculate Recipe Unit Cost recursively (supporting sub-recipes)
export function getRecipeUnitCost(
  recipe: Recipe,
  allRecipes: Recipe[],
  allRawMaterials: RawMaterial[],
  visited = new Set<string>()
): number {
  if (!recipe || visited.has(recipe.id)) return 0;
  visited.add(recipe.id);

  let totalBatchCost = 0;
  for (const ing of recipe.ingredients) {
    const isSemiFinished = ing.type === 'SEMI_FINISHED' || (!ing.rawMaterialId && !!ing.semiFinishedRecipeId);
    if (isSemiFinished && ing.semiFinishedRecipeId) {
      const subRecipe = allRecipes.find((r) => r.id === ing.semiFinishedRecipeId);
      if (subRecipe) {
        const subUnitCost = getRecipeUnitCost(subRecipe, allRecipes, allRawMaterials, new Set(visited));
        totalBatchCost += ing.quantity * subUnitCost;
      }
    } else if (ing.rawMaterialId) {
      const mat = allRawMaterials.find((m) => m.id === ing.rawMaterialId);
      if (mat) {
        totalBatchCost += ing.quantity * mat.currentAvgCost;
      }
    }
  }

  return recipe.yieldUnits > 0 ? totalBatchCost / recipe.yieldUnits : 0;
}

// Semi-Finished Stock Management
export function getSemiFinishedStock(): SemiFinishedStockItem[] {
  initStorage();
  const data = localStorage.getItem(KEYS.SEMI_FINISHED_STOCK);
  const items: SemiFinishedStockItem[] = data ? JSON.parse(data) : [];

  // Auto sync stock items for any newly added semi-finished recipes
  const recipes = getRecipes();
  const semiFinishedRecipes = recipes.filter((r) => r.recipeType === 'SEMI_FINISHED');
  let updated = false;

  for (const sfRec of semiFinishedRecipes) {
    const exists = items.some((item) => item.recipeId === sfRec.id);
    if (!exists) {
      items.push({
        id: `sf-stock-${sfRec.id}`,
        recipeId: sfRec.id,
        recipeName: sfRec.name,
        category: sfRec.category,
        currentStock: 10.0,
        unit: sfRec.unitName || 'kg',
        minStockLevel: 5.0,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      updated = true;
    }
  }

  if (updated) {
    localStorage.setItem(KEYS.SEMI_FINISHED_STOCK, JSON.stringify(items));
  }

  return items;
}

export function saveSemiFinishedStock(items: SemiFinishedStockItem[]) {
  localStorage.setItem(KEYS.SEMI_FINISHED_STOCK, JSON.stringify(items));
  notifyListeners();
}

export function updateSemiFinishedStockQuantity(id: string, newStock: number) {
  const stock = getSemiFinishedStock();
  const idx = stock.findIndex((s) => s.id === id);
  if (idx !== -1) {
    stock[idx].currentStock = Math.max(0, newStock);
    stock[idx].lastUpdated = new Date().toISOString().slice(0, 10);
    saveSemiFinishedStock(stock);
  }
}

export function produceSemiFinishedBatch(recipeId: string, batchesToProduce: number): boolean {
  const recipes = getRecipes();
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) return false;

  const rawMaterials = getRawMaterials();
  let canProduce = true;
  let missingItemName = '';

  // Verify raw materials stock availability
  for (const ing of recipe.ingredients) {
    if (ing.rawMaterialId) {
      const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      const required = ing.quantity * batchesToProduce;
      if (!mat || mat.currentStock < required) {
        canProduce = false;
        missingItemName = mat ? mat.name : 'Raw Material';
        break;
      }
    }
  }

  if (!canProduce) {
    notifyToast({
      type: 'error',
      title: 'Insufficient Inventory',
      message: `Cannot produce batch: Insufficient stock of raw material "${missingItemName}".`,
    });
    return false;
  }

  // Deduct raw materials from inventory
  const updatedMaterials = rawMaterials.map((mat) => {
    const ing = recipe.ingredients.find((i) => i.rawMaterialId === mat.id);
    if (ing) {
      return {
        ...mat,
        currentStock: Math.max(0, mat.currentStock - ing.quantity * batchesToProduce),
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    }
    return mat;
  });
  saveRawMaterials(updatedMaterials);

  // Increase semi-finished stock
  const sfStock = getSemiFinishedStock();
  const producedQty = recipe.yieldUnits * batchesToProduce;
  const stockIdx = sfStock.findIndex((s) => s.recipeId === recipeId);

  if (stockIdx !== -1) {
    sfStock[stockIdx].currentStock += producedQty;
    sfStock[stockIdx].lastUpdated = new Date().toISOString().slice(0, 10);
  } else {
    sfStock.push({
      id: `sf-stock-${recipe.id}`,
      recipeId: recipe.id,
      recipeName: recipe.name,
      category: recipe.category,
      currentStock: producedQty,
      unit: recipe.unitName || 'kg',
      minStockLevel: 5.0,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }
  saveSemiFinishedStock(sfStock);

  addActivityLog({
    type: 'SEMI_FINISHED_PRODUCED',
    title: 'Batch Semi-Finished Produced',
    description: `Produced ${batchesToProduce} batch(es) of "${recipe.name}" (+${producedQty} ${recipe.unitName}). Raw materials auto-deducted from Central Lab inventory.`,
    actor: 'Central Lab Pastry Chef',
    badgeText: 'PRODUCTION',
    severity: 'success',
    metadata: {
      recipeName: recipe.name,
      amount: producedQty,
    },
  });

  notifyToast({
    type: 'success',
    title: 'Production Batch Completed',
    message: `Produced +${producedQty} ${recipe.unitName} of ${recipe.name}. Raw materials updated.`,
  });

  notifyListeners();
  return true;
}

// Production Cascading Engine (Multi-Level BOM & Dual Stock Tracking)
export function calculateProductionCascadePreview(
  recipeId: string,
  targetQuantity: number
): ProductionCascadePreview | null {
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const sfStock = getSemiFinishedStock();

  const finishedRecipe = recipes.find((r) => r.id === recipeId);
  if (!finishedRecipe || targetQuantity <= 0) return null;

  const yieldUnits = finishedRecipe.yieldUnits > 0 ? finishedRecipe.yieldUnits : 1;
  const ratio = targetQuantity / yieldUnits;

  const semiFinishedRequirements: ProductionSubRunRequirement[] = [];
  const directRawMaterialsMap: Record<string, number> = {};
  const subRunRawMaterialsMap: Record<string, number> = {};

  const blockers: string[] = [];

  // Iterate over recipe ingredients
  for (const ing of finishedRecipe.ingredients) {
    const isSemiFinished = ing.type === 'SEMI_FINISHED' || (!ing.rawMaterialId && !!ing.semiFinishedRecipeId);
    
    if (isSemiFinished && ing.semiFinishedRecipeId) {
      const sfRecipe = recipes.find((r) => r.id === ing.semiFinishedRecipeId);
      if (!sfRecipe) continue;

      const requiredQty = ing.quantity * ratio;
      const stockItem = sfStock.find((s) => s.recipeId === sfRecipe.id);
      const availableStock = stockItem ? stockItem.currentStock : 0;
      const deficitQty = Math.max(0, requiredQty - availableStock);

      const sfYield = sfRecipe.yieldUnits > 0 ? sfRecipe.yieldUnits : 1;
      const subRunRatio = deficitQty > 0 ? deficitQty / sfYield : 0;

      const rawMaterialsNeededForSubRun: Array<{
        materialId: string;
        materialName: string;
        unit: string;
        quantityNeeded: number;
        currentStock: number;
        hasEnough: boolean;
      }> = [];

      let hasEnoughRawForSubRun = true;

      if (deficitQty > 0) {
        for (const sfIng of sfRecipe.ingredients) {
          if (sfIng.rawMaterialId) {
            const mat = rawMaterials.find((m) => m.id === sfIng.rawMaterialId);
            if (mat) {
              const qtyNeeded = sfIng.quantity * subRunRatio;
              subRunRawMaterialsMap[mat.id] = (subRunRawMaterialsMap[mat.id] || 0) + qtyNeeded;
              const currentAccumulated = subRunRawMaterialsMap[mat.id] + (directRawMaterialsMap[mat.id] || 0);
              const hasEnough = mat.currentStock >= currentAccumulated;
              if (!hasEnough) {
                hasEnoughRawForSubRun = false;
              }
              rawMaterialsNeededForSubRun.push({
                materialId: mat.id,
                materialName: mat.name,
                unit: mat.unit,
                quantityNeeded: Number(qtyNeeded.toFixed(2)),
                currentStock: mat.currentStock,
                hasEnough,
              });
            }
          }
        }
      }

      let status: 'IN_STOCK' | 'AUTO_PRODUCING' | 'INSUFFICIENT_RAW' = 'IN_STOCK';
      if (deficitQty > 0) {
        if (hasEnoughRawForSubRun) {
          status = 'AUTO_PRODUCING';
        } else {
          status = 'INSUFFICIENT_RAW';
          blockers.push(`Deficit of ${sfRecipe.name} (${deficitQty.toFixed(1)} ${sfRecipe.unitName}) cannot be auto-produced due to missing raw materials.`);
        }
      }

      semiFinishedRequirements.push({
        recipeId: sfRecipe.id,
        recipeName: sfRecipe.name,
        unit: sfRecipe.unitName || 'kg',
        requiredQty: Number(requiredQty.toFixed(2)),
        availableStock: Number(availableStock.toFixed(2)),
        deficitQty: Number(deficitQty.toFixed(2)),
        status,
        rawMaterialsNeeded: rawMaterialsNeededForSubRun,
      });

    } else if (ing.rawMaterialId) {
      const mat = rawMaterials.find((m) => m.id === ing.rawMaterialId);
      if (mat) {
        const qtyNeeded = ing.quantity * ratio;
        directRawMaterialsMap[mat.id] = (directRawMaterialsMap[mat.id] || 0) + qtyNeeded;
      }
    }
  }

  // Construct Direct Raw Materials array
  const directRawMaterialsNeeded = Object.entries(directRawMaterialsMap).map(([matId, qtyNeeded]) => {
    const mat = rawMaterials.find((m) => m.id === matId);
    const currentStock = mat ? mat.currentStock : 0;
    const hasEnough = currentStock >= qtyNeeded;
    return {
      materialId: matId,
      materialName: mat ? mat.name : 'Unknown Raw Material',
      unit: mat ? mat.unit : 'kg',
      quantityNeeded: Number(qtyNeeded.toFixed(2)),
      currentStock,
      hasEnough,
    };
  });

  // Construct Combined Total Raw Materials Summary
  const allRawMaterialIds = Array.from(new Set([...Object.keys(directRawMaterialsMap), ...Object.keys(subRunRawMaterialsMap)]));
  const totalRawMaterialsSummary = allRawMaterialIds.map((matId) => {
    const mat = rawMaterials.find((m) => m.id === matId);
    const directQty = directRawMaterialsMap[matId] || 0;
    const subRunQty = subRunRawMaterialsMap[matId] || 0;
    const totalNeeded = directQty + subRunQty;
    const currentStock = mat ? mat.currentStock : 0;
    const hasEnough = currentStock >= totalNeeded;

    if (!hasEnough && mat && !blockers.some((b) => b.includes(mat.name))) {
      blockers.push(`Insufficient total stock for raw material: ${mat.name} (Combined Need: ${totalNeeded.toFixed(2)} ${mat.unit}, Available: ${currentStock} ${mat.unit})`);
    }

    return {
      materialId: matId,
      materialName: mat ? mat.name : 'Unknown Material',
      unit: mat ? mat.unit : 'kg',
      directQty: Number(directQty.toFixed(2)),
      subRunQty: Number(subRunQty.toFixed(2)),
      totalNeeded: Number(totalNeeded.toFixed(2)),
      currentStock,
      hasEnough,
    };
  });

  const canExecute = blockers.length === 0;

  return {
    finishedRecipe,
    targetQuantity,
    batchCount: Number(ratio.toFixed(2)),
    semiFinishedRequirements,
    directRawMaterialsNeeded,
    totalRawMaterialsSummary,
    canExecute,
    blockers,
  };
}

export function executeProductionCascade(
  recipeId: string,
  targetQuantity: number
): ProductionCascadeExecutionResult | null {
  const preview = calculateProductionCascadePreview(recipeId, targetQuantity);
  if (!preview || !preview.canExecute) {
    notifyToast({
      type: 'error',
      title: 'Production Launch Blocked',
      message: preview?.blockers[0] || 'Cannot execute production: raw material or dependency constraints not met.',
    });
    return null;
  }

  const rawMaterials = getRawMaterials();
  const sfStock = getSemiFinishedStock();
  const recipes = getRecipes();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = new Date().toISOString();

  const auditLogs: string[] = [];
  const subRunsExecuted: ProductionCascadeExecutionResult['subRunsExecuted'] = [];

  // Step 1: Auto-trigger Semi-Finished Sub-Production Runs for missing deficits
  for (const sfReq of preview.semiFinishedRequirements) {
    if (sfReq.deficitQty > 0) {
      const subBatchCode = `BATCH-SF-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;
      const sfRecipe = recipes.find((r) => r.id === sfReq.recipeId);
      if (!sfRecipe) continue;

      const subRunRatio = sfReq.deficitQty / (sfRecipe.yieldUnits > 0 ? sfRecipe.yieldUnits : 1);
      const subRunDeductions: Array<{ name: string; qty: number; unit: string }> = [];

      // Deduct raw materials for sub-run
      for (const sfIng of sfRecipe.ingredients) {
        if (sfIng.rawMaterialId) {
          const matIdx = rawMaterials.findIndex((m) => m.id === sfIng.rawMaterialId);
          if (matIdx !== -1) {
            const deductQty = sfIng.quantity * subRunRatio;
            rawMaterials[matIdx].currentStock = Math.max(0, rawMaterials[matIdx].currentStock - deductQty);
            rawMaterials[matIdx].lastUpdated = new Date().toISOString().slice(0, 10);
            subRunDeductions.push({
              name: rawMaterials[matIdx].name,
              qty: Number(deductQty.toFixed(2)),
              unit: rawMaterials[matIdx].unit,
            });
          }
        }
      }

      // Replenish / Add produced deficit to semi-finished stock
      const sfIdx = sfStock.findIndex((s) => s.recipeId === sfReq.recipeId);
      if (sfIdx !== -1) {
        sfStock[sfIdx].currentStock += sfReq.deficitQty;
        sfStock[sfIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      } else {
        sfStock.push({
          id: `sf-stock-${sfReq.recipeId}`,
          recipeId: sfReq.recipeId,
          recipeName: sfReq.recipeName,
          category: sfRecipe.category,
          currentStock: sfReq.deficitQty,
          unit: sfReq.unit,
          minStockLevel: 5.0,
          lastUpdated: new Date().toISOString().slice(0, 10),
        });
      }

      const deductionSummaryStr = subRunDeductions.map((d) => `${d.qty} ${d.unit} ${d.name}`).join(', ');
      const subLogMsg = `⚡ Auto-produced ${sfReq.deficitQty} ${sfReq.unit} of "${sfReq.recipeName}" (${subBatchCode}) → Deducted ${deductionSummaryStr} from Raw Materials → Restocked Semi-Finished Depot.`;
      auditLogs.push(subLogMsg);

      addActivityLog({
        type: 'SEMI_FINISHED_PRODUCED',
        title: 'Auto-Triggered Semi-Finished Cascade Run',
        description: subLogMsg,
        actor: 'Central Lab Cascading Engine',
        badgeText: 'AUTO-CASCADE',
        severity: 'purple',
        metadata: {
          recipeName: sfReq.recipeName,
          amount: sfReq.deficitQty,
          referenceNumber: subBatchCode,
        },
      });

      subRunsExecuted.push({
        batchCode: subBatchCode,
        recipeName: sfReq.recipeName,
        quantityProduced: sfReq.deficitQty,
        unit: sfReq.unit,
        rawMaterialsDeducted: subRunDeductions,
      });
    }
  }

  // Step 2: Execute Finished Product Production
  const mainBatchCode = `BATCH-FG-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Deduct direct Semi-Finished items from semi_finished_stock
  const semiFinishedDeducted: Array<{ name: string; qty: number; unit: string }> = [];
  for (const sfReq of preview.semiFinishedRequirements) {
    const sfIdx = sfStock.findIndex((s) => s.recipeId === sfReq.recipeId);
    if (sfIdx !== -1) {
      sfStock[sfIdx].currentStock = Math.max(0, sfStock[sfIdx].currentStock - sfReq.requiredQty);
      sfStock[sfIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      semiFinishedDeducted.push({
        name: sfReq.recipeName,
        qty: sfReq.requiredQty,
        unit: sfReq.unit,
      });
    }
  }

  // Deduct direct Raw Materials from raw_material_stock
  const directMaterialsDeducted: Array<{ name: string; qty: number; unit: string }> = [];
  for (const directMat of preview.directRawMaterialsNeeded) {
    const matIdx = rawMaterials.findIndex((m) => m.id === directMat.materialId);
    if (matIdx !== -1) {
      rawMaterials[matIdx].currentStock = Math.max(0, rawMaterials[matIdx].currentStock - directMat.quantityNeeded);
      rawMaterials[matIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      directMaterialsDeducted.push({
        name: directMat.materialName,
        qty: directMat.quantityNeeded,
        unit: directMat.unit,
      });
    }
  }

  // Commit saved state to localStorage
  saveRawMaterials(rawMaterials);
  saveSemiFinishedStock(sfStock);

  const sfDeductStr = semiFinishedDeducted.length > 0 
    ? `Deducted ${semiFinishedDeducted.map(s => `${s.qty} ${s.unit} ${s.name}`).join(', ')} from Semi-Finished Depot.` 
    : '';
  const mainLogMsg = `🎉 Completed Cascading Production Run (${mainBatchCode}): Produced ${targetQuantity} ${preview.finishedRecipe.unitName} of "${preview.finishedRecipe.name}". ${sfDeductStr}`;
  auditLogs.push(mainLogMsg);

  addActivityLog({
    type: 'SEMI_FINISHED_PRODUCED',
    title: 'Finished Product Batch Produced (BOM Cascade)',
    description: mainLogMsg,
    actor: 'Central Lab Master Chef',
    badgeText: 'FINISHED BATCH',
    severity: 'success',
    metadata: {
      recipeName: preview.finishedRecipe.name,
      amount: targetQuantity,
      referenceNumber: mainBatchCode,
    },
  });

  notifyToast({
    type: 'success',
    title: 'Production Cascade Executed',
    message: `Batch ${mainBatchCode} completed (+${targetQuantity} ${preview.finishedRecipe.unitName}). Semi-finished & raw material depots auto-updated!`,
  });

  notifyListeners();

  return {
    finishedBatchCode: mainBatchCode,
    finishedRecipeName: preview.finishedRecipe.name,
    targetQuantity,
    unitName: preview.finishedRecipe.unitName,
    timestamp,
    subRunsExecuted,
    directMaterialsDeducted,
    semiFinishedDeducted,
    logs: auditLogs,
  };
}

// Toast Dispatcher System
type ToastListener = (notification: ToastNotification) => void;
const toastListeners: Set<ToastListener> = new Set();

export function subscribeToToasts(listener: ToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function notifyToast(notification: Omit<ToastNotification, 'id'>) {
  const fullToast: ToastNotification = {
    ...notification,
    id: `toast-${Date.now()}-${Math.random()}`,
  };
  toastListeners.forEach((fn) => fn(fullToast));
}

// Retail Products Catalog & Store Stock
export function getRetailProducts(): RetailProduct[] {
  initStorage();
  const data = localStorage.getItem(KEYS.RETAIL_PRODUCTS);
  return data ? JSON.parse(data) : [];
}

export function saveRetailProducts(products: RetailProduct[]) {
  localStorage.setItem(KEYS.RETAIL_PRODUCTS, JSON.stringify(products));
  notifyListeners();
}

export function getRetailStoreStock(storeId?: string): RetailStoreStock[] {
  initStorage();
  const targetStoreId = storeId || getActiveStoreId();
  const data = localStorage.getItem(KEYS.RETAIL_STORE_STOCK);
  let allStock: RetailStoreStock[] = data ? JSON.parse(data) : [];

  const products = getRetailProducts();
  let updated = false;

  // Ensure every product exists in stock for target store
  for (const prod of products) {
    const exists = allStock.some((s) => s.storeId === targetStoreId && s.productId === prod.id);
    if (!exists) {
      allStock.push({
        id: `stk-${targetStoreId}-${prod.id}`,
        storeId: targetStoreId,
        productId: prod.id,
        productName: prod.name,
        category: prod.category,
        currentStock: 25,
        unit: prod.unit,
        price: prod.price,
        costPrice: prod.costPrice,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      updated = true;
    }
  }

  if (updated) {
    localStorage.setItem(KEYS.RETAIL_STORE_STOCK, JSON.stringify(allStock));
  }

  return allStock.filter((s) => s.storeId === targetStoreId);
}

export function saveRetailStoreStock(stockList: RetailStoreStock[]) {
  const data = localStorage.getItem(KEYS.RETAIL_STORE_STOCK);
  let allStock: RetailStoreStock[] = data ? JSON.parse(data) : [];

  for (const item of stockList) {
    const idx = allStock.findIndex((s) => s.id === item.id || (s.storeId === item.storeId && s.productId === item.productId));
    if (idx !== -1) {
      allStock[idx] = item;
    } else {
      allStock.push(item);
    }
  }

  localStorage.setItem(KEYS.RETAIL_STORE_STOCK, JSON.stringify(allStock));
  notifyListeners();
}

export function updateRetailStoreStockQuantity(storeId: string, productId: string, newStock: number) {
  const stock = getRetailStoreStock(storeId);
  const idx = stock.findIndex((s) => s.productId === productId);
  if (idx !== -1) {
    stock[idx].currentStock = Math.max(0, newStock);
    stock[idx].lastUpdated = new Date().toISOString().slice(0, 10);
    saveRetailStoreStock(stock);
  }
}

// Sales Transactions Module
export function getSaleTransactions(storeId?: string): SaleTransaction[] {
  initStorage();
  const data = localStorage.getItem(KEYS.SALE_TRANSACTIONS);
  const sales: SaleTransaction[] = data ? JSON.parse(data) : [];
  if (storeId) {
    return sales.filter((s) => s.storeId === storeId);
  }
  return sales;
}

export function recordSaleTransaction(
  saleData: Omit<SaleTransaction, 'id' | 'transactionNumber' | 'timestamp'>
): SaleTransaction {
  const sales = getSaleTransactions();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const activeStore = getStores().find((s) => s.id === saleData.storeId) || getActiveStore();
  const storeCode = activeStore.code || 'STR-01';
  const txNumber = `SAL-${storeCode.replace('-', '')}-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

  const newSale: SaleTransaction = {
    ...saleData,
    id: `sal-${Date.now()}`,
    transactionNumber: txNumber,
    timestamp: new Date().toISOString(),
  };

  sales.unshift(newSale);
  localStorage.setItem(KEYS.SALE_TRANSACTIONS, JSON.stringify(sales));

  // Deduct inventory for each sold product in this retail store
  const currentStock = getRetailStoreStock(saleData.storeId);
  const updatedStock = currentStock.map((s) => {
    const soldItem = saleData.items.find((i) => i.productId === s.productId);
    if (soldItem) {
      return {
        ...s,
        currentStock: Math.max(0, s.currentStock - soldItem.quantity),
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    }
    return s;
  });
  saveRetailStoreStock(updatedStock);

  // Enqueue in IndexedDB / SQLite Offline Queue
  enqueueOfflineAction({
    entityType: 'CART_TRANSACTION',
    actionType: 'CREATE',
    entityId: newSale.id,
    label: `Ticket Caisse POS : ${newSale.transactionNumber}`,
    description: `Vente ${newSale.storeName} (${newSale.totalAmount.toFixed(2)} DZD - ${newSale.paymentMethod}) - ${newSale.items.length} article(s)`,
    payload: newSale
  }).catch((err) => console.warn('Offline enqueue sale error:', err));

  addActivityLog({
    type: 'SALE_RECORDED',
    title: 'Retail Sale Completed',
    description: `Recorded sale ${txNumber} at ${saleData.storeName} (${saleData.totalAmount.toFixed(2)} DZD - ${saleData.paymentMethod}). ${saleData.items.length} item(s) sold.`,
    actor: saleData.cashierName || 'Store Cashier',
    badgeText: 'POS SALE',
    severity: 'success',
    metadata: {
      amount: saleData.totalAmount,
      storeName: saleData.storeName,
      referenceNumber: txNumber,
      itemCount: saleData.items.length,
    },
  });

  notifyToast({
    type: 'success',
    title: 'Sale Completed Successfully',
    message: `Recorded sale ${txNumber} (${saleData.totalAmount.toFixed(2)} DZD). Retail stock updated.`,
  });

  notifyListeners();
  return newSale;
}

// Unsold Products & Waste Module
export function getUnsoldLogs(storeId?: string): UnsoldProductLog[] {
  initStorage();
  const data = localStorage.getItem(KEYS.UNSOLD_LOGS);
  const logs: UnsoldProductLog[] = data ? JSON.parse(data) : [];
  if (storeId) {
    return logs.filter((l) => l.storeId === storeId);
  }
  return logs;
}

export function recordUnsoldLog(
  logData: Omit<UnsoldProductLog, 'id' | 'logNumber' | 'recordedAt'>
): UnsoldProductLog {
  const logs = getUnsoldLogs();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const activeStore = getStores().find((s) => s.id === logData.storeId) || getActiveStore();
  const storeCode = activeStore.code || 'STR-01';
  const logNum = `UNS-${storeCode.replace('-', '')}-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

  const newLog: UnsoldProductLog = {
    ...logData,
    id: `uns-${Date.now()}`,
    logNumber: logNum,
    recordedAt: new Date().toISOString(),
  };

  logs.unshift(newLog);
  localStorage.setItem(KEYS.UNSOLD_LOGS, JSON.stringify(logs));

  // Update stock based on reason
  if (logData.reason !== 'CARRIED_OVER') {
    const currentStock = getRetailStoreStock(logData.storeId);
    const stockItem = currentStock.find((s) => s.productId === logData.productId);
    if (stockItem) {
      stockItem.currentStock = Math.max(0, stockItem.currentStock - logData.quantity);
      stockItem.lastUpdated = new Date().toISOString().slice(0, 10);
      saveRetailStoreStock(currentStock);
    }
  }

  addActivityLog({
    type: 'UNSOLD_LOGGED',
    title: 'Unsold Product / Waste Logged',
    description: `Logged ${logData.quantity} ${logData.unit} of "${logData.productName}" at ${logData.storeName} (${logData.reason.replace('_', ' ')} - loss value ${logData.totalLossValue.toFixed(2)} DZD).`,
    actor: logData.recordedBy || 'Store Staff',
    badgeText: 'UNSOLD LOG',
    severity: 'warning',
    metadata: {
      amount: logData.totalLossValue,
      storeName: logData.storeName,
      referenceNumber: logNum,
    },
  });

  notifyToast({
    type: 'warning',
    title: 'Unsold Product Logged',
    message: `Logged ${logData.quantity} ${logData.unit} of ${logData.productName} (${logData.reason}). Stock adjusted.`,
  });

  notifyListeners();
  return newLog;
}

// Central Lab Waste & Loss Functions
export function getLabWasteLogs(): LabWasteLog[] {
  const data = localStorage.getItem(KEYS.LAB_WASTE_LOGS);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveLabWasteLogs(logs: LabWasteLog[]): void {
  localStorage.setItem(KEYS.LAB_WASTE_LOGS, JSON.stringify(logs));
  notifyListeners();
}

export function recordLabWasteLog(
  logData: Omit<LabWasteLog, 'id' | 'logCode' | 'timestamp'>
): LabWasteLog {
  const logs = getLabWasteLogs();
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const logCode = `WST-LAB-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;

  const newLog: LabWasteLog = {
    ...logData,
    id: `lab-w-${Date.now()}`,
    logCode,
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newLog);
  localStorage.setItem(KEYS.LAB_WASTE_LOGS, JSON.stringify(logs));

  // Automatically adjust inventory based on itemType
  if (logData.itemType === 'RAW_MATERIAL') {
    const rawMaterials = getRawMaterials();
    const matIdx = rawMaterials.findIndex((m) => m.id === logData.itemId);
    if (matIdx !== -1) {
      rawMaterials[matIdx].currentStock = Math.max(0, rawMaterials[matIdx].currentStock - logData.quantity);
      rawMaterials[matIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      saveRawMaterials(rawMaterials);
    }
  } else if (logData.itemType === 'SEMI_FINISHED') {
    const sfStock = getSemiFinishedStock();
    const sfIdx = sfStock.findIndex((s) => s.recipeId === logData.itemId || s.id === logData.itemId);
    if (sfIdx !== -1) {
      sfStock[sfIdx].currentStock = Math.max(0, sfStock[sfIdx].currentStock - logData.quantity);
      sfStock[sfIdx].lastUpdated = new Date().toISOString().slice(0, 10);
      saveSemiFinishedStock(sfStock);
    }
  }

  // Record audit trail entry
  addActivityLog({
    type: 'WASTE_LOGGED',
    title: 'Lab Waste & Loss Recorded',
    description: `Logged ${logData.quantity} ${logData.unit} of "${logData.itemName}" (${logData.reason.replace(/_/g, ' ')}) in Central Lab. Total cost loss: ${logData.totalFinancialLoss.toFixed(2)} DZD. Inventory adjusted.`,
    actor: logData.recordedBy || 'Central Lab Staff',
    badgeText: 'LAB WASTE',
    severity: 'warning',
    metadata: {
      amount: logData.totalFinancialLoss,
      referenceNumber: logCode,
    },
  });

  notifyToast({
    type: 'warning',
    title: 'Central Lab Waste Logged',
    message: `${logData.quantity} ${logData.unit} of ${logData.itemName} logged as waste (${logData.totalFinancialLoss.toFixed(2)} DZD loss). Stock updated!`,
  });

  notifyListeners();
  return newLog;
}

export function deleteLabWasteLog(id: string): boolean {
  const logs = getLabWasteLogs();
  const filtered = logs.filter((l) => l.id !== id);
  if (filtered.length !== logs.length) {
    saveLabWasteLogs(filtered);
    notifyToast({
      type: 'info',
      title: 'Waste Record Removed',
      message: 'Waste & loss entry deleted from records.',
    });
    return true;
  }
  return false;
}

// ==========================================
// DAILY STORE INVENTORY & RECONCILIATION ENGINE
// ==========================================

export function getDailyStoreInventory(): DailyStoreInventory[] {
  initStorage();
  const data = localStorage.getItem(KEYS.DAILY_STORE_INVENTORY);
  return data ? JSON.parse(data) : [];
}

export function saveDailyStoreInventory(records: DailyStoreInventory[]) {
  localStorage.setItem(KEYS.DAILY_STORE_INVENTORY, JSON.stringify(records));
  notifyListeners();
}

/**
 * Calculates or retrieves automated reconciliation data for a given store and date.
 * Formula: Expected Closing Stock = Opening Stock + Received Requisitions - Total Sales
 */
export function calculateOrGetTodayReconciliation(
  storeId: string,
  targetDateStr?: string
): { records: DailyStoreInventory[]; isClosed: boolean } {
  const dateStr = targetDateStr || new Date().toISOString().substring(0, 10);
  const allInventoryRecords = getDailyStoreInventory();
  const stores = getStores();
  const store = stores.find((s) => s.id === storeId) || { id: storeId, name: 'Boutique' };

  // Check if closed records for this store and date already exist
  const existingStoreDateRecords = allInventoryRecords.filter(
    (r) => r.storeId === storeId && r.date === dateStr
  );

  const isClosed = existingStoreDateRecords.some((r) => r.status === 'CLOSED');

  if (isClosed) {
    return { records: existingStoreDateRecords, isClosed: true };
  }

  // Otherwise, compute live automated values
  const products = getRetailProducts();
  const requisitions = getRequisitions();
  const sales = getSaleTransactions();
  const storeStock = getRetailStoreStock(storeId);

  // Filter requisitions for this store
  const storeReqs = requisitions.filter(
    (r) =>
      r.storeId === storeId &&
      (r.status === 'DELIVERED' || r.status === 'DISPATCHED' || r.status === 'APPROVED')
  );

  // Filter sales for this store on this date
  const storeSales = sales.filter(
    (s) => s.storeId === storeId && s.timestamp.startsWith(dateStr)
  );

  // Compute values for each retail product
  const computedRecords: DailyStoreInventory[] = products.map((prod) => {
    // Check if draft record exists
    const existingDraft = existingStoreDateRecords.find((r) => r.pastryId === prod.id);

    // 1. Opening Stock (Leftover from previous day's closed record or current stock)
    let openingStock = 0;

    const prevRecords = allInventoryRecords
      .filter((r) => r.storeId === storeId && r.pastryId === prod.id && r.date < dateStr)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (prevRecords.length > 0) {
      openingStock = prevRecords[0].actualClosingStock;
    } else {
      const sItem = storeStock.find((stk) => stk.productId === prod.id);
      openingStock = sItem ? sItem.currentStock : 10;
    }

    // 2. Received Requisitions Today
    let receivedQty = 0;
    storeReqs.forEach((req) => {
      req.items.forEach((item) => {
        if (
          item.productName.toLowerCase().includes(prod.name.toLowerCase()) ||
          prod.name.toLowerCase().includes(item.productName.toLowerCase())
        ) {
          receivedQty += item.fulfilledQuantity !== undefined ? item.fulfilledQuantity : item.quantityRequested;
        }
      });
    });

    // 3. Total Sales POS Today
    let totalSalesQty = 0;
    storeSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (item.productId === prod.id || item.productName === prod.name) {
          totalSalesQty += item.quantity;
        }
      });
    });

    // 4. Expected Closing Stock (Formula: opening + received - totalSales)
    const expectedClosing = Math.max(0, openingStock + receivedQty - totalSalesQty);

    // 5. Actual Closing Stock (if draft exists, preserve physical count user entered)
    const actualClosing = existingDraft ? existingDraft.actualClosingStock : expectedClosing;

    // 6. Unaccounted Waste Variance (expected - actual)
    const variance = Math.max(0, expectedClosing - actualClosing);

    return {
      id: existingDraft?.id || `dsi-${storeId}-${prod.id}-${dateStr}`,
      storeId,
      storeName: store.name,
      date: dateStr,
      pastryId: prod.id,
      pastryName: prod.name,
      category: prod.category,
      unit: prod.unit,
      unitPrice: prod.price,
      unitCostPrice: prod.costPrice,
      openingStock,
      receivedRequisitions: receivedQty,
      totalSales: totalSalesQty,
      expectedClosingStock: expectedClosing,
      actualClosingStock: actualClosing,
      unaccountedWasteVariance: variance,
      status: 'DRAFT',
      notes: existingDraft?.notes || ''
    };
  });

  return { records: computedRecords, isClosed: false };
}

/**
 * Confirm & Close EOD Daily Stock Reconciliation
 */
export function closeDailyReconciliation(
  storeId: string,
  updatedRecords: DailyStoreInventory[],
  closedBy: string,
  notes?: string
): DailyStoreInventory[] {
  const allRecords = getDailyStoreInventory();
  const dateStr = updatedRecords[0]?.date || new Date().toISOString().substring(0, 10);
  const storeName = updatedRecords[0]?.storeName || 'Boutique';

  const closedAtISO = new Date().toISOString();

  // Finalize records
  const finalizedRecords: DailyStoreInventory[] = updatedRecords.map((r) => {
    const variance = Math.max(0, r.expectedClosingStock - r.actualClosingStock);
    return {
      ...r,
      unaccountedWasteVariance: variance,
      status: 'CLOSED',
      closedAt: closedAtISO,
      closedBy,
      notes: notes || r.notes
    };
  });

  // Filter out any old records for this store & date, then add finalized
  const remaining = allRecords.filter((r) => !(r.storeId === storeId && r.date === dateStr));
  const newAll = [...remaining, ...finalizedRecords];
  saveDailyStoreInventory(newAll);

  // Auto-log unsold product entries
  let totalWasteItemsCount = 0;
  let totalLossValue = 0;

  finalizedRecords.forEach((item) => {
    if (item.actualClosingStock > 0 || item.unaccountedWasteVariance > 0) {
      const qtyLost = item.actualClosingStock + item.unaccountedWasteVariance;
      const lossVal = qtyLost * item.unitCostPrice;
      totalWasteItemsCount += qtyLost;
      totalLossValue += lossVal;

      recordUnsoldLog({
        storeId,
        storeName,
        recordedBy: closedBy,
        productId: item.pastryId,
        productName: item.pastryName,
        category: item.category,
        quantity: item.actualClosingStock,
        unit: item.unit,
        unitCost: item.unitCostPrice,
        sellingPrice: item.unitPrice,
        totalLossValue: lossVal,
        reason: item.unaccountedWasteVariance > 0 ? 'DAMAGED_DISPLAY' : 'EXPIRED_WASTE',
        notes: item.notes || `Clôture automatique EOD du ${dateStr}`
      });
    }
  });

  // Log activity trail
  addActivityLog({
    type: 'RECONCILIATION_CLOSED',
    title: 'Clôture de Caisse & Stock Réconciliée (EOD)',
    description: `Journée ${dateStr} clôturée pour ${storeName} par ${closedBy}. Invendus théoriques réconciliés (${totalWasteItemsCount} unités, valeur d'invendus : ${totalLossValue.toFixed(2)} DZD).`,
    actor: closedBy,
    badgeText: 'EOD CLÔTURÉ',
    severity: 'success',
    metadata: {
      amount: totalLossValue,
      storeName,
      referenceNumber: `EOD-${storeId}-${dateStr}`
    }
  });

  notifyToast({
    type: 'success',
    title: 'Journée Clôturée avec Succès',
    message: `Réconciliation enregistrée pour ${storeName}. ${totalWasteItemsCount} invendus/pertes consignés au registre.`
  });

  notifyListeners();
  return finalizedRecords;
}

// ==========================================
// MODULE 1: Profitability & Margin Analytics
// ==========================================

export interface ProductMarginItem {
  id: string;
  recipeId?: string;
  name: string;
  category: string;
  unit: string;
  sku: string;
  retailSellingPrice: number;
  unitProductionCost: number;
  grossProfitMargin: number; // sellingPrice - unitCost
  foodCostPercentage: number; // (unitCost / sellingPrice) * 100
  statusBadge: 'TARGET' | 'WARNING' | 'CRITICAL_ALERT'; // <=30% Green, 31-35% Yellow, >35% Red Alert
  hasPriceSpikeAlert: boolean;
  costBreakdown: {
    directRawMaterialsCost: number;
    semiFinishedComponentsCost: number;
  };
}

export function updateFinishedProductSellingPrice(productId: string, newPrice: number): boolean {
  initStorage();
  let updated = false;

  // 1. Update Retail Products
  const products = getRetailProducts();
  const prodIdx = products.findIndex((p) => p.id === productId || p.sku === productId);
  if (prodIdx !== -1) {
    products[prodIdx].price = newPrice;
    products[prodIdx].retail_selling_price = newPrice;
    localStorage.setItem(KEYS.RETAIL_PRODUCTS, JSON.stringify(products));
    updated = true;
  }

  // 2. Update Recipes
  const recipes = getRecipes();
  const recipeIdx = recipes.findIndex((r) => r.id === productId || r.name.toLowerCase() === (products[prodIdx]?.name.toLowerCase() || ''));
  if (recipeIdx !== -1) {
    recipes[recipeIdx].suggestedSellingPrice = newPrice;
    recipes[recipeIdx].retail_selling_price = newPrice;
    localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
    updated = true;
  }

  if (updated) {
    notifyToast({
      type: 'success',
      title: 'Prix de Vente Mis à Jour',
      message: `Nouveau prix fixé à ${newPrice.toFixed(2)} DZD.`
    });
    notifyListeners();
  }

  return updated;
}

export function getFinishedProductProfitability(): ProductMarginItem[] {
  initStorage();
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const retailProducts = getRetailProducts();

  // Filter finished recipes or finished retail products
  const finishedRecipes = recipes.filter((r) => r.recipeType === 'FINISHED' || !r.recipeType || r.classification === 'FINISHED_GOOD');
  
  const results: ProductMarginItem[] = [];

  // Map each retail product or recipe to its dynamic profitability
  retailProducts.forEach((prod) => {
    // Find matching recipe by name or ID
    const matchingRecipe = finishedRecipes.find(
      (r) => r.id === prod.id || r.name.toLowerCase() === prod.name.toLowerCase()
    );

    let unitCost = prod.costPrice || 0;
    let directRawCost = 0;
    let semiFinishedCost = 0;

    if (matchingRecipe) {
      unitCost = getRecipeUnitCost(matchingRecipe, recipes, rawMaterials);
      
      // Calculate direct vs semi-finished breakdown
      let batchDirect = 0;
      let batchSemi = 0;
      matchingRecipe.ingredients.forEach((ing) => {
        if (ing.rawMaterialId) {
          const rm = rawMaterials.find((m) => m.id === ing.rawMaterialId);
          if (rm) batchDirect += ing.quantity * rm.currentAvgCost;
        } else if (ing.semiFinishedRecipeId) {
          const sfRecipe = recipes.find((r) => r.id === ing.semiFinishedRecipeId);
          if (sfRecipe) {
            batchSemi += ing.quantity * getRecipeUnitCost(sfRecipe, recipes, rawMaterials);
          }
        }
      });

      const yieldUnits = matchingRecipe.yieldUnits > 0 ? matchingRecipe.yieldUnits : 1;
      directRawCost = batchDirect / yieldUnits;
      semiFinishedCost = batchSemi / yieldUnits;
    }

    const sellingPrice = prod.retail_selling_price || prod.price || (matchingRecipe?.suggestedSellingPrice ?? 0);
    const grossMargin = sellingPrice - unitCost;
    const foodCostPct = sellingPrice > 0 ? Number(((unitCost / sellingPrice) * 100).toFixed(1)) : 0;

    let statusBadge: 'TARGET' | 'WARNING' | 'CRITICAL_ALERT' = 'TARGET';
    if (foodCostPct > 35) {
      statusBadge = 'CRITICAL_ALERT';
    } else if (foodCostPct > 30) {
      statusBadge = 'WARNING';
    }

    // Determine if ingredient prices jumped relative to base cost price
    const hasPriceSpikeAlert = foodCostPct > 30 && (unitCost > (prod.costPrice * 1.05));

    results.push({
      id: prod.id,
      recipeId: matchingRecipe?.id,
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      sku: prod.sku,
      retailSellingPrice: sellingPrice,
      unitProductionCost: Number(unitCost.toFixed(2)),
      grossProfitMargin: Number(grossMargin.toFixed(2)),
      foodCostPercentage: foodCostPct,
      statusBadge,
      hasPriceSpikeAlert,
      costBreakdown: {
        directRawMaterialsCost: Number(directRawCost.toFixed(2)),
        semiFinishedComponentsCost: Number(semiFinishedCost.toFixed(2))
      }
    });
  });

  return results;
}

// ==============================================================
// MODULE 2: Central Lab to Retail Store Delivery & Transfer Logistics
// ==============================================================

export function getDeliveryManifests(): DeliveryManifest[] {
  initStorage();
  const data = localStorage.getItem(KEYS.DELIVERY_MANIFESTS);
  return data ? JSON.parse(data) : [];
}

export function saveDeliveryManifests(manifests: DeliveryManifest[]) {
  localStorage.setItem(KEYS.DELIVERY_MANIFESTS, JSON.stringify(manifests));
  notifyListeners();
}

export function getDeliveryManifestsByStore(storeId: string): DeliveryManifest[] {
  const manifests = getDeliveryManifests();
  return manifests.filter((m) => m.storeIds.includes(storeId));
}

export function createDeliveryManifest(
  manifestData: Omit<DeliveryManifest, 'id' | 'manifestNumber' | 'createdAt'>
): DeliveryManifest {
  const manifests = getDeliveryManifests();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const manifestNumber = `MAN-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
  const manifestId = `man-${Date.now()}`;

  const newManifest: DeliveryManifest = {
    ...manifestData,
    id: manifestId,
    manifestNumber,
    createdAt: new Date().toISOString()
  };

  manifests.unshift(newManifest);
  saveDeliveryManifests(manifests);

  // Update status of all included requisitions to IN_TRANSIT and link manifestId
  const requisitions = getRequisitions();
  let updatedReqs = false;
  requisitions.forEach((req) => {
    if (newManifest.requisitionIds.includes(req.id)) {
      req.status = 'IN_TRANSIT';
      req.dispatchedAt = new Date().toISOString();
      req.manifestId = manifestId;
      updatedReqs = true;
    }
  });

  if (updatedReqs) {
    localStorage.setItem(KEYS.REQUISITIONS, JSON.stringify(requisitions));
  }

  addActivityLog({
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Bordereau d\'Expédition Généré (Manifeste)',
    description: `Ordre de transfert ${manifestNumber} préparé pour le chauffeur ${newManifest.driverName} vers ${newManifest.storeNames.join(', ')} (${newManifest.items.length} articles). Status : EN TRANSIT.`,
    actor: newManifest.createdBy || 'Responsable Logistique Lab',
    badgeText: 'EXPÉDIÉ',
    severity: 'purple',
    metadata: {
      referenceNumber: manifestNumber,
      itemCount: newManifest.items.length,
      status: 'IN_TRANSIT'
    }
  });

  notifyToast({
    type: 'success',
    title: 'Manifeste d\'Expédition Créé',
    message: `Le bordereau ${manifestNumber} a été validé. Statut passé à EN TRANSIT.`
  });

  notifyListeners();
  return newManifest;
}

export function getTransitWasteLogs(): TransitWasteLog[] {
  initStorage();
  const data = localStorage.getItem(KEYS.TRANSIT_WASTE_LOGS);
  return data ? JSON.parse(data) : [];
}

export function saveTransitWasteLogs(logs: TransitWasteLog[]) {
  localStorage.setItem(KEYS.TRANSIT_WASTE_LOGS, JSON.stringify(logs));
  notifyListeners();
}

export function confirmStoreDeliveryAndReceive(params: {
  manifestId: string;
  requisitionId: string;
  storeId: string;
  storeName: string;
  receiverName: string;
  receiverSignature?: string;
  verifiedItems: Array<{
    productId: string;
    productName: string;
    category: string;
    unit: string;
    dispatchedQty: number;
    receivedQty: number;
    damagedQty: number;
    missingQty: number;
    unitCost: number;
    sellingPrice: number;
    notes?: string;
  }>;
}) {
  initStorage();
  const { manifestId, requisitionId, storeId, storeName, receiverName, verifiedItems, receiverSignature } = params;

  // 1. Update Requisition
  const requisitions = getRequisitions();
  const reqIdx = requisitions.findIndex((r) => r.id === requisitionId);
  if (reqIdx !== -1) {
    requisitions[reqIdx].status = 'DELIVERED';
    requisitions[reqIdx].deliveredAt = new Date().toISOString();
  }
  localStorage.setItem(KEYS.REQUISITIONS, JSON.stringify(requisitions));

  // 2. Increment Store Inventory in RetailStoreStock
  const storeStock = getRetailStoreStock(storeId);
  verifiedItems.forEach((item) => {
    if (item.receivedQty > 0) {
      const stockItem = storeStock.find(
        (s) => s.productName.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(s.productName.toLowerCase())
      );
      if (stockItem) {
        stockItem.currentStock += item.receivedQty;
        stockItem.lastUpdated = new Date().toISOString().slice(0, 10);
      } else {
        storeStock.push({
          id: `stock-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          storeId,
          productId: item.productId,
          productName: item.productName,
          category: item.category as any,
          currentStock: item.receivedQty,
          unit: item.unit,
          price: item.sellingPrice,
          costPrice: item.unitCost,
          lastUpdated: new Date().toISOString().slice(0, 10)
        });
      }
    }
  });
  saveRetailStoreStock(storeStock);

  // 3. Update Daily Store Inventory
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyRecords = getDailyStoreInventory();

  verifiedItems.forEach((item) => {
    if (item.receivedQty > 0) {
      const record = dailyRecords.find(
        (r) => r.storeId === storeId && r.date === todayStr && (r.pastryName.toLowerCase().includes(item.productName.toLowerCase()) || item.productName.toLowerCase().includes(r.pastryName.toLowerCase()))
      );
      if (record) {
        record.receivedRequisitions += item.receivedQty;
        record.expectedClosingStock = record.openingStock + record.receivedRequisitions - record.totalSales;
      }
    }
  });
  saveDailyStoreInventory(dailyRecords);

  // 4. Log Damaged / Missing Items to transit_waste_log
  const transitLogs = getTransitWasteLogs();
  let totalTransitLoss = 0;
  let transitLossCount = 0;

  verifiedItems.forEach((item) => {
    const totalLost = item.damagedQty + item.missingQty;
    if (totalLost > 0) {
      const lossVal = totalLost * item.unitCost;
      totalTransitLoss += lossVal;
      transitLossCount += totalLost;

      const logCode = `TRW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

      transitLogs.unshift({
        id: `trw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        logCode,
        manifestId,
        manifestNumber: params.requisitionId,
        requisitionId,
        requisitionNumber: requisitions[reqIdx]?.requisitionNumber || requisitionId,
        storeId,
        storeName,
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        unit: item.unit,
        dispatchedQty: item.dispatchedQty,
        receivedQty: item.receivedQty,
        damagedQty: item.damagedQty,
        missingQty: item.missingQty,
        unitCostPrice: item.unitCost,
        unitSellingPrice: item.sellingPrice,
        totalLossValue: Number(lossVal.toFixed(2)),
        reason: item.damagedQty > 0 ? 'TRANSIT_DAMAGE' : 'TRANSIT_MISSING',
        reportedBy: receiverName,
        reportedAt: new Date().toISOString(),
        notes: item.notes || 'Anomalie signalée lors de la vérification de réception en magasin'
      });
    }
  });

  if (transitLossCount > 0) {
    saveTransitWasteLogs(transitLogs);

    // Also Log into Lab Waste Audit Log
    verifiedItems.forEach((item) => {
      const totalLost = item.damagedQty + item.missingQty;
      if (totalLost > 0) {
        recordLabWasteLog({
          itemType: 'FINISHED_GOOD',
          itemId: item.productId,
          itemName: item.productName,
          category: item.category,
          quantity: totalLost,
          unit: item.unit,
          unitCost: item.unitCost,
          totalFinancialLoss: totalLost * item.unitCost,
          reason: 'ACCIDENTAL_SPOILAGE',
          recordedBy: `Magasin ${storeName} (${receiverName})`,
          notes: `Pertes en transit/livraison : ${item.damagedQty} cassés/abîmés, ${item.missingQty} manquants.`
        });
      }
    });
  }

  // 5. Check and update Delivery Manifest status
  const manifests = getDeliveryManifests();
  const mIdx = manifests.findIndex((m) => m.id === manifestId);
  if (mIdx !== -1) {
    if (receiverSignature) {
      manifests[mIdx].receiverSignature = receiverSignature;
    }
    manifests[mIdx].verifiedByStoreWorker = receiverName;

    // Check if all requisitions in manifest are DELIVERED
    const allDelivered = manifests[mIdx].requisitionIds.every((rId) => {
      const r = requisitions.find((req) => req.id === rId);
      return r?.status === 'DELIVERED';
    });

    if (allDelivered) {
      manifests[mIdx].status = 'DELIVERED';
      manifests[mIdx].deliveredAt = new Date().toISOString();
    }
    saveDeliveryManifests(manifests);
  }

  // 6. Log Activity
  addActivityLog({
    type: 'REQUISITION_STATUS_UPDATED',
    title: 'Livraison Réceptionnée et Vérifiée en Magasin',
    description: `Réception confirmée par ${receiverName} pour ${storeName}. Stock mis à jour. ${transitLossCount > 0 ? `⚠️ Anomalies : ${transitLossCount} unités endommagées/manquantes consignées au registre des pertes.` : '✅ Aucun dommage constaté.'}`,
    actor: receiverName,
    badgeText: 'LIVRÉ & VÉRIFIÉ',
    severity: transitLossCount > 0 ? 'warning' : 'success',
    metadata: {
      storeName,
      referenceNumber: requisitions[reqIdx]?.requisitionNumber || requisitionId,
      status: 'DELIVERED'
    }
  });

  notifyToast({
    type: transitLossCount > 0 ? 'warning' : 'success',
    title: 'Réception de Stock Confirmée',
    message: `${storeName} a réceptionné les articles. Stock mis à jour${transitLossCount > 0 ? ` (${transitLossCount} anomalies consignées).` : '.'}`
  });

  notifyListeners();
  return true;
}

// ==========================================
// 1. PURCHASE ORDERS (SUPPLIER REORDERING)
// ==========================================
export function getPurchaseOrders(): PurchaseOrder[] {
  const data = localStorage.getItem(KEYS.PURCHASE_ORDERS);
  if (!data) {
    const initialPOs: PurchaseOrder[] = [
      {
        id: 'po-001',
        poNumber: 'PO-2026-0804-01',
        supplierId: 'sup-1',
        supplierName: 'Moulins Viron (Grands Moulins)',
        date: '2026-08-04',
        expectedDeliveryDate: '2026-08-06',
        status: 'SENT',
        items: [
          {
            id: 'poi-1',
            rawMaterialId: 'rm-1',
            rawMaterialName: 'High-Protein Bread Flour (T65)',
            category: 'Flour & Grains',
            unit: 'kg',
            currentStock: 450,
            minReorderLevel: 500,
            quantityToOrder: 250,
            unitCost: 1.45,
            totalCost: 362.50
          },
          {
            id: 'poi-2',
            rawMaterialId: 'rm-2',
            rawMaterialName: 'French Fine Pastry Flour (T45)',
            category: 'Flour & Grains',
            unit: 'kg',
            currentStock: 320,
            minReorderLevel: 400,
            quantityToOrder: 200,
            unitCost: 1.65,
            totalCost: 330.00
          }
        ],
        totalAmount: 692.50,
        createdBy: 'Central Lab Procurement',
        notes: 'Commande automatique déclenchée par alerte de stock minimum'
      }
    ];
    localStorage.setItem(KEYS.PURCHASE_ORDERS, JSON.stringify(initialPOs));
    return initialPOs;
  }
  return JSON.parse(data);
}

export function savePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  const list = getPurchaseOrders();
  const existingIdx = list.findIndex(p => p.id === po.id);
  if (existingIdx !== -1) {
    list[existingIdx] = po;
  } else {
    list.unshift(po);
  }
  localStorage.setItem(KEYS.PURCHASE_ORDERS, JSON.stringify(list));
  notifyListeners();
  return po;
}

// ==========================================
// 2. PRODUCTION BATCHES & SHEETS (FICHES DE PRODUCTION)
// ==========================================
const INITIAL_PRODUCTION_BATCHES: ProductionBatch[] = [
  {
    id: 'pb-001',
    batchNumber: 'LOT-2026-0805-01',
    recipeId: 'rec-1',
    recipeName: 'Croissant Beurre AOP',
    plannedQuantity: 120,
    actualQuantity: 120,
    unit: 'portions',
    productionDate: '2026-08-05T05:30:00Z',
    expiryDate: '2026-08-07T20:00:00Z',
    supervisorName: 'Chef Antoine',
    status: 'COMPLETED',
    notes: 'Cuisson dorée optimale, texture feuilletée conforme.'
  },
  {
    id: 'pb-002',
    batchNumber: 'LOT-2026-0805-02',
    recipeId: 'rec-2',
    recipeName: 'Pain au Chocolat Pur Beurre',
    plannedQuantity: 80,
    actualQuantity: 80,
    unit: 'portions',
    productionDate: '2026-08-05T06:00:00Z',
    expiryDate: '2026-08-07T20:00:00Z',
    supervisorName: 'Chef Antoine',
    status: 'COMPLETED',
    notes: '2 barres chocolat Valrhona par unité.'
  },
  {
    id: 'pb-003',
    batchNumber: 'LOT-2026-0805-03',
    recipeId: 'rec-3',
    recipeName: 'Tartelette Citron Meringuée',
    plannedQuantity: 45,
    actualQuantity: 45,
    unit: 'pièces',
    productionDate: '2026-08-05T07:15:00Z',
    expiryDate: '2026-08-06T20:00:00Z',
    supervisorName: 'Chef Marie',
    status: 'READY_FOR_PACKING',
    notes: 'Meringue italienne dorée au chalumeau.'
  },
  {
    id: 'pb-004',
    batchNumber: 'LOT-2026-0805-04',
    recipeId: 'rec-4',
    recipeName: 'Éclair Chocolat Grand Cru',
    plannedQuantity: 60,
    unit: 'pièces',
    productionDate: '2026-08-05T08:00:00Z',
    expiryDate: '2026-08-06T20:00:00Z',
    supervisorName: 'Chef Marie',
    status: 'IN_PREPARATION',
    notes: 'Glaçage miroir en cours.'
  }
];

export function getProductionBatches(): ProductionBatch[] {
  initStorage();
  const data = localStorage.getItem(KEYS.PRODUCTION_BATCHES);
  if (!data) {
    return [];
  }
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function setProductionBatches(batches: ProductionBatch[]) {
  localStorage.setItem(KEYS.PRODUCTION_BATCHES, JSON.stringify(batches));
  notifyListeners();
}

export function saveProductionBatch(batch: ProductionBatch): ProductionBatch {
  const batches = getProductionBatches();
  const existingIndex = batches.findIndex(b => b.id === batch.id || b.batchNumber === batch.batchNumber);
  if (existingIndex !== -1) {
    batches[existingIndex] = { ...batches[existingIndex], ...batch, updatedAt: new Date().toISOString() };
  } else {
    batches.unshift(batch);
  }
  setProductionBatches(batches);
  return batch;
}

export interface BatchStockCheckResult {
  hasSufficientStock: boolean;
  ingredients: Array<{
    materialId: string;
    name: string;
    needed: number;
    currentStock: number;
    unit: string;
    isSufficient: boolean;
    shortfall: number;
  }>;
}

/**
 * Calculate raw material requirements and sufficiency for a planned batch
 */
export function calculateRecipeStockRequirement(recipeId: string, plannedQuantity: number): BatchStockCheckResult {
  initStorage();
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const recipe = recipes.find(r => r.id === recipeId);

  if (!recipe || !recipe.ingredients) {
    return { hasSufficientStock: true, ingredients: [] };
  }

  const yieldFactor = (recipe.yieldUnits && recipe.yieldUnits > 0) ? (plannedQuantity / recipe.yieldUnits) : plannedQuantity;
  let allSufficient = true;
  const ingredients: BatchStockCheckResult['ingredients'] = [];

  recipe.ingredients.forEach(ing => {
    if (ing.rawMaterialId) {
      const mat = rawMaterials.find(m => m.id === ing.rawMaterialId);
      if (mat) {
        const needed = Number((ing.quantity * yieldFactor).toFixed(3));
        const isSufficient = mat.currentStock >= needed;
        if (!isSufficient) allSufficient = false;

        ingredients.push({
          materialId: mat.id,
          name: mat.name,
          needed,
          currentStock: mat.currentStock,
          unit: mat.unit,
          isSufficient,
          shortfall: isSufficient ? 0 : Number((needed - mat.currentStock).toFixed(3))
        });
      }
    }
  });

  return {
    hasSufficientStock: allSufficient,
    ingredients
  };
}

/**
 * Automatically deducts required raw materials and registers a new Production Batch
 */
export function deductStockForProductionSheet(
  recipeId: string,
  plannedQuantity: number,
  supervisorName: string = 'Chef Pâtissier',
  notes?: string
): { success: boolean; batch?: ProductionBatch; missingIngredients?: { name: string; needed: number; available: number; unit: string }[] } {
  initStorage();
  const recipes = getRecipes();
  const rawMaterials = getRawMaterials();
  const recipe = recipes.find(r => r.id === recipeId);

  if (!recipe) {
    return { success: false, missingIngredients: [] };
  }

  const check = calculateRecipeStockRequirement(recipeId, plannedQuantity);
  if (!check.hasSufficientStock) {
    const missing = check.ingredients
      .filter(i => !i.isSufficient)
      .map(i => ({
        name: i.name,
        needed: i.needed,
        available: i.currentStock,
        unit: i.unit
      }));
    return { success: false, missingIngredients: missing };
  }

  const yieldFactor = (recipe.yieldUnits && recipe.yieldUnits > 0) ? (plannedQuantity / recipe.yieldUnits) : plannedQuantity;
  const deductions: { materialId: string; materialName: string; quantityDeducted: number; unit: string }[] = [];

  // Atomic deduction from rawMaterials
  recipe.ingredients.forEach(ing => {
    if (ing.rawMaterialId) {
      const mat = rawMaterials.find(m => m.id === ing.rawMaterialId);
      if (mat) {
        const totalNeeded = Number((ing.quantity * yieldFactor).toFixed(3));
        mat.currentStock = Math.max(0, Number((mat.currentStock - totalNeeded).toFixed(3)));
        deductions.push({
          materialId: mat.id,
          materialName: mat.name,
          quantityDeducted: totalNeeded,
          unit: mat.unit
        });
      }
    }
  });

  saveRawMaterials(rawMaterials);

  // Create new production batch
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const existingBatches = getProductionBatches();
  const seq = String(existingBatches.length + 1).padStart(2, '0');
  const batchNumber = `LOT-${dateStr}-${seq}`;

  const newBatch: ProductionBatch = {
    id: `pb-${Date.now()}`,
    batchNumber,
    recipeId: recipe.id,
    recipeName: recipe.name,
    plannedQuantity,
    actualQuantity: plannedQuantity,
    unit: recipe.unitName || 'portions',
    productionDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    supervisorName,
    status: 'IN_PREPARATION',
    notes: notes || `Production de ${plannedQuantity} ${recipe.unitName || 'portions'} lancée. Stock matières déduit automatiquement.`,
    ingredientsUsed: deductions
  };

  existingBatches.unshift(newBatch);
  setProductionBatches(existingBatches);

  // Add activity log
  addActivityLog({
    type: 'SEMI_FINISHED_PRODUCED',
    title: `🧑‍🍳 Fiche de Production Validée : ${recipe.name}`,
    description: `Fabrication du lot ${batchNumber} (${plannedQuantity} ${recipe.unitName || 'portions'}). ${deductions.length} ingrédients déduits automatiquement des stocks.`,
    actor: supervisorName,
    badgeText: 'PRODUCTION',
    severity: 'success'
  });

  notifyToast({
    type: 'success',
    title: 'Production Lancée & Stock Déduit',
    message: `Lot ${batchNumber} généré. ${deductions.length} matières premières déduites en temps réel.`
  });

  notifyListeners();
  return { success: true, batch: newBatch };
}

export interface SavedBatchStatusMap {
  [batchKey: string]: BatchStatus;
}

export function getProductionBatchStatuses(): SavedBatchStatusMap {
  const batches = getProductionBatches();
  const map: SavedBatchStatusMap = {};
  batches.forEach(b => {
    map[b.batchNumber] = b.status;
  });
  return map;
}

export function updateProductionBatchStatus(batchKey: string, status: BatchStatus) {
  const batches = getProductionBatches();
  const batch = batches.find(b => b.batchNumber === batchKey || b.id === batchKey);
  if (batch) {
    batch.status = status;
    setProductionBatches(batches);
  }
}

// ==========================================
// 3. FOOD SAFETY & TEMPERATURE LOGS
// ==========================================
export function getTemperatureLogs(): TemperatureLog[] {
  const data = localStorage.getItem(KEYS.TEMPERATURE_LOGS);
  if (!data) {
    const initialLogs: TemperatureLog[] = [
      {
        id: 'tpl-1',
        unitName: 'Walk-In Freezer #1 (Lab)',
        locationType: 'CENTRAL_LAB',
        temperatureCelsius: -20.5,
        targetMinCelsius: -22,
        targetMaxCelsius: -18,
        isCompliant: true,
        recordedBy: 'Chef Laurent (Lab Lead)',
        timestamp: '2026-08-05T07:15:00Z',
        notes: 'Température optimale au démarrage de shift'
      },
      {
        id: 'tpl-2',
        unitName: 'Pastry Cream Chiller #2 (Lab)',
        locationType: 'CENTRAL_LAB',
        temperatureCelsius: 2.8,
        targetMinCelsius: 1,
        targetMaxCelsius: 4,
        isCompliant: true,
        recordedBy: 'Chef Laurent (Lab Lead)',
        timestamp: '2026-08-05T07:20:00Z'
      },
      {
        id: 'tpl-3',
        unitName: 'Display Fridge (Douera 01)',
        locationType: 'RETAIL_STORE',
        storeId: 'store-1',
        storeName: 'Douera 01',
        temperatureCelsius: 3.5,
        targetMinCelsius: 1,
        targetMaxCelsius: 4,
        isCompliant: true,
        recordedBy: 'Hamza (Manager)',
        timestamp: '2026-08-05T08:00:00Z'
      },
      {
        id: 'tpl-4',
        unitName: 'Gelato & Mousse Counter (Douera 02)',
        locationType: 'RETAIL_STORE',
        storeId: 'store-2',
        storeName: 'Douera 02',
        temperatureCelsius: 3.8,
        targetMinCelsius: 1,
        targetMaxCelsius: 4,
        isCompliant: true,
        recordedBy: 'Billal (Manager)',
        timestamp: '2026-08-05T08:10:00Z',
        notes: 'Contrôle conformité fraîcheur validé'
      }
    ];
    localStorage.setItem(KEYS.TEMPERATURE_LOGS, JSON.stringify(initialLogs));
    return initialLogs;
  }
  return JSON.parse(data);
}

export function recordTemperatureLog(log: Omit<TemperatureLog, 'id' | 'timestamp'>): TemperatureLog {
  const logs = getTemperatureLogs();
  const newLog: TemperatureLog = {
    ...log,
    id: `tpl-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  localStorage.setItem(KEYS.TEMPERATURE_LOGS, JSON.stringify(logs));
  
  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: log.isCompliant ? 'Relevé de Température Conforme' : '⚠️ ANOMALIE FRIGORIFIQUE DÉTECTÉE',
    description: `${log.unitName}: ${log.temperatureCelsius}°C (Cible: ${log.targetMinCelsius}°C à ${log.targetMaxCelsius}°C)`,
    actor: log.recordedBy,
    badgeText: log.isCompliant ? 'QA OK' : 'ALERTE TEMP',
    severity: log.isCompliant ? 'info' : 'warning'
  });

  notifyListeners();
  return newLog;
}

// ==========================================
// 4. QUALITY CONTROL INSPECTIONS
// ==========================================
export function getQualityInspections(): QualityInspection[] {
  const data = localStorage.getItem(KEYS.QUALITY_INSPECTIONS);
  if (!data) {
    const initialInspections: QualityInspection[] = [
      {
        id: 'qi-1',
        manifestId: 'man-001',
        manifestNumber: 'MAN-2026-0805-001',
        inspectorName: 'Chef Laurent V.',
        coldStorageCompliant: true,
        visualInspectionPassed: true,
        packagingSealsPassed: true,
        dispatchTemperatureCelsius: 3.2,
        overallPassed: true,
        timestamp: '2026-08-05T06:30:00Z',
        notes: 'Contrôle qualité expédition du matin validé sans réserve.'
      }
    ];
    localStorage.setItem(KEYS.QUALITY_INSPECTIONS, JSON.stringify(initialInspections));
    return initialInspections;
  }
  return JSON.parse(data);
}

export function recordQualityInspection(inspection: Omit<QualityInspection, 'id' | 'timestamp'>): QualityInspection {
  const list = getQualityInspections();
  const newInspection: QualityInspection = {
    ...inspection,
    id: `qi-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  list.unshift(newInspection);
  localStorage.setItem(KEYS.QUALITY_INSPECTIONS, JSON.stringify(list));

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: inspection.overallPassed ? 'Inspection Qualité QA Validée' : '⚠️ Refus Contrôle Qualité Expédition',
    description: `Inspecteur: ${inspection.inspectorName} | Manifeste: ${inspection.manifestNumber || 'Général'} | Temp: ${inspection.dispatchTemperatureCelsius}°C`,
    actor: inspection.inspectorName,
    badgeText: inspection.overallPassed ? 'QA PASSED' : 'QA FAILED',
    severity: inspection.overallPassed ? 'success' : 'warning'
  });

  notifyListeners();
  return newInspection;
}

// ==========================================
// PACKAGING & EMBALLAGE DISPATCH ENGINE
// ==========================================

export function getPackagingMaterials(): PackagingMaterial[] {
  const data = localStorage.getItem(KEYS.PACKAGING_MATERIALS);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function savePackagingMaterials(materials: PackagingMaterial[]): void {
  localStorage.setItem(KEYS.PACKAGING_MATERIALS, JSON.stringify(materials));
  notifyListeners();
}

export function receivePackagingSupplierShipment(
  packagingId: string,
  quantityReceived: number,
  unitCost: number,
  supplierNotes?: string,
  newPackagingData?: { name: string; unit_type: string; min_alert_qty: number }
): PackagingMaterial {
  const materials = getPackagingMaterials();
  let material = materials.find((m) => m.id === packagingId);

  if (!material && newPackagingData) {
    material = {
      id: `pkg-${Date.now()}`,
      name: newPackagingData.name,
      unit_type: newPackagingData.unit_type,
      central_stock_qty: 0,
      unit_cost: unitCost,
      min_alert_qty: newPackagingData.min_alert_qty || 100
    };
    materials.push(material);
  }

  if (material) {
    material.central_stock_qty += quantityReceived;
    material.unit_cost = unitCost;
    localStorage.setItem(KEYS.PACKAGING_MATERIALS, JSON.stringify(materials));

    addActivityLog({
      type: 'STOCK_ADJUSTED',
      title: '📦 Réception Stock Emballage Fournisseur',
      description: `Reçu ${quantityReceived} ${material.unit_type} de "${material.name}" au lab central (PU: ${unitCost.toFixed(2)} DZD). Total labo: ${material.central_stock_qty}. ${supplierNotes || ''}`,
      actor: 'Chef de Stock Emballage',
      badgeText: 'REC-EMBALLAGE',
      severity: 'info'
    });

    notifyListeners();
    return material;
  }

  throw new Error('Packaging material not found');
}

export function getStorePackagingInventory(storeId?: string): StorePackagingInventory[] {
  const data = localStorage.getItem(KEYS.STORE_PACKAGING_INVENTORY);
  const list: StorePackagingInventory[] = data ? JSON.parse(data) : [];
  
  if (storeId) {
    return list.filter((item) => item.store_id === storeId);
  }
  return list;
}

export function getPackagingDispatches(storeId?: string): PackagingDispatch[] {
  const data = localStorage.getItem(KEYS.PACKAGING_DISPATCHES);
  const list: PackagingDispatch[] = data ? JSON.parse(data) : [];

  if (storeId) {
    return list.filter((d) => d.target_store_id === storeId);
  }
  return list;
}

export function createPackagingDispatch(
  targetStoreId: string,
  items: Array<{ packaging_id: string; quantity_sent: number }>,
  createdBy: string,
  notes?: string,
  fromRequisitionId?: string
): PackagingDispatch {
  const materials = getPackagingMaterials();
  const stores = getStores();
  const targetStore = stores.find((s) => s.id === targetStoreId);

  if (!targetStore) {
    throw new Error('Target store not found');
  }

  // Validation: Check central stock
  const dispatchItems: PackagingDispatchItem[] = [];
  for (const item of items) {
    const mat = materials.find((m) => m.id === item.packaging_id);
    if (!mat) {
      throw new Error(`Packaging item ${item.packaging_id} not found`);
    }
    if (mat.central_stock_qty < item.quantity_sent) {
      throw new Error(`Insufficient central stock for ${mat.name}. Available: ${mat.central_stock_qty}, requested: ${item.quantity_sent}`);
    }
    
    // Deduct central stock
    mat.central_stock_qty -= item.quantity_sent;
    dispatchItems.push({
      id: `pdi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      packaging_id: mat.id,
      packaging_name: mat.name,
      unit_type: mat.unit_type,
      quantity_sent: item.quantity_sent
    });
  }

  // Save updated central packaging stock
  localStorage.setItem(KEYS.PACKAGING_MATERIALS, JSON.stringify(materials));

  // Create dispatch object
  const dispatches = getPackagingDispatches();
  const dispatchNumber = `PKG-DISP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(dispatches.length + 1).padStart(2, '0')}`;
  
  const newDispatch: PackagingDispatch = {
    id: `pdisp-${Date.now()}`,
    dispatch_number: dispatchNumber,
    target_store_id: targetStore.id,
    target_store_name: targetStore.name,
    status: 'IN_TRANSIT',
    created_at: new Date().toISOString(),
    created_by: createdBy,
    items: dispatchItems,
    notes,
    from_requisition_id: fromRequisitionId
  };

  dispatches.unshift(newDispatch);
  localStorage.setItem(KEYS.PACKAGING_DISPATCHES, JSON.stringify(dispatches));

  // If created from requisition, update requisition status
  if (fromRequisitionId) {
    const requisitions = getPackagingRequisitions();
    const req = requisitions.find((r) => r.id === fromRequisitionId);
    if (req) {
      req.status = 'DISPATCHED';
      localStorage.setItem(KEYS.PACKAGING_REQUISITIONS, JSON.stringify(requisitions));
    }
  }

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: '🚚 Expédition Emballage Générée',
    description: `Bon d'expédition emballage ${dispatchNumber} envoyé à ${targetStore.name} (${items.length} types d'articles). Stock labo ajusté.`,
    actor: createdBy,
    badgeText: 'DISPATCH-EMBALLAGE',
    severity: 'info'
  });

  notifyListeners();
  return newDispatch;
}

export function confirmPackagingDelivery(
  dispatchId: string,
  verifiedItems: Array<{ packaging_id: string; quantity_received: number }>,
  receivedBy: string,
  notes?: string
): PackagingDispatch {
  const dispatches = getPackagingDispatches();
  const dispatch = dispatches.find((d) => d.id === dispatchId);

  if (!dispatch) {
    throw new Error('Packaging dispatch not found');
  }

  if (dispatch.status === 'RECEIVED') {
    throw new Error('Dispatch is already marked as received');
  }

  const storeInventory = getStorePackagingInventory();
  const materials = getPackagingMaterials();

  // Update verified items & credit store packaging inventory
  for (const vItem of verifiedItems) {
    const dispItem = dispatch.items.find((i) => i.packaging_id === vItem.packaging_id);
    if (dispItem) {
      dispItem.quantity_received = vItem.quantity_received;
    }

    const mat = materials.find((m) => m.id === vItem.packaging_id);

    let storeItem = storeInventory.find(
      (si) => si.store_id === dispatch.target_store_id && si.packaging_id === vItem.packaging_id
    );

    if (storeItem) {
      storeItem.quantity_on_hand += vItem.quantity_received;
    } else {
      storeItem = {
        id: `spi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        store_id: dispatch.target_store_id,
        store_name: dispatch.target_store_name,
        packaging_id: vItem.packaging_id,
        packaging_name: mat ? mat.name : dispItem?.packaging_name,
        quantity_on_hand: vItem.quantity_received
      };
      storeInventory.push(storeItem);
    }
  }

  dispatch.status = 'RECEIVED';
  dispatch.received_at = new Date().toISOString();
  dispatch.received_by = receivedBy;
  if (notes) {
    dispatch.notes = dispatch.notes ? `${dispatch.notes} | Réception: ${notes}` : notes;
  }

  localStorage.setItem(KEYS.PACKAGING_DISPATCHES, JSON.stringify(dispatches));
  localStorage.setItem(KEYS.STORE_PACKAGING_INVENTORY, JSON.stringify(storeInventory));

  // If created from requisition, set requisition status to FULFILLED
  if (dispatch.from_requisition_id) {
    const requisitions = getPackagingRequisitions();
    const req = requisitions.find((r) => r.id === dispatch.from_requisition_id);
    if (req) {
      req.status = 'FULFILLED';
      localStorage.setItem(KEYS.PACKAGING_REQUISITIONS, JSON.stringify(requisitions));
    }
  }

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: '✅ Livraison Emballage Réceptionnée',
    description: `Magasin ${dispatch.target_store_name} a confirmé la réception du bon emballage ${dispatch.dispatch_number} (${verifiedItems.length} lignes). Stock boutique crédité.`,
    actor: receivedBy,
    badgeText: 'RECEPTION-EMBALLAGE',
    severity: 'success'
  });

  notifyListeners();
  return dispatch;
}

export function getPackagingRequisitions(storeId?: string): PackagingRequisition[] {
  const data = localStorage.getItem(KEYS.PACKAGING_REQUISITIONS);
  const list: PackagingRequisition[] = data ? JSON.parse(data) : [];

  if (storeId) {
    return list.filter((r) => r.store_id === storeId);
  }
  return list;
}

export function createPackagingRequisition(
  storeId: string,
  items: Array<{ packaging_id: string; quantity_requested: number }>,
  requestedBy: string,
  notes?: string
): PackagingRequisition {
  const stores = getStores();
  const store = stores.find((s) => s.id === storeId);
  const materials = getPackagingMaterials();

  if (!store) {
    throw new Error('Store not found');
  }

  const reqItems: PackagingRequisitionItem[] = [];
  for (const item of items) {
    const mat = materials.find((m) => m.id === item.packaging_id);
    if (mat) {
      reqItems.push({
        packaging_id: mat.id,
        packaging_name: mat.name,
        unit_type: mat.unit_type,
        quantity_requested: item.quantity_requested
      });
    }
  }

  const requisitions = getPackagingRequisitions();
  const reqNumber = `PKG-REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(requisitions.length + 1).padStart(2, '0')}`;

  const newReq: PackagingRequisition = {
    id: `preq-${Date.now()}`,
    requisition_number: reqNumber,
    store_id: store.id,
    store_name: store.name,
    requested_by: requestedBy,
    created_at: new Date().toISOString(),
    status: 'PENDING',
    items: reqItems,
    notes
  };

  requisitions.unshift(newReq);
  localStorage.setItem(KEYS.PACKAGING_REQUISITIONS, JSON.stringify(requisitions));

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: '📝 Demande Réquisition Emballage Transmise',
    description: `${store.name} a soumis une demande d'emballages ${reqNumber} (${reqItems.length} articles).`,
    actor: requestedBy,
    badgeText: 'REQ-EMBALLAGE',
    severity: 'info'
  });

  notifyListeners();
  return newReq;
}

// --- RAW MATERIAL DESTOCKING / INVENTORY ADJUSTMENTS ---
export function getInventoryAdjustments(): InventoryAdjustment[] {
  initStorage();
  const raw = localStorage.getItem(KEYS.INVENTORY_ADJUSTMENTS);
  if (!raw) return [];
  try {
    const list: InventoryAdjustment[] = JSON.parse(raw);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export function recordInventoryAdjustment(data: {
  rawMaterialId: string;
  quantityRemoved: number;
  reasonCategory: DestockingReasonCategory;
  notes?: string;
  createdBy?: string;
}): { adjustment: InventoryAdjustment; updatedMaterial: RawMaterial } {
  initStorage();
  const rawMaterials = getRawMaterials();
  const index = rawMaterials.findIndex(rm => rm.id === data.rawMaterialId);
  if (index === -1) {
    throw new Error("Matière première introuvable.");
  }

  const material = rawMaterials[index];
  if (data.quantityRemoved <= 0) {
    throw new Error("La quantité à déstocker doit être supérieure à zéro.");
  }
  if (data.quantityRemoved > material.currentStock) {
    throw new Error(`Quantité demandée (${data.quantityRemoved} ${material.unit}) supérieure au stock disponible (${material.currentStock} ${material.unit}).`);
  }

  const unitCostAtTime = material.currentAvgCost || 0;
  const totalLossValue = Math.round((data.quantityRemoved * unitCostAtTime) * 100) / 100;
  const newStock = Math.max(0, material.currentStock - data.quantityRemoved);

  // Update Raw Material
  const updatedMaterial: RawMaterial = {
    ...material,
    currentStock: newStock,
    lastUpdated: new Date().toISOString()
  };

  rawMaterials[index] = updatedMaterial;
  localStorage.setItem(KEYS.RAW_MATERIALS, JSON.stringify(rawMaterials));

  // Add Inventory Adjustment Record
  const createdBy = data.createdBy || 'Chef Labo Central';
  const newAdj: InventoryAdjustment = {
    id: `adj-${Date.now()}`,
    raw_material_id: material.id,
    raw_material_name: material.name,
    unit: material.unit,
    quantity_removed: data.quantityRemoved,
    unit_cost_at_time: unitCostAtTime,
    total_loss_value: totalLossValue,
    reason_category: data.reasonCategory,
    notes: data.notes || '',
    created_by: createdBy,
    created_at: new Date().toISOString()
  };

  const adjustments = getInventoryAdjustments();
  adjustments.unshift(newAdj);
  localStorage.setItem(KEYS.INVENTORY_ADJUSTMENTS, JSON.stringify(adjustments));

  const reasonLabels: Record<DestockingReasonCategory, string> = {
    EXPIRED: 'Périmé',
    QUALITY_DAMAGE: 'Avarie / Dégât Qualité',
    RANDOM_DISTRIBUTION: 'Distribution / Échantillons',
    SPILLAGE_WASTE: 'Perte / Mousse / Déversement',
    INVENTORY_CORRECTION: 'Correction de Stock'
  };

  // Enqueue in IndexedDB Offline Queue
  enqueueOfflineAction({
    entityType: 'INVENTORY_ADJUSTMENT',
    actionType: 'CREATE',
    entityId: newAdj.id,
    label: `Déstockage : ${material.name} (-${data.quantityRemoved} ${material.unit})`,
    description: `Déstockage ${material.name} pour ${reasonLabels[data.reasonCategory]} - Perte: ${totalLossValue.toLocaleString('fr-DZ')} DZD`,
    payload: newAdj
  }).catch((err) => console.warn('IndexedDB enqueue adjustment notice:', err));

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: '🔴 Déstockage Matière Première',
    description: `${data.quantityRemoved} ${material.unit} de ${material.name} retirés pour ${reasonLabels[data.reasonCategory]} - Perte: ${totalLossValue.toLocaleString('fr-DZ')} DZD`,
    actor: createdBy,
    badgeText: 'DÉSTOCKAGE',
    severity: 'warning'
  });

  notifyListeners();

  return { adjustment: newAdj, updatedMaterial };
}

// --- NEW ADVANCED MODULE STORAGE HANDLERS ---

// 1. Production Planning & Lab Intelligence Forecasts
export function getProductionForecasts(): DailyPastryProductionForecast[] {
  const stored = localStorage.getItem(KEYS.PRODUCTION_FORECASTS);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function updateProductionForecasts(forecasts: DailyPastryProductionForecast[]) {
  localStorage.setItem(KEYS.PRODUCTION_FORECASTS, JSON.stringify(forecasts));
  notifyListeners();
}

// 2. Cold-Room Expiry Tracker
export function getColdRoomBatches(): ColdRoomBatchExpiryItem[] {
  const stored = localStorage.getItem(KEYS.COLD_ROOM_BATCHES);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addColdRoomBatch(batch: Omit<ColdRoomBatchExpiryItem, 'id' | 'daysRemaining' | 'status'>): ColdRoomBatchExpiryItem {
  const batches = getColdRoomBatches();
  const exp = new Date(batch.expiryDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  
  let status: ColdRoomBatchExpiryItem['status'] = 'FRESH';
  if (diffDays <= 0) status = 'EXPIRED';
  else if (diffDays <= 2) status = 'CRITICAL';
  else if (diffDays <= 5) status = 'EXPIRING_SOON';

  const newBatch: ColdRoomBatchExpiryItem = {
    ...batch,
    id: `batch-exp-${Date.now()}`,
    daysRemaining: diffDays,
    status
  };

  batches.unshift(newBatch);
  localStorage.setItem(KEYS.COLD_ROOM_BATCHES, JSON.stringify(batches));
  notifyListeners();
  return newBatch;
}

export function deleteColdRoomBatch(batchId: string) {
  const batches = getColdRoomBatches().filter(b => b.id !== batchId);
  localStorage.setItem(KEYS.COLD_ROOM_BATCHES, JSON.stringify(batches));
  notifyListeners();
}

// 3. Custom Cake Pre-Orders
export function getCustomCakeOrders(): CustomCakeOrder[] {
  const stored = localStorage.getItem(KEYS.CUSTOM_CAKE_ORDERS);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function createCustomCakeOrder(orderData: Omit<CustomCakeOrder, 'id' | 'orderNumber' | 'createdAt' | 'remainingBalance'>): CustomCakeOrder {
  const orders = getCustomCakeOrders();
  const newOrder: CustomCakeOrder = {
    ...orderData,
    id: `cake-${Date.now()}`,
    orderNumber: `CMD-GAT-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`,
    remainingBalance: Math.max(0, orderData.totalPrice - orderData.depositAmount),
    createdAt: new Date().toISOString()
  };
  orders.unshift(newOrder);
  localStorage.setItem(KEYS.CUSTOM_CAKE_ORDERS, JSON.stringify(orders));
  
  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: '🎂 Nouvelle Commande Gâteau Sur-Mesure',
    description: `${newOrder.orderNumber} pour ${newOrder.customerName} (${newOrder.cakeType} - ${newOrder.servings}P) • Acompte: ${newOrder.depositAmount.toLocaleString('fr-DZ')} DZD`,
    actor: orderData.storeName,
    badgeText: 'COMMANDE-CLIENT',
    severity: 'info'
  });

  notifyListeners();
  return newOrder;
}

export function updateCustomCakeOrderStatus(orderId: string, newStatus: CustomCakeOrder['status'], assignedChef?: string) {
  const orders = getCustomCakeOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    if (assignedChef) order.assignedChef = assignedChef;
    localStorage.setItem(KEYS.CUSTOM_CAKE_ORDERS, JSON.stringify(orders));
    notifyListeners();
  }
}

// 4. Customer Loyalty & VIP Profiles
export function getLoyaltyProfiles(): CustomerLoyaltyProfile[] {
  const stored = localStorage.getItem(KEYS.LOYALTY_PROFILES);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addOrUpdateLoyaltyProfile(profile: Omit<CustomerLoyaltyProfile, 'id' | 'createdAt' | 'lastVisit'>): CustomerLoyaltyProfile {
  const profiles = getLoyaltyProfiles();
  const existing = profiles.find(p => p.phone === profile.phone);
  if (existing) {
    Object.assign(existing, profile, { lastVisit: new Date().toISOString().split('T')[0] });
    localStorage.setItem(KEYS.LOYALTY_PROFILES, JSON.stringify(profiles));
    notifyListeners();
    return existing;
  }
  const newProfile: CustomerLoyaltyProfile = {
    ...profile,
    id: `vip-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
    lastVisit: new Date().toISOString().split('T')[0]
  };
  profiles.unshift(newProfile);
  localStorage.setItem(KEYS.LOYALTY_PROFILES, JSON.stringify(profiles));
  notifyListeners();
  return newProfile;
}

export function addLoyaltyPoints(phone: string, pointsToAdd: number, amountSpent: number) {
  const profiles = getLoyaltyProfiles();
  const profile = profiles.find(p => p.phone === phone);
  if (profile) {
    profile.points += pointsToAdd;
    profile.totalSpent += amountSpent;
    profile.visitsCount += 1;
    profile.lastVisit = new Date().toISOString().split('T')[0];
    if (profile.totalSpent >= 40000) profile.tier = 'VIP_PLATINUM';
    else if (profile.totalSpent >= 15000) profile.tier = 'GOLD';
    else profile.tier = 'SILVER';
    localStorage.setItem(KEYS.LOYALTY_PROFILES, JSON.stringify(profiles));
    notifyListeners();
  }
}

// 5. End-of-Day Cash Drawer Reconciliation (Z-Report)
export function getCashDrawerZReports(): CashDrawerZReport[] {
  const stored = localStorage.getItem(KEYS.Z_REPORTS);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function submitCashDrawerZReport(reportData: Omit<CashDrawerZReport, 'id' | 'reportNumber' | 'closingDate' | 'cashVariance' | 'status'>): CashDrawerZReport {
  const reports = getCashDrawerZReports();
  const variance = reportData.actualCashCounted - reportData.expectedCashSales;
  let status: CashDrawerZReport['status'] = 'BALANCED';
  if (Math.abs(variance) > 500) status = 'DISCREPANCY_MAJOR';
  else if (Math.abs(variance) > 0) status = 'DISCREPANCY_MINOR';

  const newReport: CashDrawerZReport = {
    ...reportData,
    id: `zrep-${Date.now()}`,
    reportNumber: `Z-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(reports.length + 1).padStart(2, '0')}`,
    closingDate: new Date().toISOString().split('T')[0],
    cashVariance: variance,
    status
  };

  reports.unshift(newReport);
  localStorage.setItem(KEYS.Z_REPORTS, JSON.stringify(reports));

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: `🧾 Clôture de Caisse ${newReport.reportNumber}`,
    description: `Boutique: ${newReport.storeName} • Total CA: ${newReport.totalRevenue.toLocaleString('fr-DZ')} DZD • Écart Espèces: ${variance >= 0 ? '+' : ''}${variance} DZD`,
    actor: reportData.cashierName,
    badgeText: 'Z-REPORT',
    severity: status === 'BALANCED' ? 'success' : 'warning'
  });

  notifyListeners();
  return newReport;
}

// 6. Returns & Damaged Goods Vouchers
export function getStoreReturnVouchers(): StoreReturnVoucher[] {
  const stored = localStorage.getItem(KEYS.STORE_RETURNS);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function createStoreReturnVoucher(voucher: Omit<StoreReturnVoucher, 'id' | 'voucherNumber' | 'createdAt'>): StoreReturnVoucher {
  const returns = getStoreReturnVouchers();
  const newVoucher: StoreReturnVoucher = {
    ...voucher,
    id: `ret-${Date.now()}`,
    voucherNumber: `RET-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(returns.length + 1).padStart(2, '0')}`,
    createdAt: new Date().toISOString()
  };
  returns.unshift(newVoucher);
  localStorage.setItem(KEYS.STORE_RETURNS, JSON.stringify(returns));

  addActivityLog({
    type: 'STOCK_ADJUSTED',
    title: `📦 Bon de Retour Boutique ${newVoucher.voucherNumber}`,
    description: `${voucher.quantity} ${voucher.unit} de ${voucher.productName} retournés (${voucher.reason}) • Valeur: ${voucher.totalLossValue.toLocaleString('fr-DZ')} DZD`,
    actor: voucher.storeName,
    badgeText: 'RETOUR-BOUTIQUE',
    severity: 'warning'
  });

  notifyListeners();
  return newVoucher;
}

export function updateStoreReturnStatus(voucherId: string, status: StoreReturnVoucher['status'], inspectedBy?: string) {
  const returns = getStoreReturnVouchers();
  const voucher = returns.find(r => r.id === voucherId);
  if (voucher) {
    voucher.status = status;
    if (inspectedBy) voucher.inspectedBy = inspectedBy;
    localStorage.setItem(KEYS.STORE_RETURNS, JSON.stringify(returns));
    notifyListeners();
  }
}

// 7. Chef Hands-Free Voice Notes & Recipe Modifications
export function getChefVoiceNotes(): ChefVoiceNote[] {
  initStorage();
  const stored = localStorage.getItem(KEYS.CHEF_VOICE_NOTES);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveChefVoiceNote(
  noteData: Omit<ChefVoiceNote, 'id' | 'noteNumber' | 'createdAt'>
): ChefVoiceNote {
  const notes = getChefVoiceNotes();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(notes.length + 1).padStart(2, '0');
  const newNote: ChefVoiceNote = {
    ...noteData,
    id: `vn-${Date.now()}`,
    noteNumber: `VN-${dateStr}-${seq}`,
    createdAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  localStorage.setItem(KEYS.CHEF_VOICE_NOTES, JSON.stringify(notes));

  const categoryLabels: Record<string, string> = {
    RECIPE_MODIFICATION: 'Modification Recette',
    PRODUCTION_RUN: 'Note de Production',
    OVEN_INCIDENT: 'Incident Four/Cuisson',
    RAW_MATERIAL_QUALITY: 'Qualité Matière Première',
    HYGIENE_HACCP: 'Hygiène & HACCP',
    GENERAL: 'Note Générale Labo'
  };

  addActivityLog({
    type: 'RECIPE_CREATED',
    title: `🎙️ Note Vocale Chef : ${newNote.noteNumber}`,
    description: `[${categoryLabels[newNote.category] || newNote.category}] ${newNote.recipeName ? `Recette: ${newNote.recipeName} • ` : ''}${newNote.transcript.slice(0, 90)}...`,
    actor: newNote.chefName,
    badgeText: 'VOICE-NOTE',
    severity: newNote.severity === 'critical' ? 'danger' : newNote.severity === 'important' ? 'warning' : 'info'
  });

  notifyListeners();
  return newNote;
}

export function updateChefVoiceNote(id: string, updates: Partial<ChefVoiceNote>): ChefVoiceNote | null {
  const notes = getChefVoiceNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index === -1) return null;

  const updated = {
    ...notes[index],
    ...updates
  };
  notes[index] = updated;
  localStorage.setItem(KEYS.CHEF_VOICE_NOTES, JSON.stringify(notes));
  notifyListeners();
  return updated;
}

export function deleteChefVoiceNote(id: string): boolean {
  const notes = getChefVoiceNotes();
  const filtered = notes.filter(n => n.id !== id);
  if (filtered.length === notes.length) return false;

  localStorage.setItem(KEYS.CHEF_VOICE_NOTES, JSON.stringify(filtered));
  notifyListeners();
  return true;
}

export function applyVoiceNoteToRecipe(
  voiceNoteId: string,
  appliedBy: string = 'Chef Pâtissier'
): { success: boolean; recipeName?: string } {
  const notes = getChefVoiceNotes();
  const note = notes.find(n => n.id === voiceNoteId);
  if (!note || !note.recipeId) {
    return { success: false };
  }

  const recipes = getRecipes();
  const recipeIndex = recipes.findIndex(r => r.id === note.recipeId);
  if (recipeIndex === -1) {
    return { success: false };
  }

  const recipe = recipes[recipeIndex];
  const dateFormatted = new Date().toLocaleDateString('fr-FR');
  const modificationEntry = `\n\n[Mise à jour Chef ${note.chefName} - ${dateFormatted}] : ${note.transcript}`;

  const updatedInstructions = recipe.instructions
    ? `${recipe.instructions}${modificationEntry}`
    : `Consignes de fabrication :${modificationEntry}`;

  recipes[recipeIndex] = {
    ...recipe,
    instructions: updatedInstructions
  };

  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));

  // Update note status
  note.status = 'APPLIED_TO_RECIPE';
  note.appliedAt = new Date().toISOString();
  note.appliedBy = appliedBy;
  note.actionTakenNotes = `Fiche technique mise à jour avec les ajustements de la note vocale.`;

  localStorage.setItem(KEYS.CHEF_VOICE_NOTES, JSON.stringify(notes));

  addActivityLog({
    type: 'RECIPE_CREATED',
    title: `👨‍🍳 Fiche Technique Modifiée : ${recipe.name}`,
    description: `Ajustements vocaux du chef intégrés directement dans les instructions de fabrication.`,
    actor: appliedBy,
    badgeText: 'RECIPE-UPDATE',
    severity: 'success'
  });

  notifyListeners();
  return { success: true, recipeName: recipe.name };
}





