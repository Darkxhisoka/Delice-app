import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  RawMaterial,
  PackagingMaterial,
  InventoryAdjustment,
  DestockingReasonCategory,
  ActivityLogItem,
} from '../types';
import {
  getRawMaterials,
  saveRawMaterials,
  getPackagingMaterials,
  savePackagingMaterials,
  getInventoryAdjustments,
  getActivityLogs,
  addActivityLog,
  notifyToast,
  notifyListeners,
} from '../services/storage';

export interface UseInventoryReturn {
  // Data lists
  rawMaterials: RawMaterial[];
  packagingMaterials: PackagingMaterial[];
  inventoryAdjustments: InventoryAdjustment[];
  activityLogs: ActivityLogItem[];
  
  // Status flags
  loading: boolean;
  isRealtimeConnected: boolean;
  error: string | null;

  // Actions & Mutations
  refreshInventory: () => Promise<void>;
  upsertRawMaterial: (material: Partial<RawMaterial> & { name: string }) => Promise<RawMaterial>;
  deleteRawMaterial: (id: string) => Promise<void>;
  createInventoryAdjustment: (adj: Omit<InventoryAdjustment, 'id' | 'created_at'>) => Promise<InventoryAdjustment>;
  upsertPackaging: (pkg: Partial<PackagingMaterial> & { name: string }) => Promise<PackagingMaterial>;
  deletePackaging: (id: string) => Promise<void>;
}

// Data row transformers
function mapRawMaterialRow(row: any): RawMaterial {
  return {
    id: String(row.id),
    sku: row.sku || `SKU-${row.id}`,
    name: row.name || 'Sans Nom',
    category: row.category || 'Other',
    unit: row.unit || row.unit_type || 'kg',
    currentStock: Number(row.current_stock ?? row.currentStock ?? 0),
    currentAvgCost: Number(row.current_avg_cost ?? row.currentAvgCost ?? 0),
    reorderLevel: Number(row.min_reorder_level ?? row.reorderLevel ?? 10),
    min_reorder_level: Number(row.min_reorder_level ?? row.reorderLevel ?? 10),
    totalPurchasedQty: Number(row.total_purchased_qty ?? row.current_stock ?? 0),
    lastUpdated: row.last_updated || row.updated_at || new Date().toISOString(),
    barcode: row.barcode || '',
  };
}

function mapPackagingRow(row: any): PackagingMaterial {
  return {
    id: String(row.id),
    code: row.code || `PKG-${String(row.id).slice(-4)}`,
    name: row.name || 'Emballage',
    category: row.category || 'Boxes',
    unit_type: row.unit_type || row.unit || 'piece',
    central_stock_qty: Number(row.central_stock_qty ?? row.stock_qty ?? 0),
    min_alert_qty: Number(row.min_alert_qty ?? 100),
    unit_cost: Number(row.unit_cost ?? 0),
  };
}

function mapAdjustmentRow(row: any): InventoryAdjustment {
  return {
    id: String(row.id),
    raw_material_id: row.raw_material_id,
    raw_material_name: row.raw_material_name,
    unit: row.unit,
    quantity_removed: Number(row.quantity_removed ?? 0),
    unit_cost_at_time: Number(row.unit_cost_at_time ?? 0),
    total_loss_value: Number(row.total_loss_value ?? 0),
    reason_category: (row.reason_category as DestockingReasonCategory) || 'INVENTORY_CORRECTION',
    notes: row.notes || '',
    created_by: row.created_by || 'Responsable Stock',
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapActivityLogRow(row: any): ActivityLogItem {
  return {
    id: String(row.id),
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    type: row.type || 'SYSTEM_EVENT',
    title: row.title || 'Activité Système',
    description: row.description || '',
    actor: row.actor || 'Système',
    severity: row.severity || 'info',
    metadata: row.metadata || {},
  };
}

export function useInventory(): UseInventoryReturn {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => getRawMaterials());
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingMaterial[]>(() => getPackagingMaterials());
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustment[]>(() => getInventoryAdjustments());
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => getActivityLogs());
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);

  // Initial full fetch via .select('*')
  const refreshInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch raw_materials
      const { data: rawData, error: rawError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');

      if (!rawError && rawData) {
        const mappedRaw = rawData.map(mapRawMaterialRow);
        setRawMaterials(mappedRaw);
        saveRawMaterials(mappedRaw);
      }

      // 2. Fetch packaging materials (support both 'packaging_materials' and 'emballages' table names)
      let pkgMapped: PackagingMaterial[] = [];
      const { data: pkgData, error: pkgError } = await supabase
        .from('packaging_materials')
        .select('*')
        .order('name');

      if (!pkgError && pkgData) {
        pkgMapped = pkgData.map(mapPackagingRow);
      } else {
        const { data: emballageData } = await supabase.from('emballages').select('*').order('name');
        if (emballageData) {
          pkgMapped = emballageData.map(mapPackagingRow);
        }
      }

      if (pkgMapped.length > 0) {
        setPackagingMaterials(pkgMapped);
        savePackagingMaterials(pkgMapped);
      }

      // 3. Fetch inventory_adjustments
      const { data: adjData, error: adjError } = await supabase
        .from('inventory_adjustments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!adjError && adjData) {
        const mappedAdj = adjData.map(mapAdjustmentRow);
        setInventoryAdjustments(mappedAdj);
      }

      // 4. Fetch activity_logs
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!logError && logData) {
        const mappedLogs = logData.map(mapActivityLogRow);
        setActivityLogs(mappedLogs);
      }
    } catch (err: any) {
      console.warn('Live Supabase inventory fetch warning:', err);
      setError(err?.message || 'Erreur de synchronisation Supabase');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Supabase Realtime Channel Subscription
  useEffect(() => {
    isMountedRef.current = true;
    refreshInventory();

    const channelId = `live-inventory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      // 1. Raw Materials Realtime changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raw_materials' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapRawMaterialRow(payload.new);
            setRawMaterials((prev) => {
              const exists = prev.some((item) => item.id === newItem.id);
              const next = exists ? prev.map((item) => (item.id === newItem.id ? newItem : item)) : [newItem, ...prev];
              saveRawMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRawMaterialRow(payload.new);
            setRawMaterials((prev) => {
              const next = prev.map((item) => (item.id === updated.id ? updated : item));
              saveRawMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            setRawMaterials((prev) => {
              const next = prev.filter((item) => item.id !== deletedId);
              saveRawMaterials(next);
              return next;
            });
          }
          notifyListeners();
        }
      )
      // 2. Packaging Materials / Emballages Realtime changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'packaging_materials' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapPackagingRow(payload.new);
            setPackagingMaterials((prev) => {
              const exists = prev.some((item) => item.id === newItem.id);
              const next = exists ? prev.map((item) => (item.id === newItem.id ? newItem : item)) : [newItem, ...prev];
              savePackagingMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapPackagingRow(payload.new);
            setPackagingMaterials((prev) => {
              const next = prev.map((item) => (item.id === updated.id ? updated : item));
              savePackagingMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            setPackagingMaterials((prev) => {
              const next = prev.filter((item) => item.id !== deletedId);
              savePackagingMaterials(next);
              return next;
            });
          }
          notifyListeners();
        }
      )
      // 3. Emballages alias table (if present)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emballages' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updated = mapPackagingRow(payload.new);
            setPackagingMaterials((prev) => {
              const exists = prev.some((item) => item.id === updated.id);
              const next = exists ? prev.map((item) => (item.id === updated.id ? updated : item)) : [updated, ...prev];
              savePackagingMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            setPackagingMaterials((prev) => {
              const next = prev.filter((item) => item.id !== deletedId);
              savePackagingMaterials(next);
              return next;
            });
          }
          notifyListeners();
        }
      )
      // 4. Inventory Adjustments Realtime changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_adjustments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAdj = mapAdjustmentRow(payload.new);
            setInventoryAdjustments((prev) => [newAdj, ...prev.filter((a) => a.id !== newAdj.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapAdjustmentRow(payload.new);
            setInventoryAdjustments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            setInventoryAdjustments((prev) => prev.filter((a) => a.id !== deletedId));
          }
          notifyListeners();
        }
      )
      // 5. Activity Logs Realtime changes
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = mapActivityLogRow(payload.new);
            setActivityLogs((prev) => [newLog, ...prev.filter((l) => l.id !== newLog.id)]);
          }
          notifyListeners();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsRealtimeConnected(false);
        }
      });

    return () => {
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [refreshInventory]);

  // Mutations
  const upsertRawMaterial = useCallback(
    async (material: Partial<RawMaterial> & { name: string }): Promise<RawMaterial> => {
      const id = material.id || `rm-${Date.now()}`;
      const sku = material.sku || `SKU-${Date.now().toString().slice(-6)}`;
      const unit = material.unit || 'kg';
      const category = material.category || 'Other';
      const currentStock = Number(material.currentStock ?? 0);
      const currentAvgCost = Number(material.currentAvgCost ?? 0);
      const minReorderLevel = Number(material.min_reorder_level ?? material.reorderLevel ?? 10);
      const barcode = material.barcode || null;
      const lastUpdated = new Date().toISOString();

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

      let saved: RawMaterial = {
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
          saved = mapRawMaterialRow(data);
        }
      } catch (err) {
        console.warn('Upsert raw material live Supabase note:', err);
      }

      // Optimistic local state update
      setRawMaterials((prev) => {
        const exists = prev.some((m) => m.id === saved.id);
        const next = exists ? prev.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...prev];
        saveRawMaterials(next);
        return next;
      });

      return saved;
    },
    []
  );

  const deleteRawMaterial = useCallback(async (id: string): Promise<void> => {
    try {
      await supabase.from('raw_materials').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete raw material live Supabase note:', err);
    }

    setRawMaterials((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveRawMaterials(next);
      return next;
    });
  }, []);

  const createInventoryAdjustment = useCallback(
    async (adj: Omit<InventoryAdjustment, 'id' | 'created_at'>): Promise<InventoryAdjustment> => {
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
        created_by: adj.created_by || 'Responsable Stock',
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
          created_by: adj.created_by || 'Responsable Stock',
          created_at: createdAt,
        };

        const { data, error } = await supabase
          .from('inventory_adjustments')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          savedAdj = mapAdjustmentRow(data);
        }
      } catch (err) {
        console.warn('Insert inventory adjustment live Supabase note:', err);
      }

      setInventoryAdjustments((prev) => [savedAdj, ...prev.filter((a) => a.id !== savedAdj.id)]);
      return savedAdj;
    },
    []
  );

  const upsertPackaging = useCallback(
    async (pkg: Partial<PackagingMaterial> & { name: string }): Promise<PackagingMaterial> => {
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
        const payload = {
          id,
          code,
          name: pkg.name,
          category,
          unit_type: unitType,
          unit: unitType,
          central_stock_qty: centralStockQty,
          min_alert_qty: minAlertQty,
          unit_cost: unitCost,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('packaging_materials')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!error && data) {
          savedPkg = mapPackagingRow(data);
        }
      } catch (err) {
        console.warn('Upsert packaging material live Supabase note:', err);
      }

      setPackagingMaterials((prev) => {
        const exists = prev.some((p) => p.id === savedPkg.id);
        const next = exists ? prev.map((p) => (p.id === savedPkg.id ? savedPkg : p)) : [savedPkg, ...prev];
        savePackagingMaterials(next);
        return next;
      });

      return savedPkg;
    },
    []
  );

  const deletePackaging = useCallback(async (id: string): Promise<void> => {
    try {
      await supabase.from('packaging_materials').delete().eq('id', id);
    } catch (err) {
      console.warn('Delete packaging material live Supabase note:', err);
    }

    setPackagingMaterials((prev) => {
      const next = prev.filter((p) => p.id !== id);
      savePackagingMaterials(next);
      return next;
    });
  }, []);

  return {
    rawMaterials,
    packagingMaterials,
    inventoryAdjustments,
    activityLogs,
    loading,
    isRealtimeConnected,
    error,
    refreshInventory,
    upsertRawMaterial,
    deleteRawMaterial,
    createInventoryAdjustment,
    upsertPackaging,
    deletePackaging,
  };
}
