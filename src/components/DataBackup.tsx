import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  FileJson,
  RefreshCw,
  ShieldCheck,
  Calendar,
  HardDrive,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { db, initPersistentStorage, StoragePersistStatus, DexieProduct, DexieSale, DexieCartItem } from '../db/database';
import {
  getRawMaterials,
  getRecipes,
  getProductionBatches,
  getRetailStoreStock,
  getSaleTransactions,
  getRequisitions,
  getReceipts,
  notifyToast
} from '../services/storage';
import {
  exportIndexedDbToFilesystem,
  ExportResult,
  restoreIndexedDbFromEmergencyPayload
} from '../services/indexedDbExportService';
import { safeHapticsImpact, safeHapticsNotification, isNativePlatform } from '../utils/platform';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

export interface DeliceBackupPayload {
  app: 'DelicePOS';
  version: number;
  exportedAt: string;
  dexieData: {
    products: DexieProduct[];
    sales: DexieSale[];
    cart: DexieCartItem[];
  };
  localStorageData: {
    rawMaterials: any[];
    recipes: any[];
    productionBatches: any[];
    retailStoreStock: any[];
    saleTransactions: any[];
    requisitions: any[];
    receipts: any[];
  };
}

const STORAGE_KEYS = {
  RAW_MATERIALS: 'pastry_app_raw_materials',
  RECEIPTS: 'pastry_app_receipts',
  REQUISITIONS: 'pastry_app_requisitions',
  RECIPES: 'pastry_app_recipes',
  RETAIL_STORE_STOCK: 'pastry_app_retail_store_stock',
  SALE_TRANSACTIONS: 'pastry_app_sale_transactions',
  PRODUCTION_BATCHES: 'pastry_app_production_batches'
};

export const DataBackup: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [persistStatus, setPersistStatus] = useState<StoragePersistStatus | null>(null);
  const [stats, setStats] = useState({
    productsCount: 0,
    salesCount: 0,
    cartCount: 0,
    rawMaterialsCount: 0,
    recipesCount: 0,
    lastBackupTime: ''
  });
  const [importPreview, setImportPreview] = useState<{
    file: File;
    payload: DeliceBackupPayload;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'REPLACE' | 'MERGE'>('REPLACE');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isExportingEmergency, setIsExportingEmergency] = useState<boolean>(false);
  const [emergencyExportResult, setEmergencyExportResult] = useState<ExportResult | null>(null);

  const handleExportEmergencyFilesystem = async () => {
    setIsExportingEmergency(true);
    safeHapticsImpact(ImpactStyle.Heavy);

    try {
      const result = await exportIndexedDbToFilesystem();
      setEmergencyExportResult(result);

      if (result.success) {
        notifyToast({
          type: 'success',
          title: "Dump d'urgence Filesystem Réussi",
          message: `${result.filename} sauvegardé (${result.fileSizeFormatted}).`
        });
      } else {
        notifyToast({
          type: 'error',
          title: "Échec du dump d'urgence",
          message: result.message
        });
      }
      await refreshStats();
    } catch (err: any) {
      notifyToast({
        type: 'error',
        title: 'Erreur inattendue',
        message: err?.message || "Erreur lors du dump d'urgence."
      });
    } finally {
      setIsExportingEmergency(false);
    }
  };

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

  const refreshStats = async () => {
    try {
      const [storageStatus, pCount, sCount, cCount] = await Promise.all([
        initPersistentStorage(),
        db.products.count(),
        db.sales.count(),
        db.cart.count()
      ]);

      setPersistStatus(storageStatus);
      const rawMat = getRawMaterials();
      const rec = getRecipes();
      const lastBackup = localStorage.getItem('delice_last_backup_timestamp') || '';

      setStats({
        productsCount: pCount,
        salesCount: sCount,
        cartCount: cCount,
        rawMaterialsCount: rawMat.length,
        recipesCount: rec.length,
        lastBackupTime: lastBackup
      });
    } catch (err) {
      console.warn('Failed to load backup stats:', err);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  // Export JSON Backup
  const handleExportData = async () => {
    setIsExporting(true);
    safeHapticsImpact(ImpactStyle.Medium);

    try {
      const [dexieProducts, dexieSales, dexieCart] = await Promise.all([
        db.products.toArray(),
        db.sales.toArray(),
        db.cart.toArray()
      ]);

      const backupPayload: DeliceBackupPayload = {
        app: 'DelicePOS',
        version: 1,
        exportedAt: new Date().toISOString(),
        dexieData: {
          products: dexieProducts,
          sales: dexieSales,
          cart: dexieCart
        },
        localStorageData: {
          rawMaterials: getRawMaterials(),
          recipes: getRecipes(),
          productionBatches: getProductionBatches(),
          retailStoreStock: getRetailStoreStock(),
          saleTransactions: getSaleTransactions(),
          requisitions: getRequisitions(),
          receipts: getReceipts()
        }
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `delice-pos-backup-${timestamp}.json`;

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      localStorage.setItem('delice_last_backup_timestamp', new Date().toISOString());
      await refreshStats();

      safeHapticsNotification(NotificationType.Success);
      notifyToast({
        type: 'success',
        title: 'Sauvegarde Exportée',
        message: `Fichier ${fileName} généré avec succès (${(blob.size / 1024).toFixed(1)} KB).`
      });
    } catch (err: any) {
      safeHapticsNotification(NotificationType.Error);
      notifyToast({
        type: 'error',
        title: "Échec de l'exportation",
        message: err?.message || "Une erreur est survenue lors de l'export des données."
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Validate File Content
  const processUploadedFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      notifyToast({
        type: 'error',
        title: 'Format Invalide',
        message: 'Veuillez sélectionner un fichier .json de sauvegarde Délice valide.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation of Backup Payload
        if (!parsed || parsed.app !== 'DelicePOS' || !parsed.dexieData) {
          throw new Error('Le fichier sélectionné ne correspond pas au schéma de sauvegarde Délice POS.');
        }

        safeHapticsImpact(ImpactStyle.Light);
        setImportPreview({
          file,
          payload: parsed as DeliceBackupPayload
        });
      } catch (err: any) {
        safeHapticsNotification(NotificationType.Error);
        notifyToast({
          type: 'error',
          title: 'Fichier Invalide ou Corrompu',
          message: err?.message || 'Impossible de décoder le contenu JSON.'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Execute Import & Restore
  const handleExecuteRestore = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    safeHapticsImpact(ImpactStyle.Heavy);

    try {
      const { dexieData, localStorageData } = importPreview.payload;

      if (restoreMode === 'REPLACE') {
        // Clear existing Dexie tables
        await Promise.all([
          db.products.clear(),
          db.sales.clear(),
          db.cart.clear()
        ]);
      }

      // Restore Dexie Tables
      if (dexieData.products?.length) {
        await db.products.bulkPut(dexieData.products);
      }
      if (dexieData.sales?.length) {
        await db.sales.bulkPut(dexieData.sales);
      }
      if (dexieData.cart?.length) {
        await db.cart.bulkPut(dexieData.cart);
      }

      // Restore Local Storage Collections
      if (localStorageData) {
        if (localStorageData.rawMaterials) {
          localStorage.setItem(STORAGE_KEYS.RAW_MATERIALS, JSON.stringify(localStorageData.rawMaterials));
        }
        if (localStorageData.recipes) {
          localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(localStorageData.recipes));
        }
        if (localStorageData.productionBatches) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTION_BATCHES, JSON.stringify(localStorageData.productionBatches));
        }
        if (localStorageData.retailStoreStock) {
          localStorage.setItem(STORAGE_KEYS.RETAIL_STORE_STOCK, JSON.stringify(localStorageData.retailStoreStock));
        }
        if (localStorageData.saleTransactions) {
          localStorage.setItem(STORAGE_KEYS.SALE_TRANSACTIONS, JSON.stringify(localStorageData.saleTransactions));
        }
        if (localStorageData.requisitions) {
          localStorage.setItem(STORAGE_KEYS.REQUISITIONS, JSON.stringify(localStorageData.requisitions));
        }
        if (localStorageData.receipts) {
          localStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(localStorageData.receipts));
        }
      }

      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshStats();

      safeHapticsNotification(NotificationType.Success);
      notifyToast({
        type: 'success',
        title: 'Restauration Terminée',
        message: 'Toutes les bases de données locales ont été restaurées avec succès !'
      });
    } catch (err: any) {
      safeHapticsNotification(NotificationType.Error);
      notifyToast({
        type: 'error',
        title: 'Échec de la Restauration',
        message: err?.message || "Erreur lors de l'injection des données dans la base locale."
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div id="data-backup-component" className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div className="text-start">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                {t('dataBackup.bannerTitle', 'Sauvegarde & Restauration Locale')}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {t('dataBackup.dexieBadge', 'Dexie / IndexedDB')}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('dataBackup.bannerSubtitle', 'Exportez et restaurez vos collections locales en format JSON pour garantir la souveraineté totale de vos données.')}
              </p>
            </div>
          </div>

          <button
            id="backup-export-action-btn"
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            <span>{isExporting ? t('dataBackup.exportingJson', 'Génération JSON...') : t('dataBackup.downloadJson', 'Télécharger Sauvegarde JSON')}</span>
          </button>
        </div>
      </div>

      {/* Storage Health & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-start">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t('dataBackup.cardProducts', 'Articles Produits')}</div>
          <div className="text-xl font-black text-white mt-0.5">{stats.productsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('dataBackup.cardProductsSub', 'Table Dexie products')}</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t('dataBackup.cardSales', 'Tickets & Ventes')}</div>
          <div className="text-xl font-black text-indigo-400 mt-0.5">{stats.salesCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('dataBackup.cardSalesSub', 'Table Dexie sales')}</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t('dataBackup.cardRawMaterials', 'Matières Premières')}</div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{stats.rawMaterialsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{t('dataBackup.cardRawMaterialsSub', 'Inventaire Laboratoire')}</div>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase">{t('dataBackup.cardPersist', 'Persistance OS')}</div>
          <div className="text-xs font-black text-emerald-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{persistStatus?.isPersisted ? t('dataBackup.persisted', 'Persistant') : t('dataBackup.standard', 'Standard')}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            {persistStatus?.usageBytes ? `${(persistStatus.usageBytes / 1024 / 1024).toFixed(1)} ${t('dataBackup.mbUsed', 'MB utilisé')}` : t('dataBackup.androidProtected', 'Protégé Android')}
          </div>
        </div>
      </div>

      {/* Emergency Filesystem Dump Card for Store Managers */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 rounded-3xl space-y-4 shadow-xl text-start">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {t('dataBackup.dumpTitle', "Dump d'Urgence Filesystem (Plugin Natif)")}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t('dataBackup.dumpBadge', 'Mesure de Secours Gérant')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t('dataBackup.dumpDesc', "Capture instantanée atomique de toutes les bases IndexedDB (Dexie, file d'attente offline, caisse, stocks) écrite directement sur le stockage physique (dossier Documents).")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportEmergencyFilesystem}
            disabled={isExportingEmergency}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
          >
            <HardDrive className={`w-4 h-4 ${isExportingEmergency ? 'animate-spin' : ''}`} />
            <span>{isExportingEmergency ? t('dataBackup.dumpingBtn', 'Écriture Filesystem...') : t('dataBackup.dumpBtn', "Générer Dump d'Urgence")}</span>
          </button>
        </div>

        {emergencyExportResult && (
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2 text-xs text-slate-300 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('dataBackup.dumpGeneratedFile', 'Fichier généré :')}</span>
              <span className="font-mono font-bold text-amber-300 truncate max-w-[280px]">
                {emergencyExportResult.filename}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t('dataBackup.dumpLocation', 'Emplacement :')}</span>
              <span className="font-bold text-indigo-300">
                {emergencyExportResult.storageTarget === 'CAPACITOR_FILESYSTEM'
                  ? `${t('dataBackup.dumpLocal', 'Stockage Local')} (${emergencyExportResult.directory || 'Documents'})`
                  : t('dataBackup.dumpBrowserDownload', 'Téléchargement Direct Navigateur')}
              </span>
            </div>
            {emergencyExportResult.filePath && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-400 truncate">
                  {emergencyExportResult.filePath}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPath(emergencyExportResult.filePath!)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{t('dataBackup.copyPath', 'Copier chemin')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restore Area (Drag & Drop + File Selector) */}
      <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 text-start">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">{t('dataBackup.restoreTitle', 'Restaurer les Données depuis un Fichier JSON')}</h3>
          </div>
          {stats.lastBackupTime && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {t('dataBackup.lastExport', 'Dernier export :')} {new Date(stats.lastBackupTime).toLocaleDateString()} {new Date(stats.lastBackupTime).toLocaleTimeString().slice(0, 5)}
            </span>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-200">
              {t('dataBackup.dragDropText', 'Glissez-déposez votre fichier de sauvegarde')} <span className="text-indigo-400">.json</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('dataBackup.browseDevice', "ou cliquez pour parcourir les dossiers de l'appareil")}
            </p>
          </div>
        </div>

        {/* Import Preview Modal / Confirmation Card */}
        {importPreview && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/60 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">{t('dataBackup.validatedBackup', 'Sauvegarde validée :')} {importPreview.file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
              >
                {t('dataBackup.cancel', 'Annuler')}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('dataBackup.cardProducts', 'Produits')}</span>
                <strong className="text-slate-200">{importPreview.payload.dexieData.products?.length || 0}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('dataBackup.cardSales', 'Ventes')}</span>
                <strong className="text-slate-200">{importPreview.payload.dexieData.sales?.length || 0}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('dataBackup.cardRawMaterials', 'Matières Labo')}</span>
                <strong className="text-slate-200">{importPreview.payload.localStorageData?.rawMaterials?.length || 0}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">{t('dataBackup.exportDate', "Date d'export")}</span>
                <strong className="text-slate-200 truncate block">
                  {new Date(importPreview.payload.exportedAt).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {/* Mode selection */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-400">{t('dataBackup.injectionMode', "Mode d'injection :")}</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'REPLACE'}
                  onChange={() => setRestoreMode('REPLACE')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>{t('dataBackup.replaceMode', 'Remplacement complet (Recommandé)')}</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="restoreMode"
                  checked={restoreMode === 'MERGE'}
                  onChange={() => setRestoreMode('MERGE')}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>{t('dataBackup.mergeMode', 'Fusionner')}</span>
              </label>
            </div>

            {/* Confirm button */}
            <button
              id="backup-confirm-restore-btn"
              type="button"
              onClick={handleExecuteRestore}
              disabled={isImporting}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
              <span>{isImporting ? t('dataBackup.restoring', 'Restauration en cours...') : t('dataBackup.confirmRestore', 'Confirmer et Restaurer la Base')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
