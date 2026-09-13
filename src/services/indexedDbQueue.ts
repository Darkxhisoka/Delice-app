/**
 * IndexedDB Offline-First Queue Manager for Patisserie Delice Central Lab
 * Utilizes the native Browser Storage IndexedDB API to ensure:
 * 1. Store requisitions and inventory logs are stored locally when offline
 * 2. Automatic background synchronization once internet connectivity is re-established
 * 3. Atomic local queue inspection, manual sync triggers, and retry mechanisms
 */

import {
  Requisition,
  RequisitionStatus,
  InventoryAdjustment,
  RawMaterial,
  Receipt,
  SaleTransaction
} from '../types';
import { syncToFirestore } from '../lib/firebaseSync';
import {
  insertRequisitionToSupabase,
  updateRequisitionStatusInSupabase,
  insertInventoryAdjustmentToSupabase,
  upsertRawMaterialToSupabase
} from './supabaseService';
import {
  markOfflineRecordSynced,
  saveCartTransactionOffline,
  saveInventoryAdjustmentOffline,
  saveReceiptOffline
} from './sqliteStorage';

export type QueueEntityType =
  | 'CART_TRANSACTION'
  | 'REQUISITION'
  | 'INVENTORY_ADJUSTMENT'
  | 'RECEIPT'
  | 'RAW_MATERIAL_STOCK'
  | 'PACKAGING_ADJUSTMENT';

export type QueueActionType =
  | 'CREATE'
  | 'UPDATE_STATUS'
  | 'UPSERT'
  | 'DELETE';

export type QueueItemStatus =
  | 'PENDING'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED';

export interface OfflineQueueItem {
  id: string;
  entityType: QueueEntityType;
  actionType: QueueActionType;
  entityId: string;
  label: string;
  description: string;
  payload: any;
  status: QueueItemStatus;
  firebaseCollection: string;
  firebaseStatus: QueueItemStatus;
  supabaseStatus: QueueItemStatus;
  checksum: string;
  targetDocId: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string | null;
  createdAt: string;
  syncedAt?: string | null;
  lastAttemptAt?: string | null;
}

export interface DataIntegrityReport {
  timestamp: string;
  totalRecordsChecked: number;
  validChecksums: number;
  corruptedRecords: number;
  pendingSync: number;
  syncedToFirebase: number;
  syncedToSupabase: number;
  integrityScorePercent: number;
  storageUsageBytesApprox: number;
  collections: {
    name: string;
    localCount: number;
    pendingCount: number;
    syncedCount: number;
    health: 'OPTIMAL' | 'PENDING_SYNC' | 'ATTENTION';
  }[];
  integrityStatus: 'PERFECT' | 'PENDING_RECONCILIATION' | 'DEGRADED';
}

export type SyncItemStage = 'STARTING' | 'SYNCING' | 'VALIDATING' | 'SYNCED' | 'FAILED';

export interface SyncProgressInfo {
  current: number;
  total: number;
  item: OfflineQueueItem;
  activeItemId: string;
  stage: SyncItemStage;
  success?: boolean;
  stepMessage?: string;
}

export interface OfflineSyncStats {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  totalCount: number;
  lastSyncTimestamp: string | null;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
  activeItemId?: string | null;
}

const DB_NAME = 'DelicePastryLabOfflineDB';
const DB_VERSION = 1;

const STORES = {
  OFFLINE_QUEUE: 'offline_queue',
  LOCAL_REQUISITIONS: 'local_requisitions',
  LOCAL_INVENTORY_LOGS: 'local_inventory_logs',
  LOCAL_RAW_MATERIALS: 'local_raw_materials',
  SYNC_METADATA: 'sync_metadata'
} as const;

// Global memory cache & listener state
type QueueListener = (stats: OfflineSyncStats) => void;
const queueListeners: Set<QueueListener> = new Set();
let isSimulatedOfflineState = false;
let isCurrentlySyncing = false;
let activeSyncingItemId: string | null = null;

/**
 * Open or initialize the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Offline Queue Store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_entityType', 'entityType', { unique: false });
        queueStore.createIndex('by_createdAt', 'createdAt', { unique: false });
      }

      // 2. Local Requisitions Cache
      if (!db.objectStoreNames.contains(STORES.LOCAL_REQUISITIONS)) {
        const reqStore = db.createObjectStore(STORES.LOCAL_REQUISITIONS, { keyPath: 'id' });
        reqStore.createIndex('by_storeId', 'storeId', { unique: false });
        reqStore.createIndex('by_status', 'status', { unique: false });
      }

      // 3. Local Inventory Logs Cache (Adjustments & Destocking)
      if (!db.objectStoreNames.contains(STORES.LOCAL_INVENTORY_LOGS)) {
        const logStore = db.createObjectStore(STORES.LOCAL_INVENTORY_LOGS, { keyPath: 'id' });
        logStore.createIndex('by_materialId', 'raw_material_id', { unique: false });
        logStore.createIndex('by_date', 'created_at', { unique: false });
      }

      // 4. Local Raw Materials Cache
      if (!db.objectStoreNames.contains(STORES.LOCAL_RAW_MATERIALS)) {
        db.createObjectStore(STORES.LOCAL_RAW_MATERIALS, { keyPath: 'id' });
      }

      // 5. Sync Metadata
      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Generic helper to run a transaction
 */
async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      let result: any;
      Promise.resolve(callback(store))
        .then((res) => {
          result = res;
        })
        .catch(reject);

      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error(`Transaction failed on store ${storeName}`));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error(`Transaction aborted on store ${storeName}`));
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Check if the application is currently offline (real or simulated)
 */
export function isAppOffline(): boolean {
  if (isSimulatedOfflineState) return true;
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return !navigator.onLine;
  }
  return false;
}

/**
 * Set simulated offline state for live testing
 */
export function setSimulatedOffline(offline: boolean) {
  isSimulatedOfflineState = offline;
  notifyStatsUpdate();
  if (!offline && typeof window !== 'undefined' && navigator.onLine) {
    syncOfflineQueue();
  }
}

export function getIsSimulatedOffline(): boolean {
  return isSimulatedOfflineState;
}

/**
 * Calculate deterministic lightweight checksum for a JSON payload to guarantee data integrity
 */
export function calculatePayloadChecksum(payload: any): string {
  try {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `chk-${hex}`;
  } catch {
    return `chk-${Date.now().toString(16)}`;
  }
}

/**
 * Determine the target Firebase collection based on entity type
 */
export function getFirebaseCollectionForEntity(entityType: QueueEntityType): string {
  switch (entityType) {
    case 'CART_TRANSACTION':
      return 'sale_transactions';
    case 'REQUISITION':
      return 'store_requisitions';
    case 'INVENTORY_ADJUSTMENT':
      return 'inventory_adjustments';
    case 'RECEIPT':
      return 'receipts';
    case 'RAW_MATERIAL_STOCK':
      return 'raw_materials';
    case 'PACKAGING_ADJUSTMENT':
      return 'packaging_stock';
    default:
      return 'offline_synced_logs';
  }
}

/**
 * Add a new item to the IndexedDB Offline Queue
 */
export async function enqueueOfflineAction(params: {
  entityType: QueueEntityType;
  actionType: QueueActionType;
  entityId: string;
  label: string;
  description: string;
  payload: any;
}): Promise<OfflineQueueItem> {
  const now = new Date().toISOString();
  const firebaseCollection = getFirebaseCollectionForEntity(params.entityType);
  const checksum = calculatePayloadChecksum(params.payload);
  const targetDocId = params.payload?.id || params.entityId;

  const queueItem: OfflineQueueItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    entityType: params.entityType,
    actionType: params.actionType,
    entityId: params.entityId,
    label: params.label,
    description: params.description,
    payload: params.payload,
    status: 'PENDING',
    firebaseCollection,
    firebaseStatus: 'PENDING',
    supabaseStatus: 'PENDING',
    checksum,
    targetDocId,
    retryCount: 0,
    maxRetries: 5,
    errorMessage: null,
    createdAt: now,
    lastAttemptAt: null,
    syncedAt: null
  };

  // 1. Save to offline_queue store in IndexedDB
  await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
    store.put(queueItem);
  });

  // 2. Also cache in the appropriate entity store and SQLite for instant offline UI reads
  try {
    if (params.entityType === 'CART_TRANSACTION') {
      await saveCartTransactionOffline(params.payload, 'PENDING');
    } else if (params.entityType === 'INVENTORY_ADJUSTMENT') {
      await saveInventoryAdjustmentOffline(params.payload, 'PENDING');
      await withTransaction(STORES.LOCAL_INVENTORY_LOGS, 'readwrite', (store) => {
        store.put(params.payload);
      });
    } else if (params.entityType === 'RECEIPT') {
      await saveReceiptOffline(params.payload, 'PENDING');
    } else if (params.entityType === 'REQUISITION') {
      await withTransaction(STORES.LOCAL_REQUISITIONS, 'readwrite', (store) => {
        store.put(params.payload);
      });
    } else if (params.entityType === 'RAW_MATERIAL_STOCK') {
      await withTransaction(STORES.LOCAL_RAW_MATERIALS, 'readwrite', (store) => {
        store.put(params.payload);
      });
    }
  } catch (cacheErr) {
    console.warn('IndexedDB/SQLite secondary cache update notice:', cacheErr);
  }

  notifyStatsUpdate();

  // If we are actually online and not simulating offline, attempt background sync immediately
  if (!isAppOffline()) {
    setTimeout(() => {
      syncOfflineQueue().catch(console.error);
    }, 100);
  }

  return queueItem;
}

/**
 * Get all items from the IndexedDB offline queue
 */
export async function getAllQueueItems(): Promise<OfflineQueueItem[]> {
  try {
    return await withTransaction(STORES.OFFLINE_QUEUE, 'readonly', (store) => {
      return new Promise<OfflineQueueItem[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const items = (request.result || []) as OfflineQueueItem[];
          // Sort newest first
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    });
  } catch (err) {
    console.error('Failed to get items from IndexedDB queue:', err);
    return [];
  }
}

/**
 * Get pending and failed items waiting to be synced
 */
export async function getPendingQueueItems(): Promise<OfflineQueueItem[]> {
  const all = await getAllQueueItems();
  return all.filter((item) => item.status === 'PENDING' || item.status === 'FAILED');
}

/**
 * Remove an item from the queue
 */
export async function deleteQueueItem(id: string): Promise<void> {
  await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
    store.delete(id);
  });
  notifyStatsUpdate();
}

/**
 * Clear all successfully synced items from IndexedDB queue
 */
export async function clearSyncedQueueItems(): Promise<number> {
  const all = await getAllQueueItems();
  const syncedIds = all.filter((item) => item.status === 'SYNCED').map((item) => item.id);

  if (syncedIds.length === 0) return 0;

  await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
    syncedIds.forEach((id) => store.delete(id));
  });

  notifyStatsUpdate();
  return syncedIds.length;
}

/**
 * Reset failed items to PENDING so they will be retried
 */
export async function retryFailedQueueItems(): Promise<void> {
  const all = await getAllQueueItems();
  const failed = all.filter((item) => item.status === 'FAILED');

  if (failed.length === 0) return;

  await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
    failed.forEach((item) => {
      item.status = 'PENDING';
      item.errorMessage = null;
      store.put(item);
    });
  });

  notifyStatsUpdate();

  if (!isAppOffline()) {
    syncOfflineQueue().catch(console.error);
  }
}

/**
 * Local Requisition Cache Methods
 */
export async function getCachedRequisitionsFromIndexedDB(): Promise<Requisition[]> {
  try {
    return await withTransaction(STORES.LOCAL_REQUISITIONS, 'readonly', (store) => {
      return new Promise<Requisition[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  } catch (err) {
    console.error('Failed to get cached requisitions from IndexedDB:', err);
    return [];
  }
}

export async function saveRequisitionsToIndexedDBCache(requisitions: Requisition[]): Promise<void> {
  try {
    await withTransaction(STORES.LOCAL_REQUISITIONS, 'readwrite', (store) => {
      requisitions.forEach((req) => store.put(req));
    });
  } catch (err) {
    console.warn('Failed to cache requisitions in IndexedDB:', err);
  }
}

/**
 * Local Inventory Logs Cache Methods
 */
export async function getCachedInventoryLogsFromIndexedDB(): Promise<InventoryAdjustment[]> {
  try {
    return await withTransaction(STORES.LOCAL_INVENTORY_LOGS, 'readonly', (store) => {
      return new Promise<InventoryAdjustment[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const logs = (request.result || []) as InventoryAdjustment[];
          logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          resolve(logs);
        };
        request.onerror = () => reject(request.error);
      });
    });
  } catch (err) {
    console.error('Failed to get cached inventory logs from IndexedDB:', err);
    return [];
  }
}

export async function saveInventoryLogsToIndexedDBCache(logs: InventoryAdjustment[]): Promise<void> {
  try {
    await withTransaction(STORES.LOCAL_INVENTORY_LOGS, 'readwrite', (store) => {
      logs.forEach((log) => store.put(log));
    });
  } catch (err) {
    console.warn('Failed to cache inventory logs in IndexedDB:', err);
  }
}

/**
 * Main Synchronization Engine
 * Processes all pending and failed queue items against Supabase & Firestore
 */
export async function syncOfflineQueue(
  onProgress?: (progress: SyncProgressInfo) => void
): Promise<{ total: number; synced: number; failed: number }> {
  if (isCurrentlySyncing) {
    console.log('IndexedDB Queue: Sync already in progress, skipping duplicate call.');
    const stats = await getQueueStats();
    return { total: stats.pendingCount, synced: 0, failed: 0 };
  }

  if (isAppOffline()) {
    console.log('IndexedDB Queue: Application is currently offline. Synchronization deferred.');
    return { total: 0, synced: 0, failed: 0 };
  }

  isCurrentlySyncing = true;
  notifyStatsUpdate();

  const pendingItems = await getPendingQueueItems();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      activeSyncingItemId = item.id;
      item.status = 'SYNCING';
      item.lastAttemptAt = new Date().toISOString();

      // Update state to SYNCING in IndexedDB
      await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
        store.put(item);
      });

      // Emit starting progress event
      notifyStatsUpdate();
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: pendingItems.length,
          item,
          activeItemId: item.id,
          stage: 'SYNCING',
          stepMessage: `Réplication de ${item.label} vers Firebase...`
        });
      }

      // Smooth visual progression delay (300ms) so users can observe active items
      await new Promise((resolve) => setTimeout(resolve, 320));

      let success = false;
      let errorMsg: string | null = null;

      try {
        // Execute sync according to entity and action type
        if (item.entityType === 'CART_TRANSACTION') {
          if (item.actionType === 'CREATE') {
            await syncToFirestore('sale_transactions', item.payload.id || item.entityId, item.payload);
            await markOfflineRecordSynced('cart_transactions', item.payload.id || item.entityId);
          }
          success = true;
        } else if (item.entityType === 'REQUISITION') {
          if (item.actionType === 'CREATE') {
            await insertRequisitionToSupabase(item.payload);
            await syncToFirestore('store_requisitions', item.payload.id || item.entityId, item.payload);
          } else if (item.actionType === 'UPDATE_STATUS') {
            const { reqId, newStatus, options } = item.payload;
            await updateRequisitionStatusInSupabase(reqId, newStatus, options);
            await syncToFirestore('store_requisitions', reqId, {
              status: newStatus,
              updated_at: new Date().toISOString(),
              ...(options?.rejectionReason ? { rejection_reason: options.rejectionReason } : {})
            });
          }
          success = true;
        } else if (item.entityType === 'INVENTORY_ADJUSTMENT') {
          if (item.actionType === 'CREATE') {
            await insertInventoryAdjustmentToSupabase(item.payload);
            await syncToFirestore('inventory_adjustments', item.payload.id || item.entityId, item.payload);
            await markOfflineRecordSynced('inventory_adjustments', item.payload.id || item.entityId);
          }
          success = true;
        } else if (item.entityType === 'RAW_MATERIAL_STOCK') {
          if (item.actionType === 'UPSERT') {
            await upsertRawMaterialToSupabase(item.payload);
            await syncToFirestore('raw_materials', item.payload.id || item.entityId, item.payload);
          }
          success = true;
        } else if (item.entityType === 'RECEIPT') {
          if (item.actionType === 'CREATE') {
            await syncToFirestore('receipts', item.payload.id || item.entityId, item.payload);
            await markOfflineRecordSynced('receipts', item.payload.id || item.entityId);
          }
          success = true;
        } else {
          // Fallback Firestore sync
          await syncToFirestore('offline_synced_logs', item.entityId, item.payload);
          success = true;
        }
      } catch (err: any) {
        console.error(`IndexedDB Sync error on item ${item.id}:`, err);
        success = false;
        errorMsg = err?.message || 'Erreur de synchronisation réseau';
      }

      // Update final item state in IndexedDB
      item.retryCount = (item.retryCount || 0) + 1;
      if (success) {
        item.status = 'SYNCED';
        item.firebaseStatus = 'SYNCED';
        item.supabaseStatus = 'SYNCED';
        item.syncedAt = new Date().toISOString();
        item.errorMessage = null;
        syncedCount++;
      } else {
        item.status = 'FAILED';
        item.firebaseStatus = 'FAILED';
        item.supabaseStatus = 'FAILED';
        item.errorMessage = errorMsg;
        failedCount++;
      }

      await withTransaction(STORES.OFFLINE_QUEUE, 'readwrite', (store) => {
        store.put(item);
      });

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: pendingItems.length,
          item,
          activeItemId: item.id,
          stage: success ? 'SYNCED' : 'FAILED',
          success,
          stepMessage: success ? 'Synchronisé avec succès !' : 'Échec de transmission'
        });
      }
    }

    // Save metadata
    const metaRecord = {
      key: 'sync_stats',
      lastSyncTimestamp: new Date().toISOString(),
      syncedCount,
      failedCount
    };

    await withTransaction(STORES.SYNC_METADATA, 'readwrite', (store) => {
      store.put(metaRecord);
    });

  } finally {
    isCurrentlySyncing = false;
    activeSyncingItemId = null;
    notifyStatsUpdate();
  }

  return {
    total: pendingItems.length,
    synced: syncedCount,
    failed: failedCount
  };
}

/**
 * Retrieve queue statistics
 */
export async function getQueueStats(): Promise<OfflineSyncStats> {
  const items = await getAllQueueItems();
  let pendingCount = 0;
  let syncedCount = 0;
  let failedCount = 0;

  items.forEach((item) => {
    if (item.status === 'PENDING' || item.status === 'SYNCING') pendingCount++;
    else if (item.status === 'SYNCED') syncedCount++;
    else if (item.status === 'FAILED') failedCount++;
  });

  let lastSyncTimestamp: string | null = null;
  try {
    const meta = await withTransaction(STORES.SYNC_METADATA, 'readonly', (store) => {
      return new Promise<any>((resolve) => {
        const req = store.get('sync_stats');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    });
    if (meta && meta.lastSyncTimestamp) {
      lastSyncTimestamp = meta.lastSyncTimestamp;
    }
  } catch {
    // Ignore metadata read errors
  }

  return {
    pendingCount,
    syncedCount,
    failedCount,
    totalCount: items.length,
    lastSyncTimestamp,
    isSimulatedOffline: isSimulatedOfflineState,
    isSyncing: isCurrentlySyncing,
    activeItemId: activeSyncingItemId
  };
}

/**
 * Subscribe to stats updates
 */
export function subscribeToQueueStats(listener: QueueListener): () => void {
  queueListeners.add(listener);
  // Send current stats immediately
  getQueueStats().then(listener).catch(console.error);

  return () => {
    queueListeners.delete(listener);
  };
}

export async function notifyStatsUpdate() {
  try {
    const stats = await getQueueStats();
    queueListeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (err) {
        console.error('Error in queue listener:', err);
      }
    });
  } catch (err) {
    console.error('Failed to notify queue stats listeners:', err);
  }
}

/**
 * Run a full data integrity scan across local IndexedDB queues and cached stores
 */
export async function runDataIntegrityAudit(): Promise<DataIntegrityReport> {
  const items = await getAllQueueItems();
  const cachedReqs = await getCachedRequisitionsFromIndexedDB();
  const cachedLogs = await getCachedInventoryLogsFromIndexedDB();

  let validChecksums = 0;
  let corruptedRecords = 0;
  let pendingSync = 0;
  let syncedToFirebase = 0;
  let syncedToSupabase = 0;
  let approxBytes = 0;

  items.forEach((item) => {
    try {
      approxBytes += JSON.stringify(item).length * 2;
      const expectedCheck = calculatePayloadChecksum(item.payload);
      if (item.checksum && item.checksum === expectedCheck) {
        validChecksums++;
      } else if (!item.checksum) {
        validChecksums++; // legacy backward-compatible item
      } else {
        corruptedRecords++;
      }
    } catch {
      corruptedRecords++;
    }

    if (item.status === 'PENDING' || item.status === 'SYNCING') {
      pendingSync++;
    } else if (item.status === 'SYNCED') {
      syncedToFirebase++;
      syncedToSupabase++;
    }
  });

  const total = items.length;
  const score = total === 0 ? 100 : Math.max(0, Math.round(((total - corruptedRecords) / total) * 100));

  // Estimate collection metrics
  const collections = [
    {
      name: 'store_requisitions',
      localCount: cachedReqs.length,
      pendingCount: items.filter((i) => i.entityType === 'REQUISITION' && i.status !== 'SYNCED').length,
      syncedCount: items.filter((i) => i.entityType === 'REQUISITION' && i.status === 'SYNCED').length,
      health: (items.some((i) => i.entityType === 'REQUISITION' && i.status === 'FAILED') ? 'ATTENTION' : (items.some((i) => i.entityType === 'REQUISITION' && i.status === 'PENDING') ? 'PENDING_SYNC' : 'OPTIMAL')) as 'OPTIMAL' | 'PENDING_SYNC' | 'ATTENTION'
    },
    {
      name: 'inventory_adjustments',
      localCount: cachedLogs.length,
      pendingCount: items.filter((i) => i.entityType === 'INVENTORY_ADJUSTMENT' && i.status !== 'SYNCED').length,
      syncedCount: items.filter((i) => i.entityType === 'INVENTORY_ADJUSTMENT' && i.status === 'SYNCED').length,
      health: (items.some((i) => i.entityType === 'INVENTORY_ADJUSTMENT' && i.status === 'FAILED') ? 'ATTENTION' : (items.some((i) => i.entityType === 'INVENTORY_ADJUSTMENT' && i.status === 'PENDING') ? 'PENDING_SYNC' : 'OPTIMAL')) as 'OPTIMAL' | 'PENDING_SYNC' | 'ATTENTION'
    },
    {
      name: 'receipts',
      localCount: 0,
      pendingCount: items.filter((i) => i.entityType === 'RECEIPT' && i.status !== 'SYNCED').length,
      syncedCount: items.filter((i) => i.entityType === 'RECEIPT' && i.status === 'SYNCED').length,
      health: (items.some((i) => i.entityType === 'RECEIPT' && i.status === 'FAILED') ? 'ATTENTION' : (items.some((i) => i.entityType === 'RECEIPT' && i.status === 'PENDING') ? 'PENDING_SYNC' : 'OPTIMAL')) as 'OPTIMAL' | 'PENDING_SYNC' | 'ATTENTION'
    },
    {
      name: 'raw_materials',
      localCount: 0,
      pendingCount: items.filter((i) => i.entityType === 'RAW_MATERIAL_STOCK' && i.status !== 'SYNCED').length,
      syncedCount: items.filter((i) => i.entityType === 'RAW_MATERIAL_STOCK' && i.status === 'SYNCED').length,
      health: 'OPTIMAL' as const
    }
  ];

  let integrityStatus: 'PERFECT' | 'PENDING_RECONCILIATION' | 'DEGRADED' = 'PERFECT';
  if (corruptedRecords > 0) {
    integrityStatus = 'DEGRADED';
  } else if (pendingSync > 0) {
    integrityStatus = 'PENDING_RECONCILIATION';
  }

  return {
    timestamp: new Date().toISOString(),
    totalRecordsChecked: total,
    validChecksums,
    corruptedRecords,
    pendingSync,
    syncedToFirebase,
    syncedToSupabase,
    integrityScorePercent: score,
    storageUsageBytesApprox: approxBytes,
    collections,
    integrityStatus
  };
}

/**
 * Export full sync telemetry and item log as formatted JSON
 */
export async function exportSyncLogAsJSON(): Promise<string> {
  const items = await getAllQueueItems();
  const stats = await getQueueStats();
  const audit = await runDataIntegrityAudit();

  const exportPayload = {
    exportDate: new Date().toISOString(),
    appName: 'Patisserie Delice Central Lab',
    databaseVersion: DB_VERSION,
    databaseName: DB_NAME,
    stats,
    auditReport: audit,
    queueItems: items
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Auto-initialize event listeners for network changes
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('IndexedDB Queue: Browser went ONLINE. Starting auto-sync...');
    if (!isSimulatedOfflineState) {
      syncOfflineQueue().catch(console.error);
    }
    notifyStatsUpdate();
  });

  window.addEventListener('offline', () => {
    console.log('IndexedDB Queue: Browser went OFFLINE. Operations will be queued locally in IndexedDB.');
    notifyStatsUpdate();
  });
}
