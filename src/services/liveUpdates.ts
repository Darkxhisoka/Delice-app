import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, LatestVersion } from '@capgo/capacitor-updater';
import { notifyToast } from './storage';
import { checkAppVersion, setLocalVersion } from './versionService';

/**
 * Initializes Capgo Live Updates (@capgo/capacitor-updater) on native devices.
 * Automatically signals app readiness (preventing rollback), listens to update events,
 * and seamlessly triggers updates.
 */
export async function initLiveUpdates(): Promise<void> {
  // Only execute on native Capacitor platforms (Android, iOS)
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. CRITICAL: Inform Capgo that the application has booted successfully to confirm the bundle
    await CapacitorUpdater.notifyAppReady();
    console.log('[Capgo] App readiness notified successfully.');

    // 2. Listen to update lifecycle events
    CapacitorUpdater.addListener('updateAvailable', (event: any) => {
      console.log('[Capgo] Live update available:', event);
      notifyToast({
        type: 'info',
        title: 'Mise à jour en cours',
        message: `Téléchargement d'une nouvelle version (${event?.bundle?.version || 'en cours'})...`
      });
    });

    CapacitorUpdater.addListener('downloadComplete', async (event: any) => {
      console.log('[Capgo] Live update download complete:', event);
      notifyToast({
        type: 'success',
        title: 'Mise à jour prête',
        message: 'La nouvelle version a été téléchargée et va être appliquée.'
      });

      if (event?.bundle?.id) {
        try {
          if (event.bundle.version) {
            setLocalVersion(event.bundle.version);
          }
          // Set as next bundle to smoothly activate or set immediately
          await CapacitorUpdater.next({ id: event.bundle.id });
          // Check version to run any pending data migrations
          await checkAppVersion({ silent: true });
        } catch (err) {
          console.error('[Capgo] Failed to set next bundle:', err);
        }
      }
    });

    CapacitorUpdater.addListener('downloadFailed', (error: any) => {
      console.warn('[Capgo] Live update download failed:', error);
    });

    // 3. Proactively check if a new bundle version is available
    try {
      const latest: LatestVersion = await CapacitorUpdater.getLatest();
      if (latest && latest.url && latest.version) {
        console.log('[Capgo] New version found via getLatest():', latest.version);
      }
    } catch (checkErr) {
      console.debug('[Capgo] getLatest() check skipped or failed:', checkErr);
    }
  } catch (error) {
    console.warn('[Capgo] Live updates initialization error:', error);
  }
}

/**
 * Manually trigger a check and download for live updates (e.g. from Settings or Admin dashboard)
 */
export async function checkForLiveUpdatesManual(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    notifyToast({
      type: 'info',
      title: 'Mode Web',
      message: 'Les mises à jour Capgo OTA s\'exécutent sur les terminaux mobiles natifs.'
    });
    return false;
  }

  try {
    notifyToast({
      type: 'info',
      title: 'Recherche de mise à jour',
      message: 'Vérification des mises à jour en direct...'
    });

    const latest: LatestVersion = await CapacitorUpdater.getLatest();

    if (latest && latest.url && latest.version) {
      notifyToast({
        type: 'info',
        title: 'Mise à jour trouvée',
        message: `Téléchargement de la version ${latest.version}...`
      });

      const bundle = await CapacitorUpdater.download({
        url: latest.url,
        version: latest.version
      });

      if (bundle?.id) {
        await CapacitorUpdater.next({ id: bundle.id });
        notifyToast({
          type: 'success',
          title: 'Mise à jour prête',
          message: `Version ${latest.version} prête. Elle sera active au prochain démarrage.`
        });
      }
      return true;
    } else {
      notifyToast({
        type: 'success',
        title: 'Application à jour',
        message: 'Vous disposez déjà de la dernière version publiée.'
      });
      return false;
    }
  } catch (error: any) {
    notifyToast({
      type: 'error',
      title: 'Erreur de mise à jour',
      message: error?.message || 'Impossible de vérifier les mises à jour pour le moment.'
    });
    return false;
  }
}
