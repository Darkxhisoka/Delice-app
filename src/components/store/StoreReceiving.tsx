import React, { useState, useEffect } from 'react';
import { DeliveryManifest, Requisition, TransitWasteLog } from '../../types';
import {
  getDeliveryManifestsByStore,
  getRequisitionsByStore,
  getActiveStore,
  confirmStoreDeliveryAndReceive,
  getTransitWasteLogs,
  subscribeToStoreChanges
} from '../../services/storage';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  ShieldCheck,
  X,
  Plus,
  Minus,
  FileText,
  Clock,
  Send,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';

export const StoreReceivingView: React.FC = () => {
  const activeStore = getActiveStore();
  const { triggerSuccess, triggerQuantityChange } = useHapticsAndSound();
  const [manifests, setManifests] = useState<DeliveryManifest[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [transitWasteLogs, setTransitWasteLogs] = useState<TransitWasteLog[]>([]);

  // Selected manifest/delivery to verify
  const [activeVerification, setActiveVerification] = useState<{
    manifestId: string;
    requisitionId: string;
    items: Array<{
      productId: string;
      productName: string;
      category: string;
      unit: string;
      dispatchedQty: number;
      receivedQty: number;
      damagedQty: number;
      missingQty: number;
      unitCost: number;
      sellingPrice: number;
      notes: string;
    }>;
  } | null>(null);

  const [receiverWorkerName, setReceiverWorkerName] = useState(activeStore.managerName || 'Agent Réception Store');

  const loadData = () => {
    const storeManifests = getDeliveryManifestsByStore(activeStore.id);
    const storeReqs = getRequisitionsByStore(activeStore.id);
    setManifests(storeManifests);
    setRequisitions(storeReqs);
    setTransitWasteLogs(getTransitWasteLogs().filter((l) => l.storeId === activeStore.id));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, [activeStore.id]);

  // Find incoming deliveries for this store (manifests with status IN_TRANSIT or requisitions in IN_TRANSIT)
  const incomingDeliveries = manifests.filter((m) => m.status === 'IN_TRANSIT' || m.status === 'READY_FOR_DISPATCH');
  
  // Also check individual store requisitions marked IN_TRANSIT
  const inTransitReqs = requisitions.filter((r) => r.status === 'IN_TRANSIT');

  const handleStartVerification = (manifest: DeliveryManifest, requisitionId: string) => {
    // Filter items specific to this store and requisition
    const reqItems = manifest.items.filter((it) => it.storeId === activeStore.id || it.requisitionId === requisitionId);

    const initialItems = reqItems.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      category: it.category,
      unit: it.unit,
      dispatchedQty: it.quantityDispatched,
      receivedQty: it.quantityDispatched, // default to perfect delivery
      damagedQty: 0,
      missingQty: 0,
      unitCost: it.unitCost || 1.5,
      sellingPrice: it.sellingPrice || 3.5,
      notes: ''
    }));

    setActiveVerification({
      manifestId: manifest.id,
      requisitionId,
      items: initialItems
    });
  };

  const handleQuantityChange = (idx: number, field: 'receivedQty' | 'damagedQty' | 'missingQty', delta: number) => {
    if (!activeVerification) return;
    triggerQuantityChange();

    const newItems = [...activeVerification.items];
    const currentVal = newItems[idx][field];
    const newQty = Math.max(0, currentVal + delta);

    newItems[idx][field] = newQty;

    // Auto calculate missingQty if receivedQty + damagedQty < dispatchedQty
    if (field === 'receivedQty' || field === 'damagedQty') {
      const dispatched = newItems[idx].dispatchedQty;
      const received = newItems[idx].receivedQty;
      const damaged = newItems[idx].damagedQty;
      const diff = dispatched - (received + damaged);
      newItems[idx].missingQty = Math.max(0, diff);
    }

    setActiveVerification({
      ...activeVerification,
      items: newItems
    });
  };

  const handleConfirmReceipt = () => {
    if (!activeVerification) return;

    confirmStoreDeliveryAndReceive({
      manifestId: activeVerification.manifestId,
      requisitionId: activeVerification.requisitionId,
      storeId: activeStore.id,
      storeName: activeStore.name,
      receiverName: receiverWorkerName,
      receiverSignature: `Sig_${receiverWorkerName}_${new Date().getTime()}`,
      verifiedItems: activeVerification.items
    });

    triggerSuccess();
    setActiveVerification(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Réception des Livraisons Inter-Magasins</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeStore.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Vérification tactile des produits expédiés par le Laboratoire Central, comptage de la casse/manquants et réapprovisionnement automatique du stock local.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Deliveries Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-indigo-600" />
          <span>Livraisons En Transit pour {activeStore.name}</span>
        </h2>

        {incomingDeliveries.length === 0 && inTransitReqs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/70" />
            <p className="mt-2 font-bold text-slate-700">Toutes les livraisons prévues ont été récéptionnées !</p>
            <p className="text-xs text-slate-400 mt-1">Aucun camion n'est actuellement en route vers votre boutique.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingDeliveries.map((manifest) => (
              <div key={manifest.id} className="bg-white rounded-2xl border-2 border-indigo-500/40 p-5 shadow-sm space-y-4">
                
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-900 text-white">
                      {manifest.manifestNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-2">Chauffeur : {manifest.driverName}</h3>
                    <p className="text-xs text-slate-500">Immatriculation : {manifest.vehiclePlate || 'Non renseigné'}</p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 animate-pulse flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> EN TRANSIT
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <span className="font-semibold text-slate-500">Articles attendus ({manifest.items.length}) :</span>
                  <p className="mt-1 font-medium text-slate-900 line-clamp-2">
                    {manifest.items.map((it) => `${it.productName} (${it.quantityDispatched} ${it.unit})`).join(' • ')}
                  </p>
                </div>

                {manifest.requisitionIds.map((reqId) => (
                  <button
                    key={reqId}
                    onClick={() => handleStartVerification(manifest, reqId)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Lancer la Vérification & Réception de Stock</span>
                  </button>
                ))}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIVE VERIFICATION MODAL FORM */}
      {activeVerification && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span>Formulaire de Contrôle & Réception de Stock</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pointage des quantités reçues et déclaration de la casse ou des manquants en transit.
                </p>
              </div>
              <button
                onClick={() => setActiveVerification(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verification Form Items List */}
            <div className="mt-4 space-y-4">
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-semibold">Boutique :</span> <strong className="text-slate-900">{activeStore.name}</strong>
                </div>
                <div>
                  <label className="text-slate-500 font-semibold mr-1.5">Agent Récepteur :</label>
                  <input
                    type="text"
                    value={receiverWorkerName}
                    onChange={(e) => setReceiverWorkerName(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Items checklist */}
              <div className="space-y-3">
                {activeVerification.items.map((item, idx) => {
                  const hasDiscrepancy = item.damagedQty > 0 || item.missingQty > 0 || item.receivedQty !== item.dispatchedQty;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        hasDiscrepancy
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.productName}</h4>
                          <span className="text-xs text-slate-500">{item.category}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-black">
                          Expédié : {item.dispatchedQty} {item.unit}
                        </span>
                      </div>

                      {/* Interactive Touch Target Counters */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        
                        {/* Received Quantity Counter */}
                        <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl">
                          <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                            Quantité Conforme Reçue :
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, 'receivedQty', -1)}
                              className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const newItems = [...activeVerification.items];
                                newItems[idx].receivedQty = val;
                                setActiveVerification({ ...activeVerification, items: newItems });
                              }}
                              className="w-16 py-1 text-center font-black text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, 'receivedQty', 1)}
                              className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                            <span className="text-xs font-semibold text-emerald-800">{item.unit}</span>
                          </div>
                        </div>

                        {/* Damaged / Missing Counter */}
                        <div className="bg-rose-50/80 border border-rose-200 p-2.5 rounded-xl">
                          <label className="block text-[11px] font-bold text-rose-900 mb-1">
                            Pertes / Casse / Manquants en Transit :
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, 'damagedQty', -1)}
                              className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold text-base hover:bg-rose-700 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.damagedQty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const newItems = [...activeVerification.items];
                                newItems[idx].damagedQty = val;
                                setActiveVerification({ ...activeVerification, items: newItems });
                              }}
                              className="w-16 py-1 text-center font-black text-sm bg-white border border-rose-300 text-rose-900 rounded-lg focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, 'damagedQty', 1)}
                              className="w-8 h-8 rounded-lg bg-rose-600 text-white font-bold text-base hover:bg-rose-700 active:scale-95 transition-transform flex items-center justify-center shrink-0"
                            >
                              +
                            </button>
                            <span className="text-xs font-semibold text-rose-800">endommagés</span>
                          </div>
                        </div>

                      </div>

                      {/* Discrepancy Note Input */}
                      {hasDiscrepancy && (
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Optionnel : préciser le motif de la casse (ex : boîte écrasée, rupture de froid, manquant camion)"
                            value={item.notes}
                            onChange={(e) => {
                              const newItems = [...activeVerification.items];
                              newItems[idx].notes = e.target.value;
                              setActiveVerification({ ...activeVerification, items: newItems });
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-amber-400"
                          />
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              {/* Confirmation Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveVerification(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer la Réception & Mettre à jour le Stock</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Transit Waste Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Historique des Pertes & Casse en Transit ({transitWasteLogs.length})</span>
        </h3>

        {transitWasteLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">Aucun incident de livraison ni casse en transit signalé pour cette boutique.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Réf Log</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Article Impacté</th>
                  <th className="py-2.5 px-3">Qté Perdue</th>
                  <th className="py-2.5 px-3">Valeur Perte</th>
                  <th className="py-2.5 px-3">Rapporté Par</th>
                  <th className="py-2.5 px-3">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transitWasteLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{log.logCode}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(log.reportedAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{log.productName}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-bold">{log.damagedQty + log.missingQty} {log.unit}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(log.totalLossValue)}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.reportedBy}</td>
                    <td className="py-2.5 px-3 text-slate-500 italic">{log.notes || log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
