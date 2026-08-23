import { 
  subscribeCollectionFromFirestore, 
  syncToFirestore, 
  batchSyncToFirestore,
  fetchCollectionFromFirestore 
} from '../lib/firebaseSync';
import { queryClient } from './queryClient';
import { syncOfflineQueue } from './indexedDbQueue';
import { backgroundSyncService } from './backgroundSync';
import {
  getRawMaterials,
  setRawMaterials,
  getProductionBatches,
  setProductionBatches,
  getRecipes,
  getRequisitions,
  getSemiFinishedStock,
  saveSemiFinishedStock,
  getRetailStoreStock,
  saveRetailStoreStock,
  getPackagingMaterials,
  savePackagingMaterials,
  addActivityLog,
  notifyListeners,
  notifyToast
} from './storage';
import { RawMaterial, ProductionBatch, Recipe, Requisition, SemiFinishedStockItem, RetailStoreStock, PackagingMaterial } from '../types';
import { useQuery, useMutation } from '@tanstack/react-query';

let isRealtimeSyncActive = false;
const unsubscribers: (() => void)[] = [];

const AUTO_SYNC_ENABLED_KEY = 'delice_auto_background_sync_enabled';

export function getAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(AUTO_SYNC_ENABLED_KEY);
  return val !== null ? val === 'true' : true;
}

export function setAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    backgroundSyncService.start();
  } else {
    backgroundSyncService.stop();
  }
  notifyListeners();
  notifyToast({
    type: 'info',
    title: enabled ? 'Auto-Sync Activée' : 'Auto-Sync Suspendue',
    message: enabled 
      ? 'La synchronisation continue en arrière-plan des stocks est active.'
      : 'Synchronisation automatique en pause. Vous pouvez lancer un rafraîchissement manuel à tout moment.'
  });
}

export interface ForceRefreshProgress {
  step: string;
  percent: number;
  collectionName?: string;
  itemCount?: number;
}

export interface ForceRefreshResult {
  success: boolean;
  syncedOfflineCount: number;
  collectionsUpdated: Array<{ name: string; count: number }>;
  totalItems: number;
  timestamp: string;
  error?: string;
}

/**
 * Manually force a comprehensive background refresh of all inventory datasets from Cloud Firestore & local cache.
 * Pushes pending offline mutations, re-syncs stock master data, invalidates TanStack Query cache, and fires notifications.
 */
export async function forceRefreshInventoryData(
  onProgress?: (progress: ForceRefreshProgress) => void
): Promise<ForceRefreshResult> {
  const timestamp = new Date().toISOString();
  const collectionsUpdated: Array<{ name: string; count: number }> = [];
  let totalItemsCount = 0;
  let offlineSynced = 0;

  try {
    // Step 1: Push pending offline mutations (IndexedDB queue)
    onProgress?.({
      step: "Vérification et transmission de la file d'attente hors ligne...",
      percent: 15
    });
    const offlineResult = await syncOfflineQueue();
    offlineSynced = offlineResult.synced;

    // Artificial tiny pause for smooth progress animation perception
    await new Promise((r) => setTimeout(r, 220));

    // Step 2: Refresh Raw Materials Stock (Stock Matières Premières)
    onProgress?.({
      step: "Synchronisation du stock Matières Premières...",
      percent: 35,
      collectionName: 'raw_materials'
    });
    try {
      const cloudMaterials = await fetchCollectionFromFirestore<RawMaterial>('raw_materials');
      if (cloudMaterials && cloudMaterials.length > 0) {
        setRawMaterials(cloudMaterials);
        queryClient.setQueryData(['raw_materials'], cloudMaterials);
        collectionsUpdated.push({ name: 'Stock Matières Premières', count: cloudMaterials.length });
        totalItemsCount += cloudMaterials.length;
      } else {
        const local = getRawMaterials();
        if (local.length > 0) {
          await batchSyncToFirestore('raw_materials', local);
          collectionsUpdated.push({ name: 'Stock Matières Premières (Local Master)', count: local.length });
          totalItemsCount += local.length;
        }
      }
    } catch (err) {
      console.warn('Force refresh raw materials note:', err);
    }

    await new Promise((r) => setTimeout(r, 220));

    // Step 3: Refresh Production Batches & Fiches de Production
    onProgress?.({
      step: "Actualisation des fiches de production & lots en cours...",
      percent: 55,
      collectionName: 'production_batches'
    });
    try {
      const cloudBatches = await fetchCollectionFromFirestore<ProductionBatch>('production_batches');
      if (cloudBatches && cloudBatches.length > 0) {
        setProductionBatches(cloudBatches);
        queryClient.setQueryData(['production_batches'], cloudBatches);
        collectionsUpdated.push({ name: 'Fiches de Production', count: cloudBatches.length });
        totalItemsCount += cloudBatches.length;
      } else {
        const localBatches = getProductionBatches();
        if (localBatches.length > 0) {
          await batchSyncToFirestore('production_batches', localBatches);
          collectionsUpdated.push({ name: 'Fiches de Production (Local)', count: localBatches.length });
          totalItemsCount += localBatches.length;
        }
      }
    } catch (err) {
      console.warn('Force refresh production batches note:', err);
    }

    await new Promise((r) => setTimeout(r, 220));

    // Step 4: Refresh Technical Recipes & Semi-Finished Items
    onProgress?.({
      step: "Mise à jour des fiches techniques & produits semi-finis...",
      percent: 75,
      collectionName: 'recipes'
    });
    try {
      const cloudRecipes = await fetchCollectionFromFirestore<Recipe>('recipes');
      if (cloudRecipes && cloudRecipes.length > 0) {
        localStorage.setItem('delice_recipes_v1', JSON.stringify(cloudRecipes));
        queryClient.setQueryData(['recipes'], cloudRecipes);
        collectionsUpdated.push({ name: 'Fiches Techniques & Recettes', count: cloudRecipes.length });
        totalItemsCount += cloudRecipes.length;
      }
      const cloudSf = await fetchCollectionFromFirestore<SemiFinishedStockItem>('semi_finished_stock');
      if (cloudSf && cloudSf.length > 0) {
        saveSemiFinishedStock(cloudSf);
        queryClient.setQueryData(['semi_finished_stock'], cloudSf);
        collectionsUpdated.push({ name: 'Produits Semi-Finis', count: cloudSf.length });
        totalItemsCount += cloudSf.length;
      }
    } catch (err) {
      console.warn('Force refresh recipes note:', err);
    }

    await new Promise((r) => setTimeout(r, 200));

    // Step 5: Refresh Store Requisitions & Packaging Stock
    onProgress?.({
      step: "Actualisation des demandes magasins & stocks emballages...",
      percent: 90,
      collectionName: 'store_requisitions'
    });
    try {
      const cloudReqs = await fetchCollectionFromFirestore<Requisition>('store_requisitions');
      if (cloudReqs && cloudReqs.length > 0) {
        localStorage.setItem('delice_requisitions_v1', JSON.stringify(cloudReqs));
        queryClient.setQueryData(['requisitions'], cloudReqs);
        collectionsUpdated.push({ name: 'Demandes & Réquisitions Magasins', count: cloudReqs.length });
        totalItemsCount += cloudReqs.length;
      }
      const cloudPkg = await fetchCollectionFromFirestore<PackagingMaterial>('packaging_materials');
      if (cloudPkg && cloudPkg.length > 0) {
        savePackagingMaterials(cloudPkg);
        queryClient.setQueryData(['packaging_materials'], cloudPkg);
        collectionsUpdated.push({ name: 'Stock Emballages & Packaging', count: cloudPkg.length });
        totalItemsCount += cloudPkg.length;
      }
    } catch (err) {
      console.warn('Force refresh requisitions/packaging note:', err);
    }

    // Step 6: Invalidate TanStack query cache and emit global notifications
    queryClient.invalidateQueries();
    notifyListeners();

    // Log Activity Feed
    addActivityLog({
      type: 'SYSTEM_EVENT',
      title: 'Rafraîchissement Manuel des Stocks',
      description: `Synchronisation forcée exécutée avec succès (${totalItemsCount} éléments d'inventaire actualisés, ${offlineSynced} transactions hors-ligne transmises).`,
      actor: 'Utilisateur Actif / Paramètres',
      badgeText: 'CLOUD SYNC',
      severity: 'success',
      metadata: {
        itemCount: totalItemsCount,
        notes: `Transactions hors-ligne transmises: ${offlineSynced} à ${timestamp}`
      }
    });

    onProgress?.({
      step: "Synchronisation terminée avec succès !",
      percent: 100
    });

    notifyToast({
      type: 'success',
      title: 'Inventaire Actualisé',
      message: `${totalItemsCount} éléments d'inventaire synchronisés avec succès.`
    });

    return {
      success: true,
      syncedOfflineCount: offlineSynced,
      collectionsUpdated,
      totalItems: totalItemsCount,
      timestamp
    };
  } catch (err: any) {
    console.error('Force refresh inventory data error:', err);
    const errorMsg = err?.message || 'Erreur lors du rafraîchissement des données';
    onProgress?.({
      step: `Erreur : ${errorMsg}`,
      percent: 100
    });
    notifyToast({
      type: 'error',
      title: 'Échec de Synchronisation',
      message: errorMsg
    });
    return {
      success: false,
      syncedOfflineCount: offlineSynced,
      collectionsUpdated,
      totalItems: totalItemsCount,
      timestamp,
      error: errorMsg
    };
  }
}

/**
 * Initializes bidirectional real-time listeners between Firestore and local client state.
 * When data is modified on PC or Android, changes reflect instantly across all devices.
 */
export function initRealtimeCloudSync() {
  if (isRealtimeSyncActive) return;
  isRealtimeSyncActive = true;

  console.log('[RealtimeSync] Initializing real-time cloud sync listeners for Stock and Production...');

  // 1. Real-time listener for "Stock Matières Premières" (raw_materials)
  try {
    const unsubRawMaterials = subscribeCollectionFromFirestore<RawMaterial>('raw_materials', (cloudMaterials) => {
      if (cloudMaterials && cloudMaterials.length > 0) {
        // Merge cloud updates into storage
        setRawMaterials(cloudMaterials);
        // Invalidate and update TanStack Query cache
        queryClient.setQueryData(['raw_materials'], cloudMaterials);
        queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
        notifyListeners();
        console.log(`[RealtimeSync] Raw materials synced from cloud: ${cloudMaterials.length} items.`);
      } else {
        // If cloud is empty initially, seed with current local master raw materials
        const localMaterials = getRawMaterials();
        if (localMaterials.length > 0) {
          batchSyncToFirestore('raw_materials', localMaterials);
        }
      }
    });
    unsubscribers.push(unsubRawMaterials);
  } catch (err) {
    console.warn('[RealtimeSync] Raw materials listener error:', err);
  }

  // 2. Real-time listener for "Fiche de Production" (production_batches)
  try {
    const unsubBatches = subscribeCollectionFromFirestore<ProductionBatch>('production_batches', (cloudBatches) => {
      if (cloudBatches && cloudBatches.length > 0) {
        setProductionBatches(cloudBatches);
        queryClient.setQueryData(['production_batches'], cloudBatches);
        queryClient.invalidateQueries({ queryKey: ['production_batches'] });
        notifyListeners();
        console.log(`[RealtimeSync] Production batches synced from cloud: ${cloudBatches.length} items.`);
      } else {
        const localBatches = getProductionBatches();
        if (localBatches.length > 0) {
          batchSyncToFirestore('production_batches', localBatches);
        }
      }
    });
    unsubscribers.push(unsubBatches);
  } catch (err) {
    console.warn('[RealtimeSync] Production batches listener error:', err);
  }

  // 3. Real-time listener for "Fiches Techniques / Recettes" (recipes)
  try {
    const unsubRecipes = subscribeCollectionFromFirestore<Recipe>('recipes', (cloudRecipes) => {
      if (cloudRecipes && cloudRecipes.length > 0) {
        queryClient.setQueryData(['recipes'], cloudRecipes);
        queryClient.invalidateQueries({ queryKey: ['recipes'] });
        notifyListeners();
      } else {
        const localRecipes = getRecipes();
        if (localRecipes.length > 0) {
          batchSyncToFirestore('recipes', localRecipes);
        }
      }
    });
    unsubscribers.push(unsubRecipes);
  } catch (err) {
    console.warn('[RealtimeSync] Recipes listener error:', err);
  }

  // 4. Real-time listener for "Demandes Magasins" (store_requisitions)
  try {
    const unsubReqs = subscribeCollectionFromFirestore<Requisition>('store_requisitions', (cloudReqs) => {
      if (cloudReqs && cloudReqs.length > 0) {
        queryClient.setQueryData(['requisitions'], cloudReqs);
        queryClient.invalidateQueries({ queryKey: ['requisitions'] });
        notifyListeners();
      }
    });
    unsubscribers.push(unsubReqs);
  } catch (err) {
    console.warn('[RealtimeSync] Requisitions listener error:', err);
  }
}

/**
 * Cleanup listeners if needed
 */
export function stopRealtimeCloudSync() {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers.length = 0;
  isRealtimeSyncActive = false;
}

// ----------------------------------------------------
// Custom TanStack React Query Hooks for Real-Time Data
// ----------------------------------------------------

/**
 * Hook for Stock Matières Premières with real-time cloud sync and offline persistence
 */
export function useRawMaterialsQuery() {
  return useQuery<RawMaterial[]>({
    queryKey: ['raw_materials'],
    queryFn: async () => {
      return getRawMaterials();
    },
    initialData: getRawMaterials(),
  });
}

/**
 * Hook for Fiche de Production Batches with real-time cloud sync and offline persistence
 */
export function useProductionBatchesQuery() {
  return useQuery<ProductionBatch[]>({
    queryKey: ['production_batches'],
    queryFn: async () => {
      return getProductionBatches();
    },
    initialData: getProductionBatches(),
  });
}

/**
 * Hook for Recipes / Fiches Techniques with real-time cloud sync and offline persistence
 */
export function useRecipesQuery() {
  return useQuery<Recipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      return getRecipes();
    },
    initialData: getRecipes(),
  });
}

/**
 * Hook for Store Requisitions with real-time cloud sync and offline persistence
 */
export function useRequisitionsQuery() {
  return useQuery<Requisition[]>({
    queryKey: ['requisitions'],
    queryFn: async () => {
      return getRequisitions();
    },
    initialData: getRequisitions(),
  });
}
