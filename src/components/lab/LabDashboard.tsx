import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { subscribeToSupabaseRealtime } from '../../services/supabaseService';
import { notifyToast } from '../../services/storage';
import { RequisitionManager } from './RequisitionManager';
import { ReceiptForm } from './ReceiptForm';
import { InventoryList } from './InventoryList';
import { ReceiptHistory } from './ReceiptHistory';
import { RecipeCosting } from './RecipeCosting';
import { SupplierManager } from './SupplierManager';
import { StoreManager } from './StoreManager';
import { AnalyticsReporting } from './AnalyticsReporting';
import { ActivityLog } from './ActivityLog';
import { LabSalesOverview } from './LabSalesOverview';
import { ProductionOverview } from './ProductionOverview';
import { ProductionRunner } from './ProductionRunner';
import { WasteLossManager } from './WasteLossManager';
import { LabWasteAnalytics } from './LabWasteAnalytics';
import { MarginDashboard } from './MarginDashboard';
import { DeliveryManifestView } from './DeliveryManifest';
import { SupplierPO } from './SupplierPO';
import { DailyProductionPlan } from './DailyProductionPlan';
import { QualityControl } from './QualityControl';
import { StoreAnalytics } from '../reports/StoreAnalytics';
import { PackagingLab } from './PackagingLab';
import { RawMaterialDestocking } from './RawMaterialDestocking';
import { ExecutiveInventoryDashboard } from './ExecutiveInventoryDashboard';
import { OfflineQueueStatusPill } from './OfflineQueueStatusPill';
import { OfflineQueueDrawer } from './OfflineQueueDrawer';
import { SyncStatusView } from './SyncStatusView';
import { CompanyLogo } from '../common/CompanyLogo';
import { ProductionBatchPlanner } from './ProductionBatchPlanner';
import { ColdRoomExpiryTracker } from './ColdRoomExpiryTracker';
import { PriceInflationSimulator } from './PriceInflationSimulator';
import { StoreReturnsManager } from '../store/StoreReturnsManager';
import { ExportReportingCenter } from '../reports/ExportReportingCenter';
import { ChefVoiceNotesManager } from './ChefVoiceNotesManager';
import { UnitConversionWidget } from '../common/UnitConversionWidget';
import { LabProduction } from './LabProduction';
import {
  FlaskConical,
  Receipt,
  Boxes,
  FileText,
  ChefHat,
  Building,
  Store,
  BarChart3,
  History,
  ShoppingCart,
  Factory,
  Zap,
  AlertTriangle,
  PieChart,
  TrendingUp,
  Truck,
  Utensils,
  ShieldCheck,
  Package,
  Trash2,
  Radio,
  Crown,
  LayoutGrid,
  Search,
  HardDrive,
  Activity,
  Snowflake,
  Calculator,
  RotateCcw,
  FileSpreadsheet,
  Mic,
  Scale,
  X
} from 'lucide-react';

export type LabModule = 
  | 'EXECUTIVE_DASHBOARD'
  | 'LAB_PRODUCTION_DISPATCHER'
  | 'VOICE_NOTES'
  | 'UNIT_CONVERTER'
  | 'MARGIN_ANALYTICS' 
  | 'DELIVERY_LOGISTICS' 
  | 'PACKAGING'
  | 'DESTOCKING'
  | 'DAILY_PRODUCTION_PLAN'
  | 'PRODUCTION_BATCH_PLANNER'
  | 'COLD_ROOM_TRACKER'
  | 'PRICE_INFLATION'
  | 'STORE_RETURNS'
  | 'EXPORT_REPORTS'
  | 'SUPPLIER_PO'
  | 'QUALITY_CONTROL'
  | 'MULTI_STORE_ANALYTICS'
  | 'REQUISITIONS' 
  | 'PRODUCTION_RUNNER' 
  | 'PRODUCTION_OVERVIEW' 
  | 'WASTE_LOSS' 
  | 'RECONCILIATION_WASTE' 
  | 'NEW_RECEIPT' 
  | 'INVENTORY' 
  | 'RECIPES' 
  | 'RECEIPT_HISTORY' 
  | 'SUPPLIERS' 
  | 'STORES' 
  | 'STORE_SALES' 
  | 'ANALYTICS' 
  | 'SYNC_STATUS'
  | 'OFFLINE_QUEUE'
  | 'ACTIVITY_LOG';

interface ModuleCategoryConfig {
  categoryKey: string;
  categoryTitleKey: string;
  categoryIcon: React.ComponentType<{ className?: string }>;
  items: {
    id: LabModule;
    labelKey: string;
    descKey: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[];
}

const RAW_LAB_CATEGORIES: ModuleCategoryConfig[] = [
  {
    categoryKey: 'direction',
    categoryTitleKey: 'labCategories.direction',
    categoryIcon: Crown,
    items: [
      { id: 'EXECUTIVE_DASHBOARD', labelKey: 'labModules.executiveDashboard', descKey: 'labModules.executiveDashboardDesc', icon: Crown, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'MARGIN_ANALYTICS', labelKey: 'labModules.marginAnalytics', descKey: 'labModules.marginAnalyticsDesc', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-400/20' },
      { id: 'PRICE_INFLATION', labelKey: 'labModules.priceInflation', descKey: 'labModules.priceInflationDesc', icon: Calculator, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'EXPORT_REPORTS', labelKey: 'labModules.exportReports', descKey: 'labModules.exportReportsDesc', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-400/20' },
      { id: 'MULTI_STORE_ANALYTICS', labelKey: 'labModules.multiStoreAnalytics', descKey: 'labModules.multiStoreAnalyticsDesc', icon: BarChart3, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'ANALYTICS', labelKey: 'labModules.analytics', descKey: 'labModules.analyticsDesc', icon: PieChart, color: 'text-amber-400 bg-amber-400/20' }
    ]
  },
  {
    categoryKey: 'production',
    categoryTitleKey: 'labCategories.production',
    categoryIcon: Utensils,
    items: [
      { id: 'LAB_PRODUCTION_DISPATCHER', labelKey: 'labModules.labProductionDispatcher', descKey: 'labModules.labProductionDispatcherDesc', icon: ChefHat, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'VOICE_NOTES', labelKey: 'labModules.voiceNotes', descKey: 'labModules.voiceNotesDesc', icon: Mic, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'PRODUCTION_BATCH_PLANNER', labelKey: 'labModules.productionBatchPlanner', descKey: 'labModules.productionBatchPlannerDesc', icon: Zap, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DAILY_PRODUCTION_PLAN', labelKey: 'labModules.dailyProductionPlan', descKey: 'labModules.dailyProductionPlanDesc', icon: Utensils, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'PRODUCTION_RUNNER', labelKey: 'labModules.productionRunner', descKey: 'labModules.productionRunnerDesc', icon: Zap, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'RECIPES', labelKey: 'labModules.recipes', descKey: 'labModules.recipesDesc', icon: ChefHat, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'PRODUCTION_OVERVIEW', labelKey: 'labModules.productionOverview', descKey: 'labModules.productionOverviewDesc', icon: Factory, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'WASTE_LOSS', labelKey: 'labModules.wasteLoss', descKey: 'labModules.wasteLossDesc', icon: AlertTriangle, color: 'text-rose-400 bg-rose-400/20' }
    ]
  },
  {
    categoryKey: 'inventory',
    categoryTitleKey: 'labCategories.inventory',
    categoryIcon: Boxes,
    items: [
      { id: 'UNIT_CONVERTER', labelKey: 'labModules.unitConverter', descKey: 'labModules.unitConverterDesc', icon: Scale, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'COLD_ROOM_TRACKER', labelKey: 'labModules.coldRoomTracker', descKey: 'labModules.coldRoomTrackerDesc', icon: Snowflake, color: 'text-cyan-400 bg-cyan-400/20' },
      { id: 'SUPPLIER_PO', labelKey: 'labModules.supplierPo', descKey: 'labModules.supplierPoDesc', icon: ShoppingCart, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'NEW_RECEIPT', labelKey: 'labModules.newReceipt', descKey: 'labModules.newReceiptDesc', icon: Receipt, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'INVENTORY', labelKey: 'labModules.inventory', descKey: 'labModules.inventoryDesc', icon: Boxes, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'PACKAGING', labelKey: 'labModules.packaging', descKey: 'labModules.packagingDesc', icon: Package, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DESTOCKING', labelKey: 'labModules.destocking', descKey: 'labModules.destockingDesc', icon: Trash2, color: 'text-rose-400 bg-rose-400/20' },
      { id: 'RECEIPT_HISTORY', labelKey: 'labModules.receiptHistory', descKey: 'labModules.receiptHistoryDesc', icon: FileText, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'SUPPLIERS', labelKey: 'labModules.suppliers', descKey: 'labModules.suppliersDesc', icon: Building, color: 'text-indigo-400 bg-indigo-400/20' }
    ]
  },
  {
    categoryKey: 'logistics',
    categoryTitleKey: 'labCategories.logistics',
    categoryIcon: Truck,
    items: [
      { id: 'REQUISITIONS', labelKey: 'labModules.requisitions', descKey: 'labModules.requisitionsDesc', icon: FlaskConical, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORE_RETURNS', labelKey: 'labModules.storeReturns', descKey: 'labModules.storeReturnsDesc', icon: RotateCcw, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DELIVERY_LOGISTICS', labelKey: 'labModules.deliveryLogistics', descKey: 'labModules.deliveryLogisticsDesc', icon: Truck, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORES', labelKey: 'labModules.stores', descKey: 'labModules.storesDesc', icon: Store, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORE_SALES', labelKey: 'labModules.storeSales', descKey: 'labModules.storeSalesDesc', icon: ShoppingCart, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'RECONCILIATION_WASTE', labelKey: 'labModules.reconciliationWaste', descKey: 'labModules.reconciliationWasteDesc', icon: PieChart, color: 'text-amber-400 bg-amber-400/20' }
    ]
  },
  {
    categoryKey: 'quality',
    categoryTitleKey: 'labCategories.quality',
    categoryIcon: ShieldCheck,
    items: [
      { id: 'QUALITY_CONTROL', labelKey: 'labModules.qualityControl', descKey: 'labModules.qualityControlDesc', icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'SYNC_STATUS', labelKey: 'labModules.syncStatus', descKey: 'labModules.syncStatusDesc', icon: Activity, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'OFFLINE_QUEUE', labelKey: 'labModules.offlineQueue', descKey: 'labModules.offlineQueueDesc', icon: HardDrive, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'ACTIVITY_LOG', labelKey: 'labModules.activityLog', descKey: 'labModules.activityLogDesc', icon: History, color: 'text-amber-400 bg-amber-400/20' }
    ]
  }
];

interface LabDesktopTabConfig {
  module: LabModule;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'amber-solid' | 'amber-outline' | 'indigo-solid' | 'indigo-outline' | 'emerald' | 'slate';
}

const LAB_DESKTOP_TABS: LabDesktopTabConfig[] = [
  { module: 'EXECUTIVE_DASHBOARD', labelKey: 'labModules.executiveDashboard', icon: Crown, variant: 'amber-solid' },
  { module: 'LAB_PRODUCTION_DISPATCHER', labelKey: 'labModules.labProductionDispatcher', icon: ChefHat, variant: 'amber-solid' },
  { module: 'VOICE_NOTES', labelKey: 'labModules.voiceNotes', icon: Mic, variant: 'amber-outline' },
  { module: 'DAILY_PRODUCTION_PLAN', labelKey: 'labModules.dailyProductionPlan', icon: Utensils, variant: 'amber-outline' },
  { module: 'SUPPLIER_PO', labelKey: 'labModules.supplierPo', icon: ShoppingCart, variant: 'indigo-outline' },
  { module: 'DELIVERY_LOGISTICS', labelKey: 'labModules.deliveryLogistics', icon: Truck, variant: 'indigo-outline' },
  { module: 'REQUISITIONS', labelKey: 'labModules.requisitions', icon: FlaskConical, variant: 'slate' },
  { module: 'PRODUCTION_RUNNER', labelKey: 'labModules.productionRunner', icon: Zap, variant: 'amber-outline' },
  { module: 'QUALITY_CONTROL', labelKey: 'labModules.qualityControl', icon: ShieldCheck, variant: 'indigo-outline' },
  { module: 'MARGIN_ANALYTICS', labelKey: 'labModules.marginAnalytics', icon: TrendingUp, variant: 'emerald' },
  { module: 'INVENTORY', labelKey: 'labModules.inventory', icon: Boxes, variant: 'slate' },
  { module: 'RECIPES', labelKey: 'labModules.recipes', icon: ChefHat, variant: 'slate' },
];

/**
 * Memoized Desktop Tab Navigation Button
 */
const LabDesktopTabButton = React.memo<{
  module: LabModule;
  isActive: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: LabDesktopTabConfig['variant'];
  onSelect: (module: LabModule) => void;
}>(({ module, isActive, label, icon: Icon, variant = 'slate', onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(module);
  }, [onSelect, module]);

  let activeClass = 'bg-indigo-600 text-white shadow-sm';
  let inactiveClass = 'text-slate-300 hover:bg-white/10 hover:text-white';

  if (variant === 'amber-solid') {
    activeClass = 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300';
    inactiveClass = 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/30';
  } else if (variant === 'amber-outline') {
    activeClass = 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300';
    inactiveClass = 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30';
  } else if (variant === 'indigo-outline') {
    activeClass = 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 font-black';
    inactiveClass = 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30';
  } else if (variant === 'emerald') {
    activeClass = 'bg-emerald-500 text-slate-950 font-black shadow-md ring-2 ring-emerald-300';
    inactiveClass = 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
});
LabDesktopTabButton.displayName = 'LabDesktopTabButton';

/**
 * Memoized Mobile Material 3 Bottom Nav Item for Lab
 */
const LabMobileBottomNavButton = React.memo<{
  isActive: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColorClass: string;
  hasBadge?: boolean;
  onClick: () => void;
}>(({ isActive, label, icon: Icon, activeColorClass, hasBadge, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-2xl transition-all active:scale-95 cursor-pointer ${
        isActive ? `${activeColorClass} font-black` : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className="relative">
        <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
        {hasBadge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <span className="text-[10px] tracking-tight mt-0.5">{label}</span>
    </button>
  );
});
LabMobileBottomNavButton.displayName = 'LabMobileBottomNavButton';

/**
 * Memoized Lab Module Card Item for Bottom Sheet Modal
 */
const LabModuleCardItem = React.memo<{
  id: LabModule;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isActive: boolean;
  onSelect: (mod: LabModule) => void;
}>(({ id, label, desc, icon: Icon, color, isActive, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-3 rounded-2xl border text-start flex items-start gap-3 transition-all active:scale-95 cursor-pointer ${
        isActive
          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
          : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800 text-slate-200'
      }`}
    >
      <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-slate-950 text-amber-400' : color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold truncate">{label}</div>
        <div className={`text-[10px] line-clamp-1 ${isActive ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {desc}
        </div>
      </div>
    </button>
  );
});
LabModuleCardItem.displayName = 'LabModuleCardItem';

export const LabDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeModule, setActiveModule] = useState<LabModule>('EXECUTIVE_DASHBOARD');
  const [isModuleSheetOpen, setIsModuleSheetOpen] = useState<boolean>(false);
  const [isOfflineQueueDrawerOpen, setIsOfflineQueueDrawerOpen] = useState<boolean>(false);
  const [moduleSearch, setModuleSearch] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime((table, payload) => {
      setLastSyncTime(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      let tableLabel = t('common.syncDataLoading');
      if (table === 'store_requisitions') tableLabel = t('labModules.requisitions');
      if (table === 'raw_materials') tableLabel = t('inventory.rawMaterials');
      if (table === 'packaging_materials') tableLabel = t('inventory.packaging');
      if (table === 'inventory_adjustments') tableLabel = t('labModules.destocking');

      notifyToast({
        type: 'info',
        title: `🔴 Realtime : ${tableLabel}`,
        message: `${tableLabel} (${payload.eventType || 'UPDATE'}).`
      });
    });

    return () => {
      unsubscribe();
    };
  }, [t]);

  const handleSelectModule = useCallback((mod: LabModule) => {
    setActiveModule(mod);
    setIsModuleSheetOpen(false);
  }, []);

  const handleOpenModuleSheet = useCallback(() => {
    setIsModuleSheetOpen(true);
  }, []);

  const handleCloseModuleSheet = useCallback(() => {
    setIsModuleSheetOpen(false);
  }, []);

  const handleOpenOfflineQueue = useCallback(() => {
    setIsOfflineQueueDrawerOpen(true);
  }, []);

  const handleCloseOfflineQueue = useCallback(() => {
    setIsOfflineQueueDrawerOpen(false);
  }, []);

  const handleClearModuleSearch = useCallback(() => {
    setModuleSearch('');
  }, []);

  const isOtherActive = useMemo(() => {
    return !['EXECUTIVE_DASHBOARD', 'DAILY_PRODUCTION_PLAN', 'SUPPLIER_PO', 'DELIVERY_LOGISTICS'].includes(activeModule);
  }, [activeModule]);

  const totalModulesCount = useMemo(() => {
    return RAW_LAB_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const localizedCategories = useMemo(() => {
    return RAW_LAB_CATEGORIES.map((cat) => ({
      title: t(cat.categoryTitleKey),
      icon: cat.categoryIcon,
      items: cat.items.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        desc: t(item.descKey),
        icon: item.icon,
        color: item.color
      }))
    }));
  }, [t]);

  const filteredCategories = useMemo(() => {
    const query = moduleSearch.toLowerCase().trim();
    if (!query) return localizedCategories;

    return localizedCategories.map((cat) => {
      const items = cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query) ||
          cat.title.toLowerCase().includes(query)
      );
      return { ...cat, items };
    }).filter((cat) => cat.items.length > 0);
  }, [moduleSearch, localizedCategories]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-4 sm:space-y-6 pb-28 md:pb-8">
      
      {/* Central Lab Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-indigo-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 p-2 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/10 border border-amber-500/40">
              <CompanyLogo imgClassName="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">{t('nav.labTitle')}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {t('nav.roleAdmin')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>Realtime • {lastSyncTime}</span>
                </span>
                <OfflineQueueStatusPill onOpenDrawer={handleOpenOfflineQueue} />
              </div>
              <p className="text-xs text-slate-300 mt-0.5 sm:mt-1">
                {t('nav.labHubDesc')}
              </p>
            </div>
          </div>

          {/* Quick Access Tools: Unit Converter & Voice Note */}
          <div className="flex items-center gap-2">
            <button
              id="lab-header-unit-converter-btn"
              type="button"
              onClick={() => handleSelectModule('UNIT_CONVERTER')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                activeModule === 'UNIT_CONVERTER'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-amber-300 border border-amber-400/30'
              }`}
              title={t('unitConverter.title', 'Convertisseur Universel d\'Unités & Coûts')}
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{t('unitConverter.openTool', 'Convertisseur d\'Unités')}</span>
              <span className="sm:hidden">{t('unitConverter.title', 'Unités')}</span>
            </button>

            <button
              id="lab-header-voice-notes-btn"
              type="button"
              onClick={() => handleSelectModule('VOICE_NOTES')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
                activeModule === 'VOICE_NOTES'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-amber-400 border border-amber-400/30'
              }`}
            >
              <Mic className="w-4 h-4 text-amber-400" />
              <span>{t('labModules.voiceNotes')}</span>
            </button>
          </div>
        </div>

        {/* Central Lab Horizontal Module Navigation Tabs (Desktop Scrollable) */}
        <div className="hidden md:flex mt-6 pt-4 border-t border-indigo-900/50 items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {LAB_DESKTOP_TABS.map((tab) => (
            <LabDesktopTabButton
              key={tab.module}
              module={tab.module}
              isActive={activeModule === tab.module}
              label={t(tab.labelKey)}
              icon={tab.icon}
              variant={tab.variant}
              onSelect={handleSelectModule}
            />
          ))}

          <button
            type="button"
            onClick={handleOpenModuleSheet}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700 whitespace-nowrap cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            <span>{t('nav.allModules')} ({totalModulesCount})</span>
          </button>
        </div>
      </div>

      {/* Module Content Rendering with motion transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {activeModule === 'EXECUTIVE_DASHBOARD' && <ExecutiveInventoryDashboard />}
          {activeModule === 'LAB_PRODUCTION_DISPATCHER' && <LabProduction />}
          {activeModule === 'VOICE_NOTES' && <ChefVoiceNotesManager />}
          {activeModule === 'UNIT_CONVERTER' && <UnitConversionWidget />}
          {activeModule === 'DAILY_PRODUCTION_PLAN' && <DailyProductionPlan />}
          {activeModule === 'PRODUCTION_BATCH_PLANNER' && <ProductionBatchPlanner />}
          {activeModule === 'COLD_ROOM_TRACKER' && <ColdRoomExpiryTracker />}
          {activeModule === 'PRICE_INFLATION' && <PriceInflationSimulator />}
          {activeModule === 'STORE_RETURNS' && <StoreReturnsManager />}
          {activeModule === 'EXPORT_REPORTS' && <ExportReportingCenter />}
          {activeModule === 'SUPPLIER_PO' && <SupplierPO />}
          {activeModule === 'QUALITY_CONTROL' && <QualityControl />}
          {activeModule === 'MULTI_STORE_ANALYTICS' && <StoreAnalytics />}
          {activeModule === 'MARGIN_ANALYTICS' && <MarginDashboard />}
          {activeModule === 'DELIVERY_LOGISTICS' && <DeliveryManifestView />}
          {activeModule === 'PACKAGING' && <PackagingLab />}
          {activeModule === 'REQUISITIONS' && <RequisitionManager />}
          {activeModule === 'PRODUCTION_RUNNER' && <ProductionRunner />}
          {activeModule === 'PRODUCTION_OVERVIEW' && <ProductionOverview />}
          {activeModule === 'WASTE_LOSS' && <WasteLossManager />}
          {activeModule === 'RECONCILIATION_WASTE' && <LabWasteAnalytics />}
          {activeModule === 'NEW_RECEIPT' && <ReceiptForm onSuccess={() => handleSelectModule('RECEIPT_HISTORY')} />}
          {activeModule === 'INVENTORY' && <InventoryList />}
          {activeModule === 'DESTOCKING' && <RawMaterialDestocking />}
          {activeModule === 'RECIPES' && <RecipeCosting />}
          {activeModule === 'RECEIPT_HISTORY' && <ReceiptHistory />}
          {activeModule === 'SUPPLIERS' && <SupplierManager />}
          {activeModule === 'STORES' && <StoreManager />}
          {activeModule === 'STORE_SALES' && <LabSalesOverview />}
          {activeModule === 'ANALYTICS' && <AnalyticsReporting />}
          {(activeModule === 'SYNC_STATUS' || activeModule === 'OFFLINE_QUEUE') && <SyncStatusView />}
          {activeModule === 'ACTIVITY_LOG' && <ActivityLog />}
        </motion.div>
      </AnimatePresence>

      {/* ANDROID / MOBILE MATERIAL 3 BOTTOM NAVIGATION BAR FOR LAB (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around">
        
        {/* 1. Executive Dashboard */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'EXECUTIVE_DASHBOARD'}
          label={t('labCategories.direction')}
          icon={Crown}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleSelectModule('EXECUTIVE_DASHBOARD')}
        />

        {/* 2. Task List Production */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'DAILY_PRODUCTION_PLAN'}
          label={t('labCategories.production')}
          icon={Utensils}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleSelectModule('DAILY_PRODUCTION_PLAN')}
        />

        {/* 3. Achats Supplier PO */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'SUPPLIER_PO'}
          label={t('labModules.supplierPo')}
          icon={ShoppingCart}
          activeColorClass="text-indigo-400 bg-indigo-500/15"
          onClick={() => handleSelectModule('SUPPLIER_PO')}
        />

        {/* 4. Expéditions Logistics */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'DELIVERY_LOGISTICS'}
          label={t('labModules.deliveryLogistics')}
          icon={Truck}
          activeColorClass="text-indigo-400 bg-indigo-500/15"
          onClick={() => handleSelectModule('DELIVERY_LOGISTICS')}
        />

        {/* 5. All Modules Sheet */}
        <LabMobileBottomNavButton
          isActive={isOtherActive}
          label={isOtherActive ? t('nav.allModules') : t('nav.centralLab')}
          icon={LayoutGrid}
          activeColorClass="text-amber-300 bg-amber-500/20 border border-amber-500/30"
          hasBadge={isOtherActive}
          onClick={handleOpenModuleSheet}
        />
      </div>

      {/* ANDROID MATERIAL 3 SEARCHABLE BOTTOM SHEET FOR ALL LAB MODULES */}
      <AnimatePresence>
        {isModuleSheetOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModuleSheet}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs"
            />

            {/* Bottom Sheet Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto shrink-0" />

              {/* Sheet Header & Search */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{t('nav.allModules')}</h3>
                    <p className="text-[11px] text-slate-400">{t('nav.brandSubtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModuleSheet}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search filter input */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 absolute start-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full ps-10 pe-9 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {moduleSearch && (
                  <button
                    type="button"
                    onClick={handleClearModuleSearch}
                    className="absolute end-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable Categories & Module List */}
              <div className="flex-1 overflow-y-auto space-y-4 pe-1 scrollbar-none">
                {filteredCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider px-1">
                      {cat.title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.items.map((item) => (
                        <LabModuleCardItem
                          key={item.id}
                          id={item.id}
                          label={item.label}
                          desc={item.desc}
                          icon={item.icon}
                          color={item.color}
                          isActive={activeModule === item.id}
                          onSelect={handleSelectModule}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFLINE QUEUE (INDEXEDDB) MANAGEMENT DRAWER */}
      <OfflineQueueDrawer
        isOpen={isOfflineQueueDrawerOpen}
        onClose={handleCloseOfflineQueue}
      />

    </div>
  );
};
