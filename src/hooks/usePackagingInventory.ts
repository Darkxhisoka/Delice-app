import { useState, useEffect, useCallback } from 'react';
import { PackagingMaterial } from '../types';
import {
  fetchPackagingMaterialsFromSupabase,
  upsertPackagingMaterialToSupabase,
  deletePackagingMaterialFromSupabase
} from '../services/supabaseService';
import { getPackagingMaterials } from '../services/storage';

export interface UsePackagingInventoryReturn {
  materials: PackagingMaterial[];
  loading: boolean;
  error: string | null;
  refetchPackagingInventory: () => Promise<PackagingMaterial[]>;
  savePackagingItem: (item: Partial<PackagingMaterial> & { name: string }) => Promise<PackagingMaterial>;
  deletePackagingItem: (id: string) => Promise<void>;
}

export function usePackagingInventory(): UsePackagingInventoryReturn {
  const [materials, setMaterials] = useState<PackagingMaterial[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetchPackagingInventory = useCallback(async (): Promise<PackagingMaterial[]> => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchPackagingMaterialsFromSupabase();
      if (fetched && fetched.length > 0) {
        setMaterials(fetched);
        return fetched;
      } else {
        const local = getPackagingMaterials();
        setMaterials(local);
        return local;
      }
    } catch (err: any) {
      console.warn('Error fetching packaging materials from Supabase:', err);
      setError(err.message || 'Erreur de chargement du stock d\'emballage');
      const local = getPackagingMaterials();
      setMaterials(local);
      return local;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchPackagingInventory();
  }, [refetchPackagingInventory]);

  const savePackagingItem = useCallback(
    async (item: Partial<PackagingMaterial> & { name: string }): Promise<PackagingMaterial> => {
      try {
        const saved = await upsertPackagingMaterialToSupabase(item);
        // Immediately re-fetch from Supabase to update state & table
        await refetchPackagingInventory();
        return saved;
      } catch (err: any) {
        console.error('Error saving packaging item:', err);
        throw err;
      }
    },
    [refetchPackagingInventory]
  );

  const deletePackagingItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deletePackagingMaterialFromSupabase(id);
        // Immediately re-fetch from Supabase
        await refetchPackagingInventory();
      } catch (err: any) {
        console.error('Error deleting packaging item:', err);
        throw err;
      }
    },
    [refetchPackagingInventory]
  );

  return {
    materials,
    loading,
    error,
    refetchPackagingInventory,
    savePackagingItem,
    deletePackagingItem,
  };
}
