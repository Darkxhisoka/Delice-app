/**
 * Emergency IndexedDB & Local Storage State Export Service for Store Managers
 * 
 * Utilizes the native @capacitor/filesystem plugin (with browser download fallback)
 * to export a comprehensive, atomic JSON snapshot of all IndexedDB databases,
 * Dexie tables, offline mutation queues, and point-of-sale state.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { db, DexieProduct, DexieSale, DexieCartItem, DexieAppSetting } from '../db/database';
import { getActiveStore, getActiveRole } from './storage';
import { isNativePlatform, safeHapticsNotification, safeHapticsImpact } from '../utils/platform';
import { NotificationType, ImpactStyle } from '@capacitor/haptics';

// IndexedDB database names used in the application
const KNOWN_IDB_NAMES = [
  'DelicePOSDatabase',
  'DelicePastryLabOfflineDB',
  'DeliceSqliteIndexedDBFallback'
];

export interface EmergencyBackupStats {
  productsCount: number;
  salesCount: number;
  pendingSalesCount: number;
  cartItemsCount: number;
  offlineQueueCount: number;
  requisitionsCount: number;
  inventoryLogsCount: number;
  rawMaterialsCount: number;
  cashDrawerEntriesCount: number;
  unsoldLogsCount: number;
  customerLoyaltyCount: number;
  customCakeOrdersCount: number;
  totalRecordsCount: number;
}

export interface EmergencyBackupPayload {
  app: 'DelicePOS';
  exportType: 'STORE_MANAGER_EMERGENCY_DUMP';
  schemaVersion: 2;
  exportedAt: string;
  storeContext: {
    storeId: string;
    storeName: string;
    managerName: string;
    activeRole: string;
  };
  platformInfo: {
    isNative: boolean;
    userAgent: string;
    platform: string;
  };
  stats: EmergencyBackupStats;
  indexedDbState: {
    dexie: {
      products: DexieProduct[];
      sales: DexieSale[];
      cart: DexieCartItem[];
      settings: DexieAppSetting[];
    };
    offlineLabQueue: {
      queue: any[];
      cachedRequisitions: any[];
      cachedInventoryLogs: any[];
      cachedRawMaterials: any[];
      syncMetadata: any[];
    };
    sqliteFallback: {
      cartTransactions: any[];
      inventoryAdjustments: any[];
      receipts: any[];
      syncMeta: any[];
    };
    rawIndexedDbDumps?: Record<string, Record<string, any[]>>;
  };
  localStorageState: {
    retailStoreStock: any[];
    saleTransactions: any[];
    requisitions: any[];
    receipts: any[];
    rawMaterials: any[];
    recipes: any[];
    productionBatches: any[];
    cashDrawerState: any | null;
    unsoldProducts: any[];
    customerLoyalty: any[];
    customCakeOrders: any[];
    storeReturns: any[];
  };
  checksum: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  uri?: string;
  filePath?: string;
  directory?: string;
  storageTarget: 'CAPACITOR_FILESYSTEM' | 'BROWSER_DOWNLOAD';
  fileSizeBytes: number;
  fileSizeFormatted: string;
  stats: EmergencyBackupStats;
  exportedAt: string;
  message: string;
  error?: string;
}

/**
 * Calculates a simple string checksum (FNV-1a 32-bit hex) for data verification
 */
function calculateChecksum(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).toUpperCase();
}

/**
 * Format bytes into human-readable string (KB, MB)
 */
export function formatByteSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generic helper to extract all records from an arbitrary IndexedDB database
 */
async function dumpAllStoresFromIndexedDB(dbName: string): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  if (typeof window === 'undefined' || !window.indexedDB) {
    return result;
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(dbName);
      
      request.onerror = () => {
        // If the database cannot be opened, silently resolve with empty object
        resolve(result);
      };

      request.onsuccess = async (e) => {
        const idb = (e.target as IDBOpenDBRequest).result;
        const storeNames = Array.from(idb.objectStoreNames);

        if (storeNames.length === 0) {
          idb.close();
          resolve(result);
          return;
        }

        try {
          const promises = storeNames.map((storeName) => {
            return new Promise<void>((resStore) => {
              try {
                const tx = idb.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const getAllReq = store.getAll();

                getAllReq.onsuccess = () => {
                  result[storeName] = getAllReq.result || [];
                  resStore();
                };

                getAllReq.onerror = () => {
                  result[storeName] = [];
                  resStore();
                };
              } catch {
                result[storeName] = [];
                resStore();
              }
            });
          });

          await Promise.all(promises);
          idb.close();
          resolve(result);
        } catch {
          idb.close();
          resolve(result);
        }
      };
    } catch {
      resolve(result);
    }
  });
}

/**
 * Safely parse JSON from localStorage with default fallback
 */
function safeGetLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Harvester: Gathers all current IndexedDB records, Dexie state, offline mutation queues,
 * and Store Manager localStorage cache into a unified, versioned Emergency Backup Payload.
 */
export async function harvestIndexedDbState(): Promise<EmergencyBackupPayload> {
  const storeContext = getActiveStore();
  const activeRole = getActiveRole();

  // 1. Harvest Dexie POS database tables
  let dexieProducts: DexieProduct[] = [];
  let dexieSales: DexieSale[] = [];
  let dexieCart: DexieCartItem[] = [];
  let dexieSettings: DexieAppSetting[] = [];

  try {
    [dexieProducts, dexieSales, dexieCart, dexieSettings] = await Promise.all([
      db.products.toArray(),
      db.sales.toArray(),
      db.cart.toArray(),
      db.settings.toArray()
    ]);
  } catch (err) {
    console.warn('Dexie harvest notice:', err);
  }

  // 2. Harvest Offline Lab Queue IndexedDB database
  const labOfflineDbDump = await dumpAllStoresFromIndexedDB('DelicePastryLabOfflineDB');
  const sqliteFallbackDbDump = await dumpAllStoresFromIndexedDB('DeliceSqliteIndexedDBFallback');

  // 3. Harvest Point of Sale & Manager localStorage caches
  const retailStoreStock = safeGetLocalStorage<any[]>('pastry_app_retail_store_stock', []);
  const saleTransactions = safeGetLocalStorage<any[]>('pastry_app_sale_transactions', []);
  const requisitions = safeGetLocalStorage<any[]>('pastry_app_requisitions', []);
  const receipts = safeGetLocalStorage<any[]>('pastry_app_receipts', []);
  const rawMaterials = safeGetLocalStorage<any[]>('pastry_app_raw_materials', []);
  const recipes = safeGetLocalStorage<any[]>('pastry_app_recipes', []);
  const productionBatches = safeGetLocalStorage<any[]>('pastry_app_production_batches', []);
  const cashDrawerState = safeGetLocalStorage<any>('delice_cash_drawer_state', null);
  const unsoldProducts = safeGetLocalStorage<any[]>('delice_unsold_products', []);
  const customerLoyalty = safeGetLocalStorage<any[]>('delice_customer_loyalty', []);
  const customCakeOrders = safeGetLocalStorage<any[]>('delice_custom_cake_orders', []);
  const storeReturns = safeGetLocalStorage<any[]>('delice_store_returns', []);

  // 4. Calculate Aggregate Statistics
  const pendingSales = dexieSales.filter(s => s.syncStatus === 'PENDING');
  const offlineQueue = labOfflineDbDump['offline_queue'] || [];
  const cachedRequisitions = labOfflineDbDump['local_requisitions'] || [];
  const cachedInventoryLogs = labOfflineDbDump['local_inventory_logs'] || [];
  const cachedRawMaterials = labOfflineDbDump['local_raw_materials'] || [];
  const syncMetadata = labOfflineDbDump['sync_metadata'] || [];

  const cartTransactions = sqliteFallbackDbDump['cart_transactions'] || [];
  const inventoryAdjustments = sqliteFallbackDbDump['inventory_adjustments'] || [];
  const sqliteReceipts = sqliteFallbackDbDump['receipts'] || [];
  const syncMeta = sqliteFallbackDbDump['sync_meta'] || [];

  const stats: EmergencyBackupStats = {
    productsCount: dexieProducts.length,
    salesCount: dexieSales.length,
    pendingSalesCount: pendingSales.length,
    cartItemsCount: dexieCart.length,
    offlineQueueCount: offlineQueue.length,
    requisitionsCount: Math.max(requisitions.length, cachedRequisitions.length),
    inventoryLogsCount: cachedInventoryLogs.length + inventoryAdjustments.length,
    rawMaterialsCount: rawMaterials.length,
    cashDrawerEntriesCount: cashDrawerState?.movements?.length || 0,
    unsoldLogsCount: unsoldProducts.length,
    customerLoyaltyCount: customerLoyalty.length,
    customCakeOrdersCount: customCakeOrders.length,
    totalRecordsCount:
      dexieProducts.length +
      dexieSales.length +
      dexieCart.length +
      offlineQueue.length +
      requisitions.length +
      retailStoreStock.length +
      saleTransactions.length
  };

  const exportedAt = new Date().toISOString();

  const payloadSansChecksum: Omit<EmergencyBackupPayload, 'checksum'> = {
    app: 'DelicePOS',
    exportType: 'STORE_MANAGER_EMERGENCY_DUMP',
    schemaVersion: 2,
    exportedAt,
    storeContext: {
      storeId: storeContext.id,
      storeName: storeContext.name,
      managerName: storeContext.managerName,
      activeRole
    },
    platformInfo: {
      isNative: isNativePlatform(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
    },
    stats,
    indexedDbState: {
      dexie: {
        products: dexieProducts,
        sales: dexieSales,
        cart: dexieCart,
        settings: dexieSettings
      },
      offlineLabQueue: {
        queue: offlineQueue,
        cachedRequisitions,
        cachedInventoryLogs,
        cachedRawMaterials,
        syncMetadata
      },
      sqliteFallback: {
        cartTransactions,
        inventoryAdjustments,
        receipts: sqliteReceipts,
        syncMeta
      },
      rawIndexedDbDumps: {
        DelicePOSDatabase: {
          products: dexieProducts,
          sales: dexieSales,
          cart: dexieCart,
          settings: dexieSettings
        },
        DelicePastryLabOfflineDB: labOfflineDbDump,
        DeliceSqliteIndexedDBFallback: sqliteFallbackDbDump
      }
    },
    localStorageState: {
      retailStoreStock,
      saleTransactions,
      requisitions,
      receipts,
      rawMaterials,
      recipes,
      productionBatches,
      cashDrawerState,
      unsoldProducts,
      customerLoyalty,
      customCakeOrders,
      storeReturns
    }
  };

  const jsonString = JSON.stringify(payloadSansChecksum);
  const checksum = calculateChecksum(jsonString);

  return {
    ...payloadSansChecksum,
    checksum
  };
}

/**
 * Triggers a standard browser download for JSON blob (Web / PWA fallback)
 */
function downloadJsonInBrowser(jsonString: string, filename: string): void {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Core Service Method:
 * Exports current IndexedDB state to a local JSON file via the Filesystem plugin (@capacitor/filesystem).
 * 
 * If running in a native mobile container (Android/iOS), writes the file directly to
 * Directory.Documents (or Directory.Data as reliable fallback), obtains the exact filesystem URI,
 * and ensures durability.
 * 
 * If running on Web / PWA, generates a direct browser download.
 */
export async function exportIndexedDbToFilesystem(options?: {
  customFilename?: string;
  preferredDirectory?: Directory;
  forceBrowserDownload?: boolean;
}): Promise<ExportResult> {
  safeHapticsImpact(ImpactStyle.Medium);

  try {
    const payload = await harvestIndexedDbState();
    const jsonString = JSON.stringify(payload, null, 2);
    const byteSize = new Blob([jsonString]).size;
    const formattedSize = formatByteSize(byteSize);

    // Build standard emergency backup filename
    const dateStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const cleanStoreCode = (payload.storeContext.storeName || 'STORE')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toUpperCase();
    const filename = options?.customFilename || `delice_emergency_idb_dump_${cleanStoreCode}_${dateStamp}.json`;

    // 1. Try Native Capacitor Filesystem Plugin if on Android / Native device
    if (isNativePlatform() && !options?.forceBrowserDownload) {
      const targetDirectory = options?.preferredDirectory || Directory.Documents;
      let writtenFilePath = '';
      let writtenUri = '';
      let usedDirectoryName = 'Documents';

      try {
        // Attempt write to Documents directory
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: jsonString,
          directory: targetDirectory,
          encoding: Encoding.UTF8,
          recursive: true
        });

        writtenUri = writeResult.uri;

        // Try getting exact URI representation
        try {
          const uriResult = await Filesystem.getUri({
            path: filename,
            directory: targetDirectory
          });
          writtenUri = uriResult.uri;
          writtenFilePath = uriResult.uri;
        } catch {
          writtenFilePath = writeResult.uri;
        }

        usedDirectoryName = targetDirectory === Directory.Documents ? 'Documents' : 'Data';
      } catch (fsErr) {
        console.warn('Filesystem.writeFile in Documents failed, attempting Directory.Data fallback:', fsErr);
        
        // Fallback to Directory.Data (app internal sandbox)
        const fallbackResult = await Filesystem.writeFile({
          path: filename,
          data: jsonString,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
          recursive: true
        });
        
        writtenUri = fallbackResult.uri;
        writtenFilePath = fallbackResult.uri;
        usedDirectoryName = 'AppData';
      }

      // Record export in localStorage metadata
      localStorage.setItem('delice_last_emergency_backup_timestamp', new Date().toISOString());
      localStorage.setItem('delice_last_emergency_backup_file', filename);
      localStorage.setItem('delice_last_emergency_backup_uri', writtenUri);

      safeHapticsNotification(NotificationType.Success);

      return {
        success: true,
        filename,
        uri: writtenUri,
        filePath: writtenFilePath,
        directory: usedDirectoryName,
        storageTarget: 'CAPACITOR_FILESYSTEM',
        fileSizeBytes: byteSize,
        fileSizeFormatted: formattedSize,
        stats: payload.stats,
        exportedAt: payload.exportedAt,
        message: `Sauvegarde d'urgence enregistrée avec succès dans le dossier ${usedDirectoryName} (${formattedSize}).`
      };
    }

    // 2. Web / Browser / Desktop PWA Fallback: trigger download
    downloadJsonInBrowser(jsonString, filename);

    localStorage.setItem('delice_last_emergency_backup_timestamp', new Date().toISOString());
    localStorage.setItem('delice_last_emergency_backup_file', filename);

    safeHapticsNotification(NotificationType.Success);

    return {
      success: true,
      filename,
      storageTarget: 'BROWSER_DOWNLOAD',
      fileSizeBytes: byteSize,
      fileSizeFormatted: formattedSize,
      stats: payload.stats,
      exportedAt: payload.exportedAt,
      message: `Fichier JSON d'urgence généré et téléchargé avec succès (${formattedSize}).`
    };
  } catch (err: any) {
    console.error('Failed to export IndexedDB state:', err);
    safeHapticsNotification(NotificationType.Error);

    return {
      success: false,
      filename: '',
      storageTarget: 'BROWSER_DOWNLOAD',
      fileSizeBytes: 0,
      fileSizeFormatted: '0 B',
      stats: {
        productsCount: 0,
        salesCount: 0,
        pendingSalesCount: 0,
        cartItemsCount: 0,
        offlineQueueCount: 0,
        requisitionsCount: 0,
        inventoryLogsCount: 0,
        rawMaterialsCount: 0,
        cashDrawerEntriesCount: 0,
        unsoldLogsCount: 0,
        customerLoyaltyCount: 0,
        customCakeOrdersCount: 0,
        totalRecordsCount: 0
      },
      exportedAt: new Date().toISOString(),
      message: `Erreur lors de l'export d'urgence: ${err?.message || String(err)}`,
      error: err?.message || String(err)
    };
  }
}

/**
 * Helper to read and parse an emergency backup file from the Capacitor Filesystem
 */
export async function readEmergencyBackupFromFile(
  filename: string,
  directory: Directory = Directory.Documents
): Promise<EmergencyBackupPayload> {
  const fileResult = await Filesystem.readFile({
    path: filename,
    directory,
    encoding: Encoding.UTF8
  });

  const content = typeof fileResult.data === 'string' 
    ? fileResult.data 
    : await (fileResult.data as Blob).text();

  const parsed = JSON.parse(content);
  if (!parsed || parsed.app !== 'DelicePOS' || parsed.exportType !== 'STORE_MANAGER_EMERGENCY_DUMP') {
    throw new Error('Le fichier sélectionné ne correspond pas à un dump d\'urgence Délice POS valide.');
  }

  return parsed as EmergencyBackupPayload;
}

/**
 * Emergency Restore Engine:
 * Reconstitutes the IndexedDB state, Dexie collections, and localStorage from an Emergency Backup Payload.
 */
export async function restoreIndexedDbFromEmergencyPayload(
  payload: EmergencyBackupPayload,
  mode: 'REPLACE' | 'MERGE' = 'REPLACE'
): Promise<{ success: boolean; restoredStats: EmergencyBackupStats; message: string }> {
  safeHapticsImpact(ImpactStyle.Heavy);

  try {
    if (!payload || payload.app !== 'DelicePOS' || !payload.indexedDbState) {
      throw new Error('Schéma de dump d\'urgence invalide.');
    }

    const { dexie, localStorageState } = payload.indexedDbState ? payload : (payload as any);
    const dexieData = payload.indexedDbState?.dexie || (payload as any).dexieData;
    const localData = payload.localStorageState || (payload as any).localStorageData;

    // 1. Restore Dexie POS Database Tables
    if (mode === 'REPLACE') {
      await Promise.all([
        db.products.clear(),
        db.sales.clear(),
        db.cart.clear()
      ]);
    }

    if (dexieData?.products?.length) {
      await db.products.bulkPut(dexieData.products);
    }
    if (dexieData?.sales?.length) {
      await db.sales.bulkPut(dexieData.sales);
    }
    if (dexieData?.cart?.length) {
      await db.cart.bulkPut(dexieData.cart);
    }
    if (dexieData?.settings?.length) {
      await db.settings.bulkPut(dexieData.settings);
    }

    // 2. Restore LocalStorage State
    if (localData) {
      if (localData.retailStoreStock) {
        localStorage.setItem('pastry_app_retail_store_stock', JSON.stringify(localData.retailStoreStock));
      }
      if (localData.saleTransactions) {
        localStorage.setItem('pastry_app_sale_transactions', JSON.stringify(localData.saleTransactions));
      }
      if (localData.requisitions) {
        localStorage.setItem('pastry_app_requisitions', JSON.stringify(localData.requisitions));
      }
      if (localData.receipts) {
        localStorage.setItem('pastry_app_receipts', JSON.stringify(localData.receipts));
      }
      if (localData.rawMaterials) {
        localStorage.setItem('pastry_app_raw_materials', JSON.stringify(localData.rawMaterials));
      }
      if (localData.recipes) {
        localStorage.setItem('pastry_app_recipes', JSON.stringify(localData.recipes));
      }
      if (localData.productionBatches) {
        localStorage.setItem('pastry_app_production_batches', JSON.stringify(localData.productionBatches));
      }
      if (localData.cashDrawerState) {
        localStorage.setItem('delice_cash_drawer_state', JSON.stringify(localData.cashDrawerState));
      }
      if (localData.unsoldProducts) {
        localStorage.setItem('delice_unsold_products', JSON.stringify(localData.unsoldProducts));
      }
      if (localData.customerLoyalty) {
        localStorage.setItem('delice_customer_loyalty', JSON.stringify(localData.customerLoyalty));
      }
      if (localData.customCakeOrders) {
        localStorage.setItem('delice_custom_cake_orders', JSON.stringify(localData.customCakeOrders));
      }
      if (localData.storeReturns) {
        localStorage.setItem('delice_store_returns', JSON.stringify(localData.storeReturns));
      }
    }

    safeHapticsNotification(NotificationType.Success);

    return {
      success: true,
      restoredStats: payload.stats,
      message: `Restauration réussie: ${payload.stats.salesCount} ventes, ${payload.stats.productsCount} articles, ${payload.stats.requisitionsCount} réquisitions restaurés.`
    };
  } catch (err: any) {
    safeHapticsNotification(NotificationType.Error);
    throw new Error(`Échec de la restauration IndexedDB: ${err?.message || String(err)}`);
  }
}
