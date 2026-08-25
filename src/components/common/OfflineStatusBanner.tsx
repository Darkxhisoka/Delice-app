import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  Database,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  X,
  ShieldCheck,
  Package,
  Calendar,
  Zap
} from 'lucide-react';
import {
  subscribeToQueueStats,
  isAppOffline,
  OfflineSyncStats
} from '../../services/indexedDbQueue';
import {
  subscribeBackgroundSync,
  backgroundSyncService,
  BackgroundSyncStatus
} from '../../services/backgroundSync';
import { notifyToast } from '../../services/storage';
import { OfflineSyncCenterModal } from './OfflineSyncCenterModal';

export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(!isAppOffline());
  const [showReconnectedMsg, setShowReconnectedMsg] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState<boolean>(false);
  const [cacheTime, setCacheTime] = useState<string>('');
  const [queueStats, setQueueStats] = useState<OfflineSyncStats | null>(null);
  const [bgSyncStatus, setBgSyncStatus] = useState<BackgroundSyncStatus | null>(null);

  useEffect(() => {
    setCacheTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    const unsubscribeQueue = subscribeToQueueStats((stats) => {
      setQueueStats(stats);
      setIsOnline(!isAppOffline());
    });

    const unsubscribeBgSync = subscribeBackgroundSync((status) => {
      setBgSyncStatus(status);
    });

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedMsg(true);
      setIsDismissed(false);
      const timer = setTimeout(() => setShowReconnectedMsg(false), 8000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedMsg(false);
      setIsDismissed(false);
      setCacheTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeQueue();
      unsubscribeBgSync();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualSyncNow = async () => {
    if (isManualSyncing || bgSyncStatus?.isSyncing) return;
    setIsManualSyncing(true);

    try {
      if (!navigator.onLine) {
        notifyToast({
          type: 'warning',
          title: 'Hors-Ligne Détecté',
          message: 'Aucune connexion Internet détectée par le navigateur. Veuillez vérifier votre réseau Wi-Fi ou 4G.'
        });
        return;
      }

      const result = await backgroundSyncService.syncNow();
      if (result && result.synced > 0) {
        notifyToast({
          type: 'success',
          title: 'Synchronisation Réussie',
          message: `${result.synced} transaction(s) IndexedDB synchronisée(s) avec succès avec Firestore.`
        });
        setShowReconnectedMsg(false);
      } else if (result && result.failed > 0) {
        notifyToast({
          type: 'error',
          title: 'Erreur Synchronisation',
          message: `${result.failed} élément(s) n'ont pas pu être synchronisés. Réessai programmé.`
        });
      } else {
        notifyToast({
          type: 'info',
          title: 'File Synchronisée',
          message: 'Toutes les transactions IndexedDB sont déjà synchronisées.'
        });
      }
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Erreur',
        message: err?.message || 'Erreur lors de la synchronisation manuelle.'
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  if (isDismissed) return null;

  const pendingCount = queueStats?.pendingCount || 0;
  const isSyncInProgress = isManualSyncing || bgSyncStatus?.isSyncing;

  // Banner displayed when reconnected, or syncing in background, or online with pending transactions
  if (showReconnectedMsg || bgSyncStatus?.isSyncing || (isOnline && pendingCount > 0)) {
    return (
      <div 
        id="offline-banner-reconnected" 
        className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold shadow-md animate-in slide-in-from-top duration-300 border-b border-emerald-700"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              {isSyncInProgress ? (
                <RefreshCw className="w-4 h-4 text-emerald-100 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 text-emerald-100" />
              )}
            </div>
            <div>
              <span className="font-extrabold flex items-center gap-2">
                <span>{isSyncInProgress ? 'Synchronisation en cours...' : 'Connexion Réseau Détectée'}</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300">
                    {pendingCount} en attente
                  </span>
                )}
              </span>
              <p className="text-[11px] font-normal text-emerald-100 mt-0.5">
                {isSyncInProgress
                  ? "Transmission sécurisée des transactions IndexedDB vers Firebase Firestore & Supabase..."
                  : pendingCount > 0
                  ? "La connexion internet est active. Vous pouvez lancer la synchronisation manuelle immédiatement."
                  : "Connexion rétablie ! La file locale IndexedDB est synchronisée."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Sync Now button when internet connectivity is detected */}
            <button
              id="offline-banner-sync-now-btn"
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncInProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 active:scale-95 text-xs font-black shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              title="Forcer la synchronisation manuelle de la file IndexedDB vers le serveur"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncInProgress ? 'animate-spin' : ''}`} />
              <span>{isSyncInProgress ? 'Synchronisation...' : 'Sync Now'}</span>
            </button>

            {/* Sync Center Modal Trigger Button */}
            <button
              id="offline-banner-open-center-btn"
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-900/60 text-white text-xs font-black border border-white/20 transition-all cursor-pointer"
              title="Ouvrir le Centre de Persistance & Synchronisation SQLite"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Centre SQLite</span>
            </button>

            <button
              id="offline-banner-close-reconnected-btn"
              type="button"
              onClick={() => {
                setShowReconnectedMsg(false);
                setIsDismissed(true);
              }}
              className="text-emerald-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Fermer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Center */}
        <OfflineSyncCenterModal
          isOpen={isSyncCenterOpen}
          onClose={() => setIsSyncCenterOpen(false)}
        />
      </div>
    );
  }

  // Banner displayed when offline
  if (!isOnline) {
    return (
      <div 
        id="offline-banner-offline"
        className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold shadow-md animate-in slide-in-from-top duration-300 border-b border-amber-600"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold flex items-center gap-1.5">
                Mode Hors-Ligne Actif (SQLite & IndexedDB)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-amber-400">
                  {pendingCount > 0 ? `${pendingCount} action(s) en file` : 'File Locale Prête'}
                </span>
              </span>
              <p className="text-[11px] font-medium text-slate-900 mt-0.5">
                Les transactions de vente, réceptions et déstockages sont enregistrés localement dans SQLite/IndexedDB et se synchroniseront automatiquement dès détection d'internet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {/* Sync Center button */}
            <button
              id="offline-banner-center-offline-btn"
              type="button"
              onClick={() => setIsSyncCenterOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-amber-400 hover:bg-slate-900 active:scale-95 text-xs font-black shadow-sm transition-all cursor-pointer"
              title="Ouvrir le Centre de Persistance & Synchronisation SQLite"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Centre SQLite</span>
            </button>

            {/* Sync Now button to attempt background sync check */}
            <button
              id="offline-banner-force-sync-btn"
              type="button"
              onClick={handleManualSyncNow}
              disabled={isSyncInProgress}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 text-slate-950 hover:bg-slate-900/80 text-xs font-black shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              title="Tester la connexion et forcer une tentative de synchronisation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncInProgress ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncInProgress ? 'Vérification...' : 'Sync Now'}</span>
            </button>

            <button
              id="offline-banner-close-offline-btn"
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-950/70 hover:text-slate-950 p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Masquer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Center */}
        <OfflineSyncCenterModal
          isOpen={isSyncCenterOpen}
          onClose={() => setIsSyncCenterOpen(false)}
        />
      </div>
    );
  }

  return null;
};

