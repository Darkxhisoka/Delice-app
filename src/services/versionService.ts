import { Capacitor } from '@capacitor/core';
import { db } from '../db/database';
import { notifyToast } from './storage';

export interface AppVersionManifest {
  version: string;
  buildNumber?: number;
  releasedAt?: string;
  minSupportedVersion?: string;
  mandatoryUpdate?: boolean;
  title?: string;
  changelog?: string[];
  migrationTasks?: string[];
  notes?: string;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  isMandatory: boolean;
  localVersion: string;
  remoteVersion: string;
  manifest: AppVersionManifest | null;
  migrationsApplied: string[];
  migrationError?: string | null;
  error?: string | null;
}

export type MigrationHandler = (fromVersion: string, toVersion: string) => Promise<void>;

const STORAGE_KEYS = {
  INSTALLED_VERSION: 'pastry_app_installed_version',
  LAST_CHECK_TIME: 'pastry_app_last_version_check',
  APPLIED_MIGRATIONS: 'pastry_app_applied_migrations',
  DISMISSED_UPDATE_VERSION: 'pastry_app_dismissed_update_version',
  PENDING_RELOAD_FLAG: 'pastry_app_pending_update_reload'
};

const DEFAULT_FALLBACK_VERSION = '1.4.0';

// In-memory migrations registry
const migrationRegistry = new Map<string, MigrationHandler>();
const listeners: Array<(result: VersionCheckResult) => void> = [];

/**
 * Compare two semver strings (e.g. "1.3.2" vs "1.4.0").
 * Returns:
 *  -1 if v1 < v2
 *   0 if v1 === v2
 *   1 if v1 > v2
 */
export function compareSemver(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;
  const clean1 = v1.trim().replace(/^[vV]/, '');
  const clean2 = v2.trim().replace(/^[vV]/, '');

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

/**
 * Get current stored local version
 */
export function getLocalVersion(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INSTALLED_VERSION);
    if (stored) return stored;
    // Set initial baseline
    localStorage.setItem(STORAGE_KEYS.INSTALLED_VERSION, DEFAULT_FALLBACK_VERSION);
    return DEFAULT_FALLBACK_VERSION;
  } catch {
    return DEFAULT_FALLBACK_VERSION;
  }
}

/**
 * Set stored local version
 */
export function setLocalVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INSTALLED_VERSION, version);
  } catch (err) {
    console.warn('[VersionService] Failed to set local version in localStorage:', err);
  }
}

/**
 * Get list of already applied migration task IDs
 */
export function getAppliedMigrations(): string[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.APPLIED_MIGRATIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Record a successfully applied migration task
 */
function recordAppliedMigration(taskName: string): void {
  try {
    const applied = new Set(getAppliedMigrations());
    applied.add(taskName);
    localStorage.setItem(STORAGE_KEYS.APPLIED_MIGRATIONS, JSON.stringify(Array.from(applied)));
  } catch (err) {
    console.warn('[VersionService] Failed to save applied migration:', err);
  }
}

/**
 * Register a custom data migration handler for version upgrades
 */
export function registerMigration(name: string, handler: MigrationHandler): void {
  migrationRegistry.set(name, handler);
}

// -------------------------------------------------------------
// Built-in Migration Handlers
// -------------------------------------------------------------

// 1. Clean legacy storage keys and ensure state consistency
registerMigration('migrate-storage-keys-v1.4', async () => {
  try {
    console.log('[VersionService:Migration] Running migrate-storage-keys-v1.4...');
    // Clean potential legacy corrupted test keys
    const legacyKeys = [
      'pastry_app_has_seeded_v2',
      'pastry_app_demo_seed_v1',
      'pastry_app_temp_reconcile_draft'
    ];
    legacyKeys.forEach((key) => localStorage.removeItem(key));
    console.log('[VersionService:Migration] Legacy keys cleanup completed.');
  } catch (err) {
    console.error('[VersionService:Migration] Error in migrate-storage-keys-v1.4:', err);
  }
});

// 2. Clear old Service Worker CacheStorage buckets on version bump
registerMigration('flush-stale-sw-caches', async () => {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      console.log('[VersionService:Migration] Flushing old CacheStorage entries...');
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        // Keep current cache or purge legacy versioned caches
        if (!name.includes(DEFAULT_FALLBACK_VERSION)) {
          await caches.delete(name);
          console.log(`[VersionService:Migration] Stale cache purged: ${name}`);
        }
      }
    } catch (err) {
      console.warn('[VersionService:Migration] Cache flush note:', err);
    }
  }
});

// 3. Validate IndexedDB Dexie tables and open connection
registerMigration('validate-indexeddb-integrity', async () => {
  try {
    console.log('[VersionService:Migration] Validating IndexedDB Dexie tables...');
    if (!db.isOpen()) {
      await db.open();
    }
    // Verify core tables
    await Promise.all([
      db.products.count(),
      db.cart.count(),
      db.sales.count()
    ]);
    console.log('[VersionService:Migration] IndexedDB validation successful.');
  } catch (err) {
    console.error('[VersionService:Migration] IndexedDB validation warning:', err);
  }
});

/**
 * Executes pending data migrations between versions
 */
export async function runDataMigrations(
  fromVersion: string,
  toVersion: string,
  taskNames?: string[]
): Promise<{ applied: string[]; errors: string[] }> {
  const applied: string[] = [];
  const errors: string[] = [];
  const alreadyApplied = new Set(getAppliedMigrations());

  // Determine tasks to run: either explicitly requested in manifest or all registered
  const tasksToRun = taskNames && taskNames.length > 0
    ? taskNames
    : Array.from(migrationRegistry.keys());

  for (const taskName of tasksToRun) {
    if (alreadyApplied.has(taskName)) {
      continue;
    }

    const handler = migrationRegistry.get(taskName);
    if (handler) {
      try {
        console.log(`[VersionService] Applying migration '${taskName}' (${fromVersion} -> ${toVersion})...`);
        await handler(fromVersion, toVersion);
        recordAppliedMigration(taskName);
        applied.push(taskName);
        console.log(`[VersionService] Migration '${taskName}' succeeded.`);
      } catch (taskErr: any) {
        const msg = taskErr?.message || String(taskErr);
        console.error(`[VersionService] Migration '${taskName}' failed:`, msg);
        errors.push(`${taskName}: ${msg}`);
      }
    } else {
      console.warn(`[VersionService] Migration '${taskName}' specified in manifest but no handler registered.`);
      // Mark as processed to avoid infinite retries
      recordAppliedMigration(taskName);
      applied.push(taskName);
    }
  }

  return { applied, errors };
}

/**
 * Fetches the deployed version manifest from /version.json with cache busting
 */
export async function fetchDeployedVersionManifest(): Promise<AppVersionManifest | null> {
  try {
    const timestamp = Date.now();
    const response = await fetch(`/version.json?_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching version.json`);
    }

    const manifest: AppVersionManifest = await response.json();
    return manifest;
  } catch (err: any) {
    console.debug('[VersionService] Failed to fetch deployed manifest:', err?.message || err);
    return null;
  }
}

/**
 * Main version check routine:
 * 1. Fetches deployed version manifest.
 * 2. Compares against local version in localStorage.
 * 3. Also checks Capgo OTA status if running on native mobile.
 * 4. Executes data migrations if a new version is detected.
 * 5. Notifies UI listeners if an update is available.
 */
export async function checkAppVersion(options?: {
  forceCheck?: boolean;
  silent?: boolean;
}): Promise<VersionCheckResult> {
  const localVer = getLocalVersion();
  const appliedList: string[] = [];
  let migrationError: string | null = null;

  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, new Date().toISOString());

    // 1. Fetch remote version manifest from deployed server/CDN
    const manifest = await fetchDeployedVersionManifest();

    let remoteVer = manifest?.version || localVer;
    let isMandatory = false;

    // Check min supported version or explicit mandatory flag
    if (manifest) {
      if (manifest.mandatoryUpdate) {
        isMandatory = true;
      }
      if (manifest.minSupportedVersion && compareSemver(localVer, manifest.minSupportedVersion) < 0) {
        isMandatory = true;
      }
    }

    // 2. Check Capgo OTA on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        const latest = await CapacitorUpdater.getLatest();
        if (latest && latest.version && compareSemver(localVer, latest.version) < 0) {
          remoteVer = latest.version;
        }
      } catch (capgoErr) {
        console.debug('[VersionService] Capgo version check skipped:', capgoErr);
      }
    }

    const comparison = compareSemver(localVer, remoteVer);
    const hasUpdate = comparison < 0;

    // 3. If there is a new version or force check requested, run data migrations
    if (hasUpdate) {
      const migrationResult = await runDataMigrations(
        localVer,
        remoteVer,
        manifest?.migrationTasks
      );
      appliedList.push(...migrationResult.applied);
      if (migrationResult.errors.length > 0) {
        migrationError = migrationResult.errors.join('; ');
      }
    }

    const result: VersionCheckResult = {
      hasUpdate,
      isMandatory,
      localVersion: localVer,
      remoteVersion: remoteVer,
      manifest,
      migrationsApplied: appliedList,
      migrationError
    };

    // Notify listeners
    listeners.forEach((listener) => {
      try {
        listener(result);
      } catch (listenerErr) {
        console.error('[VersionService] Listener error:', listenerErr);
      }
    });

    if (!options?.silent && !hasUpdate && options?.forceCheck) {
      notifyToast({
        type: 'success',
        title: 'Application à jour',
        message: `Vous utilisez la dernière version (v${localVer}).`
      });
    }

    return result;
  } catch (err: any) {
    const errorMsg = err?.message || 'Erreur lors de la vérification de version';
    const result: VersionCheckResult = {
      hasUpdate: false,
      isMandatory: false,
      localVersion: localVer,
      remoteVersion: localVer,
      manifest: null,
      migrationsApplied: [],
      error: errorMsg
    };
    return result;
  }
}

/**
 * Triggers full application reload / update application.
 * Upgrades stored local version, clears caches, and reboots.
 */
export async function applyUpdateAndReload(targetVersion?: string): Promise<void> {
  const nextVer = targetVersion || DEFAULT_FALLBACK_VERSION;
  setLocalVersion(nextVer);

  // Clear dismissed update flag
  try {
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_UPDATE_VERSION);
  } catch {}

  // Flush Service Worker Caches
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}
  }

  // If running in Capgo native environment, reload via Capgo
  if (Capacitor.isNativePlatform()) {
    try {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      await CapacitorUpdater.reload();
      return;
    } catch (capgoErr) {
      console.warn('[VersionService] Capgo reload fallback:', capgoErr);
    }
  }

  // Web reload with cache bust
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('_v', Date.now().toString());
    window.location.href = `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`;
  }
}

/**
 * Allows user to dismiss an optional update until next session
 */
export function dismissUpdate(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_UPDATE_VERSION, version);
  } catch {}
}

/**
 * Check if a version update prompt was already dismissed by user
 */
export function isUpdateDismissed(version: string): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_UPDATE_VERSION);
    return dismissed === version;
  } catch {
    return false;
  }
}

/**
 * Subscribe to version check events
 */
export function subscribeToVersionChanges(
  callback: (result: VersionCheckResult) => void
): () => void {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Initializes periodic version check and window focus triggers
 */
export function initVersionService(): () => void {
  // Initial check after app boots smoothly (3 seconds)
  const initialTimer = setTimeout(() => {
    checkAppVersion({ silent: true }).catch((err) =>
      console.debug('[VersionService] Initial check note:', err)
    );
  }, 3000);

  // Periodic background check every 30 minutes
  const intervalId = setInterval(() => {
    if (navigator.onLine) {
      checkAppVersion({ silent: true }).catch((err) =>
        console.debug('[VersionService] Interval check note:', err)
      );
    }
  }, 30 * 60 * 1000);

  // Check when window regains focus or comes back from background
  const handleFocus = () => {
    if (navigator.onLine) {
      checkAppVersion({ silent: true }).catch((err) =>
        console.debug('[VersionService] Focus check note:', err)
      );
    }
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('online', handleFocus);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(intervalId);
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('online', handleFocus);
  };
}
