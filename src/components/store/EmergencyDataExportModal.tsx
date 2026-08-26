import React, { useState, useEffect, useRef, ChangeEvent, DragEvent, useCallback } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  FileJson,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Copy,
  Layers,
  FolderOpen
} from 'lucide-react';
import {
  exportIndexedDbToFilesystem,
  harvestIndexedDbState,
  restoreIndexedDbFromEmergencyPayload,
  EmergencyBackupPayload,
  ExportResult,
  EmergencyBackupStats,
  formatByteSize
} from '../../services/indexedDbExportService';
import { notifyToast } from '../../services/storage';
import { registerBackButtonHandler } from '../../hooks/useAndroidBackButton';
import { safeHapticsImpact, safeHapticsNotification, isNativePlatform } from '../../utils/platform';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

interface EmergencyDataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyDataExportModal: React.FC<EmergencyDataExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [currentStats, setCurrentStats] = useState<EmergencyBackupStats | null>(null);
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);
  const [importPreview, setImportPreview] = useState<{
    file: File;
    payload: EmergencyBackupPayload;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'RESTORE'>('EXPORT');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load current statistics
  const loadStats = useCallback(async () => {
    try {
      const payload = await harvestIndexedDbState();
      setCurrentStats(payload.stats);
    } catch (err) {
      console.warn('Failed to harvest current stats:', err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadStats();

    // Register Android hardware back button handler
    const unregister = registerBackButtonHandler('emergency-export-modal', () => {
      onClose();
      return true;
    }, 110);

    return () => unregister();
  }, [isOpen, onClose, loadStats]);

  if (!isOpen) return null;

  // Execute export via Filesystem plugin
  const handleTriggerExport = async () => {
    setIsExporting(true);
    safeHapticsImpact(ImpactStyle.Heavy);

    try {
      const result = await exportIndexedDbToFilesystem();
      setLastExportResult(result);

      if (result.success) {
        notifyToast({
          type: 'success',
          title: 'Export d\'urgence Réussi',
          message: `${result.filename} enregistré (${result.fileSizeFormatted}).`
        });
      } else {
        notifyToast({
          type: 'error',
          title: 'Échec de l\'export d\'urgence',
          message: result.message
        });
      }
      await loadStats();
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Erreur inattendue',
        message: err?.message || 'Une erreur est survenue lors de l\'export.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Copy file URI / Path to clipboard
  const handleCopyPath = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    safeHapticsNotification(NotificationType.Success);
    notifyToast({
      type: 'info',
      title: 'Copié',
      message: 'Chemin du fichier copié dans le presse-papier.'
    });
  };

  // File drop & upload handler for emergency restore
  const handleProcessFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      notifyToast({
        type: 'error',
        title: 'Format Invalide',
        message: 'Veuillez sélectionner un fichier .json de sauvegarde d\'urgence.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || parsed.app !== 'DelicePOS') {
          throw new Error('Le fichier sélectionné ne correspond pas au format Délice POS.');
        }

        safeHapticsImpact(ImpactStyle.Light);
        setImportPreview({
          file,
          payload: parsed as EmergencyBackupPayload
        });
        setActiveTab('RESTORE');
      } catch (err: any) {
        safeHapticsNotification(NotificationType.Error);
        notifyToast({
          type: 'error',
          title: 'Fichier Invalide',
          message: err?.message || 'Impossible de décoder le JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleExecuteRestore = async () => {
    if (!importPreview) return;
    setIsRestoring(true);

    try {
      const res = await restoreIndexedDbFromEmergencyPayload(importPreview.payload, restoreMode);
      notifyToast({
        type: 'success',
        title: 'Restauration Effectuée',
        message: res.message
      });
      setImportPreview(null);
      await loadStats();
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Échec de Restauration',
        message: err?.message || 'Impossible de restaurer les données.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      id="emergency-data-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="emergency-data-export-modal-container"
        className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-amber-400/20"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Dump d'Urgence IndexedDB & Filesystem
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase">
                  Secours Gérant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Export direct sur stockage physique local via le plugin Filesystem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('EXPORT')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'EXPORT'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Créer un Dump Local</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RESTORE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'RESTORE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restaurer / Importer {importPreview ? '• (Fichier prêt)' : ''}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'EXPORT' && (
            <>
              {/* Summary of Local IndexedDB State */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>État actuel des bases IndexedDB & Caches locaux</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadStats}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Actualiser</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">Articles Produits</div>
                    <div className="text-base font-black text-amber-300">
                      {currentStats?.productsCount ?? '...'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">Ventes Enregistrées</div>
                    <div className="text-base font-black text-emerald-400">
                      {currentStats?.salesCount ?? '...'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">File d'attente Offline</div>
                    <div className="text-base font-black text-indigo-400">
                      {currentStats?.offlineQueueCount ?? '...'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="text-slate-400 text-[10px]">Demandes Approvisionnement</div>
                    <div className="text-base font-black text-white">
                      {currentStats?.requisitionsCount ?? '...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Trigger Export */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Exportation Complète & Sécurisée
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Génère un instantané JSON exhaustif incluant la base Dexie, la file d'attente hors-ligne,
                      les réquisitions, la caisse et les invendus. Le fichier est écrit sur le stockage physique de l'appareil
                      via le plugin natif <strong>Filesystem</strong> (Dossier Documents).
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerExport}
                    disabled={isExporting}
                    className="flex-1 min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Génération du Dump Filesystem en cours...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Exporter le Dump d'Urgence (.JSON)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Last Export Result Details Card */}
              {lastExportResult && (
                <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-2.5 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dernier Dump Généré avec Succès</span>
                  </div>

                  <div className="space-y-1.5 text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Nom de fichier :</span>
                      <span className="font-mono font-bold text-white truncate max-w-[240px] sm:max-w-none">
                        {lastExportResult.filename}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Taille du fichier :</span>
                      <span className="font-bold text-amber-300">
                        {lastExportResult.fileSizeFormatted} ({lastExportResult.fileSizeBytes.toLocaleString()} octets)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cible de stockage :</span>
                      <span className="font-bold text-indigo-300">
                        {lastExportResult.storageTarget === 'CAPACITOR_FILESYSTEM'
                          ? `Dossier Local (${lastExportResult.directory || 'Documents'})`
                          : 'Téléchargement Navigateur'}
                      </span>
                    </div>

                    {lastExportResult.filePath && (
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <div className="font-mono text-[11px] text-slate-400 truncate flex-1">
                          {lastExportResult.filePath}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPath(lastExportResult.filePath!)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'RESTORE' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">
                    Glissez votre fichier de sauvegarde .JSON ici ou cliquez pour parcourir
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Compatible avec tous les dumps d'urgence générés par Délice POS & Lab
                  </p>
                </div>
              </div>

              {/* Import Preview */}
              {importPreview && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">
                        {importPreview.file.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatByteSize(importPreview.file.size)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Articles</div>
                      <div className="font-bold text-amber-300">
                        {importPreview.payload.stats?.productsCount || importPreview.payload.indexedDbState?.dexie?.products?.length || 0}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Ventes</div>
                      <div className="font-bold text-emerald-400">
                        {importPreview.payload.stats?.salesCount || importPreview.payload.indexedDbState?.dexie?.sales?.length || 0}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Boutique Source</div>
                      <div className="font-bold text-white truncate">
                        {importPreview.payload.storeContext?.storeName || 'Boutique'}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Checksum</div>
                      <div className="font-mono font-bold text-indigo-300 truncate">
                        {importPreview.payload.checksum || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Restore Mode Choice */}
                  <div className="pt-2 flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emergencyRestoreMode"
                        checked={restoreMode === 'REPLACE'}
                        onChange={() => setRestoreMode('REPLACE')}
                        className="accent-amber-400"
                      />
                      <span>Écraser & Remplacer</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emergencyRestoreMode"
                        checked={restoreMode === 'MERGE'}
                        onChange={() => setRestoreMode('MERGE')}
                        className="accent-amber-400"
                      />
                      <span>Fusionner les données</span>
                    </label>
                  </div>

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Restauration des tables IndexedDB en cours...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Lancer la Restauration d'Urgence</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
