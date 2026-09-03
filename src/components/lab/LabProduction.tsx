import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Printer,
  Calendar,
  Store as StoreIcon,
  Filter,
  Layers,
  Flame,
  Sparkles,
  Crown,
  Cookie,
  Eye,
  Award,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  RefreshCw,
  FileText,
  LayoutGrid,
  Table as TableIcon,
  X,
  ChefHat,
  PackageCheck,
  TrendingUp,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  getRequisitions,
  getStores,
  notifyToast,
  subscribeToStoreChanges,
} from '../../services/storage';
import {
  ProductionRoomId,
  RoomProductionReport,
  AggregatedProductionItem,
  StoreLocation,
} from '../../types';
import {
  PRODUCTION_ROOMS,
  aggregateStoreOrders,
  formatStoreBreakdown,
  getRoomMetadata,
} from '../../utils/orderAggregator';

// Map icon string names to Lucide icons
const ROOM_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Cookie: ({ className }) => <Cookie className={className} />,
  Crown: ({ className }) => <Crown className={className} />,
  Layers: ({ className }) => <Layers className={className} />,
  Flame: ({ className }) => <Flame className={className} />,
  Sparkles: ({ className }) => <Sparkles className={className} />,
  Award: ({ className }) => <Award className={className} />,
  Eye: ({ className }) => <Eye className={className} />,
};

type ViewMode = 'grid' | 'focus' | 'matrix';

export const LabProduction: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  // State
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const [targetDate, setTargetDate] = useState<string>(todayStr);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeRoomFilter, setActiveRoomFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [focusedRoomId, setFocusedRoomId] = useState<ProductionRoomId>('viennoiserie');
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({
    gateaux_secs: true,
    gateaux_orientaux: true,
    mille_feuille: true,
    viennoiserie: true,
    patisserie_fine: true,
    piece_montee: true,
    trompe_oeil: true,
  });

  // Modal Print State
  const [printModalReport, setPrintModalReport] = useState<RoomProductionReport | null>(null);
  const [printAllModalOpen, setPrintAllModalOpen] = useState<boolean>(false);

  // Checked items local state for kitchen floor
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Data fetching — reactive with subscription to store changes
  const [requisitions, setRequisitions] = useState(() => {
    const r = getRequisitions();
    console.debug(`[LabProduction] Initial load: ${r.length} requisitions`);
    if (r.length > 0) {
      console.debug(`[LabProduction] Status breakdown:`, r.map(req => ({ id: req.id, status: req.status, items: req.items?.length || 0 })));
    }
    return r;
  });
  const [stores, setStores] = useState(() => getStores());
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to store changes (localStorage updates from approval, dispatch, etc.)
  useEffect(() => {
    console.debug(`[LabProduction] Subscribing to store changes...`);
    const unsubscribe = subscribeToStoreChanges(() => {
      console.debug(`[LabProduction] Store change detected — refreshing requisitions & stores`);
      setRequisitions(getRequisitions());
      setStores(getStores());
      setRefreshKey(k => k + 1);
    });
    return () => {
      console.debug(`[LabProduction] Unsubscribing from store changes`);
      unsubscribe();
    };
  }, []);

  // Also refresh on mount to catch any changes that happened while this component was unmounted
  useEffect(() => {
    const fresh = getRequisitions();
    if (fresh.length !== requisitions.length) {
      console.debug(`[LabProduction] Mount refresh: ${requisitions.length} → ${fresh.length} requisitions`);
      setRequisitions(fresh);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Aggregate orders through engine
  const aggregatedData = useMemo(() => {
    console.debug(`[LabProduction] Aggregating ${requisitions.length} requisitions (refreshKey=${refreshKey})...`);
    const result = aggregateStoreOrders(requisitions, {
      targetDate: targetDate === 'ALL' ? undefined : targetDate,
      storeId: selectedStoreId === 'ALL' ? undefined : selectedStoreId,
    });
    console.debug(`[LabProduction] Aggregation complete: ${result.summary.activeRoomsCount} active rooms, ${result.summary.totalUnitsToProduce} total units`);
    return result;
  }, [requisitions, targetDate, selectedStoreId, refreshKey]);

  const { reports, orderedReports, summary, itemsWithMissingRoomId } = aggregatedData;

  // Available unique dates from requisitions for quick date-picking
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    requisitions.forEach((r) => {
      if (r.dateNeeded) dates.add(r.dateNeeded);
      if (r.dateRequested) dates.add(r.dateRequested);
    });
    return Array.from(dates).sort().reverse();
  }, [requisitions]);

  const toggleRoomExpansion = (roomId: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  const toggleItemCompletion = (itemKey: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  const handlePrintRoomTicket = (report: RoomProductionReport) => {
    setPrintModalReport(report);
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  const exportConsolidatedSummaryCSV = () => {
    const rows = [
      ['Lab Central Delice - Ordre de Production Global'],
      ['Date cible', targetDate === 'ALL' ? 'Toutes les dates' : targetDate],
      ['Magasin filtre', selectedStoreId === 'ALL' ? 'Tous les magasins' : selectedStoreId],
      ['Date d’export', new Date().toLocaleString()],
      [],
      ['Salle de Production', 'Produit', 'Quantite Requise', 'Unite', 'Nb Lots', 'Cout Estime (DZD)', 'Repartition Magasins'],
    ];

    orderedReports.forEach((report) => {
      report.items.forEach((item) => {
        const breakdownStr = item.storeBreakdown
          .map((sb) => `${sb.storeName}: ${sb.quantity}`)
          .join(' | ');
        rows.push([
          report.roomNameFr,
          item.productName,
          item.totalQuantityRequired.toString(),
          item.unit,
          item.totalBatchesNeeded.toString(),
          (item.totalQuantityRequired * item.unitEstimatedCost).toFixed(2),
          `"${breakdownStr}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ordre_Production_Labo_${targetDate || 'Global'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifyToast({
      type: 'success',
      title: t('common.success', 'Succès'),
      message: t('productionDispatcher.exportSuccess', 'Exportation CSV effectuée avec succès.'),
    });
  };

  // Filtered reports according to active room filter and search query
  const filteredReports = useMemo(() => {
    return orderedReports.filter((report) => {
      if (activeRoomFilter !== 'ALL' && report.roomId !== activeRoomFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const hasMatchingProduct = report.items.some(
        (i) => i.productName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
      const hasMatchingRoom =
        report.roomNameFr.toLowerCase().includes(q) ||
        report.roomNameAr.toLowerCase().includes(q);
      return hasMatchingProduct || hasMatchingRoom;
    });
  }, [orderedReports, activeRoomFilter, searchQuery]);

  return (
    <div className={`space-y-6 pb-16 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* --- MASTER HEADER --- */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-amber-500/20">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                  {t('productionDispatcher.title', 'Central Lab Production Dispatcher')}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    7 {t('productionDispatcher.roomsBadge', 'Salles Spécialisées')}
                  </span>
                </h1>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {t(
                    'productionDispatcher.subtitle',
                    'Consolidation automatique des commandes magasins & routage par salle de production.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setPrintAllModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{t('productionDispatcher.printAllTickets', 'Imprimer Tous les Ordres')}</span>
            </button>
            <button
              onClick={exportConsolidatedSummaryCSV}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm font-medium flex items-center gap-2 transition active:scale-95"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>{t('productionDispatcher.exportCsv', 'Export CSV')}</span>
            </button>
          </div>
        </div>

        {/* --- CONTROL BAR & FILTERS --- */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Target Date Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {t('productionDispatcher.targetDate', 'Date Cible de Production')}
            </label>
            <div className="relative">
              <input
                type="date"
                value={targetDate === 'ALL' ? '' : targetDate}
                onChange={(e) => setTargetDate(e.target.value || 'ALL')}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            {/* Quick date pills */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setTargetDate(todayStr)}
                className={`px-2 py-0.5 rounded-md transition font-medium ${
                  targetDate === todayStr
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('productionDispatcher.today', 'Aujourd\'hui')} ({todayStr.slice(5).replace('-', '/')})
              </button>
              <button
                type="button"
                onClick={() => setTargetDate(yesterdayStr)}
                className={`px-2 py-0.5 rounded-md transition font-medium ${
                  targetDate === yesterdayStr
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {yesterdayStr.slice(5).replace('-', '/')}
              </button>
              <button
                type="button"
                onClick={() => setTargetDate('ALL')}
                className={`px-2 py-0.5 rounded-md transition font-medium ${
                  targetDate === 'ALL'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t('productionDispatcher.allDates', 'Toutes')}
              </button>
            </div>
          </div>

          {/* Store Filter */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <StoreIcon className="w-3.5 h-3.5 text-indigo-400" />
              {t('productionDispatcher.storeFilter', 'Filtrer par Magasin')}
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition"
            >
              <option value="ALL">{t('productionDispatcher.allStores', 'Tous les Magasins (Consolidé)')}</option>
              {stores.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500 mt-1">
              {summary.participatingStoresCount} {t('productionDispatcher.storesActive', 'magasin(s) demandeur(s)')}
            </p>
          </div>

          {/* Product / Room Search */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              {t('productionDispatcher.search', 'Rechercher Pâtisserie / Salle')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('productionDispatcher.searchPlaceholder', 'Ex: Croissant, Baklawa, Sablé...')}
                className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* View Mode Switcher */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              {t('productionDispatcher.viewMode', 'Mode d’Affichage')}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-800/90 p-1 rounded-xl border border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('productionDispatcher.viewGrid', '7 Salles')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  viewMode === 'focus'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>{t('productionDispatcher.viewFocus', 'Focus')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  viewMode === 'matrix'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>{t('productionDispatcher.viewMatrix', 'Matrice')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- ROOM PILL TABS --- */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveRoomFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              activeRoomFilter === 'ALL'
                ? 'bg-zinc-100 text-zinc-900 font-semibold shadow-md'
                : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('productionDispatcher.allRooms', 'Toutes les Salles')} ({summary.activeRoomsCount}/7)</span>
          </button>
          {PRODUCTION_ROOMS.map((room) => {
            const report = reports[room.id];
            const count = report?.totalUnitsToProduce || 0;
            const IconComp = ROOM_ICONS[room.iconName] || Layers;
            return (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoomFilter(room.id);
                  setFocusedRoomId(room.id);
                }}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 border ${
                  activeRoomFilter === room.id
                    ? `${room.theme.badgeBg} ${room.theme.badgeText} ${room.theme.borderActive} font-semibold shadow-sm`
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{isRtl ? room.nameAr : room.nameFr}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    count > 0 ? 'bg-zinc-900/80 text-zinc-100' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- TOP KPI SUMMARY STATS --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Target Units */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              {t('productionDispatcher.totalUnits', 'Total Pièces à Produire')}
            </p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">
              {summary.totalUnitsAcrossAllRooms.toLocaleString()}
              <span className="text-xs text-zinc-400 font-normal ml-1.5">unités</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {t('productionDispatcher.acrossAllRooms', 'Consolidé sur les 7 ateliers')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Active Production Rooms */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              {t('productionDispatcher.activeRooms', 'Salles en Activité')}
            </p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {summary.activeRoomsCount} <span className="text-sm font-normal text-zinc-500">/ 7</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {t('productionDispatcher.dispatchedStations', 'Postes de travail sollicités')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Ordering Stores */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              {t('productionDispatcher.storesConsolidated', 'Magasins Destinataires')}
            </p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-1">
              {summary.participatingStoresCount}
              <span className="text-xs text-zinc-400 font-normal ml-1.5">points de vente</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {summary.totalOrdersAggregated} {t('productionDispatcher.requisitionsCount', 'commandes agrégées')}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Estimated Production COGS */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-zinc-400">
              {t('productionDispatcher.estimatedCost', 'Coût Matières Estimé')}
            </p>
            <p className="text-2xl font-extrabold text-purple-400 mt-1">
              {summary.totalEstimatedCost.toLocaleString()}{' '}
              <span className="text-xs text-zinc-400 font-normal">DZD</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {t('productionDispatcher.targetDateLabel', 'Date')}: {targetDate === 'ALL' ? 'Toutes' : targetDate}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- WARNINGS & EMPTY STATE --- */}
      {itemsWithMissingRoomId.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              {itemsWithMissingRoomId.length} {t('productionDispatcher.missingRoomWarning', 'produit(s) sans salle attribuée — routés automatiquement')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {itemsWithMissingRoomId.slice(0, 8).map((entry, idx) => {
                const roomMeta = PRODUCTION_ROOMS.find((r) => r.id === entry.resolvedTo);
                return (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                  >
                    {entry.productName} → {roomMeta?.nameFr || entry.resolvedTo}
                  </span>
                );
              })}
              {itemsWithMissingRoomId.length > 8 && (
                <span className="text-[11px] px-2 py-0.5 text-zinc-500">
                  +{itemsWithMissingRoomId.length - 8} autres
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {summary.totalOrdersAggregated === 0 && requisitions.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">
            {t('productionDispatcher.noResultsForDate', 'Aucune commande trouvée pour cette date.')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {t('productionDispatcher.tryAllDates', 'Essayez "Toutes" ou changez la date cible.')}
          </p>
          <button
            onClick={() => setTargetDate('ALL')}
            className="mt-3 px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/30 transition"
          >
            {t('productionDispatcher.showAllDates', 'Voir toutes les dates')}
          </button>
        </div>
      )}

      {requisitions.length === 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-400">
            {t('productionDispatcher.noRequisitions', 'Aucune demande boutique soumise.')}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {t('productionDispatcher.createRequisitionHint', 'Les commandes créées depuis les boutiques apparaîtront ici.')}
          </p>
        </div>
      )}

      {/* --- VIEW 1: 7 ROOM CARDS GRID --- */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const isExpanded = expandedRooms[report.roomId] ?? true;
            const IconComp = ROOM_ICONS[report.iconName] || Layers;
            const metadata = getRoomMetadata(report.roomId);

            return (
              <div
                key={report.roomId}
                className={`bg-zinc-900/90 border ${
                  report.totalUnitsToProduce > 0 ? report.colorTheme.border : 'border-zinc-800'
                } rounded-2xl overflow-hidden shadow-xl flex flex-col transition hover:border-zinc-700`}
              >
                {/* Room Card Header */}
                <div className={`p-4 ${report.colorTheme.headerBg} border-b border-zinc-800/80 flex items-start justify-between gap-3`}>
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl ${report.colorTheme.bgLight} border ${report.colorTheme.border} flex items-center justify-center ${report.colorTheme.badgeText} shadow-md`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                        {isRtl ? report.roomNameAr : report.roomNameFr}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {isRtl ? metadata.categoryAr : metadata.categoryFr}
                      </p>
                    </div>
                  </div>

                  {/* Room Quick Stats Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-xl text-xs font-bold ${report.colorTheme.badgeBg} ${report.colorTheme.badgeText} border ${report.colorTheme.border}`}
                    >
                      {report.totalUnitsToProduce} {t('productionDispatcher.units', 'pcs')}
                    </span>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {report.items.length} {t('productionDispatcher.products', 'produits')}
                    </p>
                  </div>
                </div>

                {/* Room Description Banner */}
                <div className="px-4 py-2 bg-zinc-950/40 border-b border-zinc-800/50 text-[11px] text-zinc-400">
                  {isRtl ? metadata.descriptionAr : metadata.descriptionFr}
                </div>

                {/* Room Items List */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  {report.items.length === 0 ? (
                    <div className="py-10 text-center text-zinc-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      {t('productionDispatcher.noItemsForRoom', 'Aucune commande pour cette salle sur la date sélectionnée.')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium px-1">
                        <span>{t('productionDispatcher.itemAndBatch', 'Produit & Objectif')}</span>
                        <span>{t('productionDispatcher.storesDispatch', 'Répartition Magasins')}</span>
                      </div>

                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                        {report.items.map((item, idx) => {
                          const itemKey = `${report.roomId}-${item.productName}`;
                          const isDone = completedItems[itemKey];

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-xl border transition ${
                                isDone
                                  ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                                  : 'bg-zinc-800/60 border-zinc-700/60 hover:border-zinc-600'
                              }`}
                            >
                              {/* Item Main Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleItemCompletion(itemKey)}
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition ${
                                      isDone
                                        ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                        : 'border-zinc-600 hover:border-amber-400 text-transparent'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                  </button>
                                  <div>
                                    <h4
                                      className={`text-sm font-semibold ${
                                        isDone ? 'line-through text-zinc-400' : 'text-zinc-100'
                                      }`}
                                    >
                                      {item.productName}
                                    </h4>
                                    <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                      <span className="font-semibold text-amber-400">
                                        {item.totalQuantityRequired} {item.unit}
                                      </span>
                                      <span>•</span>
                                      <span className="text-zinc-400">
                                        {item.totalBatchesNeeded} {t('productionDispatcher.batches', 'lots')} (taille lot: {item.standardBatchSize})
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-bold text-zinc-200">
                                    {(item.totalQuantityRequired * item.unitEstimatedCost).toFixed(0)} DZD
                                  </span>
                                </div>
                              </div>

                              {/* Store Breakdown Badges */}
                              <div className="mt-2.5 pt-2 border-t border-zinc-700/40 flex flex-wrap gap-1.5">
                                {item.storeBreakdown.map((sb, sbIdx) => (
                                  <span
                                    key={sbIdx}
                                    className="px-2 py-0.5 rounded-lg bg-zinc-900/90 border border-zinc-700/60 text-[11px] font-medium text-zinc-300 flex items-center gap-1"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                    <span className="text-zinc-400">{sb.storeName}:</span>
                                    <span className="font-bold text-amber-300">{sb.quantity}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedRoomId(report.roomId);
                        setViewMode('focus');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition"
                    >
                      {t('productionDispatcher.openFocus', 'Détails Atelier')}
                    </button>

                    <button
                      type="button"
                      disabled={report.items.length === 0}
                      onClick={() => handlePrintRoomTicket(report)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        report.items.length > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/10 active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t('productionDispatcher.printTicket', 'Ordre de Fabrication')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- VIEW 2: FOCUS ROOM DEEP DIVE VIEW --- */}
      {viewMode === 'focus' && (
        <div className="space-y-6">
          {/* Room Selector Tab Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {PRODUCTION_ROOMS.map((room) => {
              const rep = reports[room.id];
              const IconComp = ROOM_ICONS[room.iconName] || Layers;
              const isSel = focusedRoomId === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setFocusedRoomId(room.id)}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2.5 border ${
                    isSel
                      ? `${room.theme.headerBg} ${room.theme.badgeText} ${room.theme.borderActive} shadow-lg`
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{isRtl ? room.nameAr : room.nameFr}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-950/80 text-zinc-200">
                    {rep?.totalUnitsToProduce || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Focused Room Detailed Dashboard */}
          {(() => {
            const report = reports[focusedRoomId];
            const meta = getRoomMetadata(focusedRoomId);
            const IconComp = ROOM_ICONS[meta.iconName] || Layers;

            return (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-zinc-800">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-14 h-14 rounded-2xl ${meta.theme.bgLight} border ${meta.theme.border} flex items-center justify-center ${meta.theme.badgeText}`}>
                      <IconComp className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-zinc-100">
                        {isRtl ? report.roomNameAr : report.roomNameFr}
                      </h2>
                      <p className="text-sm text-zinc-400">
                        {isRtl ? meta.categoryAr : meta.categoryFr} — {isRtl ? meta.descriptionAr : meta.descriptionFr}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePrintRoomTicket(report)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{t('productionDispatcher.printTicket', 'Imprimer Ordre de Fabrication')}</span>
                    </button>
                  </div>
                </div>

                {/* KPI mini-cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                    <p className="text-xs text-zinc-400">{t('productionDispatcher.totalItems', 'Total Pièces')}</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">{report.totalUnitsToProduce}</p>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                    <p className="text-xs text-zinc-400">{t('productionDispatcher.recipesCount', 'Recettes à Lancer')}</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{report.items.length}</p>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                    <p className="text-xs text-zinc-400">{t('productionDispatcher.participatingStores', 'Magasins Concernés')}</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{report.participatingStoresCount}</p>
                  </div>
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5">
                    <p className="text-xs text-zinc-400">{t('productionDispatcher.estCost', 'Coût Estimé')}</p>
                    <p className="text-xl font-bold text-purple-400 mt-1">{report.totalEstimatedCost} DZD</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-zinc-950/80 text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">{t('productionDispatcher.product', 'Pâtisserie')}</th>
                        <th className="py-3 px-4 text-center">{t('productionDispatcher.batchTarget', 'Objectif Global')}</th>
                        <th className="py-3 px-4 text-center">{t('productionDispatcher.batchCalculation', 'Lots / Tournées')}</th>
                        <th className="py-3 px-4">{t('productionDispatcher.storeBreakdown', 'Répartition Détaillée par Boutique')}</th>
                        <th className="py-3 px-4 text-center">{t('productionDispatcher.status', 'État Atelier')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {report.items.map((item, idx) => {
                        const itemKey = `${report.roomId}-${item.productName}`;
                        const isDone = completedItems[itemKey];

                        return (
                          <tr key={idx} className={`hover:bg-zinc-800/40 transition ${isDone ? 'bg-emerald-950/10' : ''}`}>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleItemCompletion(itemKey)}
                                className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                    : 'border-zinc-600 hover:border-amber-400 text-transparent'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-semibold text-zinc-100 ${isDone ? 'line-through text-zinc-500' : ''}`}>
                                {item.productName}
                              </span>
                              <p className="text-xs text-zinc-500">{item.category}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-base font-extrabold text-amber-400">
                                {item.totalQuantityRequired}
                              </span>{' '}
                              <span className="text-xs text-zinc-400">{item.unit}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-1 rounded-lg bg-zinc-800 font-bold text-zinc-200 text-xs">
                                {item.totalBatchesNeeded} {t('productionDispatcher.batches', 'lots')}
                              </span>
                              <p className="text-[11px] text-zinc-500 mt-1">({item.standardBatchSize} / lot)</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1.5">
                                {item.storeBreakdown.map((sb, sbIdx) => (
                                  <span
                                    key={sbIdx}
                                    className="px-2 py-1 rounded-lg bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200"
                                  >
                                    <strong className="text-amber-400">{sb.storeName}:</strong> {sb.quantity}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isDone ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                                  {t('productionDispatcher.completed', 'Terminé')}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30">
                                  {t('productionDispatcher.inPrep', 'À Préparer')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* --- VIEW 3: STORE CONSOLIDATION MATRIX --- */}
      {viewMode === 'matrix' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-amber-400" />
                {t('productionDispatcher.matrixTitle', 'Matrice Consolidée : Produits × Magasins')}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {t(
                  'productionDispatcher.matrixSubtitle',
                  'Vue croisée permettant de vérifier les quantités attribuées à chaque boutique par atelier.'
                )}
              </p>
            </div>
            <button
              onClick={exportConsolidatedSummaryCSV}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('productionDispatcher.exportCsv', 'Export CSV')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-xs font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">{t('productionDispatcher.roomAndProduct', 'Salle & Produit')}</th>
                  <th className="py-3.5 px-4 text-center bg-amber-500/10 text-amber-400 font-extrabold">
                    {t('productionDispatcher.totalLab', 'Total Labo')}
                  </th>
                  {stores.map((st) => (
                    <th key={st.id} className="py-3.5 px-3 text-center whitespace-nowrap">
                      {st.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {orderedReports.map((report) => (
                  <React.Fragment key={report.roomId}>
                    {/* Room Category Header */}
                    <tr className="bg-zinc-950/90 font-bold text-xs text-amber-400">
                      <td colSpan={2 + stores.length} className="py-2.5 px-4 tracking-wide uppercase flex items-center gap-2">
                        <span>{isRtl ? report.roomNameAr : report.roomNameFr}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          ({report.totalUnitsToProduce} {t('productionDispatcher.units', 'pcs')})
                        </span>
                      </td>
                    </tr>

                    {report.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition">
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-zinc-100">{item.productName}</span>
                          <span className="text-xs text-zinc-500 ml-2">({item.unit})</span>
                        </td>
                        <td className="py-2.5 px-4 text-center bg-amber-500/5 font-extrabold text-amber-400">
                          {item.totalQuantityRequired}
                        </td>
                        {stores.map((st) => {
                          const storeQty =
                            item.storeBreakdown.find((sb) => sb.storeId === st.id)?.quantity || 0;
                          return (
                            <td
                              key={st.id}
                              className={`py-2.5 px-3 text-center text-xs ${
                                storeQty > 0 ? 'font-bold text-zinc-100 bg-zinc-800/20' : 'text-zinc-600'
                              }`}
                            >
                              {storeQty > 0 ? storeQty : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PRINT MODAL 1: SINGLE ROOM WORK TICKET --- */}
      {printModalReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Actions Bar (hidden in browser print) */}
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-zinc-100 text-sm">
                  {t('productionDispatcher.printPreview', 'Aperçu Bon de Travail Atelier')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintTrigger}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('productionDispatcher.printNow', 'Imprimer')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalReport(null)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ticket Printable Body (Designed for clean A4 / Thermal output) */}
            <div id="printable-room-ticket" className="p-8 bg-white text-zinc-900 overflow-y-auto space-y-6 print:p-0">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-950">DÉLICE — LABO CENTRAL</h1>
                  <p className="text-xs font-semibold text-zinc-600 uppercase">Ordre de Fabrication & Dispatch</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-zinc-900 text-white font-extrabold text-sm rounded">
                    ATELIER : {printModalReport.roomNameFr.toUpperCase()}
                  </span>
                  <p className="text-xs text-zinc-600 mt-1">
                    Date Cible : <strong>{printModalReport.targetDate}</strong>
                  </p>
                </div>
              </div>

              {/* Summary Stats Strip */}
              <div className="grid grid-cols-3 gap-3 bg-zinc-100 p-3 rounded border border-zinc-300 text-xs">
                <div>
                  <span className="text-zinc-500 block">Total Unités à Fabriquer :</span>
                  <strong className="text-base text-zinc-950">{printModalReport.totalUnitsToProduce} pcs</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Nombre de Recettes :</span>
                  <strong className="text-base text-zinc-950">{printModalReport.items.length} références</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Boutiques à Livrer :</span>
                  <strong className="text-base text-zinc-950">{printModalReport.participatingStoresCount} boutiques</strong>
                </div>
              </div>

              {/* Items & Store Breakdown Table */}
              <table className="w-full text-left text-xs border border-zinc-300">
                <thead className="bg-zinc-200 text-zinc-800 uppercase font-bold border-b border-zinc-300">
                  <tr>
                    <th className="py-2 px-3 border-r border-zinc-300">Réf / Pâtisserie</th>
                    <th className="py-2 px-3 text-center border-r border-zinc-300 w-24">Quantité Totale</th>
                    <th className="py-2 px-3 text-center border-r border-zinc-300 w-20">Nb Lots</th>
                    <th className="py-2 px-3">Répartition Dispatch Magasins</th>
                    <th className="py-2 px-2 text-center w-16">Pointage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-300">
                  {printModalReport.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                      <td className="py-2.5 px-3 border-r border-zinc-300 font-bold text-zinc-950">
                        {item.productName}
                      </td>
                      <td className="py-2.5 px-3 border-r border-zinc-300 text-center font-extrabold text-sm">
                        {item.totalQuantityRequired} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 border-r border-zinc-300 text-center font-medium">
                        {item.totalBatchesNeeded} lots
                      </td>
                      <td className="py-2.5 px-3 text-zinc-800 font-medium">
                        {formatStoreBreakdown(item.storeBreakdown)}
                      </td>
                      <td className="py-2.5 px-2 border-l border-zinc-300 text-center">
                        <div className="w-4 h-4 border-2 border-zinc-400 mx-auto rounded-sm"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures & Notes */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-zinc-300 text-xs">
                <div className="border border-zinc-300 rounded p-3 h-24">
                  <span className="font-bold text-zinc-700 block mb-1">Visa Chef de Partie Atelier :</span>
                  <div className="mt-8 border-t border-dashed border-zinc-400 text-[10px] text-zinc-500">Nom & Signature</div>
                </div>
                <div className="border border-zinc-300 rounded p-3 h-24">
                  <span className="font-bold text-zinc-700 block mb-1">Contrôle Qualité & Emballage Labo :</span>
                  <div className="mt-8 border-t border-dashed border-zinc-400 text-[10px] text-zinc-500">Nom & Signature</div>
                </div>
              </div>

              <p className="text-[10px] text-center text-zinc-400">
                Généré automatiquement par Délice ERP — {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT MODAL 2: PRINT ALL ROOM TICKETS (CONSOLIDATED DOSSIER) --- */}
      {printAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-zinc-100 text-sm">
                  {t('productionDispatcher.dossierTitle', 'Dossier de Production Global — 7 Ateliers')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintTrigger}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm flex items-center gap-2 shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('productionDispatcher.printNow', 'Imprimer Tout')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintAllModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="p-8 bg-white text-zinc-900 overflow-y-auto space-y-8 print:p-0">
              {orderedReports.map((report, rIdx) => (
                <div key={rIdx} className="page-break space-y-4 pb-6 border-b-2 border-zinc-300 last:border-b-0">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <div>
                      <h2 className="text-lg font-black text-zinc-950">
                        {rIdx + 1}. ATELIER : {report.roomNameFr.toUpperCase()}
                      </h2>
                      <p className="text-xs text-zinc-600">{report.roomDescriptionFr}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold px-2.5 py-1 bg-zinc-900 text-white rounded">
                        {report.totalUnitsToProduce} pcs
                      </span>
                    </div>
                  </div>

                  {report.items.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-2">Aucune production requise pour cet atelier.</p>
                  ) : (
                    <table className="w-full text-left text-xs border border-zinc-300">
                      <thead className="bg-zinc-200 text-zinc-800 uppercase font-bold border-b border-zinc-300">
                        <tr>
                          <th className="py-2 px-3 border-r border-zinc-300">Pâtisserie</th>
                          <th className="py-2 px-3 text-center border-r border-zinc-300 w-24">Quantité</th>
                          <th className="py-2 px-3 text-center border-r border-zinc-300 w-20">Nb Lots</th>
                          <th className="py-2 px-3">Répartition Magasins</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-300">
                        {report.items.map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                            <td className="py-2 px-3 border-r border-zinc-300 font-bold">{item.productName}</td>
                            <td className="py-2 px-3 border-r border-zinc-300 text-center font-extrabold">
                              {item.totalQuantityRequired} {item.unit}
                            </td>
                            <td className="py-2 px-3 border-r border-zinc-300 text-center">{item.totalBatchesNeeded} lots</td>
                            <td className="py-2 px-3 text-zinc-700">{formatStoreBreakdown(item.storeBreakdown)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
