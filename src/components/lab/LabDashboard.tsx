import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  X
} from 'lucide-react';

export type LabModule = 
  | 'EXECUTIVE_DASHBOARD'
  | 'VOICE_NOTES'
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

interface ModuleCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: LabModule; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string }[];
}

const LAB_CATEGORIES: ModuleCategory[] = [
  {
    title: '👑 Direction & Pilotage',
    icon: Crown,
    items: [
      { id: 'EXECUTIVE_DASHBOARD', label: 'Executive Dashboard (Lab Central)', desc: 'KPIs globaux, stocks & alertes', icon: Crown, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'MARGIN_ANALYTICS', label: 'Marges & Profitabilité', desc: 'Marges réelles et rentabilité', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-400/20' },
      { id: 'PRICE_INFLATION', label: 'Simulateur Inflation Matières', desc: 'Modélisation des coûts & marges', icon: Calculator, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'EXPORT_REPORTS', label: 'Exportations & Rapports Exécutifs', desc: 'Fichiers CSV / Bilan comptable', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-400/20' },
      { id: 'MULTI_STORE_ANALYTICS', label: 'Multi-Boutiques & Gaspillage', desc: 'Performances des 6 points de vente', icon: BarChart3, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'ANALYTICS', label: 'Analytiques & Tendances', desc: 'Statistiques avancées', icon: PieChart, color: 'text-amber-400 bg-amber-400/20' }
    ]
  },
  {
    title: '👨‍🍳 Production & Pâtisserie',
    icon: Utensils,
    items: [
      { id: 'VOICE_NOTES', label: 'Dictée Vocale & Notes Chefs', desc: 'Enregistrement mains-libres & modifications recettes', icon: Mic, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'PRODUCTION_BATCH_PLANNER', label: 'Planification IA & Fournées', desc: 'Ordonnancement et calcul des batchs', icon: SparklesIcon, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DAILY_PRODUCTION_PLAN', label: 'Task List Pâtissiers', desc: 'Planning du jour et fiches postes', icon: Utensils, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'PRODUCTION_RUNNER', label: 'Lancer Production (Cascade NOM)', desc: 'Déstockage automatique et sous-lots', icon: Zap, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'RECIPES', label: 'Fiches Techniques & COGS', desc: 'Formules et calcul des coûts', icon: ChefHat, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'PRODUCTION_OVERVIEW', label: 'Aperçu Production', desc: 'Lots en cours et historiques', icon: Factory, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'WASTE_LOSS', label: 'Registre Pertes & Casse', desc: 'Déclaration des pertes labo', icon: AlertTriangle, color: 'text-rose-400 bg-rose-400/20' }
    ]
  },
  {
    title: '📦 Stocks, Achats & Fournisseurs',
    icon: Boxes,
    items: [
      { id: 'COLD_ROOM_TRACKER', label: 'Surveillance DLC & Chambres Froides', desc: 'Chaîne du froid et déstockage FIFO', icon: Snowflake, color: 'text-cyan-400 bg-cyan-400/20' },
      { id: 'SUPPLIER_PO', label: 'Commandes Fournisseurs (PO)', desc: 'Bons de commande automatisés', icon: ShoppingCart, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'NEW_RECEIPT', label: 'Réception Matières Premières', desc: 'Scanner et contrôle des arrivages', icon: Receipt, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'INVENTORY', label: 'Stock Matières Premières', desc: 'Niveaux et valorisation en direct', icon: Boxes, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'PACKAGING', label: 'Packaging & Emballage', desc: 'Cartons, rubans et boîtes', icon: Package, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DESTOCKING', label: 'Déstockage MP & Ajustements', desc: 'Ajustements manuels d’inventaire', icon: Trash2, color: 'text-rose-400 bg-rose-400/20' },
      { id: 'RECEIPT_HISTORY', label: 'Historique des Achats', desc: 'Journal des réceptions et factures', icon: FileText, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'SUPPLIERS', label: 'Répertoire Fournisseurs', desc: 'Contacts et conditions tarifaires', icon: Building, color: 'text-indigo-400 bg-indigo-400/20' }
    ]
  },
  {
    title: '🚚 Logistique & Commandes Boutiques',
    icon: Truck,
    items: [
      { id: 'REQUISITIONS', label: 'Commandes des Boutiques', desc: 'Validation et expédition des demandes', icon: FlaskConical, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORE_RETURNS', label: 'Bons de Retour & Valorisation', desc: 'Rapatriement des invendus et recyclage', icon: RotateCcw, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'DELIVERY_LOGISTICS', label: 'Expéditions & Bordereaux', desc: 'Manifestes de livraison camions', icon: Truck, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORES', label: 'Points de Vente', desc: 'Configuration des 6 boutiques', icon: Store, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'STORE_SALES', label: 'Aperçu Ventes & Invendus', desc: 'Remontées POS et invendus', icon: ShoppingCart, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'RECONCILIATION_WASTE', label: 'Analyse Invendus Boutiques', desc: 'Rapprochement et pertes magasins', icon: PieChart, color: 'text-amber-400 bg-amber-400/20' }
    ]
  },
  {
    title: '🛡️ Qualité & Traçabilité',
    icon: ShieldCheck,
    items: [
      { id: 'QUALITY_CONTROL', label: 'Contrôle Qualité & HACCP', desc: 'Traçabilité et relevés température', icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'SYNC_STATUS', label: 'État de Synchronisation & Firebase', desc: 'Changements locaux, file IndexedDB & intégrité', icon: Activity, color: 'text-amber-400 bg-amber-400/20' },
      { id: 'OFFLINE_QUEUE', label: 'File Hors-Ligne (IndexedDB)', desc: 'Synchronisation et résilience réseau', icon: HardDrive, color: 'text-indigo-400 bg-indigo-400/20' },
      { id: 'ACTIVITY_LOG', label: 'Fil d’Activité (Audit Global)', desc: 'Journal d’événements en temps réel', icon: History, color: 'text-amber-400 bg-amber-400/20' }
    ]
  }
];

function SparklesIcon(props: { className?: string }) {
  return <Zap {...props} />;
}

interface LabDesktopTabConfig {
  module: LabModule;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'amber-solid' | 'amber-outline' | 'indigo-solid' | 'indigo-outline' | 'emerald' | 'slate';
}

const LAB_DESKTOP_TABS: LabDesktopTabConfig[] = [
  { module: 'EXECUTIVE_DASHBOARD', label: '👑 Executive Dashboard', icon: Crown, variant: 'amber-solid' },
  { module: 'VOICE_NOTES', label: '🎙️ Dictée Vocale & Notes', icon: Mic, variant: 'amber-outline' },
  { module: 'DAILY_PRODUCTION_PLAN', label: '👩‍🍳 Task List Pâtissiers', icon: Utensils, variant: 'amber-outline' },
  { module: 'SUPPLIER_PO', label: '🛒 Commandes Fournisseurs (PO)', icon: ShoppingCart, variant: 'indigo-outline' },
  { module: 'DELIVERY_LOGISTICS', label: '🚚 Expéditions & Bordereaux', icon: Truck, variant: 'indigo-outline' },
  { module: 'REQUISITIONS', label: 'Commandes Boutiques', icon: FlaskConical, variant: 'slate' },
  { module: 'PRODUCTION_RUNNER', label: '⚡ Lancer Production', icon: Zap, variant: 'amber-outline' },
  { module: 'QUALITY_CONTROL', label: '🛡️ Qualité & HACCP', icon: ShieldCheck, variant: 'indigo-outline' },
  { module: 'MARGIN_ANALYTICS', label: '📊 Marges & COGS', icon: TrendingUp, variant: 'emerald' },
  { module: 'INVENTORY', label: 'Stock Matières', icon: Boxes, variant: 'slate' },
  { module: 'RECIPES', label: 'Fiches Techniques', icon: ChefHat, variant: 'slate' },
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
      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all active:scale-95 cursor-pointer ${
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
  const [activeModule, setActiveModule] = useState<LabModule>('EXECUTIVE_DASHBOARD');
  const [isModuleSheetOpen, setIsModuleSheetOpen] = useState<boolean>(false);
  const [isOfflineQueueDrawerOpen, setIsOfflineQueueDrawerOpen] = useState<boolean>(false);
  const [moduleSearch, setModuleSearch] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime((table, payload) => {
      setLastSyncTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      let tableLabel = 'Mise à jour database';
      if (table === 'store_requisitions') tableLabel = 'Statuts des Réquisitions';
      if (table === 'raw_materials') tableLabel = 'Niveaux de Stocks Mat. Premières';
      if (table === 'packaging_materials') tableLabel = 'Niveaux de Stocks Emballages';
      if (table === 'inventory_adjustments') tableLabel = 'Déstockage / Perte';

      notifyToast({
        type: 'info',
        title: `🔴 Live Supabase : ${tableLabel}`,
        message: `Mise à jour en direct synchronisée (${payload.eventType || 'UPDATE'}).`
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

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
    return LAB_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0);
  }, []);

  const filteredCategories = useMemo(() => {
    const query = moduleSearch.toLowerCase().trim();
    if (!query) return LAB_CATEGORIES;

    return LAB_CATEGORIES.map((cat) => {
      const items = cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query) ||
          cat.title.toLowerCase().includes(query)
      );
      return { ...cat, items };
    }).filter((cat) => cat.items.length > 0);
  }, [moduleSearch]);

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
                <h1 className="text-lg sm:text-xl font-black tracking-tight">Laboratoire Central & Production</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Vue Administrateur
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
                Approvisionnement, ordonnancement cascade, stocks matières & marges de fabrication.
              </p>
            </div>
          </div>

          {/* Quick Access Hands-Free Voice Note Trigger Button */}
          <div className="flex items-center gap-2">
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
              <span>🎙️ Dictée Vocale Chef</span>
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
              label={tab.label}
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
            <span>Tous les Modules ({totalModulesCount})</span>
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
          {activeModule === 'VOICE_NOTES' && <ChefVoiceNotesManager />}
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
          label="Direction"
          icon={Crown}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleSelectModule('EXECUTIVE_DASHBOARD')}
        />

        {/* 2. Task List Production */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'DAILY_PRODUCTION_PLAN'}
          label="Production"
          icon={Utensils}
          activeColorClass="text-amber-400 bg-amber-500/15"
          onClick={() => handleSelectModule('DAILY_PRODUCTION_PLAN')}
        />

        {/* 3. Achats Supplier PO */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'SUPPLIER_PO'}
          label="Achats PO"
          icon={ShoppingCart}
          activeColorClass="text-indigo-400 bg-indigo-500/15"
          onClick={() => handleSelectModule('SUPPLIER_PO')}
        />

        {/* 4. Expéditions Logistics */}
        <LabMobileBottomNavButton
          isActive={activeModule === 'DELIVERY_LOGISTICS'}
          label="Expéditions"
          icon={Truck}
          activeColorClass="text-indigo-400 bg-indigo-500/15"
          onClick={() => handleSelectModule('DELIVERY_LOGISTICS')}
        />

        {/* 5. All 22 Modules Sheet */}
        <LabMobileBottomNavButton
          isActive={isOtherActive}
          label={isOtherActive ? 'Module...' : 'Hub Labo'}
          icon={LayoutGrid}
          activeColorClass="text-amber-300 bg-amber-500/20 border border-amber-500/30"
          hasBadge={isOtherActive}
          onClick={handleOpenModuleSheet}
        />
      </div>

      {/* ANDROID MATERIAL 3 SEARCHABLE BOTTOM SHEET FOR ALL 22 LAB MODULES */}
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
                    <h3 className="font-extrabold text-sm text-white">Hub des 22 Modules Laboratoire</h3>
                    <p className="text-[11px] text-slate-400">Production, Stocks, Marges & Boutiques</p>
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
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un module (ex: cascade, COGS, HACCP, stock...)"
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {moduleSearch && (
                  <button
                    type="button"
                    onClick={handleClearModuleSearch}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable Categories & Module List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
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

