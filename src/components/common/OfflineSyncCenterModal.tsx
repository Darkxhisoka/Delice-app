import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  Layers,
  ArrowRight,
  Trash2,
  Download,
  Activity,
  Cpu,
  Server,
  Zap
} from 'lucide-react';
import {
  OfflineQueueItem,
  OfflineSyncStats,
  DataIntegrityReport,
  getAllQueueItems,
  subscribeToQueueStats,
  syncOfflineQueue,
  retryFailedQueueItems,
  clearSyncedQueueItems,
  deleteQueueItem,
  runDataIntegrityAudit,
  isAppOffline,
  setSimulatedOffline,
  getIsSimulatedOffline
} from '../../services/indexedDbQueue';
import {
  getStorageHealthInfo,
  StorageHealthInfo
} from '../../services/sqliteStorage';
import { notifyToast } from '../../services/storage';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';

interface OfflineSyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineSyncCenterModal: React.FC<OfflineSyncCenterModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    triggerSyncComplete,
    triggerError,
    triggerMaterialClick,
    triggerToggle,
    triggerClick
  } = useHapticsAndSound();

  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [stats, setStats] = useState<OfflineSyncStats | null>(null);
  const [healthInfo, setHealthInfo] = useState<StorageHealthInfo | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(getIsSimulatedOffline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStepMsg, setSyncStepMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'STORAGE' | 'INTEGRITY'>('QUEUE');
  const [selectedItemPayload, setSelectedItemPayload] = useState<OfflineQueueItem | null>(null);

  const loadData = async () => {
    const [items, health] = await Promise.all([
      getAllQueueItems(),
      getStorageHealthInfo()
    ]);
    setQueueItems(items);
    setHealthInfo(health);
    setIsSimulated(getIsSimulatedOffline());
  };

  useEffect(() => {
    if (!isOpen) return;

    loadData();

    const unsubscribe = subscribeToQueueStats((newStats) => {
      setStats(newStats);
      loadData();
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    if (isSyncing) return;
    if (isAppOffline()) {
      triggerError();
      notifyToast({
        type: 'warning',
        title: t('syncCenter.offlineWarningTitle', 'Mode Hors-Ligne Actif'),
        message: t('syncCenter.offlineWarningMsg', 'Impossible de synchroniser sans connexion réseau. Désactivez le mode hors-ligne simulé ou connectez-vous à Internet.')
      });
      return;
    }

    triggerMaterialClick();
    setIsSyncing(true);
    setSyncStepMsg(t('syncCenter.initTunnel', 'Initialisation du tunnel de synchronisation...'));

    try {
      const result = await syncOfflineQueue((progress) => {
        setSyncStepMsg(`[${progress.current}/${progress.total}] ${progress.stepMessage || progress.item.label}`);
      });

      if (result.synced > 0) {
        triggerSyncComplete();
        notifyToast({
          type: 'success',
          title: t('syncCenter.syncSuccessTitle', 'Synchronisation Réussie'),
          message: t('syncCenter.syncSuccessMsg', { count: result.synced, defaultValue: `${result.synced} transaction(s) et réceptions SQLite/IndexedDB synchronisées avec succès !` })
        });
      } else if (result.failed > 0) {
        triggerError();
        notifyToast({
          type: 'error',
          title: t('syncCenter.partialSyncTitle', 'Synchronisation Partielle'),
          message: t('syncCenter.partialSyncMsg', { count: result.failed, defaultValue: `${result.failed} élément(s) ont échoué lors de la réplication.` })
        });
      } else {
        triggerClick();
        notifyToast({
          type: 'info',
          title: t('syncCenter.alreadySyncedTitle', 'File Synchronisée'),
          message: t('syncCenter.alreadySyncedMsg', 'Toutes les données locales sont déjà synchronisées.')
        });
      }

      await loadData();
    } catch (err: any) {
      triggerError();
      notifyToast({
        type: 'error',
        title: t('syncCenter.syncErrorTitle', 'Erreur'),
        message: err?.message || t('syncCenter.syncErrorMsg', 'Erreur lors de la synchronisation.')
      });
    } finally {
      setIsSyncing(false);
      setSyncStepMsg('');
    }
  };

  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulated;
    triggerToggle();
    setIsSimulated(nextState);
    setSimulatedOffline(nextState);

    notifyToast({
      type: nextState ? 'warning' : 'info',
      title: nextState ? t('syncCenter.simOfflineOnTitle', 'Mode Hors-Ligne Simulé Activé') : t('syncCenter.simOfflineOffTitle', 'Mode Connecté Rétabli'),
      message: nextState
        ? t('syncCenter.simOfflineOnMsg', 'Les transactions caisse, réceptions et déstockages seront conservés en SQLite/IndexedDB sans appel réseau.')
        : t('syncCenter.simOfflineOffMsg', 'La connexion au serveur est rétablie. La synchronisation automatique va débuter.')
    });
  };

  const handleRetryFailed = async () => {
    triggerMaterialClick();
    await retryFailedQueueItems();
    await loadData();
    notifyToast({
      type: 'info',
      title: t('syncCenter.retryScheduledTitle', 'Réessai programmé'),
      message: t('syncCenter.retryScheduledMsg', 'Les éléments en échec ont été remis en attente de synchronisation.')
    });
  };

  const handleClearSynced = async () => {
    triggerClick();
    const count = await clearSyncedQueueItems();
    await loadData();
    notifyToast({
      type: 'info',
      title: t('syncCenter.cleanupTitle', 'Nettoyage effectué'),
      message: t('syncCenter.cleanupMsg', { count, defaultValue: `${count} élément(s) synchronisé(s) purgé(s) de la file d'attente locale.` })
    });
  };

  const handleDeleteSingle = async (id: string) => {
    triggerClick();
    await deleteQueueItem(id);
    await loadData();
  };

  const handleRunAudit = async () => {
    triggerMaterialClick();
    const report = await runDataIntegrityAudit();
    setIntegrityReport(report);
  };

  const handleExportTelemetry = () => {
    triggerClick();
    const telemetryData = {
      exportedAt: new Date().toISOString(),
      healthInfo,
      stats,
      queueItemsCount: queueItems.length,
      queueItems
    };

    const blob = new Blob([JSON.stringify(telemetryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delice-offline-sync-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    notifyToast({
      type: 'success',
      title: t('syncCenter.exportSuccessTitle', 'Journal Téléchargé'),
      message: t('syncCenter.exportSuccessMsg', 'Le rapport technique SQLite & IndexedDB a été exporté en JSON.')
    });
  };

  const pendingCount = stats?.pendingCount ?? queueItems.filter((i) => i.status === 'PENDING' || i.status === 'SYNCING').length;
  const failedCount = stats?.failedCount ?? queueItems.filter((i) => i.status === 'FAILED').length;
  const isActuallyOffline = isAppOffline();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="offline-sync-center-modal"
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-start">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white">{t('syncCenter.title', 'Centre de Persistance & Synchronisation Offline')}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {t('syncCenter.hybridBadge', 'SQLite / IndexedDB')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('syncCenter.subtitle', 'Moteur de stockage hybride @capacitor/community/sqlite & IndexedDB pour transactions, réceptions et déstockages.')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ms-2"
            aria-label={t('common.close', 'Fermer')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Banner & Telemetry Bar */}
        <div className="p-4 sm:p-6 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-start">
          {/* Storage Engine Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('syncCenter.activeEngine', 'Moteur Actif')}</div>
              <div className="text-xs font-black text-white flex items-center gap-1.5 mt-0.5">
                <span>{healthInfo?.storageEngine === 'CAPACITOR_SQLITE' ? t('syncCenter.nativeSqlite', 'Capacitor Native SQLite') : t('syncCenter.universalIndexedDb', 'IndexedDB Universel')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
            </div>
          </div>

          {/* Network State */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${isActuallyOffline ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {isActuallyOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('syncCenter.networkState', 'État Réseau')}</div>
                <div className="text-xs font-black text-white mt-0.5">
                  {isActuallyOffline ? t('syncCenter.offline', 'Hors-Ligne') : t('syncCenter.online', 'Connecté au Réseau')}
                </div>
              </div>
            </div>

            {/* Offline Simulation Toggle */}
            <button
              onClick={handleToggleSimulatedOffline}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isSimulated 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={t('syncCenter.simulatedOfflineTooltip', 'Activer la simulation hors-ligne pour tester les ventes et déstockages sur le terrain')}
            >
              {isSimulated ? t('syncCenter.simulatedOffline', 'Hors-Ligne Simulé') : t('syncCenter.testOffline', 'Tester Hors-Ligne')}
            </button>
          </div>

          {/* Pending Queue Summary */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border shrink-0 ${pendingCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('syncCenter.pendingSync', 'En Attente de Sync')}</div>
                <div className="text-xs font-black text-white mt-0.5">
                  {t('syncCenter.actionsCount', { count: pendingCount, defaultValue: `${pendingCount} action(s)` })} {failedCount > 0 && <span className="text-rose-400">{t('syncCenter.failuresCount', { count: failedCount, defaultValue: `(${failedCount} échecs)` })}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={handleManualSync}
              disabled={isSyncing || isActuallyOffline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t('syncCenter.syncing', 'Sync...') : t('syncCenter.syncNow', 'Sync Now')}</span>
            </button>
          </div>
        </div>

        {/* Sync Step Live Message */}
        {isSyncing && syncStepMsg && (
          <div className="px-6 py-2 bg-indigo-950/80 border-b border-indigo-800 flex items-center gap-2 text-xs font-bold text-indigo-200 animate-pulse text-start">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-300 shrink-0" />
            <span>{syncStepMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/40 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
                activeTab === 'QUEUE'
                  ? 'border-indigo-400 text-indigo-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('syncCenter.tabQueue', { count: queueItems.length, defaultValue: `File d'Attente (${queueItems.length})` })}
            </button>
            <button
              onClick={() => setActiveTab('STORAGE')}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
                activeTab === 'STORAGE'
                  ? 'border-indigo-400 text-indigo-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('syncCenter.tabStorage', 'Tables SQLite & IndexedDB')}
            </button>
            <button
              onClick={() => {
                setActiveTab('INTEGRITY');
                if (!integrityReport) handleRunAudit();
              }}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-colors cursor-pointer ${
                activeTab === 'INTEGRITY'
                  ? 'border-indigo-400 text-indigo-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('syncCenter.tabIntegrity', 'Audit d\'Intégrité')}
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {failedCount > 0 && (
              <button
                onClick={handleRetryFailed}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                {t('syncCenter.retryFailed', { count: failedCount, defaultValue: `Réessayer Échecs (${failedCount})` })}
              </button>
            )}
            <button
              onClick={handleClearSynced}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
            >
              {t('syncCenter.clearSynced', 'Purger Synchronisés')}
            </button>
            <button
              onClick={handleExportTelemetry}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 transition-all cursor-pointer"
              title={t('syncCenter.exportJsonTooltip', 'Exporter les métadonnées et la file en JSON')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('syncCenter.exportJson', 'Export JSON')}</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-start">
          {activeTab === 'QUEUE' && (
            <div className="space-y-3">
              {queueItems.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/40 border border-slate-800">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h3 className="text-sm font-bold text-slate-200">{t('syncCenter.queueEmptyTitle', 'File Locale Complètement Synchronisée')}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {t('syncCenter.queueEmptyDesc', 'Aucune transaction ou réception en attente. Toutes les données locales sont sécurisées et synchronisées avec le serveur.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queueItems.map((item) => {
                    const isFailed = item.status === 'FAILED';
                    const isSynced = item.status === 'SYNCED';
                    const isPending = item.status === 'PENDING' || item.status === 'SYNCING';

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFailed
                            ? 'bg-rose-950/20 border-rose-800/60'
                            : isSynced
                            ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                            : 'bg-slate-950/80 border-indigo-500/40 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                              item.entityType === 'CART_TRANSACTION'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : item.entityType === 'RECEIPT'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : item.entityType === 'INVENTORY_ADJUSTMENT'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {item.entityType === 'CART_TRANSACTION' && <ShoppingCart className="w-4 h-4" />}
                              {item.entityType === 'RECEIPT' && <Receipt className="w-4 h-4" />}
                              {item.entityType === 'INVENTORY_ADJUSTMENT' && <AlertTriangle className="w-4 h-4" />}
                              {item.entityType !== 'CART_TRANSACTION' && item.entityType !== 'RECEIPT' && item.entityType !== 'INVENTORY_ADJUSTMENT' && <FileText className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-white">{item.label}</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.entityType}
                                </span>
                                {item.checksum && (
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                    {item.checksum}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                              {item.errorMessage && (
                                <p className="text-xs text-rose-400 mt-1 font-semibold">
                                  {t('syncCenter.errorLabel', { msg: item.errorMessage, retries: item.retryCount, max: item.maxRetries, defaultValue: `Erreur : ${item.errorMessage} (Tentatives: ${item.retryCount}/${item.maxRetries})` })}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Status Pill */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                              isSynced
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isFailed
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {isSynced && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              {isFailed && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                              {isPending && <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />}
                              <span>{item.status}</span>
                            </span>

                            {/* View Payload button */}
                            <button
                              onClick={() => setSelectedItemPayload(selectedItemPayload?.id === item.id ? null : item)}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            >
                              {selectedItemPayload?.id === item.id ? t('syncCenter.hidePayload', 'Masquer') : t('syncCenter.viewPayload', 'Payload')}
                            </button>

                            {/* Delete single item */}
                            <button
                              onClick={() => handleDeleteSingle(item.id)}
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title={t('syncCenter.deleteItemTooltip', 'Supprimer cette action de la file locale')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Payload Viewer */}
                        {selectedItemPayload?.id === item.id && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono overflow-x-auto text-emerald-300 text-start">
                            <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'STORAGE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                    <ShoppingCart className="w-4 h-4" />
                    <span>{t('syncCenter.tableCart', 'Table cart_transactions')}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{healthInfo?.totalCartTransactions ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t('syncCenter.pendingReplication', { count: healthInfo?.pendingSyncCart ?? 0, defaultValue: `${healthInfo?.pendingSyncCart ?? 0} en attente de réplication` })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t('syncCenter.tableAdjustments', 'Table inventory_adjustments')}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{healthInfo?.totalInventoryAdjustments ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t('syncCenter.pendingReplication', { count: healthInfo?.pendingSyncAdjustments ?? 0, defaultValue: `${healthInfo?.pendingSyncAdjustments ?? 0} en attente de réplication` })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                    <Receipt className="w-4 h-4" />
                    <span>{t('syncCenter.tableReceipts', 'Table receipts')}</span>
                  </div>
                  <div className="text-2xl font-black text-white">{healthInfo?.totalReceipts ?? 0}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {t('syncCenter.pendingReplication', { count: healthInfo?.pendingSyncReceipts ?? 0, defaultValue: `${healthInfo?.pendingSyncReceipts ?? 0} en attente de réplication` })}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  {t('syncCenter.guaranteesTitle', 'Garanties d\'Intégrité et de Persistance Hors-Ligne')}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed ps-2">
                  <li>{t('syncCenter.guarantee1', 'Sur environnement natif Android (Capacitor), les enregistrements sont persistés dans la base SQLite locale delice_pos_offline_db.')}</li>
                  <li>{t('syncCenter.guarantee2', 'Sur navigateur Web & PWA, un fallback IndexedDB universel avec transactions ACID garantit zéro perte de données même en cas de fermeture brutale de l\'application.')}</li>
                  <li>{t('syncCenter.guarantee3', 'Chaque transaction dispose d\'un checksum SHA pour valider son intégrité avant synchronisation vers Firebase Firestore et Supabase.')}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'INTEGRITY' && (
            <div className="space-y-4">
              {integrityReport ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase text-emerald-400">{t('syncCenter.globalScore', 'Score d\'Intégrité Global')}</div>
                      <div className="text-2xl font-black text-white">{integrityReport.integrityScorePercent}% - {integrityReport.integrityStatus}</div>
                    </div>
                    <button
                      onClick={handleRunAudit}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t('syncCenter.rerunAudit', 'Relancer Audit')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{t('syncCenter.records', 'Enregistrements')}</div>
                      <div className="text-lg font-black text-white">{integrityReport.totalRecordsChecked}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{t('syncCenter.validChecksums', 'Checksums Valides')}</div>
                      <div className="text-lg font-black text-emerald-400">{integrityReport.validChecksums}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{t('syncCenter.corruptedRecords', 'Corruptions Détectées')}</div>
                      <div className="text-lg font-black text-rose-400">{integrityReport.corruptedRecords}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{t('syncCenter.usedSpace', 'Espace Utilisé (approx)')}</div>
                      <div className="text-lg font-black text-slate-200">{(integrityReport.storageUsageBytesApprox / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">{t('syncCenter.analyzing', 'Analyse de la base SQLite et IndexedDB en cours...')}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('syncCenter.footerNote', 'Synchronisation bidirectionnelle automatique dès détection du réseau')}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {t('common.close', 'Fermer')}
          </button>
        </div>
      </div>
    </div>
  );
};
