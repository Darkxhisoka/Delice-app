import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Settings,
  RefreshCw,
  Database,
  Cloud,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  RotateCcw,
  Printer,
  Shield,
  Smartphone,
  HardDrive,
  Sliders,
  Check,
  Zap,
  Info,
  Server
} from 'lucide-react';
import {
  forceRefreshInventoryData,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  ForceRefreshProgress,
  ForceRefreshResult
} from '../../services/realtimeSync';
import { getQueueStats, isAppOffline, getIsSimulatedOffline } from '../../services/indexedDbQueue';
import { getRawMaterials, getProductionBatches, getRecipes, resetToDemoData, notifyToast } from '../../services/storage';
import { SoundHapticsSettingsPanel } from './SoundHapticsSettingsPanel';
import { OfflineSyncCenterModal } from './OfflineSyncCenterModal';
import { DataBackupModal } from './DataBackupModal';
import { registerBackButtonHandler } from '../../hooks/useAndroidBackButton';
import { FileJson } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSyncDrawer?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenSyncDrawer
}) => {
  const [autoSync, setAutoSync] = useState<boolean>(() => getAutoSyncEnabled());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshProgress, setRefreshProgress] = useState<ForceRefreshProgress | null>(null);
  const [lastRefreshResult, setLastRefreshResult] = useState<ForceRefreshResult | null>(null);
  const [isSyncCenterOpen, setIsSyncCenterOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [inventoryStats, setInventoryStats] = useState({
    rawMaterials: 0,
    productionBatches: 0,
    recipes: 0
  });

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackButtonHandler('settings-modal', () => {
      onClose();
      return true;
    }, 90);

    return () => unregister();
  }, [isOpen, onClose]);

  const isOffline = typeof navigator !== 'undefined' ? (!navigator.onLine || getIsSimulatedOffline()) : false;

  const loadCurrentStats = async () => {
    try {
      const stats = await getQueueStats();
      setQueueCount(stats.pendingCount);
      if (stats.lastSyncTimestamp) {
        setLastSyncTime(stats.lastSyncTimestamp);
      }
      setInventoryStats({
        rawMaterials: getRawMaterials().length,
        productionBatches: getProductionBatches().length,
        recipes: getRecipes().length
      });
    } catch (err) {
      console.warn('Error loading stats in SettingsModal:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAutoSync(getAutoSyncEnabled());
      loadCurrentStats();
    }
  }, [isOpen]);

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
  };

  const handleForceRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLastRefreshResult(null);

    const result = await forceRefreshInventoryData((progress) => {
      setRefreshProgress(progress);
    });

    setIsRefreshing(false);
    setLastRefreshResult(result);
    setLastSyncTime(new Date().toISOString());
    loadCurrentStats();
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données aux valeurs de démonstration ?')) {
      resetToDemoData();
      loadCurrentStats();
      notifyToast({
        type: 'info',
        title: 'Données Réinitialisées',
        message: 'Toutes les données ont été remises aux valeurs de test initiales.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={isRefreshing ? undefined : onClose} 
      />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Paramètres & Synchronisation
              </h2>
              <p className="text-xs text-slate-400">
                Gestion des flux de données, rafraîchissement d'inventaire et connectivité
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRefreshing}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* 1. DEDICATED MANUAL SYNC & INVENTORY REFRESH SECTION */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Actualisation Manuelle des Stocks
                  </h3>
                  <p className="text-xs text-slate-400">
                    Forcer un rafraîchissement complet des données d'inventaire depuis le Cloud
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  isOffline 
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' 
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  {isOffline ? 'Mode Hors-Ligne' : 'Cloud Connecté'}
                </span>
              </div>
            </div>

            {/* Main Action Trigger Card */}
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                    Synchronisation Immédiate des Données
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Matières premières ({inventoryStats.rawMaterials}), Fiches de production ({inventoryStats.productionBatches}), Recettes ({inventoryStats.recipes})
                  </div>
                </div>

                {/* Force Refresh Button with Dynamic Animation State */}
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all select-none w-full sm:w-auto shrink-0 ${
                    isRefreshing
                      ? 'bg-indigo-600 text-white cursor-wait opacity-90'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-95'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-300' : 'text-white'}`} />
                  <span>{isRefreshing ? 'Synchronisation...' : 'Actualiser l\'Inventaire'}</span>
                </button>
              </div>

              {/* In-Progress Animated Progress Bar */}
              <AnimatePresence>
                {isRefreshing && refreshProgress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 pt-2 border-t border-slate-800"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5 truncate">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                        {refreshProgress.step}
                      </span>
                      <span className="text-indigo-300 font-mono font-bold">
                        {refreshProgress.percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <motion.div
                        className="bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${refreshProgress.percent}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success / Result Feedback Banner */}
              <AnimatePresence>
                {!isRefreshing && lastRefreshResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      lastRefreshResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {lastRefreshResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="font-bold text-white">
                        {lastRefreshResult.success
                          ? 'Synchronisation terminée avec succès !'
                          : 'Échec partiel de la synchronisation'}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {lastRefreshResult.totalItems} articles d'inventaire synchronisés avec le Cloud.
                        {lastRefreshResult.syncedOfflineCount > 0 && ` (${lastRefreshResult.syncedOfflineCount} actions hors-ligne transmises)`}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Automatic Background Sync Toggle Switch */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Synchronisation Continue en Arrière-Plan
                </div>
                <div className="text-[11px] text-slate-400">
                  Transmet automatiquement les changements de stock toutes les 45s et à chaque reconnexion
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAutoSync}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoSync ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={autoSync}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Offline Queue Information */}
            <div className="flex items-center justify-between text-xs px-2 pt-1 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Transactions hors-ligne en attente :
                <strong className={`font-mono ${queueCount > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {queueCount}
                </strong>
              </span>

              {lastSyncTime && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Dernier sync : {new Date(lastSyncTime).toLocaleTimeString('fr-FR')}
                </span>
              )}
            </div>
          </div>

          {/* 2. AUDIO & HAPTICS FEEDBACK ENGINE */}
          <SoundHapticsSettingsPanel />

          {/* 3. SYSTEM PREFERENCES & DATA MANAGEMENT */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Préférences Système & Impression
                </h3>
                <p className="text-xs text-slate-400">
                  Configuration matérielle et gestion du stockage local
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SQLite & Offline Engine Card */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Base SQLite & Offline Sync
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {queueCount} en attente
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Consulter les tables locales SQLite / IndexedDB, auditer les checksums et piloter la file de réplication.
                </div>
                <button
                  onClick={() => setIsSyncCenterOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Ouvrir le Centre de Persistance SQLite</span>
                </button>
              </div>

              {/* Dexie JSON Backup & Restore Card */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <FileJson className="w-3.5 h-3.5 text-emerald-400" />
                    Sauvegarde & Restauration Dexie
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    JSON Export
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Exporter les bases Dexie (ventes, articles, panier) en JSON ou restaurer un backup local.
                </div>
                <button
                  type="button"
                  onClick={() => setIsBackupModalOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Gérer Sauvegardes JSON</span>
                </button>
              </div>

              {/* Thermal Printer Settings Card */}
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  Imprimante Thermique POS
                </div>
                <div className="text-[11px] text-slate-400">
                  Impression directe silencieuse configurée pour tickets 80mm & étiquettes de production.
                </div>
              </div>
            </div>

            {/* Reset Demo Data Action */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Réinitialiser la base de données locale
              </div>
              <button
                onClick={handleResetData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurer Démo</span>
              </button>
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-6 py-3.5 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-500" />
            <span>Pâtisserie le Délice • v1.4.0 (Sync Engine Pro)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors min-h-[38px]"
          >
            Fermer
          </button>
        </div>

      </div>

      <OfflineSyncCenterModal
        isOpen={isSyncCenterOpen}
        onClose={() => {
          setIsSyncCenterOpen(false);
          loadCurrentStats();
        }}
      />

      <DataBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => {
          setIsBackupModalOpen(false);
          loadCurrentStats();
        }}
      />
    </div>
  );
};
