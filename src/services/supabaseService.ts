import { supabase } from '../lib/supabaseClient';
import {
  getRawMaterials,
  saveRawMaterials,
  getPackagingMaterials,
  getInventoryAdjustments,
  notifyListeners,
  getActiveStoreId,
} from './storage';
import {
  RawMaterial,
  PackagingMaterial,
  Requisition,
  RequisitionStatus,
  InventoryAdjustment,
  DestockingReasonCategory,
  StorePackagingInventory,
  PackagingDispatch,
  PackagingRequisition,
  RetailProduct,
} from '../types';

/**
 * Helper to safely handle Supabase errors with warning logs and allow graceful fallback
 */
function logSupabaseWarning(error: any, actionName: string) {
  if (error) {
    console.warn(`Supabase warning during ${actionName}:`, error.message || error);
  }
}

// =========================================================
// 0. FINISHED PRODUCTS CATALOG (Store Requisition Screen)
// =========================================================

/**
 * Fetches the full finished-products catalog used by the Store Requisition screen.
 * Intentionally does NOT filter on current stock or an is_active/isAvailable flag:
 * a store must be able to requisition a brand-new product even if central lab
 * hasn't produced any stock for it yet, and legacy rows with no is_active value
 * set should still be treated as available rather than hidden.
 */
export async function fetchRetailProductsFromSupabase(): Promise<RetailProduct[]> {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) {
    console.warn('Supabase fetch products warning:', error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    category: row.category || row.room_id || 'Other',
    price: Number(row.price ?? row.retail_selling_price ?? 0),
    costPrice: Number(row.cost_price ?? row.unit_estimated_cost ?? 0),
    retail_selling_price: row.retail_selling_price != null ? Number(row.retail_selling_price) : undefined,
    unit: row.unit || 'units',
    sku: row.sku || `SKU-${row.id}`,
    imageIcon: row.image_icon || undefined,
    description: row.description || undefined,
  }));
}

// =========================================================
// 1. RAW MATERIALS & PACKAGING INVENTORY
// =========================================================

export async function fetchRawMaterialsFromSupabase(): Promise<RawMaterial[]> {
  const { data, error } = await supabase.from('raw_materials').select('*').order('name');
  if (error) {
    console.warn('Supabase fetch raw_materials warning:', error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    sku: row.sku || `SKU-${row.id}`,
    name: row.name,
    category: row.category || 'Other',
    unit: row.unit || row.unit_type || 'kg',
    currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
    currentAvgCost: Number(row.current_avg_cost ?? row.currentAvgCost ?? 0),
    reorderLevel: Number(row.min_reorder_level ?? row.reorderLevel ?? 10),
    min_reorder_level: Number(row.min_reorder_level ?? row.reorderLevel ?? 10),
    totalPurchasedQty: Number(row.total_purchased_qty ?? row.current_stock ?? 0),
    lastUpdated: row.last_updated || row.updated_at || new Date().toISOString(),
    barcode: row.barcode || '',
  }));
}

export async function upsertRawMaterialToSupabase(material: Partial<RawMaterial> & { id?: string; name: string }): Promise<RawMaterial> {
  const id = material.id || `rm-${Date.now()}`;
  const sku = material.sku || `SKU-${Date.now().toString().slice(-6)}`;
  const unit = material.unit || 'kg';
  const category = material.category || 'Other';
  const currentStock = Number(material.currentStock ?? 0);
  const currentAvgCost = Number(material.currentAvgCost ?? 0);
  const minReorderLevel = Number(material.min_reorder_level ?? material.reorderLevel ?? 10);
  const barcode = material.barcode || null;
  const lastUpdated = new Date().toISOString();

  // Primary payload matching strictly raw_materials columns (NO unit_type)
  const payload = {
    id,
    sku,
    name: material.name,
    category,
    unit,
    current_stock: currentStock,
    current_avg_cost: currentAvgCost,
    min_reorder_level: minReorderLevel,
    barcode,
    last_updated: lastUpdated,
  };

  let savedMaterial: RawMaterial = {
    id,
    sku,
    name: material.name,
    category,
    unit,
    currentStock,
    currentAvgCost,
    reorderLevel: minReorderLevel,
    min_reorder_level: minReorderLevel,
    totalPurchasedQty: currentStock,
    lastUpdated,
    barcode: barcode || '',
  };

  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      savedMaterial = {
        id: data.id,
        sku: data.sku || sku,
        name: data.name,
        category: data.category || category,
        unit: data.unit || unit,
        currentStock: Number(data.current_stock ?? currentStock),
        currentAvgCost: Number(data.current_avg_cost ?? currentAvgCost),
        reorderLevel: Number(data.min_reorder_level ?? minReorderLevel),
        min_reorder_level: Number(data.min_reorder_level ?? minReorderLevel),
        totalPurchasedQty: Number(data.current_stock ?? currentStock),
        lastUpdated: data.last_updated || lastUpdated,
        barcode: data.barcode || '',
      };
    } else if (error) {
      logSupabaseWarning(error, 'upsertRawMaterialToSupabase');
    }
  } catch (err: any) {
    logSupabaseWarning(err, 'upsertRawMaterialToSupabase exception');
  }

  // Synchronize local storage cache and notify UI listeners
  try {
    const localList = getRawMaterials();
    const existingIdx = localList.findIndex((m) => m.id === savedMaterial.id);
    if (existingIdx >= 0) {
      localList[existingIdx] = { ...localList[existingIdx], ...savedMaterial };
    } else {
      localList.unshift(savedMaterial);
    }
    saveRawMaterials(localList);
    notifyListeners();
  } catch (localStorageErr) {
    console.warn('LocalStorage raw_materials sync error:', localStorageErr);
  }

  return savedMaterial;
}

export async function deleteRawMaterialFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('raw_materials').delete().eq('id', id);
    logSupabaseWarning(error, 'deleteRawMaterialFromSupabase');
  } catch (err) {
    logSupabaseWarning(err, 'deleteRawMaterialFromSupabase exception');
  }

  try {
    const localList = getRawMaterials().filter((m) => m.id !== id);
    saveRawMaterials(localList);
    notifyListeners();
  } catch (err) {
    console.warn('LocalStorage raw_materials delete sync error:', err);
  }
}

export async function fetchPackagingMaterialsFromSupabase(): Promise<PackagingMaterial[]> {
  const { data, error } = await supabase.from('packaging_materials').select('*').order('name');
  if (error) {
    console.warn('Supabase fetch packaging_materials warning:', error.message);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    code: row.code || `PKG-${row.id.toString().slice(-4)}`,
    name: row.name,
    category: row.category || 'Boxes',
    unit_type: row.unit_type || row.unit || 'piece',
    central_stock_qty: Number(row.central_stock_qty ?? 0),
    min_alert_qty: Number(row.min_alert_qty ?? 100),
    unit_cost: Number(row.unit_cost ?? 0),
  }));
}

export async function fetchStorePackagingInventoryFromSupabase(storeId?: string): Promise<StorePackagingInventory[]> {
  const currentStoreId = storeId || getActiveStoreId();
  let query = supabase.from('store_packaging_inventory').select('*');

  if (currentStoreId && currentStoreId !== 'ALL' && currentStoreId !== 'LAB-CENTRAL') {
    query = query.eq('store_id', currentStoreId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Supabase fetch store_packaging_inventory warning:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    store_id: row.store_id,
    store_name: row.store_name,
    packaging_id: row.packaging_id,
    packaging_name: row.packaging_name,
    quantity_on_hand: Number(row.quantity_on_hand ?? 0)
  }));
}

export async function upsertPackagingMaterialToSupabase(pkg: Partial<PackagingMaterial> & { name: string }): Promise<PackagingMaterial> {
  const id = pkg.id || `pkg-${Date.now()}`;
  const code = pkg.code || `PKG-${Date.now().toString().slice(-6)}`;
  const unitType = pkg.unit_type || 'piece';
  const category = pkg.category || 'Boxes';
  const centralStockQty = Number(pkg.central_stock_qty ?? 0);
  const minAlertQty = Number(pkg.min_alert_qty ?? 100);
  const unitCost = Number(pkg.unit_cost ?? 0);

  let savedPkg: PackagingMaterial = {
    id,
    code,
    name: pkg.name,
    category,
    unit_type: unitType,
    central_stock_qty: centralStockQty,
    min_alert_qty: minAlertQty,
    unit_cost: unitCost,
  };

  try {
    if (!pkg.id) {
      try {
        const { data: newId, error: rpcError } = await supabase.rpc('add_new_packaging_item', {
          p_code: code,
          p_name: pkg.name,
          p_category: category,
          p_unit: unitType,
          p_central_stock_qty: centralStockQty,
          p_unit_cost: unitCost,
          p_min_alert_qty: minAlertQty,
        });

        if (!rpcError && newId) {
          savedPkg.id = newId;
        }
      } catch (rpcErr) {
        logSupabaseWarning(rpcErr, 'add_new_packaging_item RPC');
      }
    }

    const payload = {
      id: savedPkg.id,
      code: savedPkg.code,
      name: savedPkg.name,
      category: savedPkg.category,
      unit_type: savedPkg.unit_type,
      unit: savedPkg.unit_type,
      central_stock_qty: savedPkg.central_stock_qty,
      min_alert_qty: savedPkg.min_alert_qty,
      unit_cost: savedPkg.unit_cost,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('packaging_materials')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (!error && data) {
      savedPkg = {
        id: data.id,
        code: data.code || savedPkg.code,
        name: data.name,
        category: data.category || savedPkg.category,
        unit_type: data.unit_type || data.unit || savedPkg.unit_type,
        central_stock_qty: Number(data.central_stock_qty ?? savedPkg.central_stock_qty),
        min_alert_qty: Number(data.min_alert_qty ?? savedPkg.min_alert_qty),
        unit_cost: Number(data.unit_cost ?? savedPkg.unit_cost),
      };
    } else if (error) {
      logSupabaseWarning(error, 'upsertPackagingMaterialToSupabase');
    }
  } catch (err: any) {
    logSupabaseWarning(err, 'upsertPackagingMaterialToSupabase exception');
  }

  // Local storage fallback sync
  try {
    const materials = getPackagingMaterials();
    const idx = materials.findIndex((m) => m.id === savedPkg.id);
    if (idx >= 0) {
      materials[idx] = { ...materials[idx], ...savedPkg };
    } else {
      materials.unshift(savedPkg);
    }
    localStorage.setItem('pastry_app_packaging_materials', JSON.stringify(materials));
    notifyListeners();
  } catch (localStorageErr) {
    console.warn('LocalStorage packaging_materials sync error:', localStorageErr);
  }

  return savedPkg;
}

export async function deletePackagingMaterialFromSupabase(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('packaging_materials').delete().eq('id', id);
    logSupabaseWarning(error, 'deletePackagingMaterialFromSupabase');
  } catch (err) {
    logSupabaseWarning(err, 'deletePackagingMaterialFromSupabase exception');
  }

  try {
    const materials = getPackagingMaterials().filter((m) => m.id !== id);
    localStorage.setItem('pastry_app_packaging_materials', JSON.stringify(materials));
    notifyListeners();
  } catch (err) {
    console.warn('LocalStorage packaging_materials delete sync error:', err);
  }
}

// =========================================================
// 2. STORE REQUISITIONS & DISPATCHES
// =========================================================

export async function fetchRequisitionsFromSupabase(storeId?: string): Promise<Requisition[]> {
  let query = supabase.from('store_requisitions').select('*').order('created_at', { ascending: false });
  if (storeId && storeId !== 'ALL') {
    query = query.eq('store_id', storeId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('Supabase fetch store_requisitions warning:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    requisitionNumber: row.requisition_number || row.requisitionNumber || `REQ-${row.id}`,
    storeId: row.store_id || row.storeId,
    storeName: row.store_name || row.storeName || 'Boutique',
    dateRequested: row.date_requested || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    dateNeeded: row.date_needed || row.dateNeeded || new Date().toISOString().slice(0, 10),
    status: (row.status || 'PENDING') as RequisitionStatus,
    items: row.items || [],
    totalEstimatedCost: Number(row.total_estimated_cost ?? row.totalEstimatedCost ?? 0),
    notes: row.notes || '',
    requestedBy: row.requested_by || row.requestedBy || 'Responsable Caisse',
    rejectionReason: row.rejection_reason || row.rejectionReason,
    dispatchedAt: row.dispatched_at || row.dispatchedAt,
    deliveredAt: row.delivered_at || row.deliveredAt,
  }));
}

export async function insertRequisitionToSupabase(req: Omit<Requisition, 'id' | 'requisitionNumber' | 'dateRequested' | 'status'>): Promise<Requisition> {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const requisitionNumber = `REQ-${todayStr}-${Math.floor(100 + Math.random() * 900)}`;
  const id = `req-${Date.now()}`;
  const dateRequested = new Date().toISOString().slice(0, 10);

  let newReq: Requisition = {
    id,
    requisitionNumber,
    storeId: req.storeId,
    storeName: req.storeName,
    dateRequested,
    dateNeeded: req.dateNeeded,
    status: 'PENDING',
    items: req.items || [],
    totalEstimatedCost: req.totalEstimatedCost,
    notes: req.notes || '',
    requestedBy: req.requestedBy || 'Store Staff',
  };

  try {
    const payload = {
      id,
      requisition_number: requisitionNumber,
      store_id: req.storeId,
      store_name: req.storeName,
      date_requested: dateRequested,
      date_needed: req.dateNeeded,
      status: 'PENDING',
      items: req.items,
      total_estimated_cost: req.totalEstimatedCost,
      notes: req.notes || '',
      requested_by: req.requestedBy || 'Store Staff',
    };

    const { data, error } = await supabase
      .from('store_requisitions')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      newReq = {
        id: data.id,
        requisitionNumber: data.requisition_number,
        storeId: data.store_id,
        storeName: data.store_name,
        dateRequested: data.date_requested,
        dateNeeded: data.date_needed,
        status: data.status as RequisitionStatus,
        items: data.items || [],
        totalEstimatedCost: Number(data.total_estimated_cost),
        notes: data.notes || '',
        requestedBy: data.requested_by,
      };
    } else if (error) {
      logSupabaseWarning(error, 'insertRequisitionToSupabase');
    }
  } catch (err: any) {
    logSupabaseWarning(err, 'insertRequisitionToSupabase exception');
  }

  // Local storage fallback sync
  try {
    const rawReqs = localStorage.getItem('pastry_app_requisitions');
    let list: Requisition[] = rawReqs ? JSON.parse(rawReqs) : [];
    list.unshift(newReq);
    localStorage.setItem('pastry_app_requisitions', JSON.stringify(list));
    notifyListeners();
  } catch (localStorageErr) {
    console.warn('LocalStorage requisitions sync error:', localStorageErr);
  }

  return newReq;
}

export async function updateRequisitionStatusInSupabase(
  reqId: string,
  newStatus: RequisitionStatus,
  options?: { rejectionReason?: string; fulfilledQuantities?: Record<string, number> }
): Promise<void> {
  const updatePayload: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'REJECTED' && options?.rejectionReason) {
    updatePayload.rejection_reason = options.rejectionReason;
  }
  if (newStatus === 'DISPATCHED') {
    updatePayload.dispatched_at = new Date().toISOString();
  }
  if (newStatus === 'DELIVERED') {
    updatePayload.delivered_at = new Date().toISOString();
  }

  try {
    const { error } = await supabase
      .from('store_requisitions')
      .update(updatePayload)
      .eq('id', reqId);

    logSupabaseWarning(error, 'updateRequisitionStatusInSupabase');
  } catch (err) {
    logSupabaseWarning(err, 'updateRequisitionStatusInSupabase exception');
  }

  // Local storage fallback sync
  try {
    const rawReqs = localStorage.getItem('pastry_app_requisitions');
    if (rawReqs) {
      let list: Requisition[] = JSON.parse(rawReqs);
      const reqIdx = list.findIndex((r) => r.id === reqId);
      if (reqIdx >= 0) {
        list[reqIdx] = {
          ...list[reqIdx],
          status: newStatus,
          ...(options?.rejectionReason ? { rejectionReason: options.rejectionReason } : {}),
          ...(newStatus === 'DISPATCHED' ? { dispatchedAt: new Date().toISOString() } : {}),
          ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date().toISOString() } : {}),
        };
        localStorage.setItem('pastry_app_requisitions', JSON.stringify(list));
        notifyListeners();
      }
    }
  } catch (err) {
    console.warn('LocalStorage updateRequisitionStatus error:', err);
  }
}

// =========================================================
// 3. DESTOCKING WRITE-OFFS & INVENTORY ADJUSTMENTS
// =========================================================

export async function fetchInventoryAdjustmentsFromSupabase(): Promise<InventoryAdjustment[]> {
  const { data, error } = await supabase
    .from('inventory_adjustments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetch inventory_adjustments warning:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    raw_material_id: row.raw_material_id,
    raw_material_name: row.raw_material_name,
    unit: row.unit,
    quantity_removed: Number(row.quantity_removed),
    unit_cost_at_time: Number(row.unit_cost_at_time),
    total_loss_value: Number(row.total_loss_value),
    reason_category: row.reason_category as DestockingReasonCategory,
    notes: row.notes || '',
    created_by: row.created_by,
    created_at: row.created_at,
  }));
}

export async function insertInventoryAdjustmentToSupabase(adj: Omit<InventoryAdjustment, 'id' | 'created_at'>): Promise<InventoryAdjustment> {
  const id = `adj-${Date.now()}`;
  const createdAt = new Date().toISOString();

  let savedAdj: InventoryAdjustment = {
    id,
    raw_material_id: adj.raw_material_id,
    raw_material_name: adj.raw_material_name,
    unit: adj.unit,
    quantity_removed: Number(adj.quantity_removed),
    unit_cost_at_time: Number(adj.unit_cost_at_time),
    total_loss_value: Number(adj.total_loss_value),
    reason_category: adj.reason_category,
    notes: adj.notes || '',
    created_by: adj.created_by || 'Chef Labo Central',
    created_at: createdAt,
  };

  try {
    const payload = {
      id,
      raw_material_id: adj.raw_material_id,
      raw_material_name: adj.raw_material_name,
      unit: adj.unit,
      quantity_removed: adj.quantity_removed,
      unit_cost_at_time: adj.unit_cost_at_time,
      total_loss_value: adj.total_loss_value,
      reason_category: adj.reason_category,
      notes: adj.notes || '',
      created_by: adj.created_by || 'Chef Labo Central',
      created_at: createdAt,
    };

    const { data, error } = await supabase
      .from('inventory_adjustments')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      savedAdj = {
        id: data.id,
        raw_material_id: data.raw_material_id,
        raw_material_name: data.raw_material_name,
        unit: data.unit,
        quantity_removed: Number(data.quantity_removed),
        unit_cost_at_time: Number(data.unit_cost_at_time),
        total_loss_value: Number(data.total_loss_value),
        reason_category: data.reason_category as DestockingReasonCategory,
        notes: data.notes || '',
        created_by: data.created_by,
        created_at: data.created_at,
      };
    } else if (error) {
      logSupabaseWarning(error, 'insertInventoryAdjustmentToSupabase');
    }
  } catch (err: any) {
    logSupabaseWarning(err, 'insertInventoryAdjustmentToSupabase exception');
  }

  // Local storage fallback sync
  try {
    const rawList = localStorage.getItem('pastry_app_inventory_adjustments');
    let list: InventoryAdjustment[] = rawList ? JSON.parse(rawList) : [];
    list.unshift(savedAdj);
    localStorage.setItem('pastry_app_inventory_adjustments', JSON.stringify(list));
    notifyListeners();
  } catch (localStorageErr) {
    console.warn('LocalStorage inventory_adjustments sync error:', localStorageErr);
  }

  return savedAdj;
}

// =========================================================
// 4. SUPABASE REALTIME SUBSCRIPTIONS
// =========================================================

export function subscribeToSupabaseRealtime(onEvent?: (table: string, payload: any) => void) {
  const channel = supabase
    .channel('delice-realtime-channel-' + Math.random().toString(36).substring(2, 9))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'raw_materials' },
      (payload) => {
        notifyListeners();
        if (onEvent) onEvent('raw_materials', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'packaging_materials' },
      (payload) => {
        notifyListeners();
        if (onEvent) onEvent('packaging_materials', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_requisitions' },
      (payload) => {
        notifyListeners();
        if (onEvent) onEvent('store_requisitions', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_adjustments' },
      (payload) => {
        notifyListeners();
        if (onEvent) onEvent('inventory_adjustments', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_packaging_inventory' },
      (payload) => {
        notifyListeners();
        if (onEvent) onEvent('store_packaging_inventory', payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

