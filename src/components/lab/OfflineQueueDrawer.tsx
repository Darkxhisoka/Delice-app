import React, { useState, useEffect } from 'react';
import {
  subscribeToQueueStats,
  getAllQueueItems,
  deleteQueueItem,
  clearSyncedQueueItems,
  retryFailedQueueItems,
  syncOfflineQueue,
  enqueueOfflineAction,
  setSimulatedOffline,
  isAppOffline,
  getIsSimulatedOffline,
  OfflineQueueItem,
  OfflineSyncStats,
  QueueEntityType
} from '../../services/indexedDbQueue';
import {
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Boxes,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert
} from 'lucide-react';
import { notifyToast, getRawMaterials } from '../../services/storage';
import {
  SyncLottieDataFlow,
  SyncProcessingRadarIcon,
  SyncActiveBadge,
  SyncCardShimmerBorder
} from '../common/SyncItemProgressAnimation';

interface OfflineQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineQueueDrawer: React.FC<OfflineQueueDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const [stats, setStats] = useState<OfflineSyncStats>({
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    totalCount: 0,
    lastSyncTimestamp: null,
    isSimulatedOffline: false,
    isSyncing: false,
    activeItemId: null
  });
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'REQUISITION' | 'INVENTORY' | 'PENDING' | 'SYNCED'>('ALL');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeProcessingItemId, setActiveProcessingItemId] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(getIsSimulatedOffline());

  const loadQueue = async () => {
    const list = await getAllQueueItems();
    setItems(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
    const unsubscribe = subscribeToQueueStats((newStats) => {
      setStats(newStats);
      setIsSimulated(newStats.isSimulatedOffline);
      loadQueue();
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const isOffline = isAppOffline();

  const handleToggleOfflineSimulation = () => {
    const nextState = !isSimulated;
    setIsSimulated(nextState);
    setSimulatedOffline(nextState);
    notifyToast({
      type: nextState ? 'warning' : 'success',
      title: nextState ? 'Mode Hors-Ligne Simulé Activé' : 'Mode En Ligne Rétabli',
      message: nextState
        ? 'Toutes les réquisitions et logs seront mis en file IndexedDB locale sans appel réseau.'
        : 'La connexion est rétablie. La synchronisation automatique démarre.'
    });
  };

  const handleSyncAll = async () => {
    if (isOffline) {
      notifyToast({
        type: 'warning',
        title: 'Appareil Hors-Ligne',
        message: 'Désactivez la simulation hors-ligne ou reconnectez-vous au réseau pour synchroniser.'
      });
      return;
    }

    try {
      setSyncProgress({ current: 0, total: stats.pendingCount });
      const result = await syncOfflineQueue((progress) => {
        setSyncProgress({ current: progress.current, total: progress.total });
        setActiveProcessingItemId(progress.activeItemId || null);
      });

      await loadQueue();
      setSyncProgress(null);
      setActiveProcessingItemId(null);

      if (result.total === 0) {
        notifyToast({
          type: 'info',
          title: 'File IndexedDB Déjà Synchronisée',
          message: 'Aucun élément en attente de synchronisation.'
        });
      } else {
        notifyToast({
          type: result.failed > 0 ? 'warning' : 'success',
          title: 'Synchronisation Terminée',
          message: `${result.synced} élément(s) synchronisé(s) vers Supabase & Firestore${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`
        });
      }
    } catch (err: any) {
      setSyncProgress(null);
      setActiveProcessingItemId(null);
      notifyToast({
        type: 'error',
        title: 'Erreur Synchronisation',
        message: err.message || 'Impossible de synchroniser la file IndexedDB.'
      });
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedQueueItems();
    await loadQueue();
    notifyToast({
      type: 'info',
      title: 'Éléments Réinitialisés',
      message: 'Les actions en échec ont été remises en attente pour synchronisation.'
    });
  };

  const handleClearSynced = async () => {
    const count = await clearSyncedQueueItems();
    await loadQueue();
    notifyToast({
      type: 'info',
      title: 'Historique Nettoyé',
      message: `${count} élément(s) synchronisé(s) supprimé(s) de la file IndexedDB.`
    });
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteQueueItem(id);
    await loadQueue();
    notifyToast({
      type: 'info',
      title: 'Élément Supprimé',
      message: 'Action retirée de la file IndexedDB locale.'
    });
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'REQUISITION') return item.entityType === 'REQUISITION';
    if (activeFilter === 'INVENTORY') return item.entityType === 'INVENTORY_ADJUSTMENT' || item.entityType === 'RECEIPT' || item.entityType === 'RAW_MATERIAL_STOCK';
    if (activeFilter === 'PENDING') return item.status === 'PENDING' || item.status === 'SYNCING';
    if (activeFilter === 'SYNCED') return item.status === 'SYNCED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">File d'Attente Hors-Ligne (IndexedDB)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Browser Storage API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Stockage persistant des réquisitions et inventaires avec resynchronisation automatique
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Network & DB Info Banner */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isOffline
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {isOffline ? <WifiOff className="w-4 h-4 animate-pulse" /> : <Wifi className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {isOffline ? 'Mode Hors-Ligne' : 'Connecté au Réseau'}
                </span>
                {isSimulated && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Simulé
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                DB: <span className="font-mono text-slate-300">DelicePastryLabOfflineDB</span> • Version 1
              </span>
            </div>
          </div>

          {/* Offline simulator switch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOfflineSimulation}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isSimulated
                  ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isSimulated ? 'Désactiver Simulation' : 'Simuler Hors-Ligne'}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 p-4 bg-slate-900/60 border-b border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">En Attente</span>
            <span className={`text-lg font-black font-mono ${stats.pendingCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {stats.pendingCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Synchronisés</span>
            <span className="text-lg font-black font-mono text-emerald-400">
              {stats.syncedCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Échecs</span>
            <span className={`text-lg font-black font-mono ${stats.failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {stats.failedCount}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Queue</span>
            <span className="text-lg font-black font-mono text-indigo-300">
              {stats.totalCount}
            </span>
          </div>
        </div>

        {/* Action Controls & Sync Trigger */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={stats.isSyncing || stats.pendingCount === 0 || isOffline}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                stats.isSyncing || stats.pendingCount === 0 || isOffline
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${stats.isSyncing ? 'animate-spin' : ''}`} />
              <span>{stats.isSyncing ? 'Synchronisation en cours...' : 'Synchroniser la file (Sync All)'}</span>
            </button>

            {stats.failedCount > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer échecs ({stats.failedCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stats.syncedCount > 0 && (
              <button
                type="button"
                onClick={handleClearSynced}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                title="Purger l'historique synchronisé"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Nettoyer</span>
              </button>
            )}
          </div>
        </div>

        {/* Sync Progress Bar if syncing */}
        {syncProgress && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Synchronisation : {syncProgress.current} / {syncProgress.total} élément(s)...</span>
            </div>
            <span className="font-mono font-bold">
              {Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%
            </span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: `Tous (${items.length})` },
            { id: 'PENDING', label: `En attente (${stats.pendingCount})` },
            { id: 'REQUISITION', label: 'Réquisitions' },
            { id: 'INVENTORY', label: 'Inventaires' },
            { id: 'SYNCED', label: `Synchronisés (${stats.syncedCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === tab.id
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">Aucun élément dans la file</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Toutes les opérations créées en mode hors-ligne s'afficheront ici automatiquement avec leur statut IndexedDB.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const isCurrentlyProcessing = item.status === 'SYNCING' || stats.activeItemId === item.id || activeProcessingItemId === item.id;
              const isItemPending = (item.status === 'PENDING' || item.status === 'SYNCING') && !isCurrentlyProcessing;
              const isItemSynced = item.status === 'SYNCED' && !isCurrentlyProcessing;
              const isItemFailed = item.status === 'FAILED' && !isCurrentlyProcessing;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden relative ${
                    isCurrentlyProcessing
                      ? 'bg-amber-500/10 border-amber-400/80 shadow-md shadow-amber-500/15 animate-sync-active-card ring-1 ring-amber-400/30'
                      : isItemPending
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                      : isItemFailed
                      ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isCurrentlyProcessing && <SyncCardShimmerBorder />}

                  <div
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      {/* Entity icon */}
                      {isCurrentlyProcessing ? (
                        <SyncProcessingRadarIcon>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.entityType === 'REQUISITION'
                              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/60 shadow-xs'
                              : 'bg-amber-500/30 text-amber-300 border border-amber-400/60 shadow-xs'
                          }`}>
                            {item.entityType === 'REQUISITION' ? (
                              <FileText className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Boxes className="w-4 h-4 animate-pulse" />
                            )}
                          </div>
                        </SyncProcessingRadarIcon>
                      ) : (
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.entityType === 'REQUISITION'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.entityType === 'REQUISITION' ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <Boxes className="w-4 h-4" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {item.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.actionType}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {item.description}
                        </p>

                        {isCurrentlyProcessing && (
                          <div className="mt-2">
                            <SyncLottieDataFlow currentStep={`Transmission vers Firestore (${item.firebaseCollection || 'store_requisitions'})`} />
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{item.entityType}</span>
                          {item.retryCount > 0 && (
                            <>
                              <span>•</span>
                              <span>Tentatives: {item.retryCount}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Expand Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentlyProcessing && (
                        <SyncActiveBadge label="En cours" step="Sync" />
                      )}

                      {isItemSynced && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Synchronisé
                        </span>
                      )}

                      {isItemPending && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          En attente
                        </span>
                      )}

                      {isItemFailed && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Échec
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        disabled={isCurrentlyProcessing}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                        title="Supprimer de la file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payload Viewer */}
                  {isExpanded && (
                    <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 text-xs font-mono space-y-2">
                      {item.errorMessage && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                          <div>
                            <span className="font-bold">Dernière erreur : </span>
                            {item.errorMessage}
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Payload JSON (Stocké en local IndexedDB) :</span>
                        <span className="text-[10px] text-slate-500">{item.id}</span>
                      </div>

                      <pre className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto max-h-48">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Reconnexion automatique activée avec résilience réseau</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {stats.lastSyncTimestamp ? `Dernière synchro: ${new Date(stats.lastSyncTimestamp).toLocaleTimeString()}` : 'Pas encore synchronisé'}
          </span>
        </div>

      </div>
    </div>
  );
};
