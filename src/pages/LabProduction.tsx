import React, { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, repairRequisitionStatuses } from '../db/db';
import { getRequisitions, getRawMaterials, getStores } from '../services/storage';
import { MASTER_PRODUCT_CATALOG } from '../utils/orderAggregator';
import { INITIAL_RAW_MATERIALS } from '../data/mockData';
import {
  Sparkles,
  Flame,
  Cookie,
  Crown,
  Layers,
  Award,
  Eye,
  RefreshCw,
  Printer,
  Boxes,
  Store,
  Calendar,
  Search,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
  Package,
  FileSpreadsheet,
  FileText,
  ClipboardList,
  LayoutGrid
} from 'lucide-react';
import { OrdreDeFabricationReport } from '../components/lab/OrdreDeFabricationReport';

/**
 * Case-insensitive check for 'approved', 'approuvé', and 'validated' (Requirement 5)
 */
export function isStatusApproved(status: string | undefined): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'approved' ||
    s === 'approuvé' ||
    s === 'approuve' ||
    s === 'validated' ||
    s === 'validé' ||
    s === 'valide'
  );
}

/**
 * Canonical Room ID Normalization
 * Ensures 'patisseries_fines' and 'patisserie_fine' both map to 'patisseries_fines'
 * and any unrecognized or undefined room defaults to 'patisseries_fines' (Requirement 4)
 */
export function normalizeRoomId(roomId: string | undefined): string {
  if (!roomId) return 'patisseries_fines';
  const r = String(roomId).toLowerCase().trim().replace(/[-\s]/g, '_');
  if (
    r === 'patisserie_fine' ||
    r === 'patisserie_fines' ||
    r === 'patisseries_fine' ||
    r === 'patisseries_fines'
  ) {
    return 'patisseries_fines';
  }
  if (r === 'mille_feuille' || r === 'mille_feuilles' || r === 'feuilletage') {
    return 'feuilletage';
  }
  if (r === 'gateau_sec' || r === 'gateaux_sec' || r === 'gateaux_secs') {
    return 'gateaux_secs';
  }
  if (r === 'gateau_oriental' || r === 'gateaux_orientaux') {
    return 'gateaux_orientaux';
  }
  if (r === 'viennoiserie' || r === 'viennoiseries') {
    return 'viennoiserie';
  }
  if (r === 'piece_montee' || r === 'pieces_montees') {
    return 'piece_montee';
  }
  if (r === 'trompe_loeil' || r === 'trompe_l_oeil' || r === 'trompe_oeil') {
    return 'trompe_oeil';
  }
  return r || 'patisseries_fines';
}

export interface ProductionRoomMeta {
  id: string;
  nameFr: string;
  nameAr: string;
  categoryFr: string;
  icon: any;
  colorTheme: {
    bg: string;
    border: string;
    badge: string;
    text: string;
    bar: string;
  };
}

export const ROOMS_META: Record<string, ProductionRoomMeta> = {
  patisseries_fines: {
    id: 'patisseries_fines',
    nameFr: 'Pâtisseries Fines',
    nameAr: 'حلويات راقية وفاخرة',
    categoryFr: 'Entremets, Tartes, Éclairs & Macarons',
    icon: Sparkles,
    colorTheme: {
      bg: 'bg-purple-50/70',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-900 border-purple-300',
      text: 'text-purple-950',
      bar: 'bg-purple-600',
    },
  },
  viennoiserie: {
    id: 'viennoiserie',
    nameFr: 'Viennoiserie & Brioche',
    nameAr: 'كرواسون وفطائر بريوش',
    categoryFr: 'Pâte Levée Feuilletée & Tourage',
    icon: Flame,
    colorTheme: {
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      text: 'text-amber-950',
      bar: 'bg-amber-600',
    },
  },
  gateaux_secs: {
    id: 'gateaux_secs',
    nameFr: 'Gâteaux Secs & Biscuits',
    nameAr: 'حلويات جافة وبسكويت',
    categoryFr: 'Biscuiterie, Sablés & Cookies',
    icon: Cookie,
    colorTheme: {
      bg: 'bg-yellow-50/70',
      border: 'border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-900 border-yellow-300',
      text: 'text-yellow-950',
      bar: 'bg-yellow-600',
    },
  },
  gateaux_orientaux: {
    id: 'gateaux_orientaux',
    nameFr: 'Gâteaux Orientaux',
    nameAr: 'حلويات تقليدية وشرقية',
    categoryFr: 'Pâtisserie Traditionnelle & Miel',
    icon: Crown,
    colorTheme: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      text: 'text-emerald-950',
      bar: 'bg-emerald-600',
    },
  },
  feuilletage: {
    id: 'feuilletage',
    nameFr: 'Feuilletage & Mille-Feuille',
    nameAr: 'ميل فوي وعجائن مورقة',
    categoryFr: 'Feuilletage Inversé & Glaçage',
    icon: Layers,
    colorTheme: {
      bg: 'bg-orange-50/70',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      text: 'text-orange-950',
      bar: 'bg-orange-600',
    },
  },
  piece_montee: {
    id: 'piece_montee',
    nameFr: 'Pièces Montées & Événements',
    nameAr: 'كعكات المناسبات والأعراس',
    categoryFr: 'Wedding Cakes, Pyramides Choux & Prestige',
    icon: Award,
    colorTheme: {
      bg: 'bg-rose-50/70',
      border: 'border-rose-200',
      badge: 'bg-rose-100 text-rose-900 border-rose-300',
      text: 'text-rose-950',
      bar: 'bg-rose-600',
    },
  },
  trompe_oeil: {
    id: 'trompe_oeil',
    nameFr: 'Trompe-l’œil & Signatures',
    nameAr: 'إبداعات ترومب لوي الحرفية',
    categoryFr: 'Créations Cédric Grolet & Sculptures',
    icon: Eye,
    colorTheme: {
      bg: 'bg-teal-50/70',
      border: 'border-teal-200',
      badge: 'bg-teal-100 text-teal-900 border-teal-300',
      text: 'text-teal-950',
      bar: 'bg-teal-600',
    },
  },
};

export interface AggregatedItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  itemType: 'finished_product' | 'raw_material';
  roomId: string;
  totalQuantity: number;
  storesBreakdown: Record<string, { storeName: string; quantity: number }>;
}

export function LabProduction() {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRescanning, setIsRescanning] = useState<boolean>(false);

  // VIEW MODE: Grid dispatcher vs dedicated Ordre de Fabrication (OF) view
  const [viewMode, setViewMode] = useState<'DISPATCHER' | 'OF_REPORT'>('DISPATCHER');
  const [selectedOFRoomId, setSelectedOFRoomId] = useState<string>('patisseries_fines');

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // ==========================================================================
  // REQUIREMENT 1 & 5: Live Query from Dexie.js
  // 1. useLiveQuery listens to db.requisitions.where('status').equals('approved')
  // 5. Case-insensitive status check for 'approved', 'approuvé', and 'validated'
  // ==========================================================================
  const approvedRequisitions = useLiveQuery(async () => {
    try {
      // 1. Direct indexed query on db.requisitions for status 'approved' (Requirement 1)
      const directlyApproved = await db.requisitions.where('status').equals('approved').toArray();

      // 2. Also fetch all requisitions for case-insensitive check (Requirement 5)
      const allDexieReqs = await db.requisitions.toArray();

      // Hydration fallback if Dexie table is not yet seeded
      const sourceReqs = allDexieReqs.length > 0 ? allDexieReqs : (getRequisitions() || []);

      const caseInsensitiveMatches = sourceReqs.filter((req: any) => {
        return isStatusApproved(req.status);
      });

      // Merge & deduplicate by ID
      const map = new Map<string, any>();
      for (const r of directlyApproved) {
        if (r.id) map.set(r.id, r);
      }
      for (const r of caseInsensitiveMatches) {
        if (r.id) map.set(r.id, r);
      }

      return Array.from(map.values());
    } catch (err: any) {
      console.warn('[useLiveQuery db.requisitions] query notice:', err);
      // Fallback
      const stored = getRequisitions() || [];
      return stored.filter((r: any) => isStatusApproved(r.status));
    }
  }, []);

  // ==========================================================================
  // REQUIREMENT 3: Check both db.products and db.raw_materials tables
  // ==========================================================================
  const dexieProducts = useLiveQuery(async () => {
    try {
      const list = await db.products.toArray();
      if (list && list.length > 0) return list;
    } catch (err) {
      console.warn('[useLiveQuery db.products] notice:', err);
    }
    return MASTER_PRODUCT_CATALOG.map((p, idx) => ({
      id: p.id || `prod-${idx + 1}`,
      name: p.name,
      roomId: p.roomId || 'patisseries_fines',
      category: p.category,
      unit: p.unit || 'pcs',
      itemType: 'finished_product',
    }));
  }, []);

  const dexieRawMaterials = useLiveQuery(async () => {
    try {
      const list = await db.raw_materials.toArray();
      if (list && list.length > 0) return list;
    } catch (err) {
      console.warn('[useLiveQuery db.raw_materials] notice:', err);
    }
    const local = getRawMaterials();
    return (local?.length ? local : INITIAL_RAW_MATERIALS).map((rm) => ({
      id: rm.id,
      name: rm.name,
      roomId: (rm as any).roomId || 'gateaux_secs',
      category: rm.category,
      unit: rm.unit || 'kg',
      itemType: 'raw_material',
    }));
  }, []);

  // On mount and when triggered, run repair script to convert legacy statuses
  useEffect(() => {
    repairRequisitionStatuses()
      .then(({ updatedCount, totalCount }) => {
        log(`Database check: Repaired ${updatedCount}/${totalCount} legacy requisitions to canonical 'approved'.`);
      })
      .catch((err) => log(`Repair warning: ${err.message}`));
  }, []);

  // Manual rescan handler
  const handleForceRescan = async () => {
    setIsRescanning(true);
    log('Forcing manual rescan & Dexie table sync...');
    try {
      const { updatedCount, totalCount } = await repairRequisitionStatuses();
      log(`Rescan finished: ${totalCount} requisitions scanned, ${updatedCount} repaired.`);
    } catch (err: any) {
      log(`Rescan error: ${err.message}`);
    } finally {
      setIsRescanning(false);
    }
  };

  // Available stores for dropdown
  const storeLocations = useMemo(() => {
    return getStores();
  }, []);

  // ==========================================================================
  // AGGREGATION PIPELINE
  // Requirements 2, 3, 4, 5
  // ==========================================================================
  const { aggregatedRooms, totalUnits, totalOrdersCount, activeRoomsCount, participatingStores } = useMemo(() => {
    const reqs = approvedRequisitions || [];

    // Filter by selected store if specified
    const filteredReqs = reqs.filter((req) => {
      if (selectedStoreFilter !== 'ALL' && req.storeId !== selectedStoreFilter) {
        return false;
      }
      return true;
    });

    // Build Fast Product & Raw Material Lookup Maps (Requirement 3)
    const productCatalogMap = new Map<string, any>();
    (dexieProducts || []).forEach((p: any) => {
      if (p.id) productCatalogMap.set(String(p.id).trim(), p);
      if (p.code) productCatalogMap.set(String(p.code).trim(), p);
      if (p.name) productCatalogMap.set(String(p.name).toLowerCase().trim(), p);
    });

    const rawMaterialsCatalogMap = new Map<string, any>();
    (dexieRawMaterials || []).forEach((rm: any) => {
      if (rm.id) rawMaterialsCatalogMap.set(String(rm.id).trim(), rm);
      if (rm.code) rawMaterialsCatalogMap.set(String(rm.code).trim(), rm);
      if (rm.name) rawMaterialsCatalogMap.set(String(rm.name).toLowerCase().trim(), rm);
    });

    // Map: RoomId -> Map<ProductKey, AggregatedItem>
    const roomsMap: Record<string, Map<string, AggregatedItem>> = {
      patisseries_fines: new Map(),
      viennoiserie: new Map(),
      gateaux_secs: new Map(),
      gateaux_orientaux: new Map(),
      feuilletage: new Map(),
      piece_montee: new Map(),
      trompe_oeil: new Map(),
    };

    let totalUnitsSum = 0;
    const storesSet = new Set<string>();

    filteredReqs.forEach((req: any, reqIndex: number) => {
      const storeId = req.storeId || 'default-store';
      const storeName = req.storeName || `Magasin ${storeId}`;
      storesSet.add(storeName);

      // Support req.lines, req.items, req.cart, req.orderLines flexibly
      const rawLines = Array.isArray(req.lines)
        ? req.lines
        : Array.isArray(req.items)
        ? req.items
        : Array.isArray(req.cart)
        ? req.cart
        : Array.isArray(req.orderLines)
        ? req.orderLines
        : [];

      rawLines.forEach((line: any) => {
        // REQUIREMENT 2: Requisition lines match items flexibly checking line.productId, line.product_id, and line.id
        const itemId = String(line.productId || line.product_id || line.id || line.itemId || '').trim();
        const itemName = String(
          line.itemTitle || line.productName || line.product_name || line.name || line.title || 'Article Pâtisserie'
        ).trim();
        const normName = itemName.toLowerCase().trim();

        const quantity = Number(line.requestedQty ?? line.quantityRequested ?? line.quantity ?? line.qty ?? 0);
        if (quantity <= 0) return;

        // REQUIREMENT 3: Check both db.products and db.raw_materials tables for matching room IDs
        let matchedProduct: any = null;
        let matchedRawMaterial: any = null;

        if (itemId) {
          matchedProduct = productCatalogMap.get(itemId);
          matchedRawMaterial = rawMaterialsCatalogMap.get(itemId);
        }

        if (!matchedProduct && !matchedRawMaterial && normName) {
          matchedProduct = productCatalogMap.get(normName);
          matchedRawMaterial = rawMaterialsCatalogMap.get(normName);
        }

        const isRawMaterial =
          Boolean(matchedRawMaterial) ||
          line.itemType === 'raw_material' ||
          line.type === 'raw_material' ||
          (line.category && line.category.toLowerCase().includes('matière')) ||
          normName.startsWith('farine') ||
          normName.startsWith('beurre') ||
          normName.startsWith('sucre') ||
          normName.startsWith('chocolat valrhona');

        const itemType: 'finished_product' | 'raw_material' = isRawMaterial ? 'raw_material' : 'finished_product';

        const catalogEntry = matchedProduct || matchedRawMaterial;

        // REQUIREMENT 4: Default any item with an undefined roomId to 'patisseries_fines' so it is NEVER hidden in the UI
        let candidateRoom = catalogEntry?.roomId || line.roomId || line.room_id;
        if (!candidateRoom || candidateRoom === 'undefined' || candidateRoom === 'null' || candidateRoom === '') {
          candidateRoom = 'patisseries_fines';
        }

        const canonicalRoomId = normalizeRoomId(candidateRoom);

        // Ensure room map bucket exists (fallback to patisseries_fines)
        if (!roomsMap[canonicalRoomId]) {
          roomsMap[canonicalRoomId] = new Map();
        }

        const unit = line.unit || catalogEntry?.unit || (isRawMaterial ? 'kg' : 'pcs');
        const category = line.category || catalogEntry?.category || (isRawMaterial ? 'Matières Premières' : 'Pâtisseries Fines');

        // Aggregation key by item ID or normalized name
        const aggKey = itemId ? `id_${itemId}` : `name_${normName}`;

        const roomItems = roomsMap[canonicalRoomId];
        let existing = roomItems.get(aggKey);

        if (!existing) {
          existing = {
            id: itemId || `item-${normName}`,
            name: catalogEntry?.name || itemName,
            category,
            unit,
            itemType,
            roomId: canonicalRoomId,
            totalQuantity: 0,
            storesBreakdown: {},
          };
          roomItems.set(aggKey, existing);
        }

        existing.totalQuantity += quantity;
        if (!existing.storesBreakdown[storeId]) {
          existing.storesBreakdown[storeId] = { storeName, quantity: 0 };
        }
        existing.storesBreakdown[storeId].quantity += quantity;

        totalUnitsSum += quantity;
      });
    });

    // Convert room items to sorted arrays and filter by search query
    const resultRooms: Array<{
      meta: ProductionRoomMeta;
      items: AggregatedItem[];
      totalRoomUnits: number;
    }> = [];

    let activeCount = 0;

    Object.entries(roomsMap).forEach(([roomId, itemsMap]) => {
      let itemsList = Array.from(itemsMap.values());

      // Apply search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        itemsList = itemsList.filter(
          (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
        );
      }

      // Sort by total quantity descending
      itemsList.sort((a, b) => b.totalQuantity - a.totalQuantity);

      const totalRoomUnits = itemsList.reduce((acc, curr) => acc + curr.totalQuantity, 0);
      if (itemsList.length > 0) {
        activeCount++;
      }

      const meta = ROOMS_META[roomId] || {
        id: roomId,
        nameFr: roomId.replace('_', ' ').toUpperCase(),
        nameAr: 'ورشة الإنتاج',
        categoryFr: 'Laboratoire Pâtisserie',
        icon: Sparkles,
        colorTheme: ROOMS_META.patisseries_fines.colorTheme,
      };

      resultRooms.push({
        meta,
        items: itemsList,
        totalRoomUnits,
      });
    });

    return {
      aggregatedRooms: resultRooms,
      totalUnits: totalUnitsSum,
      totalOrdersCount: filteredReqs.length,
      activeRoomsCount: activeCount,
      participatingStores: Array.from(storesSet),
    };
  }, [approvedRequisitions, dexieProducts, dexieRawMaterials, selectedStoreFilter, searchQuery]);

  // Filtered rooms display according to room tab
  const displayedRooms = useMemo(() => {
    if (selectedRoomFilter === 'ALL') {
      return aggregatedRooms;
    }
    return aggregatedRooms.filter((r) => r.meta.id === selectedRoomFilter);
  }, [aggregatedRooms, selectedRoomFilter]);

  // Extract originating requisition numbers for traceability
  const originatingRequisitions = useMemo(() => {
    if (!approvedRequisitions) return [];
    const set = new Set<string>();
    approvedRequisitions.forEach((r: any) => {
      const code = r.requisitionNumber || r.id;
      if (code) set.add(String(code).replace(/^#/, ''));
    });
    return Array.from(set);
  }, [approvedRequisitions]);

  // Selected room for Ordre de Fabrication report view
  const currentOFRoom = useMemo(() => {
    const found = aggregatedRooms.find((r) => r.meta.id === selectedOFRoomId);
    return found || aggregatedRooms[0];
  }, [aggregatedRooms, selectedOFRoomId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Dexie LiveQuery Connecté
            </span>
            <span className="text-xs text-slate-400 font-medium">Temps réel & Hors-ligne</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dispatcher de Production Laboratoire
          </h1>
          <p className="text-sm text-slate-600">
            Agrégation automatique des réquisitions validées par poste de travail (Laboratoire Central)
          </p>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('DISPATCHER')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'DISPATCHER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grille Ateliers</span>
            </button>
            <button
              onClick={() => {
                const target =
                  displayedRooms.find((r) => r.items.length > 0)?.meta.id ||
                  (selectedRoomFilter !== 'ALL' ? selectedRoomFilter : 'patisseries_fines');
                setSelectedOFRoomId(target);
                setViewMode('OF_REPORT');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'OF_REPORT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
              <span>Ordres de Fabrication (OF)</span>
            </button>
          </div>

          <button
            onClick={handleForceRescan}
            disabled={isRescanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Rescanner et réparer les statuts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualiser Dexie</span>
          </button>

          <button
            onClick={() => setShowDebug(!showDebug)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            <span>Diagnostic</span>
            {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Réquisitions Approuvées</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalOrdersCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Status: 'approved', 'approuvé', 'validated'</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unités à Fabriquer</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalUnits}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total pièces & matières premières</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Ateliers Actifs</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeRoomsCount} <span className="text-sm font-semibold text-slate-400">/ 7</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Postes de fabrication sollicités</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Boutiques Commanditaires</span>
            <Store className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{participatingStores.length}</div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {participatingStores.join(', ') || 'Aucune boutique'}
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Item */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un gâteau ou matière première..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Store Filter */}
          <div className="relative">
            <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="ALL">Toutes les boutiques</option>
              {storeLocations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter Dropdown */}
          <div className="relative">
            <Boxes className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="ALL">Tous les ateliers (7 postes)</option>
              {Object.values(ROOMS_META).map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.nameFr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Room Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          <button
            onClick={() => setSelectedRoomFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedRoomFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tous les ateliers ({totalUnits})
          </button>
          {aggregatedRooms.map(({ meta, totalRoomUnits }) => {
            const Icon = meta.icon;
            const isSelected = selectedRoomFilter === meta.id;
            return (
              <button
                key={meta.id}
                onClick={() => setSelectedRoomFilter(meta.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? `${meta.colorTheme.bar} text-white shadow-xs`
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.nameFr}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {totalRoomUnits}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Diagnostic Drawer */}
      {showDebug && (
        <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-white font-bold">
            <span className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Dexie.js Live Diagnostic Log
            </span>
            <span className="text-slate-400 text-[11px]">
              IndexedDB Store Requisitions Status Aggregator
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 py-1 text-[11px] text-slate-300">
            <div>Live Requisitions: {approvedRequisitions?.length ?? 'chargement...'}</div>
            <div>db.products: {dexieProducts?.length ?? 0}</div>
            <div>db.raw_materials: {dexieRawMaterials?.length ?? 0}</div>
            <div>Filter Room: {selectedRoomFilter}</div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] pt-1">
            {debugLogs.length === 0 ? (
              <div className="text-slate-500">En attente de messages système...</div>
            ) : (
              debugLogs.map((entry, idx) => <div key={idx}>{entry}</div>)
            )}
          </div>
        </div>
      )}

      {/* VIEW SELECTION: Dedicated OF Report View vs Dispatcher Grid */}
      {viewMode === 'OF_REPORT' ? (
        <div className="space-y-6">
          {/* Workshop selector tabs for OF */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto print:hidden">
            {aggregatedRooms.map((room) => {
              const isSelected = room.meta.id === selectedOFRoomId;
              const Icon = room.meta.icon;
              return (
                <button
                  key={room.meta.id}
                  onClick={() => setSelectedOFRoomId(room.meta.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{room.meta.nameFr}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {room.items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Ordre de Fabrication Report */}
          <OrdreDeFabricationReport
            roomMeta={currentOFRoom.meta}
            items={currentOFRoom.items}
            originatingRequisitions={originatingRequisitions}
            totalRoomUnits={currentOFRoom.totalRoomUnits}
            onClose={() => setViewMode('DISPATCHER')}
          />
        </div>
      ) : (
        /* DISPATCHER ROOM CARDS (Empty State vs Active Rooms) */
        displayedRooms.every((r) => r.items.length === 0) ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-8 text-center space-y-3">
            <Boxes className="w-12 h-12 text-amber-600 mx-auto" />
            <h3 className="text-lg font-bold text-amber-900">
              Aucune commande approuvée à fabriquer actuellement
            </h3>
            <p className="text-sm text-amber-700 max-w-lg mx-auto">
              Dès qu'une réquisition est approuvée dans le gestionnaire des réquisitions, elle s'affiche
              automatiquement en temps réel dans cette vue dispatchée par atelier.
            </p>
            <div className="pt-2">
              <button
                onClick={handleForceRescan}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Forcer la vérification
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedRooms
              .filter((r) => r.items.length > 0)
              .map(({ meta, items, totalRoomUnits }) => {
                const Icon = meta.icon;
                return (
                  <div
                    key={meta.id}
                    className={`rounded-2xl border ${meta.colorTheme.border} ${meta.colorTheme.bg} overflow-hidden shadow-xs flex flex-col`}
                  >
                    {/* Room Card Header */}
                    <div className="p-4 sm:p-5 border-b border-inherit flex items-start justify-between gap-3 bg-white/70">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.colorTheme.bar} text-white shadow-xs`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-black text-slate-900">{meta.nameFr}</h2>
                            <span className="text-xs font-bold text-slate-400 font-arabic">
                              {meta.nameAr}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{meta.categoryFr}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Total Atelier
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {totalRoomUnits}{' '}
                            <span className="text-xs font-semibold text-slate-500">unités</span>
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedOFRoomId(meta.id);
                            setViewMode('OF_REPORT');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer"
                          title="Voir et imprimer l'Ordre de Fabrication de cet atelier"
                        >
                          <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">OF Atelier</span>
                        </button>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="p-4 sm:p-5 flex-1 space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                                {item.itemType === 'raw_material' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Matière Première
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    Produit Fini
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium block">
                                {item.category}
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-flex items-baseline gap-1 text-base font-black text-slate-900">
                                {item.totalQuantity}
                                <span className="text-xs font-semibold text-slate-500">
                                  {item.unit}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Store Breakdown Badges */}
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                              Répartition:
                            </span>
                            {Object.entries(item.storesBreakdown).map(([storeId, detail]) => (
                              <span
                                key={storeId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                <span className="text-slate-500">{detail.storeName}:</span>
                                <span className="font-bold text-slate-900">
                                  {detail.quantity} {item.unit}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )
      )}
    </div>
  );
}
