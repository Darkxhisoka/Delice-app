import {
  syncOfflineQueue,
  getQueueStats,
  getPendingQueueItems,
  isAppOffline,
  getIsSimulatedOffline,
  notifyStatsUpdate,
  OfflineSyncStats
} from './indexedDbQueue';
import { notifyToast } from './storage';

export interface BackgroundSyncStatus {
  isRunning: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  lastAutoSyncAt: string | null;
  totalAutoSyncRuns: number;
  totalItemsSynced: number;
  totalItemsFailed: number;
  lastError: string | null;
  hasBackgroundSyncApi: boolean;
}

type SyncStateListener = (status: BackgroundSyncStatus) => void;

class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isInitialized = false;
  private isSyncing = false;
  private isRunning = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private retryTimeout: NodeJS.Timeout | null = null;
  private retryAttempt = 0;
  private maxRetries = 5;
  private baseRetryDelayMs = 3000;
  private listeners: Set<SyncStateListener> = new Set();

  private status: BackgroundSyncStatus = {
    isRunning: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastAutoSyncAt: null,
    totalAutoSyncRuns: 0,
    totalItemsSynced: 0,
    totalItemsFailed: 0,
    lastError: null,
    hasBackgroundSyncApi: false
  };

  private constructor() {}

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Initializes the automatic background synchronization service
   */
  public start(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.isRunning = true;
    this.status.isRunning = true;

    if (typeof window === 'undefined') return;

    // Detect PWA Background Sync API capability
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      this.status.hasBackgroundSyncApi = true;
      console.log('Background Sync Service: Native Web SyncManager is supported.');
    }

    // 1. Listen for browser ONLINE event
    window.addEventListener('online', this.handleOnlineEvent);

    // 2. Listen for browser OFFLINE event
    window.addEventListener('offline', this.handleOfflineEvent);

    // 3. Listen for window visibility change (user re-entering the tab)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // 4. Listen for window focus
    window.addEventListener('focus', this.handleWindowFocus);

    // 5. Listen for Service Worker background sync triggers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
    }

    // 6. Periodic connectivity check & pending queue monitor (every 45 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.checkAndSyncIfNeeded('heartbeat');
    }, 45000);

    // 7. Initial verification on mount
    setTimeout(() => {
      this.checkAndSyncIfNeeded('initial_startup');
      this.registerNativeBackgroundSync();
    }, 1500);

    this.notifyListeners();
    console.log('Background Sync Service: Successfully initialized and active.');
  }

  /**
   * Stops the background sync service and cleans up listeners
   */
  public stop(): void {
    if (!this.isInitialized) return;
    this.isInitialized = false;
    this.isRunning = false;
    this.status.isRunning = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineEvent);
      window.removeEventListener('offline', this.handleOfflineEvent);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleWindowFocus);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', this.handleServiceWorkerMessage);
      }
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.notifyListeners();
  }

  /**
   * Requests the browser to schedule native PWA background synchronization
   */
  public async registerNativeBackgroundSync(): Promise<void> {
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'sync' in registration) {
          await (registration as any).sync.register('delice-sync-offline-queue');
          console.log('Background Sync Service: Registered native PWA background sync tag [delice-sync-offline-queue]');
        }
      }
    } catch (err) {
      console.debug('Background Sync Service: Native sync registration note:', err);
    }
  }

  /**
   * Handler for online reconnection event
   */
  private handleOnlineEvent = (): void => {
    console.log('Background Sync Service: Internet connection RESTORED. Triggering automatic background sync to Firestore...');
    this.status.isOnline = true;
    this.retryAttempt = 0;
    this.notifyListeners();
    this.checkAndSyncIfNeeded('network_reconnected');
  };

  /**
   * Handler for offline event
   */
  private handleOfflineEvent = (): void => {
    console.log('Background Sync Service: Network connection LOST. Background sync paused.');
    this.status.isOnline = false;
    this.notifyListeners();
  };

  /**
   * Handler for visibility change (e.g. user resumes application tab)
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.checkAndSyncIfNeeded('visibility_resumed');
    }
  };

  /**
   * Handler for window focus
   */
  private handleWindowFocus = (): void => {
    this.checkAndSyncIfNeeded('window_focused');
  };

  /**
   * Handler for messages posted from Service Worker
   */
  private handleServiceWorkerMessage = (event: MessageEvent): void => {
    if (event.data && event.data.type === 'BACKGROUND_SYNC_TRIGGER') {
      console.log('Background Sync Service: Received sync trigger from Service Worker.');
      this.checkAndSyncIfNeeded('service_worker_trigger');
    }
  };

  /**
   * Checks pending queue and executes background sync if conditions are met
   */
  public async checkAndSyncIfNeeded(triggerReason: string = 'manual'): Promise<{ total: number; synced: number; failed: number } | null> {
    if (this.isSyncing) {
      console.log(`Background Sync Service: Sync already in progress, skipping trigger [${triggerReason}].`);
      return null;
    }

    if (isAppOffline() || getIsSimulatedOffline()) {
      return null;
    }

    try {
      const pendingItems = await getPendingQueueItems();
      if (pendingItems.length === 0) {
        return { total: 0, synced: 0, failed: 0 };
      }

      console.log(`Background Sync Service: Found ${pendingItems.length} pending transactions. Pushing to Firestore (reason: ${triggerReason})...`);
      return await this.performSync(triggerReason);
    } catch (err: any) {
      console.error('Background Sync Service: Error during queue inspection:', err);
      return null;
    }
  }

  /**
   * Core synchronization execution
   */
  private async performSync(triggerReason: string): Promise<{ total: number; synced: number; failed: number }> {
    this.isSyncing = true;
    this.status.isSyncing = true;
    this.notifyListeners();

    try {
      const result = await syncOfflineQueue();

      this.status.lastAutoSyncAt = new Date().toISOString();
      this.status.totalAutoSyncRuns += 1;
      this.status.totalItemsSynced += result.synced;
      this.status.totalItemsFailed += result.failed;
      this.status.lastError = null;

      // Notify user via Toast on successful automatic synchronization
      if (result.synced > 0) {
        notifyToast({
          type: 'success',
          title: 'Synchronisation automatique réussie',
          message: `${result.synced} transaction(s) en attente ont été synchronisées avec succès avec Firebase Firestore.`
        });

        // Dispatch a custom window event for reactive components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('delice:background-sync-completed', {
            detail: { ...result, triggerReason, timestamp: new Date().toISOString() }
          }));
        }
      }

      // If some items failed, schedule exponential backoff retry
      if (result.failed > 0 && this.retryAttempt < this.maxRetries) {
        this.scheduleRetry();
      } else {
        this.retryAttempt = 0;
      }

      return result;
    } catch (err: any) {
      const errMsg = err?.message || 'Erreur inconnue de synchronisation en arrière-plan';
      console.error('Background Sync Service: Execution failure:', err);
      this.status.lastError = errMsg;

      if (this.retryAttempt < this.maxRetries) {
        this.scheduleRetry();
      }

      return { total: 0, synced: 0, failed: 1 };
    } finally {
      this.isSyncing = false;
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Schedules an automatic retry with exponential backoff and jitter
   */
  private scheduleRetry(): void {
    this.retryAttempt += 1;
    const jitter = Math.floor(Math.random() * 1000);
    const delay = Math.min(this.baseRetryDelayMs * Math.pow(2, this.retryAttempt - 1) + jitter, 30000);

    console.log(`Background Sync Service: Scheduling retry #${this.retryAttempt} in ${Math.round(delay / 1000)}s...`);

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.checkAndSyncIfNeeded(`auto_retry_${this.retryAttempt}`);
    }, delay);
  }

  /**
   * Triggers an immediate manual background synchronization
   */
  public async syncNow(): Promise<{ total: number; synced: number; failed: number }> {
    this.retryAttempt = 0;
    const result = await this.performSync('manual_user_request');
    return result;
  }

  /**
   * Returns current status snapshot
   */
  public getStatus(): BackgroundSyncStatus {
    return {
      ...this.status,
      isOnline: typeof navigator !== 'undefined' ? (navigator.onLine && !getIsSimulatedOffline()) : true,
    };
  }

  /**
   * Subscribe to background sync status updates
   */
  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const current = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (e) {
        console.error('Background Sync Service: Listener error:', e);
      }
    });
  }
}

// Export singleton instance and convenience helpers
export const backgroundSyncService = BackgroundSyncService.getInstance();

export function initBackgroundSync(): void {
  backgroundSyncService.start();
}

export function stopBackgroundSync(): void {
  backgroundSyncService.stop();
}

export function triggerBackgroundSync(): Promise<{ total: number; synced: number; failed: number } | null> {
  return backgroundSyncService.checkAndSyncIfNeeded('manual_trigger');
}

export function getBackgroundSyncStatus(): BackgroundSyncStatus {
  return backgroundSyncService.getStatus();
}

export function subscribeBackgroundSync(listener: SyncStateListener): () => void {
  return backgroundSyncService.subscribe(listener);
}
