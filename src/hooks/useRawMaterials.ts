import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { RawMaterial } from '../types';
import { getRawMaterials, saveRawMaterials, notifyListeners } from '../services/storage';

export interface UseRawMaterialsReturn {
  rawMaterials: RawMaterial[];
  loading: boolean;
  isRealtimeConnected: boolean;
  error: string | null;
  refetchRawMaterials: () => Promise<RawMaterial[]>;
  saveRawMaterial: (material: Partial<RawMaterial> & { name: string }) => Promise<RawMaterial>;
  deleteRawMaterial: (id: string) => Promise<void>;
}

function mapRawMaterial(row: any): RawMaterial {
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

export function useRawMaterials(): UseRawMaterialsReturn {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => getRawMaterials());
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const refetchRawMaterials = useCallback(async (): Promise<RawMaterial[]> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supaErr } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name');

      if (supaErr) {
        throw supaErr;
      }

      if (data) {
        const mapped = data.map(mapRawMaterial);
        setRawMaterials(mapped);
        saveRawMaterials(mapped);
        return mapped;
      }
      return [];
    } catch (err: any) {
      console.warn('Supabase raw_materials fetch warning:', err);
      setError(err?.message || 'Erreur de chargement des matières premières');
      const fallback = getRawMaterials();
      setRawMaterials(fallback);
      return fallback;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refetchRawMaterials();

    const channelName = `live-rm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raw_materials' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = mapRawMaterial(payload.new);
            setRawMaterials((prev) => {
              const exists = prev.some((m) => m.id === newItem.id);
              const next = exists ? prev.map((m) => (m.id === newItem.id ? newItem : m)) : [newItem, ...prev];
              saveRawMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRawMaterial(payload.new);
            setRawMaterials((prev) => {
              const next = prev.map((m) => (m.id === updated.id ? updated : m));
              saveRawMaterials(next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            setRawMaterials((prev) => {
              const next = prev.filter((m) => m.id !== deletedId);
              saveRawMaterials(next);
              return next;
            });
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
  }, [refetchRawMaterials]);

  const saveRawMaterial = useCallback(
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
        const { data, error: supaErr } = await supabase
          .from('raw_materials')
          .upsert(payload, { onConflict: 'id' })
          .select()
          .single();

        if (!supaErr && data) {
          saved = mapRawMaterial(data);
        }
      } catch (err) {
        console.warn('Upsert raw material note:', err);
      }

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
      console.warn('Delete raw material note:', err);
    }

    setRawMaterials((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveRawMaterials(next);
      return next;
    });
  }, []);

  return {
    rawMaterials,
    loading,
    isRealtimeConnected,
    error,
    refetchRawMaterials,
    saveRawMaterial,
    deleteRawMaterial,
  };
}
