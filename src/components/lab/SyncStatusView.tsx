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
  runDataIntegrityAudit,
  exportSyncLogAsJSON,
  getFirebaseCollectionForEntity,
  OfflineQueueItem,
  OfflineSyncStats,
  DataIntegrityReport,
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
  ShieldCheck,
  ShieldAlert,
  Download,
  Search,
  Server,
  Cloud,
  Check,
  Flame,
  Activity,
  Copy,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { notifyToast, getRawMaterials } from '../../services/storage';
import { checkForLiveUpdatesManual } from '../../services/liveUpdates';
import {
  subscribeBackgroundSync,
  triggerBackgroundSync,
  BackgroundSyncStatus
} from '../../services/backgroundSync';
import {
  SyncLottieDataFlow,
  SyncProcessingRadarIcon,
  SyncActiveBadge,
  SyncCardShimmerBorder,
  SyncItemStepPipeline
} from '../common/SyncItemProgressAnimation';

export const SyncStatusView: React.FC = () => {
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
  const [bgSyncStatus, setBgSyncStatus] = useState<BackgroundSyncStatus | null>(null);
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'SYNCED' | 'FAILED' | 'REQUISITIONS' | 'INVENTORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(getIsSimulatedOffline());
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeProcessingItemId, setActiveProcessingItemId] = useState<string | null>(null);
  const [activeStepMessage, setActiveStepMessage] = useState<string>('');
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    const list = await getAllQueueItems();
    setItems(list);
    const report = await runDataIntegrityAudit();
    setIntegrityReport(report);
  };

  useEffect(() => {
    loadData();
    const unsubscribeQueue = subscribeToQueueStats((newStats) => {
      setStats(newStats);
      setIsSimulated(newStats.isSimulatedOffline);
      loadData();
    });
    const unsubscribeBgSync = subscribeBackgroundSync((status) => {
      setBgSyncStatus(status);
    });
    return () => {
      unsubscribeQueue();
      unsubscribeBgSync();
    };
  }, []);

  const isOffline = isAppOffline();

  const handleToggleOfflineSimulation = () => {
    const nextState = !isSimulated;
    setIsSimulated(nextState);
    setSimulatedOffline(nextState);
    notifyToast({
      type: nextState ? 'warning' : 'success',
      title: nextState ? 'Mode Hors-Ligne Simulé Activé' : 'Mode En Ligne Rétabli',
      message: nextState
        ? 'Toutes les opérations seront stockées localement dans IndexedDB sans appel réseau.'
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
        setActiveStepMessage(progress.stepMessage || `Traitement de ${progress.item.label}...`);
      });

      await loadData();
      setSyncProgress(null);
      setActiveProcessingItemId(null);
      setActiveStepMessage('');

      if (result.total === 0) {
        notifyToast({
          type: 'info',
          title: 'File Déjà Synchronisée',
          message: 'Toutes les modifications locales sont déjà à jour dans Firebase.'
        });
      } else {
        notifyToast({
          type: result.failed > 0 ? 'warning' : 'success',
          title: 'Synchronisation Terminée',
          message: `${result.synced} changement(s) répliqué(s) vers Firebase Firestore & Supabase${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`
        });
      }
    } catch (err: any) {
      setSyncProgress(null);
      setActiveProcessingItemId(null);
      setActiveStepMessage('');
      notifyToast({
        type: 'error',
        title: 'Erreur Synchronisation',
        message: err.message || 'Impossible de synchroniser avec Firebase.'
      });
    }
  };

  const handleRunIntegrityAudit = async () => {
    setIsAuditing(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const report = await runDataIntegrityAudit();
      setIntegrityReport(report);
      notifyToast({
        type: 'success',
        title: 'Audit d\'Intégrité Terminé',
        message: `Score d'intégrité : ${report.integrityScorePercent}% • ${report.validChecksums} checksums valides sur ${report.totalRecordsChecked} enregistrements.`
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRetryFailed = async () => {
    await retryFailedQueueItems();
    await loadData();
    notifyToast({
      type: 'info',
      title: 'Éléments Réinitialisés',
      message: 'Les actions en échec ont été remises en attente pour synchronisation Firebase.'
    });
  };

  const handleClearSynced = async () => {
    const count = await clearSyncedQueueItems();
    await loadData();
    notifyToast({
      type: 'info',
      title: 'Historique Nettoyé',
      message: `${count} élément(s) synchronisé(s) supprimé(s) de la file locale IndexedDB.`
    });
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteQueueItem(id);
    await loadData();
    notifyToast({
      type: 'info',
      title: 'Élément Supprimé',
      message: 'Changement local retiré de la file IndexedDB.'
    });
  };

  const handleExportJSON = async () => {
    try {
      const jsonString = await exportSyncLogAsJSON();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `delice-sync-audit-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifyToast({
        type: 'success',
        title: 'Export Réussi',
        message: 'Le journal complet de synchronisation a été téléchargé en JSON.'
      });
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Échec Export',
        message: err.message || 'Impossible d\'exporter les données de synchronisation.'
      });
    }
  };

  const handleCopyPayload = (id: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    notifyToast({
      type: 'info',
      title: 'Copié dans le Presse-Papier',
      message: 'Payload JSON copié avec succès.'
    });
  };

  // Filter and search items
  const filteredItems = items.filter((item) => {
    // Filter type
    if (activeFilter === 'PENDING' && !(item.status === 'PENDING' || item.status === 'SYNCING')) return false;
    if (activeFilter === 'SYNCED' && item.status !== 'SYNCED') return false;
    if (activeFilter === 'FAILED' && item.status !== 'FAILED') return false;
    if (activeFilter === 'REQUISITIONS' && item.entityType !== 'REQUISITION') return false;
    if (activeFilter === 'INVENTORY' && !(item.entityType === 'INVENTORY_ADJUSTMENT' || item.entityType === 'RECEIPT' || item.entityType === 'RAW_MATERIAL_STOCK')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = item.label?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCollection = item.firebaseCollection?.toLowerCase().includes(q);
      const matchDocId = item.targetDocId?.toLowerCase().includes(q);
      const matchChecksum = item.checksum?.toLowerCase().includes(q);
      return matchLabel || matchDesc || matchCollection || matchDocId || matchChecksum;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    État de Synchronisation & Intégrité des Données
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Firebase Firestore Engine
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Transparence en temps réel des modifications locales (IndexedDB), vérification des checksums et synchronisation avec Firebase.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={stats.isSyncing || stats.pendingCount === 0 || isOffline}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md ${
                stats.isSyncing || stats.pendingCount === 0 || isOffline
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${stats.isSyncing ? 'animate-spin' : ''}`} />
              <span>{stats.isSyncing ? 'Synchronisation en cours...' : 'Forcer Synchronisation Firebase'}</span>
            </button>

            <button
              type="button"
              onClick={handleRunIntegrityAudit}
              disabled={isAuditing}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Vérifier la validité des checksums et l'intégrité locale"
            >
              <ShieldCheck className={`w-4 h-4 text-emerald-400 ${isAuditing ? 'animate-pulse' : ''}`} />
              <span>{isAuditing ? 'Audit en cours...' : 'Vérifier Intégrité'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleOfflineSimulation}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isSimulated
                  ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400 shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isSimulated ? 'Mode Hors-Ligne Actif' : 'Simuler Hors-Ligne'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Télécharger le journal d'audit au format JSON"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Progress Bar & Active Animation Banner */}
      {syncProgress && (
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/50 text-amber-300 shadow-2xl relative overflow-hidden space-y-3 animate-sync-active-card">
          <SyncCardShimmerBorder />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-md">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white block">
                    Synchronisation active avec Firebase Firestore & Supabase
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse">
                    En Direct
                  </span>
                </div>
                <span className="text-xs text-slate-300">
                  {activeStepMessage || `Traitement de l'élément ${syncProgress.current} sur ${syncProgress.total}...`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="w-36 sm:w-48 h-3 bg-slate-950 rounded-full overflow-hidden border border-amber-500/40 relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 transition-all duration-300 relative"
                  style={{ width: `${Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%` }}
                >
                  <div className="absolute inset-0 animate-sync-shimmer opacity-70" />
                </div>
              </div>
              <span className="font-mono text-sm font-black text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%
              </span>
            </div>
          </div>

          {/* Active Data Stream Visualizer */}
          <SyncLottieDataFlow
            currentStep={activeStepMessage || 'Réplication idempotente vers Firebase Firestore & Supabase PostgreSQL...'}
            className="shadow-inner"
          />
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Integrity Score */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Intégrité Données</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {integrityReport?.integrityScorePercent ?? 100}%
              </span>
              <span className="text-xs text-slate-400">
                ({integrityReport?.validChecksums ?? 0} valides)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>0 corruption détectée • IndexedDB</span>
            </p>
          </div>
        </div>

        {/* 2. Pending Changes */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modifications Locales</span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              stats.pendingCount > 0
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${stats.pendingCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                {stats.pendingCount}
              </span>
              <span className="text-xs text-slate-400">en attente de réplication</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.pendingCount > 0
                ? `${stats.pendingCount} changement(s) en file locale IndexedDB`
                : 'Toutes les modifications sont synchronisées'}
            </p>
          </div>
        </div>

        {/* 3. Synced to Firebase & Supabase */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Répliqués vers Firebase</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-indigo-300">
                {stats.syncedCount}
              </span>
              <span className="text-xs text-slate-400">sur {stats.totalCount} total</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Firestore & Supabase PostgreSQL</span>
            </p>
          </div>
        </div>

        {/* 4. Connectivity & Background Sync Service */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sync Arrière-Plan</span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
              bgSyncStatus?.isSyncing
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 animate-spin'
                : isOffline
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}>
              {bgSyncStatus?.isSyncing ? (
                <RefreshCw className="w-4 h-4" />
              ) : isOffline ? (
                <WifiOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-black ${
                bgSyncStatus?.isSyncing
                  ? 'text-amber-400 animate-pulse'
                  : isOffline
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {bgSyncStatus?.isSyncing
                  ? 'Sync Auto en Cours'
                  : isOffline
                  ? 'Mode Hors-Ligne (Local)'
                  : 'Auto-Sync Actif'}
              </span>
              {bgSyncStatus?.isRunning && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Démon Actif
                </span>
              )}
              {isSimulated && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Simulé
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate" title={`Auto-sync runs: ${bgSyncStatus?.totalAutoSyncRuns || 0}`}>
              Reconnexion : <span className="text-slate-300 font-medium">{bgSyncStatus?.totalAutoSyncRuns ? `${bgSyncStatus.totalAutoSyncRuns} cycles auto` : 'Prêt à pousser vers Firestore'}</span>
            </p>
          </div>
        </div>

      </div>

      {/* Target Collections Breakdown Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>État des Collections Firebase & Tables Associées</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Suivi de la réplication par collection Firestore avec vérification des flux
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {integrityReport?.collections.map((col) => {
            const isOptimal = col.health === 'OPTIMAL';
            const isPending = col.health === 'PENDING_SYNC';
            return (
              <div
                key={col.name}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-200 truncate" title={col.name}>
                    {col.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isOptimal
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isPending
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {isOptimal ? 'Synchronisé' : isPending ? 'En attente' : 'Attention'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>En attente locale :</span>
                    <span className={`font-mono font-bold ${col.pendingCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {col.pendingCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Synchronisés Firestore :</span>
                    <span className="font-mono font-bold text-indigo-300">
                      {col.syncedCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Enregistrements locaux :</span>
                    <span className="font-mono text-slate-300">
                      {col.localCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main List of Pending Changes & Sync Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        {/* Controls, Search and Filter bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Changements Locaux & File de Synchronisation ({filteredItems.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historique détaillé des modifications en attente ou répliquées vers Firebase
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {stats.failedCount > 0 && (
              <button
                type="button"
                onClick={handleRetryFailed}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réessayer échecs ({stats.failedCount})</span>
              </button>
            )}

            {stats.syncedCount > 0 && (
              <button
                type="button"
                onClick={handleClearSynced}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                title="Purger l'historique synchronisé"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Nettoyer synchronisés</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: `Tous (${items.length})` },
              { id: 'PENDING', label: `En attente (${stats.pendingCount})` },
              { id: 'SYNCED', label: `Synchronisés (${stats.syncedCount})` },
              { id: 'FAILED', label: `Échecs (${stats.failedCount})` },
              { id: 'REQUISITIONS', label: 'Commandes' },
              { id: 'INVENTORY', label: 'Stocks' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher changement, docId..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List of Queue Items */}
        <div className="space-y-3 pt-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 rounded-2xl border border-slate-800/60">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">Aucun changement correspondant</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Toutes les modifications locales créées dans les modules de réquisitions, réceptions ou inventaire apparaissent ici avec leur état Firebase.
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
                      ? 'bg-amber-500/10 border-amber-400/80 shadow-lg shadow-amber-500/15 animate-sync-active-card ring-1 ring-amber-400/40'
                      : isItemPending
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50 shadow-xs'
                      : isItemFailed
                      ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Shimmer Progress Strip for active item */}
                  {isCurrentlyProcessing && <SyncCardShimmerBorder />}

                  <div
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Entity icon with Radar Pulse for currently processing item */}
                      {isCurrentlyProcessing ? (
                        <SyncProcessingRadarIcon>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            item.entityType === 'REQUISITION'
                              ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/60 shadow-md shadow-indigo-500/30'
                              : 'bg-amber-500/30 text-amber-300 border border-amber-400/60 shadow-md shadow-amber-500/30'
                          }`}>
                            {item.entityType === 'REQUISITION' ? (
                              <FileText className="w-5 h-5 animate-pulse" />
                            ) : (
                              <Boxes className="w-5 h-5 animate-pulse" />
                            )}
                          </div>
                        </SyncProcessingRadarIcon>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          item.entityType === 'REQUISITION'
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.entityType === 'REQUISITION' ? (
                            <FileText className="w-5 h-5" />
                          ) : (
                            <Boxes className="w-5 h-5" />
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {item.label}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {item.actionType}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            📁 {item.firebaseCollection || getFirebaseCollectionForEntity(item.entityType)}
                          </span>
                          {item.checksum && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              {item.checksum}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          {item.description}
                        </p>

                        {/* Active Item Lottie-style Data Flow Visualizer */}
                        {isCurrentlyProcessing && (
                          <div className="mt-2.5 space-y-1.5">
                            <SyncLottieDataFlow
                              currentStep={activeStepMessage || `Transmission vers Firebase Firestore (${item.firebaseCollection || 'store_requisitions'})`}
                            />
                            <SyncItemStepPipeline stage="SYNCING" />
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Créé : {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">Doc: {item.targetDocId || item.entityId}</span>
                          {item.syncedAt && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">
                                Synchro : {new Date(item.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </>
                          )}
                          {item.retryCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400">Tentatives : {item.retryCount}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badges & Controls */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                      
                      {/* Firebase Sync Status Tag */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden lg:inline">
                          Firebase :
                        </span>

                        {isCurrentlyProcessing && (
                          <SyncActiveBadge
                            label="En cours de réplication..."
                            step="Étape 2/3"
                          />
                        )}

                        {isItemSynced && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>À jour (Firestore)</span>
                          </span>
                        )}

                        {isItemPending && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>En attente locale</span>
                          </span>
                        )}

                        {isItemFailed && (
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Échec de réplication</span>
                          </span>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        disabled={isCurrentlyProcessing}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Supprimer cette modification de la file IndexedDB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Accordion expand arrow */}
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Payload & Technical Inspector */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 text-xs space-y-3">
                      {item.errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                          <div>
                            <span className="font-bold">Dernière erreur de transmission Firebase : </span>
                            {item.errorMessage}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Target Doc ID: <span className="font-mono text-slate-200">{item.targetDocId || item.entityId}</span></span>
                          <span>•</span>
                          <span>Checksum: <span className="font-mono text-emerald-400">{item.checksum || 'N/A'}</span></span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyPayload(item.id, item.payload)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === item.id ? 'Copié !' : 'Copier JSON'}</span>
                        </button>
                      </div>

                      <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-56">
                        {JSON.stringify(item.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Capgo Live Updates (OTA) Card */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              Mises à jour directes Capgo (OTA Live Updates)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Auto-Update Actif
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Permet de déployer instantanément les nouvelles versions du frontend sans repasser par le Play Store / App Store. Les mises à jour sont automatiquement téléchargées au lancement de l'application.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => checkForLiveUpdatesManual()}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Vérifier les Mises à Jour OTA</span>
        </button>
      </div>

      {/* Offline Data Integrity & Dual Architecture Architecture Info Box */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col lg:flex-row items-start gap-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Server className="w-6 h-6" />
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            Garantie d'Intégrité des Données Hors-Ligne & Architecture Résiliente
          </h3>
          <p className="leading-relaxed">
            Pour assurer une continuité absolue dans les laboratoires de production et points de vente même lors de coupures réseau en Algérie, toutes les écritures sont stockées de façon atomique dans le navigateur via l'API <strong>IndexedDB</strong> avec calcul d'empreinte cryptographique (<code className="text-amber-300">checksum</code>).
          </p>
          <p className="leading-relaxed">
            Dès le rétablissement de la connexion ou via déclenchement manuel, la passerelle réplique les modifications de manière idempotente vers <strong>Firebase Firestore</strong> (<code className="text-indigo-300">store_requisitions</code>, <code className="text-indigo-300">inventory_adjustments</code>, etc.) ainsi que <strong>Supabase PostgreSQL</strong>, éliminant tout risque de perte de données ou de doublons.
          </p>
        </div>
      </div>

    </div>
  );
};
