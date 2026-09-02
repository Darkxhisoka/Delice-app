import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { subscribeToSupabaseRealtime } from '../../services/supabaseService';
import { notifyToast } from '../../services/storage';
import { RequisitionForm } from './RequisitionForm';
import { StoreRequisitionHistory } from './StoreRequisitionHistory';
import { RetailSalesPOS } from './RetailSalesPOS';
import { UnsoldProductsManager } from './UnsoldProductsManager';
import { SalesAnalyticsView } from './SalesAnalyticsView';
import { StoreReconciliation } from './StoreReconciliation';
import { StoreReceivingView } from './StoreReceiving';
import { StorePackaging } from './StorePackaging';
import { ActivityFeed } from '../common/ActivityFeed';
import { QuickActionsFloatingButton } from './QuickActionsFloatingButton';
import { CustomCakePreOrders } from './CustomCakePreOrders';
import { CustomerLoyaltyManager } from './CustomerLoyaltyManager';
import { CashDrawerZReportView } from './CashDrawerZReportView';
import { StoreReturnsManager } from './StoreReturnsManager';
import { EmergencyDataExportModal } from './EmergencyDataExportModal';
import { getActiveStore } from '../../services/storage';
import { CompanyLogo } from '../common/CompanyLogo';
import { 
  ShoppingCart, 
  PackageX, 
  BarChart3, 
  ShoppingBag, 
  History, 
  Store, 
  ShieldCheck, 
  Calculator, 
  Truck, 
  Package, 
  Activity, 
  Radio,
  LayoutGrid,
  X,
  Cake,
  Crown,
  Receipt,
  RotateCcw,
  HardDrive
} from 'lucide-react';

export type StoreTab = 
  | 'POS_SALES' 
  | 'CUSTOM_CAKES'
  | 'LOYALTY_VIP'
  | 'CASH_Z_REPORT'
  | 'STORE_RETURNS'
  | 'RECEIVING' 
  | 'RECONCILIATION' 
  | 'UNSOLD_LOGS' 
  | 'SALES_ANALYTICS' 
  | 'NEW_REQ' 
  | 'HISTORY' 
  | 'PACKAGING' 
  | 'ACTIVITY_FEED';

interface DesktopTabConfig {
  id: StoreTab;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'amber-solid' | 'amber-outline' | 'pink' | 'purple' | 'emerald-solid' | 'emerald-outline' | 'indigo' | 'slate';
}

const DESKTOP_TABS_CONFIG: DesktopTabConfig[] = [
  { id: 'POS_SALES', labelKey: 'tabs.posSales', defaultLabel: 'Caisse / Ventes', icon: ShoppingCart, variant: 'amber-solid' },
  { id: 'CUSTOM_CAKES', labelKey: 'tabs.customCakes', defaultLabel: '🎂 Gâteaux Sur-Mesure', icon: Cake, variant: 'pink' },
  { id: 'LOYALTY_VIP', labelKey: 'tabs.loyaltyVip', defaultLabel: '👑 Club VIP & Fidélité', icon: Crown, variant: 'purple' },
  { id: 'CASH_Z_REPORT', labelKey: 'tabs.cashZReport', defaultLabel: 'Clôture Caisse (Z)', icon: Receipt, variant: 'emerald-outline' },
  { id: 'STORE_RETURNS', labelKey: 'tabs.storeReturns', defaultLabel: 'Bons de Retour', icon: RotateCcw, variant: 'amber-outline' },
  { id: 'RECEIVING', labelKey: 'tabs.receiving', defaultLabel: '🚚 Réception Livraisons', icon: Truck, variant: 'indigo' },
  { id: 'PACKAGING', labelKey: 'tabs.packaging', defaultLabel: '📦 Emballages & Colisage', icon: Package, variant: 'amber-outline' },
  { id: 'RECONCILIATION', labelKey: 'tabs.reconciliation', defaultLabel: '⚡ Clôture Stock EOD', icon: Calculator, variant: 'amber-outline' },
  { id: 'UNSOLD_LOGS', labelKey: 'tabs.unsoldLogs', defaultLabel: 'Invendus & Casse', icon: PackageX, variant: 'amber-solid' },
  { id: 'SALES_ANALYTICS', labelKey: 'tabs.salesAnalytics', defaultLabel: 'Analytique Ventes', icon: BarChart3, variant: 'amber-solid' },
  { id: 'NEW_REQ', labelKey: 'tabs.newReq', defaultLabel: 'Demande Approvisionnement', icon: ShoppingBag, variant: 'emerald-solid' },
  { id: 'HISTORY', labelKey: 'tabs.history', defaultLabel: 'Historique Commandes', icon: History, variant: 'emerald-solid' },
  { id: 'ACTIVITY_FEED', labelKey: 'tabs.activityFeed', defaultLabel: '⚡ Audit', icon: Activity, variant: 'amber-solid' },
];

/**
 * Memoized Desktop Navigation Tab Button
 */
const StoreDesktopTabItem = React.memo<{
  id: StoreTab;
  isActive: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: DesktopTabConfig['variant'];
  onSelect: (tab: StoreTab) => void;
}>(({ id, isActive, label, icon: Icon, variant = 'slate', onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  let activeClass = 'bg-amber-500 text-slate-950 font-black shadow-sm';
  let inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800';

  if (variant === 'pink') {
    activeClass = 'bg-pink-600 text-white font-black shadow-md ring-2 ring-pink-400';
    inactiveClass = 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30';
  } else if (variant === 'purple') {
    activeClass = 'bg-purple-600 text-white font-black shadow-md ring-2 ring-purple-400';
    inactiveClass = 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30';
  } else if (variant === 'emerald-outline') {
    activeClass = 'bg-emerald-600 text-white font-black shadow-md ring-2 ring-emerald-400';
    inactiveClass = 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30';
  } else if (variant === 'emerald-solid') {
    activeClass = 'bg-emerald-600 text-white shadow-sm';
    inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800';
  } else if (variant === 'indigo') {
    activeClass = 'bg-indigo-600 text-white font-black shadow-md ring-2 ring-indigo-400';
    inactiveClass = 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30';
  } else if (variant === 'amber-outline') {
    activeClass = 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300';
    inactiveClass = 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
        isActive ? activeClass : inactiveClass
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
});
StoreDesktopTabItem.displayName = 'StoreDesktopTabItem';

/**
 * Memoized Mobile Material 3 Bottom Nav Item
 */
const StoreMobileBottomNavButton = React.memo<{
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
StoreMobileBottomNavButton.displayName = 'StoreMobileBottomNavButton';

/**
 * Memoized Secondary Module Item for Bottom Sheet
 */
const StoreModuleCardItem = React.memo<{
  tab: StoreTab;
  isActive: boolean;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  activeBgClass?: string;
  fullWidth?: boolean;
  badge?: string;
  onSelect: (tab: StoreTab) => void;
}>(({ tab, isActive, title, subtitle, icon: Icon, iconColor, activeBgClass = 'bg-amber-500 text-slate-950 border-amber-400 font-bold', fullWidth = false, badge, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(tab);
  }, [onSelect, tab]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${fullWidth ? 'col-span-2' : ''} p-3 rounded-2xl border text-start flex ${
        fullWidth ? 'items-center justify-between gap-3' : 'flex-col justify-between gap-2'
      } transition-all active:scale-95 cursor-pointer ${
        isActive
          ? activeBgClass
          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
      }`}
    >
      <div className={fullWidth ? 'flex items-center gap-2.5 min-w-0' : 'contents'}>
        <Icon className={`w-5 h-5 shrink-0 ${isActive && activeBgClass.includes('text-slate-950') ? 'text-slate-950' : iconColor}`} />
        <div className="min-w-0">
          <div className="text-xs font-extrabold truncate">{title}</div>
          <div className={`text-[10px] truncate ${isActive ? 'opacity-90' : 'opacity-75'}`}>{subtitle}</div>
        </div>
      </div>
      {badge && (
        <span className="text-[10px] uppercase font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
});
StoreModuleCardItem.displayName = 'StoreModuleCardItem';

export const StoreDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<StoreTab>('POS_SALES');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const activeStore = getActiveStore();
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime((table) => {
      setLastSyncTime(new Date().toLocaleTimeString(i18n.language === 'ar' ? 'ar-DZ' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      let tableLabel = t('store.realtimeUpdate', 'Mise à jour en direct');
      if (table === 'store_requisitions') tableLabel = t('store.realtimeReqModified', 'Statut Réquisition Modifié');
      if (table === 'raw_materials') tableLabel = t('store.realtimeRawMatUpdate', 'Mise à jour Stock Labo');
      if (table === 'packaging_materials') tableLabel = t('store.realtimePackagingUpdate', 'Stock Emballage Modifié');

      notifyToast({
        type: 'info',
        title: `🔴 ${t('store.realtimeSupabase', 'Realtime Supabase')} : ${tableLabel}`,
        message: t('store.realtimeAutoUpdateMsg', 'Affichage mis à jour automatiquement.')
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTabSelect = useCallback((tab: StoreTab) => {
    setActiveTab(tab);
    setIsMoreSheetOpen(false);
  }, []);

  const handleOpenMoreSheet = useCallback(() => {
    setIsMoreSheetOpen(true);
  }, []);

  const handleCloseMoreSheet = useCallback(() => {
    setIsMoreSheetOpen(false);
  }, []);

  const isMoreActive = useMemo(() => {
    return ['CUSTOM_CAKES', 'LOYALTY_VIP', 'CASH_Z_REPORT', 'STORE_RETURNS', 'RECONCILIATION', 'UNSOLD_LOGS', 'SALES_ANALYTICS', 'HISTORY', 'ACTIVITY_FEED'].includes(activeTab);
  }, [activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-4 sm:space-y-6 pb-28 md:pb-8">
      
      {/* Store Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md border border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 p-2 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/10 border border-amber-500/40">
              <CompanyLogo imgClassName="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">{activeStore.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('nav.retailStore')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Radio className="w-3 h-3 text-emerald-400" />
                  <span>Realtime • {lastSyncTime}</span>
                </span>

                {/* Emergency Dump Button */}
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(true)}
                  className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 flex items-center gap-1 transition-colors cursor-pointer"
                  title={t('common.dumpBackupDesc', 'Exporter les bases IndexedDB sur le stockage local (Mesure de secours)')}
                >
                  <HardDrive className="w-3 h-3 text-amber-400" />
                  <span>{t('common.dumpBackup')}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 sm:mt-1">
                {activeStore.address} • {t('common.manager', 'Gérant')} : {activeStore.managerName}
              </p>
            </div>
          </div>

          {/* Desktop Module Tab Navigation (Horizontal Scrollable) */}
          <div className="hidden md:flex bg-slate-950/90 p-1.5 rounded-xl border border-slate-700/90 items-center gap-1 overflow-x-auto scrollbar-none self-start md:self-auto max-w-full">
            {DESKTOP_TABS_CONFIG.map((tab) => (
              <StoreDesktopTabItem
                key={tab.id}
                id={tab.id}
                isActive={activeTab === tab.id}
                label={t(tab.labelKey, tab.defaultLabel)}
                icon={tab.icon}
                variant={tab.variant}
                onSelect={handleTabSelect}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Render Active View with motion transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {activeTab === 'POS_SALES' && <RetailSalesPOS currentStore={activeStore} />}
          {activeTab === 'CUSTOM_CAKES' && <CustomCakePreOrders />}
          {activeTab === 'LOYALTY_VIP' && <CustomerLoyaltyManager />}
          {activeTab === 'CASH_Z_REPORT' && <CashDrawerZReportView />}
          {activeTab === 'STORE_RETURNS' && <StoreReturnsManager />}
          {activeTab === 'RECEIVING' && <StoreReceivingView />}
          {activeTab === 'PACKAGING' && <StorePackaging />}
          {activeTab === 'RECONCILIATION' && <StoreReconciliation currentStore={activeStore} />}
          {activeTab === 'UNSOLD_LOGS' && <UnsoldProductsManager currentStore={activeStore} />}
          {activeTab === 'SALES_ANALYTICS' && <SalesAnalyticsView currentStore={activeStore} />}
          {activeTab === 'NEW_REQ' && <RequisitionForm onSuccess={() => handleTabSelect('HISTORY')} />}
          {activeTab === 'HISTORY' && <StoreRequisitionHistory />}
          {activeTab === 'ACTIVITY_FEED' && <ActivityFeed initialInterface="STORE" />}
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Button for fast 1-tap reporting of unsellable products */}
      <QuickActionsFloatingButton
        currentStore={activeStore}
        onNavigateTab={handleTabSelect}
      />

      {/* ANDROID / MOBILE MATERIAL 3 BOTTOM NAVIGATION BAR (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl px-1.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center justify-around">
        
        {/* 1. Caisse (POS) */}
        <StoreMobileBottomNavButton
          isActive={activeTab === 'POS_SALES'}
          label={t('store.pos', 'Caisse')}
          icon={ShoppingCart}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleTabSelect('POS_SALES')}
        />

        {/* 2. Réception Livraisons */}
        <StoreMobileBottomNavButton
          isActive={activeTab === 'RECEIVING'}
          label={t('tabs.receiving', 'Livraisons')}
          icon={Truck}
          activeColorClass="text-indigo-400 bg-indigo-500/15"
          onClick={() => handleTabSelect('RECEIVING')}
        />

        {/* 3. Demandes Approvisionnement */}
        <StoreMobileBottomNavButton
          isActive={activeTab === 'NEW_REQ'}
          label={t('tabs.newReq', 'Demandes')}
          icon={ShoppingBag}
          activeColorClass="text-emerald-400 bg-emerald-500/15"
          onClick={() => handleTabSelect('NEW_REQ')}
        />

        {/* 4. Colisage & Emballages */}
        <StoreMobileBottomNavButton
          isActive={activeTab === 'PACKAGING'}
          label={t('tabs.packaging', 'Colisage')}
          icon={Package}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleTabSelect('PACKAGING')}
        />

        {/* 5. More Hub / Menu */}
        <StoreMobileBottomNavButton
          isActive={isMoreActive}
          label={isMoreActive ? t('common.active', 'Actif') : t('tabs.moreModules', 'Plus...')}
          icon={LayoutGrid}
          activeColorClass="text-indigo-300 bg-indigo-500/20 border border-indigo-500/30"
          hasBadge={isMoreActive}
          onClick={handleOpenMoreSheet}
        />
      </div>

      {/* ANDROID MATERIAL 3 BOTTOM SHEET FOR "PLUS / MODULES" */}
      <AnimatePresence>
        {isMoreSheetOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseMoreSheet}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Sheet Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-2xl text-white space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />

              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{t('nav.storeTitle')}</h3>
                    <p className="text-[11px] text-slate-400">{activeStore.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseMoreSheet}
                  className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Secondary Modules */}
              <div className="grid grid-cols-2 gap-2.5">
                <StoreModuleCardItem
                  tab="CUSTOM_CAKES"
                  isActive={activeTab === 'CUSTOM_CAKES'}
                  title={t('tabs.customCakes', 'Gâteaux Sur-Mesure')}
                  subtitle={t('store.customCakesSub', 'Commandes événements & labo')}
                  icon={Cake}
                  iconColor="text-pink-400"
                  activeBgClass="bg-pink-600 text-white border-pink-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="LOYALTY_VIP"
                  isActive={activeTab === 'LOYALTY_VIP'}
                  title={t('tabs.loyaltyVip', 'Club VIP & Fidélité')}
                  subtitle={t('store.loyaltyVipSub', 'Points & profils clients')}
                  icon={Crown}
                  iconColor="text-purple-400"
                  activeBgClass="bg-purple-600 text-white border-purple-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="CASH_Z_REPORT"
                  isActive={activeTab === 'CASH_Z_REPORT'}
                  title={t('tabs.cashZReport', 'Clôture Caisse (Z)')}
                  subtitle={t('store.cashZReportSub', 'Comptage espèces & TPE')}
                  icon={Receipt}
                  iconColor="text-emerald-400"
                  activeBgClass="bg-emerald-600 text-white border-emerald-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="STORE_RETURNS"
                  isActive={activeTab === 'STORE_RETURNS'}
                  title={t('tabs.storeReturns', 'Bons de Retour')}
                  subtitle={t('store.storeReturnsSub', 'Invendus & recyclage labo')}
                  icon={RotateCcw}
                  iconColor="text-amber-400"
                  activeBgClass="bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="RECONCILIATION"
                  isActive={activeTab === 'RECONCILIATION'}
                  title={t('tabs.reconciliation', 'Clôture Stock EOD')}
                  subtitle={t('store.reconciliationSub', 'Inventaire de fin de journée')}
                  icon={Calculator}
                  iconColor="text-amber-400"
                  activeBgClass="bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="UNSOLD_LOGS"
                  isActive={activeTab === 'UNSOLD_LOGS'}
                  title={t('tabs.unsoldLogs', 'Invendus & Casse')}
                  subtitle={t('store.unsoldLogsSub', 'Pertes et déclassements')}
                  icon={PackageX}
                  iconColor="text-rose-400"
                  activeBgClass="bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="SALES_ANALYTICS"
                  isActive={activeTab === 'SALES_ANALYTICS'}
                  title={t('tabs.salesAnalytics', 'Analytique Ventes')}
                  subtitle={t('store.salesAnalyticsSub', 'CA & meilleures ventes')}
                  icon={BarChart3}
                  iconColor="text-indigo-400"
                  activeBgClass="bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="HISTORY"
                  isActive={activeTab === 'HISTORY'}
                  title={t('tabs.history', 'Historique Commandes')}
                  subtitle={t('store.historySub', 'Bons de réquisition passés')}
                  icon={History}
                  iconColor="text-emerald-400"
                  activeBgClass="bg-emerald-600 text-white border-emerald-500 font-bold"
                  onSelect={handleTabSelect}
                />

                <StoreModuleCardItem
                  tab="ACTIVITY_FEED"
                  isActive={activeTab === 'ACTIVITY_FEED'}
                  title={t('tabs.activityFeed', 'Journal d\'Audit & Activités')}
                  subtitle={t('store.activityFeedSub', 'Traçabilité des opérations de la boutique')}
                  icon={Activity}
                  iconColor="text-amber-400"
                  activeBgClass="bg-amber-500 text-slate-950 border-amber-400 font-bold"
                  fullWidth
                  badge="Live"
                  onSelect={handleTabSelect}
                />

                {/* Emergency Dump Filesystem Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    setIsEmergencyModalOpen(true);
                  }}
                  className="col-span-2 p-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-slate-100 hover:bg-amber-500/30 text-start flex items-center justify-between gap-3 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HardDrive className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white">{t('common.dumpBackup')}</div>
                      <div className="text-[10px] text-amber-300/90">{t('store.dumpSub', 'Sauvegarde locale instantanée IndexedDB')}</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shrink-0">
                    {t('common.emergencyExport', 'Secours')}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Emergency IndexedDB & Filesystem Export Modal */}
      <EmergencyDataExportModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />

    </div>
  );
};


