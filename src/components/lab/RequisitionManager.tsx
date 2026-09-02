import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getRequisitions,
  getStores,
  updateRequisitionStatus,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  fetchRequisitionsFromSupabase,
  updateRequisitionStatusInSupabase,
  fetchRawMaterialsFromSupabase,
  upsertRawMaterialToSupabase
} from '../../services/supabaseService';
import { isAppOffline } from '../../services/indexedDbQueue';
import { Requisition, RequisitionStatus, StoreLocation } from '../../types';
import {
  RequisitionSearchFilter,
  RequisitionFilterState
} from './RequisitionSearchFilter';
import { PackingListModal } from './PackingListModal';
import {
  Building2,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
  Printer,
  FileText,
  Download,
  Loader2
} from 'lucide-react';
import { exportRequisitionsListPDF, exportSingleRequisitionPDF } from '../../utils/pdfExport';

const DEFAULT_FILTER_STATE: RequisitionFilterState = {
  searchTerm: '',
  selectedStoreId: 'ALL',
  selectedStatus: 'ALL',
  dateFilterType: 'dateRequested',
  datePreset: 'ALL',
  startDate: '',
  endDate: '',
  sortBy: 'dateRequested_desc',
};

export const RequisitionManager: React.FC = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [filters, setFilters] = useState<RequisitionFilterState>(DEFAULT_FILTER_STATE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal state for rejection reason & packing list view
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [selectedPackingListReq, setSelectedPackingListReq] = useState<Requisition | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supaReqs = await fetchRequisitionsFromSupabase('ALL');
      if (supaReqs && supaReqs.length > 0) {
        setRequisitions(supaReqs);
      } else {
        setRequisitions(getRequisitions());
      }
    } catch (err: any) {
      console.error('Error fetching requisitions from Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Supabase Réquisitions',
        message: err.message || 'Impossible de charger les réquisitions depuis Supabase.'
      });
      setRequisitions(getRequisitions());
    } finally {
      setStores(getStores());
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(() => {
      setStores(getStores());
    });
  }, []);

  const handleStatusUpdate = async (
    reqId: string,
    newStatus: RequisitionStatus,
    options?: { rejectionReason?: string }
  ) => {
    try {
      // 1. If not offline, update in Supabase database
      if (!isAppOffline()) {
        await updateRequisitionStatusInSupabase(reqId, newStatus, options);
      }

      // 2. Also update local storage state (which enqueues into IndexedDB)
      const updated = updateRequisitionStatus(reqId, newStatus, options);

      // 3. When Lab Admin approves, trigger raw material inventory deductions if online
      if (!isAppOffline() && (newStatus === 'APPROVED' || newStatus === 'DISPATCHED') && updated) {
        const rawMats = await fetchRawMaterialsFromSupabase();
        if (rawMats && rawMats.length > 0) {
          for (const item of updated.items) {
            const matchingMat = rawMats.find(m =>
              m.name.toLowerCase().includes(item.productName.toLowerCase()) ||
              item.productName.toLowerCase().includes(m.name.toLowerCase())
            );
            if (matchingMat && matchingMat.currentStock > 0) {
              const newQty = Math.max(0, matchingMat.currentStock - item.quantityRequested);
              await upsertRawMaterialToSupabase({
                ...matchingMat,
                currentStock: newQty,
                lastUpdated: new Date().toISOString()
              });
            }
          }
        }
      }

      await loadData();

      const offlineNote = isAppOffline() ? ' (💾 Enregistré localement dans la file IndexedDB)' : '';
      notifyToast({
        type: newStatus === 'REJECTED' ? 'warning' : 'success',
        title: isAppOffline() ? 'Mise à jour hors-ligne' : `Réquisition mise à jour`,
        message: `Statut changé en "${newStatus}"${updated ? ` pour ${updated.storeName}` : ''}${offlineNote}.`,
      });
    } catch (err: any) {
      console.warn('Network update failed, updating local IndexedDB queue:', err);
      // Fallback local update
      const updated = updateRequisitionStatus(reqId, newStatus, options);
      await loadData();
      notifyToast({
        type: 'info',
        title: 'Mise à jour locale (IndexedDB)',
        message: `Statut "${newStatus}" sauvegardé localement dans la file IndexedDB pour synchronisation.`
      });
    }
  };

  const handleOpenRejectModal = (reqId: string) => {
    setRejectingReqId(reqId);
    setRejectionReasonInput('');
  };

  const handleConfirmReject = () => {
    if (!rejectingReqId) return;
    if (!rejectionReasonInput.trim()) {
      alert('Please state a reason for rejecting this requisition.');
      return;
    }
    handleStatusUpdate(rejectingReqId, 'REJECTED', {
      rejectionReason: rejectionReasonInput.trim(),
    });
    setRejectingReqId(null);
  };

  // Filter logic
  const filtered = requisitions.filter((req) => {
    // 1. Store filter
    const matchesStore =
      filters.selectedStoreId === 'ALL' || req.storeId === filters.selectedStoreId;

    // 2. Status filter
    const matchesStatus =
      filters.selectedStatus === 'ALL' || req.status === filters.selectedStatus;

    // 3. Keyword Search match
    const term = filters.searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      req.requisitionNumber.toLowerCase().includes(term) ||
      req.storeName.toLowerCase().includes(term) ||
      req.requestedBy.toLowerCase().includes(term) ||
      (req.notes && req.notes.toLowerCase().includes(term)) ||
      req.items.some(
        (i) =>
          i.productName.toLowerCase().includes(term) ||
          i.category.toLowerCase().includes(term)
      );

    // 4. Date filter
    const targetDateStr =
      filters.dateFilterType === 'dateRequested' ? req.dateRequested : req.dateNeeded;

    let matchesDate = true;
    if (filters.startDate) {
      matchesDate = matchesDate && targetDateStr >= filters.startDate;
    }
    if (filters.endDate) {
      matchesDate = matchesDate && targetDateStr <= filters.endDate;
    }

    return matchesStore && matchesStatus && matchesSearch && matchesDate;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (filters.sortBy === 'dateRequested_desc') {
      return b.dateRequested.localeCompare(a.dateRequested);
    }
    if (filters.sortBy === 'dateRequested_asc') {
      return a.dateRequested.localeCompare(b.dateRequested);
    }
    if (filters.sortBy === 'dateNeeded_asc') {
      return a.dateNeeded.localeCompare(b.dateNeeded);
    }
    if (filters.sortBy === 'amount_desc') {
      return b.totalEstimatedCost - a.totalEstimatedCost;
    }
    if (filters.sortBy === 'amount_asc') {
      return a.totalEstimatedCost - b.totalEstimatedCost;
    }
    return 0;
  });

  const totalFilteredValue = sorted.reduce((sum, r) => sum + r.totalEstimatedCost, 0);

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> En attente de révision
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approuvée
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Package className="w-3.5 h-3.5" /> En cours de préparation / Cuisson
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Truck className="w-3.5 h-3.5" /> Expédiée
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCheck className="w-3.5 h-3.5" /> Livrée
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Rejetée
          </span>
        );
    }
  };

  const pendingCount = requisitions.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Centre de Gestion des Commandes Boutiques</h3>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {pendingCount} En Attente
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gérer, approuver, préparer et expédier les commandes de pâtisserie pour l'ensemble des points de vente.
          </p>
        </div>

        {/* Quick Stats & PDF Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => exportRequisitionsListPDF(sorted, 'Réquisitions Filtrées')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exporter Rapport PDF</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Actives</span>
            <span className="text-sm font-bold text-slate-900">{requisitions.length} Commandes</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] text-amber-700 font-bold uppercase block">En Attente</span>
            <span className="text-sm font-bold text-amber-900">{pendingCount}</span>
          </div>
        </div>
      </div>

      {/* Advanced Requisition Search & Filter Control Component */}
      <RequisitionSearchFilter
        stores={stores}
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={() => setFilters(DEFAULT_FILTER_STATE)}
        totalResultsCount={sorted.length}
        totalRequisitionsCount={requisitions.length}
        totalFilteredValue={totalFilteredValue}
      />

      {/* Requisitions List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">Aucune commande ne correspond aux filtres sélectionnés</p>
          <p className="text-xs text-slate-500">
            Essayez d'ajuster vos mots-clés, le magasin, la période ou le statut de la commande.
          </p>
          <button
            onClick={() => setFilters(DEFAULT_FILTER_STATE)}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
          >
            Réinitialiser les Filtres
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {sorted.map((req, index) => {
              const isExpanded = expandedId === req.id;

              return (
                <motion.div
                  key={req.id}
                  layout="position"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(index * 0.04, 0.28),
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className={`bg-white rounded-2xl border transition-all ${
                    req.status === 'PENDING'
                      ? 'border-amber-300 shadow-sm ring-1 ring-amber-200'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Master Card Header */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{req.requisitionNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {req.storeName}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>Demandeur : <strong className="text-slate-700">{req.requestedBy}</strong></span>
                          <span>•</span>
                          <span>Demandé le : {req.dateRequested}</span>
                          <span>•</span>
                          <span className="text-indigo-700 font-semibold">Requis pour : {req.dateNeeded}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions & Price */}
                    <div className="flex items-center justify-between md:justify-end gap-3 flex-wrap pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Montant Est.</span>
                        <span className="text-base font-black text-slate-900">{req.totalEstimatedCost.toFixed(2)} DZD</span>
                      </div>

                      {/* Stage Transition Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(req.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Rejeter
                            </button>
                          </>
                        )}

                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => handleStatusUpdate(req.id, 'PROCESSING')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <Package className="w-3.5 h-3.5" /> Lancer la Cuisson / Prépa
                          </button>
                        )}

                        {req.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleStatusUpdate(req.id, 'DISPATCHED')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" /> Expédier la Livraison
                          </button>
                        )}

                        {req.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleStatusUpdate(req.id, 'DELIVERED')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Marquer Livrée
                          </button>
                        )}

                        {req.status !== 'REJECTED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => exportSingleRequisitionPDF(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors shadow-2xs"
                              title="Exporter le Bon de Réquisition Officiel en PDF"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" /> PDF Bon
                            </button>

                            <button
                              onClick={() => setSelectedPackingListReq(req)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors shadow-2xs"
                              title="Imprimer le bon de préparation"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-700" /> Bon de Colisage
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="border-t border-slate-200 p-5 bg-slate-50/60 space-y-4 overflow-hidden"
                      >
                        {req.notes && (
                          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                            <strong className="font-bold">Instructions Spéciales Magasin :</strong> {req.notes}
                          </div>
                        )}

                        {req.rejectionReason && (
                          <div className="text-xs text-rose-900 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                            <strong className="font-bold">Motif du Rejet :</strong> {req.rejectionReason}
                          </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                                <th className="p-2.5">Article</th>
                                <th className="p-2.5">Catégorie</th>
                                <th className="p-2.5 text-center">Qté Demandée</th>
                                <th className="p-2.5 text-right">Coût Est./Unité</th>
                                <th className="p-2.5 text-right">Total Ligne</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {req.items.map((item, itemIdx) => (
                                <motion.tr
                                  key={item.id}
                                  initial={{ opacity: 0, x: -6 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: itemIdx * 0.03 }}
                                  className="hover:bg-slate-50"
                                >
                                  <td className="p-2.5 font-bold text-slate-900">{item.productName}</td>
                                  <td className="p-2.5 text-slate-500">{item.category}</td>
                                  <td className="p-2.5 text-center font-bold text-slate-900">
                                    {item.quantityRequested} {item.unit}
                                  </td>
                                  <td className="p-2.5 text-right text-slate-600">{item.unitEstimatedCost.toFixed(2)} DZD</td>
                                  <td className="p-2.5 text-right font-bold text-slate-900">
                                    {(item.quantityRequested * item.unitEstimatedCost).toFixed(2)} DZD
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Rejeter la Commande
              </h3>
              <button
                onClick={() => setRejectingReqId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Veuillez saisir le motif du refus. Cette note sera transmise à l'équipe du point de vente.
            </p>

            <textarea
              rows={3}
              required
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Ex: Stock de matière première insuffisant, veuillez contacter le chef de laboratoire..."
              className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-3 border border-slate-300 focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingReqId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Confirmer le Rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packing List Print Modal */}
      {selectedPackingListReq && (
        <PackingListModal
          requisition={selectedPackingListReq}
          store={stores.find((s) => s.id === selectedPackingListReq.storeId)}
          onClose={() => setSelectedPackingListReq(null)}
        />
      )}

    </div>
  );
};

