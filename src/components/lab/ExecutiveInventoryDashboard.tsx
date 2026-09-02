import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  subscribeToSupabaseRealtime,
  fetchRawMaterialsFromSupabase,
  fetchPackagingMaterialsFromSupabase,
  fetchRequisitionsFromSupabase,
  fetchInventoryAdjustmentsFromSupabase,
  updateRequisitionStatusInSupabase,
  insertInventoryAdjustmentToSupabase,
  upsertRawMaterialToSupabase,
  upsertPackagingMaterialToSupabase,
  fetchStorePackagingInventoryFromSupabase
} from '../../services/supabaseService';
import {
  getStores,
  getPackagingMaterials,
  getRawMaterials,
  getStorePackagingInventory,
  getActivityLogs,
  addActivityLog,
  notifyToast,
  subscribeToStoreChanges,
  getActiveStoreId
} from '../../services/storage';
import {
  RawMaterial,
  PackagingMaterial,
  StoreLocation,
  StorePackagingInventory,
  Requisition,
  InventoryAdjustment,
  ActivityLogItem,
  DestockingReasonCategory
} from '../../types';
import { PackagingFormModal } from './PackagingFormModal';
import { AddRawMaterialModal } from './AddRawMaterialModal';
import { WeeklyProductionTrendsChart } from './WeeklyProductionTrendsChart';
import {
  Crown,
  Package,
  Boxes,
  Store,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Layers,
  Activity,
  TrendingUp,
  Building,
  Phone,
  UserCheck,
  FileText,
  Check,
  X,
  ChevronRight,
  Calendar,
  Radio,
  SlidersHorizontal,
  Loader2,
  CheckSquare
} from 'lucide-react';

type ExecutiveTab = 'OVERVIEW' | 'PRODUCTION_TRENDS' | 'REQUISITIONS' | 'STOCK_MGMT' | 'ACTIVITY_LOGS';

export const ExecutiveInventoryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('OVERVIEW');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('');

  // Main Master Data States
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [packagingMaterials, setPackagingMaterials] = useState<PackagingMaterial[]>([]);
  const [storePackagingInventory, setStorePackagingInventory] = useState<StorePackagingInventory[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // Selected Store Modal State for Tab 1
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);

  // Requisition Action Modal State for Tab 2
  const [rejectingReq, setRejectingReq] = useState<Requisition | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Stock Management Sub-tab & Modals for Tab 3
  const [stockType, setStockType] = useState<'RAW' | 'PACKAGING'>('PACKAGING');
  const [isAddRawModalOpen, setIsAddRawModalOpen] = useState(false);
  const [isAddPkgModalOpen, setIsAddPkgModalOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Quick Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<{
    id: string;
    type: 'RAW' | 'PACKAGING';
    name: string;
    currentStock: number;
    unit: string;
    unitCost: number;
  } | null>(null);
  const [adjustMode, setAdjustMode] = useState<'RECEIPT' | 'WASTAGE' | 'RECOUNT'>('RECEIPT');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustReasonCategory, setAdjustReasonCategory] = useState<DestockingReasonCategory>('INVENTORY_CORRECTION');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState<boolean>(false);

  // Activity Log Filters for Tab 4
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logStoreFilter, setLogStoreFilter] = useState('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState('ALL');

  // Load All Data from Supabase with Local Storage Fallbacks
  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      // 1. Stores
      let storeList = getStores();
      try {
        const { data: supaStores, error: storeErr } = await supabase.from('stores').select('*').order('name');
        if (!storeErr && supaStores && supaStores.length > 0) {
          storeList = supaStores.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || `STR-${s.id}`,
            address: s.address || 'Alger',
            managerName: s.manager_name || s.managerName || 'Responsable',
            phone: s.phone || '0550000000'
          }));
        }
      } catch (err) {
        console.warn('Supabase store fetch warning:', err);
      }
      setStores(storeList);

      // 2. Packaging Materials
      let pkgList = await fetchPackagingMaterialsFromSupabase();
      if (!pkgList || pkgList.length === 0) {
        pkgList = getPackagingMaterials();
      }
      setPackagingMaterials(pkgList);

      // 3. Raw Materials
      let rawList = await fetchRawMaterialsFromSupabase();
      if (!rawList || rawList.length === 0) {
        rawList = getRawMaterials();
      }
      setRawMaterials(rawList);

      // 4. Store Packaging Inventory
      let storePkgInv: StorePackagingInventory[] = [];
      try {
        const currentStoreId = getActiveStoreId();
        let query = supabase.from('store_packaging_inventory').select('*');
        if (currentStoreId && currentStoreId !== 'ALL' && currentStoreId !== 'LAB-CENTRAL') {
          query = query.eq('store_id', currentStoreId);
        }
        const { data: supaPkgInv, error: pkgInvErr } = await query;
        if (!pkgInvErr && supaPkgInv && supaPkgInv.length > 0) {
          storePkgInv = supaPkgInv.map((row: any) => ({
            id: row.id,
            store_id: row.store_id,
            store_name: row.store_name,
            packaging_id: row.packaging_id,
            packaging_name: row.packaging_name,
            quantity_on_hand: Number(row.quantity_on_hand ?? 0)
          }));
        } else {
          storePkgInv = getStorePackagingInventory(currentStoreId !== 'ALL' && currentStoreId !== 'LAB-CENTRAL' ? currentStoreId : undefined);
        }
      } catch (err) {
        storePkgInv = getStorePackagingInventory();
      }
      setStorePackagingInventory(storePkgInv);

      // 5. Requisitions
      let reqList = await fetchRequisitionsFromSupabase();
      if (!reqList || reqList.length === 0) {
        const localReqs = localStorage.getItem('pastry_app_requisitions');
        reqList = localReqs ? JSON.parse(localReqs) : [];
      }
      setRequisitions(reqList);

      // 6. Inventory Adjustments
      let adjList = await fetchInventoryAdjustmentsFromSupabase();
      if (!adjList || adjList.length === 0) {
        const localAdj = localStorage.getItem('pastry_app_inventory_adjustments');
        adjList = localAdj ? JSON.parse(localAdj) : [];
      }
      setAdjustments(adjList);

      // 7. Activity Logs
      setActivityLogs(getActivityLogs());

      setLastSync(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error loading executive dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to local storage state updates
    const unsubscribeLocal = subscribeToStoreChanges(() => {
      setActivityLogs(getActivityLogs());
    });

    // Subscribe to Supabase Realtime channel
    const unsubscribeRealtime = subscribeToSupabaseRealtime((table) => {
      loadDashboardData();
      notifyToast({
        type: 'info',
        title: '🔴 Synchro En Direct (Supabase)',
        message: `Mise à jour détectée sur la table "${table}". Tableau de bord rafraîchi.`
      });
    });

    return () => {
      unsubscribeLocal();
      unsubscribeRealtime();
    };
  }, [loadDashboardData]);

  // --- HEADER SUMMARY CARDS CALCULATIONS ---
  const summaryCards = useMemo(() => {
    // 1. Raw Materials Status
    const totalRawItems = rawMaterials.length;
    const lowRawItems = rawMaterials.filter(
      (m) => Number(m.currentStock) <= Number(m.min_reorder_level || m.reorderLevel || 10)
    ).length;

    // 2. Central Packaging Bulk Reserve
    const totalPackagingUnits = packagingMaterials.reduce((acc, p) => acc + Number(p.central_stock_qty || 0), 0);
    const lowPackagingItems = packagingMaterials.filter(
      (p) => Number(p.central_stock_qty) <= Number(p.min_alert_qty || 100)
    ).length;

    // 3. Pending Store Requisitions
    const pendingReqCount = requisitions.filter((r) => r.status === 'PENDING').length;

    // 4. Multi-Store Alert Status
    let storesAlertCount = 0;
    stores.forEach((store) => {
      const storeInv = storePackagingInventory.filter((item) => item.store_id === store.id);
      const hasStockout = storeInv.some((item) => item.quantity_on_hand <= 0);
      const hasLowStock = storeInv.some((item) => item.quantity_on_hand < 30);
      if (hasStockout || hasLowStock || storeInv.length === 0) {
        storesAlertCount++;
      }
    });

    return {
      totalRawItems,
      lowRawItems,
      totalPackagingUnits,
      lowPackagingItems,
      pendingReqCount,
      storesAlertCount
    };
  }, [rawMaterials, packagingMaterials, requisitions, stores, storePackagingInventory]);

  // --- HANDLER: Approve & Dispatch Requisition ---
  const handleApproveAndDispatch = async (req: Requisition) => {
    try {
      // 1. Deduct requested quantities from Central stock and Add to Store local stock
      for (const item of req.items) {
        const requestedQty = item.quantityRequested;

        // Try to find matching packaging item or raw material
        const pkgMatch = packagingMaterials.find(
          (p) => p.name.toLowerCase() === item.productName.toLowerCase() || p.id === item.id
        );

        if (pkgMatch) {
          const newStock = Math.max(0, pkgMatch.central_stock_qty - requestedQty);
          await upsertPackagingMaterialToSupabase({
            ...pkgMatch,
            central_stock_qty: newStock
          });

          // Add to store_packaging_inventory
          const { data: existingStoreInv } = await supabase
            .from('store_packaging_inventory')
            .select('*')
            .eq('store_id', req.storeId)
            .eq('packaging_id', pkgMatch.id)
            .maybeSingle();

          const currentQtyOnHand = existingStoreInv ? Number(existingStoreInv.quantity_on_hand || 0) : 0;
          await supabase.from('store_packaging_inventory').upsert(
            {
              id: existingStoreInv?.id || `spi-${req.storeId}-${pkgMatch.id}`,
              store_id: req.storeId,
              store_name: req.storeName,
              packaging_id: pkgMatch.id,
              packaging_name: pkgMatch.name,
              quantity_on_hand: currentQtyOnHand + requestedQty,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );
        } else {
          // Check Raw Material
          const rawMatch = rawMaterials.find(
            (r) => r.name.toLowerCase() === item.productName.toLowerCase() || r.id === item.id
          );

          if (rawMatch) {
            const newStock = Math.max(0, rawMatch.currentStock - requestedQty);
            await upsertRawMaterialToSupabase({
              ...rawMatch,
              currentStock: newStock
            });
          }
        }
      }

      // 2. Update requisition status to 'DISPATCHED'
      await updateRequisitionStatusInSupabase(req.id, 'DISPATCHED');

      // 3. Add activity log
      addActivityLog({
        type: 'STOCK_ADJUSTED',
        title: '🚚 Requisition Approuvée & Expédiée',
        description: `Commande ${req.requisitionNumber} expédiée vers ${req.storeName} par la Direction Labo. Stock labo déduit & stock boutique crédité.`,
        actor: 'Chef Hakim',
        badgeText: 'EXPÉDITION-VALIDE',
        severity: 'success'
      });

      notifyToast({
        type: 'success',
        title: 'Expédition Réussie',
        message: `La commande ${req.requisitionNumber} a été validée, le stock du labo a été ajusté et la boutique ${req.storeName} a été créditée.`
      });

      await loadDashboardData();
    } catch (err: any) {
      console.error('Error in handleApproveAndDispatch:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur d\'Expédition',
        message: err.message || 'Impossible de valider l\'expédition.'
      });
    }
  };

  // --- HANDLER: Reject Requisition ---
  const handleConfirmRejectRequisition = async () => {
    if (!rejectingReq) return;
    try {
      await updateRequisitionStatusInSupabase(rejectingReq.id, 'REJECTED', {
        rejectionReason: rejectReason.trim() || 'Motif non spécifié par la Direction Labo'
      });

      addActivityLog({
        type: 'STOCK_ADJUSTED',
        title: '❌ Requisition Rejetée',
        description: `Commande ${rejectingReq.requisitionNumber} pour ${rejectingReq.storeName} rejetée par la Direction Labo. Motif: ${rejectReason || 'Non spécifié'}`,
        actor: 'Chef Hakim',
        badgeText: 'REQUISITION-REJET',
        severity: 'danger'
      });

      notifyToast({
        type: 'warning',
        title: 'Requisition Rejetée',
        message: `La commande ${rejectingReq.requisitionNumber} a été refusée.`
      });

      setRejectingReq(null);
      setRejectReason('');
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error rejecting requisition:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Rejet',
        message: err.message || 'Impossible de rejeter la commande.'
      });
    }
  };

  // --- HANDLER: Execute Quick Stock Adjustment ---
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    setIsSavingAdjustment(true);
    try {
      let finalStock = adjustingItem.currentStock;
      let qtyDelta = Number(adjustQty);

      if (adjustMode === 'RECEIPT') {
        finalStock += qtyDelta;
      } else if (adjustMode === 'WASTAGE') {
        finalStock = Math.max(0, finalStock - qtyDelta);
      } else if (adjustMode === 'RECOUNT') {
        finalStock = qtyDelta;
        qtyDelta = Math.abs(qtyDelta - adjustingItem.currentStock);
      }

      // 1. Update stock in Supabase & Local Cache
      if (adjustingItem.type === 'PACKAGING') {
        const pkgMatch = packagingMaterials.find((p) => p.id === adjustingItem.id);
        if (pkgMatch) {
          await upsertPackagingMaterialToSupabase({
            ...pkgMatch,
            central_stock_qty: finalStock
          });
        }
      } else {
        const rawMatch = rawMaterials.find((r) => r.id === adjustingItem.id);
        if (rawMatch) {
          await upsertRawMaterialToSupabase({
            ...rawMatch,
            currentStock: finalStock
          });
        }
      }

      // 2. Record inventory adjustment log if wastage or recount
      const totalLossValue = adjustMode === 'WASTAGE' ? qtyDelta * adjustingItem.unitCost : 0;
      await insertInventoryAdjustmentToSupabase({
        raw_material_id: adjustingItem.id,
        raw_material_name: adjustingItem.name,
        unit: adjustingItem.unit,
        quantity_removed: adjustMode === 'WASTAGE' ? qtyDelta : 0,
        unit_cost_at_time: adjustingItem.unitCost,
        total_loss_value: totalLossValue,
        reason_category: adjustReasonCategory,
        notes: adjustNotes || `Ajustement manuel (${adjustMode}) par Direction Labo`,
        created_by: 'Chef Hakim'
      });

      // 3. Add activity log
      addActivityLog({
        type: 'STOCK_ADJUSTED',
        title: `📊 Stock Ajusté (${adjustingItem.name})`,
        description: `Mode: ${adjustMode}. Ancien stock: ${adjustingItem.currentStock} ${adjustingItem.unit} ➔ Nouveau stock: ${finalStock} ${adjustingItem.unit}. Note: ${adjustNotes || 'Aucune'}`,
        actor: 'Chef Hakim',
        badgeText: 'AJUSTEMENT-INVENTAIRE',
        severity: adjustMode === 'WASTAGE' ? 'warning' : 'info'
      });

      notifyToast({
        type: 'success',
        title: 'Stock Mis à Jour',
        message: `Le stock de ${adjustingItem.name} a été ajusté à ${finalStock} ${adjustingItem.unit}.`
      });

      setAdjustingItem(null);
      setAdjustNotes('');
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error saving stock adjustment:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur d\'Ajustement',
        message: err.message || 'Impossible de mettre à jour le stock.'
      });
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  // Filtered Stock List for Tab 3
  const filteredStockList = useMemo(() => {
    if (stockType === 'PACKAGING') {
      return packagingMaterials.filter(
        (p) =>
          p.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
          (p.code && p.code.toLowerCase().includes(stockSearchQuery.toLowerCase())) ||
          (p.category && p.category.toLowerCase().includes(stockSearchQuery.toLowerCase()))
      );
    } else {
      return rawMaterials.filter(
        (r) =>
          r.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
          (r.sku && r.sku.toLowerCase().includes(stockSearchQuery.toLowerCase())) ||
          (r.category && r.category.toLowerCase().includes(stockSearchQuery.toLowerCase()))
      );
    }
  }, [stockType, packagingMaterials, rawMaterials, stockSearchQuery]);

  // Filtered Activity Logs for Tab 4
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchQuery =
        log.title.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.description.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.actor.toLowerCase().includes(logSearchQuery.toLowerCase());

      const matchStore =
        logStoreFilter === 'ALL' ||
        log.description.toLowerCase().includes(logStoreFilter.toLowerCase()) ||
        log.title.toLowerCase().includes(logStoreFilter.toLowerCase());

      const matchType =
        logTypeFilter === 'ALL' ||
        log.type === logTypeFilter ||
        (log.badgeText && log.badgeText.includes(logTypeFilter));

      return matchQuery && matchStore && matchType;
    });
  }, [activityLogs, logSearchQuery, logStoreFilter, logTypeFilter]);

  return (
    <div className="space-y-6">
      
      {/* EXECUTIVE HEADER BANNER */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 rounded-2xl shadow-lg ring-4 ring-amber-400/20">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Tableau de Bord Exécutif • Direction Labo Central
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Vue Directoire Labo Central & 6 Boutiques
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Realtime Sync • {lastSync || 'En direct'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Pilotage en temps réel des stocks du Laboratoire Central, approbation des requisitions et suivi multi-points de vente.
              </p>
            </div>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="self-start lg:self-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{refreshing ? 'Actualisation...' : 'Actualiser Données'}</span>
          </button>
        </div>

        {/* HEADER SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          {/* Card 1: Central Lab Raw Materials */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Matières Premières Labo
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{summaryCards.totalRawItems}</span>
                <span className="text-xs text-slate-400 font-medium">références</span>
              </div>
              {summaryCards.lowRawItems > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {summaryCards.lowRawItems} en alerte stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Tous les stocks optimaux
                </span>
              )}
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl text-amber-400">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Central Packaging Reserve */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Reserve Packaging Central
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{summaryCards.totalPackagingUnits.toLocaleString()}</span>
                <span className="text-xs text-slate-400 font-medium">unités</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {packagingMaterials.length} catégories d'emballages
              </span>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl text-indigo-400">
              <Package className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Pending Requisitions */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Commandes Boutiques En Attente
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${summaryCards.pendingReqCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {summaryCards.pendingReqCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">requisitions</span>
              </div>
              <span className="text-xs text-amber-300 font-semibold block">
                {summaryCards.pendingReqCount > 0 ? 'Action requise de validation' : 'Aucune commande en attente'}
              </span>
            </div>
            <div className={`p-3 rounded-xl ${summaryCards.pendingReqCount > 0 ? 'bg-amber-400/20 text-amber-400 animate-pulse' : 'bg-slate-700/50 text-slate-400'}`}>
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Multi-Store Alert Status */}
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-4 border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Alerte Multi-Boutiques
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{stores.length}</span>
                <span className="text-xs text-slate-400 font-medium">points de vente</span>
              </div>
              {summaryCards.storesAlertCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                  <ShieldAlert className="w-3 h-3" />
                  {summaryCards.storesAlertCount} boutique(s) en alerte stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Réseau 100% Approvisionné
                </span>
              )}
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl text-emerald-400">
              <Store className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* MAIN NAVIGATION TABS */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Tab 1 : Vue Réseau Multi-Boutiques (6 Points)</span>
          </button>

          <button
            onClick={() => setActiveTab('PRODUCTION_TRENDS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'PRODUCTION_TRENDS'
                ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Tab 2 : Tendances Production vs Matières</span>
          </button>

          <button
            onClick={() => setActiveTab('REQUISITIONS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap relative ${
              activeTab === 'REQUISITIONS'
                ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Tab 3 : File de Requisitions & Expéditions</span>
            {summaryCards.pendingReqCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                {summaryCards.pendingReqCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('STOCK_MGMT')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'STOCK_MGMT'
                ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Tab 4 : Gestion Stocks Labo (MP & Packaging)</span>
          </button>

          <button
            onClick={() => setActiveTab('ACTIVITY_LOGS')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
              activeTab === 'ACTIVITY_LOGS'
                ? 'bg-amber-400 text-slate-950 shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Tab 5 : Mouvements & Audit Realtime</span>
          </button>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MULTI-STORE OVERVIEW GRID                                    */}
      {/* ==================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Supervision du Réseau de Vente • 6 Boutiques
              </h2>
              <p className="text-xs text-slate-500">
                Aperçu de la couverture en packaging et état de stock pour chaque point de vente.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              {stores.length} boutiques connectées
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((store) => {
              // Calculate store inventory metrics
              const storeInv = storePackagingInventory.filter((item) => item.store_id === store.id);
              const totalUnitsCount = storeInv.reduce((sum, item) => sum + Number(item.quantity_on_hand || 0), 0);
              
              const hasStockout = storeInv.some((item) => item.quantity_on_hand <= 0);
              const hasLowStock = storeInv.some((item) => item.quantity_on_hand < 30);

              let statusBadge = (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Stock Optimal
                </span>
              );

              if (hasStockout) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    Rupture Urgente
                  </span>
                );
              } else if (hasLowStock || storeInv.length === 0) {
                statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Stock Bas
                  </span>
                );
              }

              return (
                <div
                  key={store.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {store.code || `STORE-${store.id}`}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1">{store.name}</h3>
                        <p className="text-xs text-slate-500">{store.address}</p>
                      </div>
                      {statusBadge}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Gérant / Contact :</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          {store.managerName || 'Responsable Magasin'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Téléphone :</span>
                        <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {store.phone}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Emballages en Stock :</span>
                        <span className="font-black text-indigo-700 text-sm">
                          {totalUnitsCount.toLocaleString()} pièces
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedStore(store)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Détail du Stock Boutique</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Featured Weekly Production Volume vs Raw Material Consumption Line Chart */}
          <div className="pt-2">
            <WeeklyProductionTrendsChart
              requisitions={requisitions}
              rawMaterials={rawMaterials}
            />
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PRODUCTION TRENDS FULL VIEW                                   */}
      {/* ==================================================================== */}
      {activeTab === 'PRODUCTION_TRENDS' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <WeeklyProductionTrendsChart
            requisitions={requisitions}
            rawMaterials={rawMaterials}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: REQUISITIONS & DISPATCH QUEUE (INTERACTIVE WORKFLOW)          */}
      {/* ==================================================================== */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                File d'Approbation des Requisitions & Expéditions
              </h2>
              <p className="text-xs text-slate-500">
                Commandes soumises par les gérants de caisse. La direction du laboratoire approuve et déclenche le transfert physique.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-black">
                {requisitions.filter((r) => r.status === 'PENDING').length} En Attente
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider">
                    <th className="p-4">Code Requisition</th>
                    <th className="p-4">Date / Heure</th>
                    <th className="p-4">Boutique Demandeuse</th>
                    <th className="p-4">Articles Commandés</th>
                    <th className="p-4 text-center">Quantité Demandée</th>
                    <th className="p-4 text-center">Statut</th>
                    <th className="p-4 text-right">Actions Directes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {requisitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Aucune requisition enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    requisitions.map((req) => {
                      const isPending = req.status === 'PENDING';
                      const isDispatched = req.status === 'DISPATCHED' || req.status === 'DELIVERED';
                      const isRejected = req.status === 'REJECTED';

                      const totalQty = req.items.reduce((acc, item) => acc + (item.quantityRequested || 0), 0);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {req.requisitionNumber}
                          </td>
                          <td className="p-4 text-slate-500">
                            {req.dateRequested}
                          </td>
                          <td className="p-4 font-black text-slate-900">
                            {req.storeName}
                          </td>
                          <td className="p-4 space-y-1">
                            {req.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-slate-700">
                                <Package className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="font-semibold">{item.productName}</span>
                                <span className="text-slate-400 font-mono">({item.quantityRequested} {item.unit || 'pcs'})</span>
                              </div>
                            ))}
                          </td>
                          <td className="p-4 text-center font-black text-slate-900 text-sm">
                            {totalQty.toLocaleString()}
                          </td>
                          <td className="p-4 text-center">
                            {isPending && (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-black text-[11px] inline-flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3" />
                                EN ATTENTE
                              </span>
                            )}
                            {isDispatched && (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-black text-[11px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                EXPÉDIÉE
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-black text-[11px] inline-flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                REJETÉE
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveAndDispatch(req)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-xs transition-colors flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approuver & Expédier
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingReq(req);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Rejeter
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Traitée par Directoire
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CENTRAL LAB STOCK MANAGEMENT (RAW MATERIALS & PACKAGING)     */}
      {/* ==================================================================== */}
      {activeTab === 'STOCK_MGMT' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Gestion des Stocks Centralisés du Laboratoire
              </h2>
              <p className="text-xs text-slate-500">
                Catalogue master des emballages et matières premières du laboratoire central.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddPkgModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvel Emballage</span>
              </button>
              <button
                onClick={() => setIsAddRawModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Matière Première</span>
              </button>
            </div>
          </div>

          {/* Sub-tab Switcher & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setStockType('PACKAGING')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  stockType === 'PACKAGING' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📦 Packaging & Emballages ({packagingMaterials.length})
              </button>
              <button
                onClick={() => setStockType('RAW')}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  stockType === 'RAW' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🌾 Matières Premières ({rawMaterials.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={stockSearchQuery}
                onChange={(e) => setStockSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, SKU ou code..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider">
                    <th className="p-4">Code / SKU</th>
                    <th className="p-4">Désignation</th>
                    <th className="p-4">Catégorie</th>
                    <th className="p-4 text-center">Stock Central Labo</th>
                    <th className="p-4 text-right">Coût Unitaire (DA)</th>
                    <th className="p-4 text-center">Seuil Alerte Min</th>
                    <th className="p-4 text-center">Statut Alerte</th>
                    <th className="p-4 text-right">Ajustement Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStockList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Aucun article correspondant trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredStockList.map((item: any) => {
                      const isPkg = stockType === 'PACKAGING';
                      const code = isPkg ? item.code || `PKG-${item.id.slice(-4)}` : item.sku || `SKU-${item.id.slice(-4)}`;
                      const name = item.name;
                      const category = item.category || 'Général';
                      const stockQty = isPkg ? Number(item.central_stock_qty) : Number(item.currentStock);
                      const unitCost = isPkg ? Number(item.unit_cost) : Number(item.currentAvgCost);
                      const minAlert = isPkg ? Number(item.min_alert_qty || 100) : Number(item.min_reorder_level || item.reorderLevel || 10);
                      const unit = isPkg ? item.unit_type || 'pcs' : item.unit || 'kg';

                      const isLow = stockQty <= minAlert;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {code}
                          </td>
                          <td className="p-4 font-black text-slate-900">
                            {name}
                          </td>
                          <td className="p-4 text-slate-500">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {category}
                            </span>
                          </td>
                          <td className="p-4 text-center font-black text-slate-900 text-sm">
                            <span className={isLow ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>
                              {stockQty.toLocaleString()} {unit}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-800">
                            {unitCost.toFixed(2)} DA
                          </td>
                          <td className="p-4 text-center text-slate-500 font-bold">
                            {minAlert} {unit}
                          </td>
                          <td className="p-4 text-center">
                            {isLow ? (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-xl font-black text-[10px] inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                ALERTE STOCK
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                OPTIMAL
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                setAdjustingItem({
                                  id: item.id,
                                  type: isPkg ? 'PACKAGING' : 'RAW',
                                  name,
                                  currentStock: stockQty,
                                  unit,
                                  unitCost
                                });
                                setAdjustQty(10);
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5" />
                              <span>+ / - Ajuster</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: STOCK MOVEMENT & AUDIT LOGS                                   */}
      {/* ==================================================================== */}
      {activeTab === 'ACTIVITY_LOGS' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Fil d'Activité Realtime & Registre d'Audit
              </h2>
              <p className="text-xs text-slate-500">
                Suivi horodaté de toutes les expéditions, réceptions, ajustements et déstockages.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3 text-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Rechercher dans les logs (titre, acteur, motif)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={logStoreFilter}
                onChange={(e) => setLogStoreFilter(e.target.value)}
                className="p-2 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 w-full md:w-auto"
              >
                <option value="ALL">Toutes les Boutiques</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                value={logTypeFilter}
                onChange={(e) => setLogTypeFilter(e.target.value)}
                className="p-2 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900 w-full md:w-auto"
              >
                <option value="ALL">Tous les Types d'Actions</option>
                <option value="STOCK_ADJUSTED">Ajustements Stock</option>
                <option value="NEW_ITEM">Création d'Articles</option>
                <option value="REQUISITION">Requisitions</option>
              </select>
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                Aucune activité enregistrée correspondant aux filtres.
              </p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                        {log.badgeText || log.type}
                      </span>
                      <h4 className="font-black text-slate-900 text-sm">{log.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600">{log.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>Exécuté par : <strong className="text-slate-700">{log.actor}</strong></span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>

                  <span className="self-start sm:self-center px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 shadow-2xs">
                    {log.sourceInterface || 'SYSTEM'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: STORE INVENTORY DETAIL (TAB 1)                                */}
      {/* ==================================================================== */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {selectedStore.code || `STR-${selectedStore.id}`}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Inventaire Emballage • {selectedStore.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-black uppercase border-b border-slate-200">
                    <th className="p-3">Article Packaging</th>
                    <th className="p-3 text-center">Quantité sur Place</th>
                    <th className="p-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {storePackagingInventory
                    .filter((item) => item.store_id === selectedStore.id)
                    .map((item) => {
                      const isZero = item.quantity_on_hand <= 0;
                      const isLow = item.quantity_on_hand < 30;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">
                            {item.packaging_name || `Article #${item.packaging_id}`}
                          </td>
                          <td className="p-3 text-center font-black text-slate-900 text-sm">
                            <span className={isZero ? 'text-rose-600 font-extrabold' : isLow ? 'text-amber-600' : 'text-slate-900'}>
                              {item.quantity_on_hand} pcs
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {isZero ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-black text-[10px]">
                                RUPTURE
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px]">
                                ALERTE BAS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedStore(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: REJECT REQUISITION MOTIF (TAB 2)                               */}
      {/* ==================================================================== */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Motif de Rejet Requisition
              </h3>
              <button
                onClick={() => setRejectingReq(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Veuillez indiquer le motif du refus pour la requisition <strong>{rejectingReq.requisitionNumber}</strong> ({rejectingReq.storeName}).
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Stock central temporairement épuisé, réapprovisionnement demain..."
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmRejectRequisition}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs shadow-md"
              >
                Confirmer le Rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: QUICK STOCK ADJUSTMENT (TAB 3)                                */}
      {/* ==================================================================== */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Ajustement de Stock Manuel</h3>
                  <p className="text-xs text-slate-500">{adjustingItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="p-2 hover:bg-slate-100 rounded-2xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4 text-xs">
              {/* Mode Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Type d'Ajustement
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('RECEIPT')}
                    className={`py-2 rounded-xl font-black transition-all ${
                      adjustMode === 'RECEIPT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Réception / Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('WASTAGE')}
                    className={`py-2 rounded-xl font-black transition-all ${
                      adjustMode === 'WASTAGE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    - Perte / Gaspillage
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('RECOUNT')}
                    className={`py-2 rounded-xl font-black transition-all ${
                      adjustMode === 'RECOUNT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    = Recensement Physique
                  </button>
                </div>
              </div>

              {/* Stock Current vs Delta */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-500 font-medium block">Stock Actuel Labo :</span>
                  <span className="text-base font-black text-slate-900">
                    {adjustingItem.currentStock} {adjustingItem.unit}
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase">
                    {adjustMode === 'RECOUNT' ? 'Nouveau Stock Total' : 'Quantité Modifiée'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Number(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Reason Category if Wastage */}
              {adjustMode === 'WASTAGE' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Motif de Perte / Gaspillage
                  </label>
                  <select
                    value={adjustReasonCategory}
                    onChange={(e) => setAdjustReasonCategory(e.target.value as DestockingReasonCategory)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  >
                    <option value="EXPIRED">Péremption / Date Dépassée</option>
                    <option value="QUALITY_DAMAGE">Dommage Qualité / Abîmé</option>
                    <option value="SPILLAGE_WASTE">Ressuyage / Gaspillage Prod</option>
                    <option value="INVENTORY_CORRECTION">Correction d'Inventaire</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Remarques / Justification
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Ex: Contrôle physique périodique"
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjustment}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingAdjustment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Enregistrer l'Ajustement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATION MODALS FROM OTHER COMPONENTS */}
      <PackagingFormModal
        isOpen={isAddPkgModalOpen}
        onClose={() => setIsAddPkgModalOpen(false)}
        onSuccess={loadDashboardData}
      />

      <AddRawMaterialModal
        isOpen={isAddRawModalOpen}
        onClose={() => setIsAddRawModalOpen(false)}
        onSuccess={loadDashboardData}
      />

    </div>
  );
};
