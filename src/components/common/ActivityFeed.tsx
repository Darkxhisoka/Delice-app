import React, { useState, useEffect } from 'react';
import { subscribeToStoreChanges } from '../../services/storage';
import { CompanyLogo } from './CompanyLogo';
import { 
  getActivityFeed, 
  exportActivityLogsToCSV, 
  clearActivityLogs, 
  logUserActivity,
  ActivityFeedFilter 
} from '../../services/activityTracker';
import { ActivityLogItem, ActivityType } from '../../types';
import {
  Activity,
  Search,
  Filter,
  Receipt,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Boxes,
  User,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Flame,
  Sparkles,
  Zap,
  Store,
  FlaskConical,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight
} from 'lucide-react';

interface ActivityFeedProps {
  embedded?: boolean;
  maxItems?: number;
  initialInterface?: 'ALL' | 'STORE' | 'LAB';
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  embedded = false,
  maxItems,
  initialInterface = 'ALL'
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sourceInterface, setSourceInterface] = useState<'ALL' | 'STORE' | 'LAB'>(initialInterface);
  const [selectedCategory, setSelectedCategory] = useState<ActivityFeedFilter['category']>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<ActivityFeedFilter['severity']>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { logs, stats } = getActivityFeed({
    searchTerm,
    sourceInterface,
    category: selectedCategory,
    severity: selectedSeverity,
    limit: maxItems
  });

  useEffect(() => {
    if (!autoRefresh) return;
    const handleUpdate = () => {
      setLastUpdate(new Date());
    };
    return subscribeToStoreChanges(handleUpdate);
  }, [autoRefresh]);

  const getEventIcon = (type: ActivityType, severity?: string) => {
    switch (type) {
      case 'SALE_RECORDED':
        return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
      case 'RECEIPT_CREATED':
        return <Receipt className="w-4 h-4 text-teal-500" />;
      case 'REQUISITION_CREATED':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'REQUISITION_STATUS_UPDATED':
        if (severity === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
        if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        return <Truck className="w-4 h-4 text-purple-500" />;
      case 'SUPPLIER_ADDED':
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'STOCK_ADJUSTED':
      case 'PACKAGING_DISPATCHED':
        return <Boxes className="w-4 h-4 text-sky-500" />;
      case 'SEMI_FINISHED_PRODUCED':
      case 'RECIPE_CREATED':
      case 'DAILY_PLAN_UPDATED':
        return <FlaskConical className="w-4 h-4 text-amber-500" />;
      case 'WASTE_LOGGED':
      case 'UNSOLD_LOGGED':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'RECONCILIATION_CLOSED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'DELIVERY_MANIFEST_CREATED':
        return <Package className="w-4 h-4 text-indigo-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeStyle = (severity?: string) => {
    switch (severity) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleSimulateActivity = () => {
    logUserActivity({
      type: 'SYSTEM_EVENT',
      title: 'Vérification Audit Système Test',
      description: 'Lancement d\'une inspection de routine des flux magasin et labo central',
      actor: 'Système Audit Automatisé',
      severity: 'info',
      badgeText: 'AUDIT',
      metadata: { notes: 'Chrono test automatisé' }
    });
  };

  return (
    <div className={`space-y-5 ${embedded ? '' : 'max-w-7xl mx-auto'}`}>
      
      {/* Header & Controls Panel */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Pulse */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white rounded-2xl p-1 border-2 border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg">
              <CompanyLogo imgClassName="h-10 w-auto object-contain max-w-[130px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <span>Fil d'Activité & Audit Temps Réel</span>
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  En Direct
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Historique centralisé des ventes, réquisitions, réceptions MP, déstockage et mouvements labo
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSimulateActivity}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Générer une entrée de test"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Événement Test</span>
            </button>

            <button
              onClick={exportActivityLogsToCSV}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter CSV</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Voulez-vous vraiment effacer tout le journal d\'activité local ?')) {
                  clearActivityLogs();
                }
              }}
              className="p-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-xl transition-all border border-slate-700"
              title="Effacer le journal local"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-2xl p-3 border border-slate-800 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Logs</span>
            <span className="text-base font-black text-white">{stats.total}</span>
          </div>
          <div className="bg-emerald-950/40 rounded-2xl p-3 border border-emerald-900/40 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Boutiques</span>
            <span className="text-base font-black text-emerald-300">{stats.storeCount}</span>
          </div>
          <div className="bg-indigo-950/40 rounded-2xl p-3 border border-indigo-900/40 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Labo Central</span>
            <span className="text-base font-black text-indigo-300">{stats.labCount}</span>
          </div>
          <div className="bg-blue-950/40 rounded-2xl p-3 border border-blue-900/40 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Réquisitions</span>
            <span className="text-base font-black text-blue-300">{stats.requisitionCount}</span>
          </div>
          <div className="bg-amber-950/40 rounded-2xl p-3 border border-amber-900/40 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Ventes POS</span>
            <span className="text-base font-black text-amber-300">{stats.salesCount}</span>
          </div>
          <div className="bg-rose-950/40 rounded-2xl p-3 border border-rose-900/40 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Pertes/Invendus</span>
            <span className="text-base font-black text-rose-300">{stats.wasteCount}</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Interface Toggle Tabs */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
              <button
                onClick={() => setSourceInterface('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sourceInterface === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tout le Système ({stats.total})
              </button>
              <button
                onClick={() => setSourceInterface('STORE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sourceInterface === 'STORE'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Point de Vente ({stats.storeCount})</span>
              </button>
              <button
                onClick={() => setSourceInterface('LAB')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  sourceInterface === 'LAB'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Labo Central ({stats.labCount})</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher référence, magasin, acteur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'Toutes Catégories' },
              { id: 'SALES', label: '🛒 Ventes POS' },
              { id: 'REQUISITIONS', label: '📋 Réquisitions & BDL' },
              { id: 'RECEIPTS', label: '🚚 Réceptions MP' },
              { id: 'PRODUCTION', label: '🧪 Production & Fiches' },
              { id: 'STOCK', label: '📦 Stocks & Déstockage' },
              { id: 'WASTE', label: '🔥 Pertes & Invendus' },
              { id: 'SUPPLIERS', label: '🏢 Fournisseurs' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-white text-slate-950 border-white font-bold shadow-sm'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Activity Timeline List */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        
        {logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Aucune activité ne correspond à vos filtres</p>
              <p className="text-xs text-slate-500 mt-1">Essayez de réinitialiser la recherche ou de changer d'espace.</p>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setSourceInterface('ALL');
                setSelectedCategory('ALL');
                setSelectedSeverity('ALL');
              }}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {logs.map((log) => {
              const src = log.sourceInterface || log.metadata?.sourceInterface || 'SYSTEM';
              return (
                <div key={log.id} className="relative flex items-start gap-4 group">
                  
                  {/* Timeline Point Icon */}
                  <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                    src === 'STORE' ? 'border-emerald-500' : src === 'LAB' ? 'border-indigo-500' : 'border-amber-500'
                  }`}>
                    {getEventIcon(log.type, log.severity)}
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-4 border border-slate-200/90 transition-all hover:shadow-md space-y-2.5">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Source Tag */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          src === 'STORE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : src === 'LAB'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {src === 'STORE' ? '🏬 Boutique' : src === 'LAB' ? '🧪 Labo' : '⚙️ Système'}
                        </span>

                        <h4 className="font-bold text-xs text-slate-900">{log.title}</h4>

                        {log.badgeText && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle(log.severity)}`}>
                            {log.badgeText}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {log.description}
                    </p>

                    {/* Metadata tags & Actor */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.metadata?.referenceNumber && (
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-mono font-bold text-slate-800 shadow-2xs">
                            {log.metadata.referenceNumber}
                          </span>
                        )}
                        {log.metadata?.storeName && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-semibold">
                            {log.metadata.storeName}
                          </span>
                        )}
                        {log.metadata?.supplierName && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-semibold">
                            {log.metadata.supplierName}
                          </span>
                        )}
                        {log.metadata?.amount !== undefined && (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md font-black">
                            {log.metadata.amount.toLocaleString('fr-FR')} DZD
                          </span>
                        )}
                        {log.metadata?.itemCount !== undefined && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold">
                            {log.metadata.itemCount} article(s)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-600 font-semibold text-[11px] ml-auto">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{log.actor}</span>
                      </div>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
