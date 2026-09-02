import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getRequisitionsByStore, getActiveStore, subscribeToStoreChanges, notifyToast } from '../../services/storage';
import { fetchRequisitionsFromSupabase } from '../../services/supabaseService';
import { Requisition, RequisitionStatus } from '../../types';
import { PackingListModal } from '../lab/PackingListModal';
import {
  Clock,
  CheckCircle2,
  Package,
  Truck,
  CheckCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  Building2,
  Printer,
  Download,
  FileText,
  Loader2
} from 'lucide-react';
import { exportRequisitionsListPDF, exportSingleRequisitionPDF } from '../../utils/pdfExport';

export const StoreRequisitionHistory: React.FC = () => {
  const activeStore = getActiveStore();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPackingListReq, setSelectedPackingListReq] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const supaReqs = await fetchRequisitionsFromSupabase(activeStore.id);
      if (supaReqs && supaReqs.length > 0) {
        setRequisitions(supaReqs);
      } else {
        setRequisitions(getRequisitionsByStore(activeStore.id));
      }
    } catch (err: any) {
      console.error('Error fetching requisitions from Supabase:', err);
      notifyToast({
        type: 'error',
        title: 'Erreur Supabase Réquisitions',
        message: err.message || 'Impossible de charger l\'historique des réquisitions.'
      });
      setRequisitions(getRequisitionsByStore(activeStore.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(() => {
      loadData();
    });
  }, [activeStore.id]);

  const filtered = requisitions.filter((req) => {
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesSearch =
      req.requisitionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> En Attente de Révision
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approuvée
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Package className="w-3.5 h-3.5" /> En Préparation / Emballage
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Truck className="w-3.5 h-3.5" /> En Cours de Livraison
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCheck className="w-3.5 h-3.5" /> Livrée
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Rejetée
          </span>
        );
      default:
        return null;
    }
  };

  const renderStatusPipeline = (status: RequisitionStatus) => {
    if (status === 'REJECTED') {
      return (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Cette commande a été refusée par la direction du Laboratoire Central.</span>
        </div>
      );
    }

    const steps: { key: RequisitionStatus; label: string }[] = [
      { key: 'PENDING', label: 'Demandée' },
      { key: 'APPROVED', label: 'Approuvée' },
      { key: 'PROCESSING', label: 'Au Labo' },
      { key: 'DISPATCHED', label: 'Expédiée' },
      { key: 'DELIVERED', label: 'Livrée' },
    ];

    const statusOrder: Record<RequisitionStatus, number> = {
      PENDING: 1,
      APPROVED: 2,
      IN_PRODUCTION: 3,
      PROCESSING: 3,
      READY_FOR_DISPATCH: 3.5,
      IN_TRANSIT: 4,
      DISPATCHED: 4,
      DELIVERED: 5,
      REJECTED: 0,
    };

    const currentLevel = statusOrder[status];

    return (
      <div className="w-full py-2">
        <div className="flex items-center justify-between relative">
          {/* Progress Bar Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${((currentLevel - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, idx) => {
            const stepLevel = statusOrder[step.key];
            const isCompleted = stepLevel <= currentLevel;
            const isCurrent = stepLevel === currentLevel;

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                >
                  {isCompleted ? <CheckCheck className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-semibold mt-1.5 ${
                    isCurrent ? 'text-emerald-700 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Historique des Commandes de {activeStore.name}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Suivez le statut de préparation et le calendrier de livraison pour cette boutique.</p>
        </div>

        {/* Filters & Export */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => exportRequisitionsListPDF(filtered, `Boutique ${activeStore.name}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter PDF</span>
          </button>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher N° ou article..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvée</option>
              <option value="PROCESSING">En préparation</option>
              <option value="DISPATCHED">Expédiée</option>
              <option value="DELIVERED">Livrée</option>
              <option value="REJECTED">Rejetée</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requisitions List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Package className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Aucune Commande Trouvée</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Aucune commande ne correspond à vos critères de recherche pour {activeStore.name}. Utilisez le formulaire ci-dessus pour envoyer une nouvelle demande.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((req, index) => {
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
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                >
                  {/* Main Card Summary */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                        <Package className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{req.requisitionNumber}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>Demandée le : <strong className="text-slate-700">{req.dateRequested}</strong></span>
                          <span>•</span>
                          <span>Requise pour : <strong className="text-slate-700">{req.dateNeeded}</strong></span>
                          <span>•</span>
                          <span>{req.items.length} Pâtisserie(s)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Coût Est. Total</span>
                        <span className="text-base font-black text-slate-900">{req.totalEstimatedCost.toFixed(2)} DZD</span>
                      </div>

                      {req.status !== 'REJECTED' && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportSingleRequisitionPDF(req);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-colors"
                            title="Exporter le Bon de Réquisition Officiel en PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" /> PDF Bon
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPackingListReq(req);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors"
                            title="Imprimer le bon de colisage"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" /> Bon de Colisage
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
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
                        {/* Visual Progress Stepper */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Progression de la Préparation</h4>
                          {renderStatusPipeline(req.status)}
                        </div>

                        {req.rejectionReason && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                            <strong className="font-bold">Motif du refus du Laboratoire :</strong> {req.rejectionReason}
                          </div>
                        )}

                        {/* Itemized Table */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Détail des Articles Commandés</h4>
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                                  <th className="p-2.5">Nom de l'Article</th>
                                  <th className="p-2.5">Catégorie</th>
                                  <th className="p-2.5 text-center">Qté Demandée</th>
                                  <th className="p-2.5 text-center">Qté Livrée</th>
                                  <th className="p-2.5 text-right">Coût Est./Unité</th>
                                  <th className="p-2.5 text-right">Sous-total</th>
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
                                    <td className="p-2.5 text-center text-slate-600">
                                      {item.fulfilledQuantity !== undefined ? `${item.fulfilledQuantity} ${item.unit}` : 'En attente'}
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
                        </div>

                        {req.notes && (
                          <div className="text-xs text-slate-600 bg-amber-50/80 border border-amber-200 p-3 rounded-xl">
                            <strong className="font-bold text-amber-900">Instructions de Livraison de la Boutique :</strong> {req.notes}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      {/* Packing List Print Modal */}
      {selectedPackingListReq && (
        <PackingListModal
          requisition={selectedPackingListReq}
          store={activeStore}
          onClose={() => setSelectedPackingListReq(null)}
        />
      )}
    </div>
  );
};
