import React, { useState, useEffect } from 'react';
import {
  subscribeToQueueStats,
  syncOfflineQueue,
  isAppOffline,
  OfflineSyncStats
} from '../../services/indexedDbQueue';
import {
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { notifyToast } from '../../services/storage';

interface OfflineQueueStatusPillProps {
  onOpenDrawer: () => void;
  compact?: boolean;
}

export const OfflineQueueStatusPill: React.FC<OfflineQueueStatusPillProps> = ({
  onOpenDrawer,
  compact = false
}) => {
  const [stats, setStats] = useState<OfflineSyncStats>({
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    totalCount: 0,
    lastSyncTimestamp: null,
    isSimulatedOffline: false,
    isSyncing: false
  });

  useEffect(() => {
    const unsubscribe = subscribeToQueueStats((newStats) => {
      setStats(newStats);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stats.isSyncing) return;

    if (isAppOffline()) {
      notifyToast({
        type: 'warning',
        title: 'Appareil Hors-Ligne',
        message: 'Impossible de synchroniser sans connexion active ou avec le mode hors-ligne simulé.'
      });
      return;
    }

    try {
      const result = await syncOfflineQueue();
      if (result.total === 0) {
        notifyToast({
          type: 'info',
          title: 'File IndexedDB vide',
          message: 'Toutes les données locales sont déjà synchronisées.'
        });
      } else {
        notifyToast({
          type: result.failed > 0 ? 'warning' : 'success',
          title: 'Synchronisation Terminée',
          message: `${result.synced} élément(s) synchronisé(s) vers Supabase & Firestore${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`
        });
      }
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Erreur Synchronisation',
        message: err.message || 'Échec de la synchronisation IndexedDB.'
      });
    }
  };

  const isOffline = isAppOffline();
  const hasPending = stats.pendingCount > 0;
  const hasFailed = stats.failedCount > 0;

  return (
    <div
      onClick={onOpenDrawer}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 shadow-sm border ${
        isOffline
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
          : hasPending
          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
          : hasFailed
          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
      title="Ouvrir le gestionnaire de file d'attente IndexedDB"
    >
      {/* Network / Storage icon */}
      <div className="flex items-center gap-1.5">
        {isOffline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : (
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="font-mono text-[11px] font-bold">IndexedDB</span>
      </div>

      <span className="w-px h-3.5 bg-slate-700 mx-0.5" />

      {/* Status or counter */}
      <div className="flex items-center gap-1.5">
        {stats.isSyncing ? (
          <span className="flex items-center gap-1 text-amber-300 text-[11px]">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {!compact && <span>Sync en cours...</span>}
          </span>
        ) : hasPending ? (
          <span className="flex items-center gap-1 text-amber-300">
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {stats.pendingCount}
            </span>
            {!compact && <span>en attente</span>}
          </span>
        ) : hasFailed ? (
          <span className="flex items-center gap-1 text-rose-300">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-black rounded-md bg-rose-400/20 text-rose-300 border border-rose-400/30">
              {stats.failedCount} err
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {!compact && <span>À jour</span>}
          </span>
        )}
      </div>

      {/* Sync trigger button if not offline and has pending */}
      {!isOffline && hasPending && !stats.isSyncing && (
        <button
          type="button"
          onClick={handleManualSync}
          className="p-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 transition-colors ml-0.5"
          title="Synchroniser immédiatement vers le serveur"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
