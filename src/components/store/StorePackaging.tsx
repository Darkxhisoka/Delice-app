import React, { useState, useEffect } from 'react';
import {
  getActiveStore,
  getStorePackagingInventory,
  getPackagingMaterials,
  getPackagingDispatches,
  getPackagingRequisitions,
  confirmPackagingDelivery,
  createPackagingRequisition,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import { fetchStorePackagingInventoryFromSupabase } from '../../services/supabaseService';
import {
  StorePackagingInventory,
  PackagingMaterial,
  PackagingDispatch,
  PackagingRequisition,
  StoreLocation
} from '../../types';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  AlertTriangle,
  Boxes,
  X,
  Check,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';

export const StorePackaging: React.FC = () => {
  const [activeStore, setActiveStore] = useState<StoreLocation>(getActiveStore());
  const [inventory, setInventory] = useState<StorePackagingInventory[]>([]);
  const [materials, setMaterials] = useState<PackagingMaterial[]>([]);
  const [dispatches, setDispatches] = useState<PackagingDispatch[]>([]);
  const [requisitions, setRequisitions] = useState<PackagingRequisition[]>([]);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'RECEIVE_DELIVERY' | 'REQUEST_SUPPLY'>('INVENTORY');

  // Delivery confirmation modal state
  const [selectedDispatch, setSelectedDispatch] = useState<PackagingDispatch | null>(null);
  const [receiveVerification, setReceiveVerification] = useState<
    Array<{ packaging_id: string; quantity_received: number }>
  >([]);
  const [receiverName, setReceiverName] = useState('Gérant Boutique');
  const [receiptNotes, setReceiptNotes] = useState('');

  // Requisition form state
  const [reqItems, setReqItems] = useState<Array<{ packaging_id: string; quantity_requested: number }>>([]);
  const [reqNotes, setReqNotes] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const store = getActiveStore();
      setActiveStore(store);

      try {
        const supaInv = await fetchStorePackagingInventoryFromSupabase(store.id);
        if (supaInv && supaInv.length > 0) {
          setInventory(supaInv);
        } else {
          setInventory(getStorePackagingInventory(store.id));
        }
      } catch {
        setInventory(getStorePackagingInventory(store.id));
      }

      setMaterials(getPackagingMaterials());
      setDispatches(getPackagingDispatches(store.id));
      setRequisitions(getPackagingRequisitions(store.id));
    };

    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  // Filter in-transit deliveries directed to this store
  const inTransitDispatches = dispatches.filter((d) => d.status === 'IN_TRANSIT');

  // Open delivery modal
  const handleOpenDeliveryModal = (dispatch: PackagingDispatch) => {
    setSelectedDispatch(dispatch);
    setReceiveVerification(
      dispatch.items.map((i) => ({
        packaging_id: i.packaging_id,
        quantity_received: i.quantity_sent
      }))
    );
    setReceiptNotes('');
  };

  // Submit delivery confirmation
  const handleConfirmDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispatch) return;

    try {
      confirmPackagingDelivery(
        selectedDispatch.id,
        receiveVerification,
        receiverName,
        receiptNotes
      );

      notifyToast({
        type: 'success',
        title: 'Livraison réceptionnée !',
        message: `Les emballages du bon ${selectedDispatch.dispatch_number} ont été ajoutés au stock de ${activeStore.name}.`
      });

      setSelectedDispatch(null);
      setActiveTab('INVENTORY');
    } catch (err: any) {
      notifyToast({ type: 'error', title: 'Erreur Réception', message: err.message });
    }
  };

  // Add requisition line
  const handleAddReqLine = () => {
    const availableMat = materials.find((m) => !reqItems.some((ri) => ri.packaging_id === m.id)) || materials[0];
    if (!availableMat) return;
    setReqItems([...reqItems, { packaging_id: availableMat.id, quantity_requested: 50 }]);
  };

  const handleRemoveReqLine = (index: number) => {
    setReqItems(reqItems.filter((_, i) => i !== index));
  };

  const handleUpdateReqLine = (index: number, field: 'packaging_id' | 'quantity_requested', value: any) => {
    const updated = [...reqItems];
    if (field === 'packaging_id') {
      updated[index].packaging_id = value;
    } else {
      updated[index].quantity_requested = Math.max(1, parseInt(value) || 0);
    }
    setReqItems(updated);
  };

  // Submit requisition
  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (reqItems.length === 0) {
      notifyToast({ type: 'error', title: 'Formulaire vide', message: 'Ajoutez au moins une référence d’emballage.' });
      return;
    }

    try {
      const created = createPackagingRequisition(
        activeStore.id,
        reqItems,
        'Gérant Boutique',
        reqNotes
      );

      notifyToast({
        type: 'success',
        title: 'Demande transmise au labo central',
        message: `Réquisition ${created.requisition_number} créée.`
      });

      setReqItems([]);
      setReqNotes('');
      setActiveTab('INVENTORY');
    } catch (err: any) {
      notifyToast({ type: 'error', title: 'Erreur', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-2xl font-bold">
              <Package className="w-5 h-5 text-amber-600" />
            </span>
            <h2 className="text-xl font-black text-slate-900">Stock Emballage Boutique — {activeStore.name}</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestion du stock en magasin pour les boîtes à gâteaux, sacs viennoiseries et réception des livraisons du labo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inTransitDispatches.length > 0 && (
            <button
              onClick={() => setActiveTab('RECEIVE_DELIVERY')}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 animate-pulse"
            >
              <Truck className="w-4 h-4" />
              <span>Réceptionner Livraison ({inTransitDispatches.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              if (reqItems.length === 0) handleAddReqLine();
              setActiveTab('REQUEST_SUPPLY');
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Demander Réapprovisionnement</span>
          </button>
        </div>
      </div>

      {/* Incoming Delivery Alert Banner */}
      {inTransitDispatches.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-200/60 text-indigo-800 flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-900 text-sm">
                🚚 Delivery in transit from Central Lab ({inTransitDispatches.length} shipment)
              </h4>
              <p className="text-xs text-indigo-700">
                Un bon d'expédition d'emballages est actuellement en route pour votre boutique.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenDeliveryModal(inTransitDispatches[0])}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs flex items-center gap-1"
          >
            <span>Confirmer Réception Stock</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-fit">
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'INVENTORY'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-600" />
          <span>Stock Emballages en Magasin</span>
        </button>

        <button
          onClick={() => setActiveTab('RECEIVE_DELIVERY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'RECEIVE_DELIVERY'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-600" />
          <span>Livraisons du Labo ({inTransitDispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REQUEST_SUPPLY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'REQUEST_SUPPLY'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4 text-emerald-600" />
          <span>Demande de Réapprovisionnement</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY TABLE */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900">Quantités d'Emballages en Réserve</h3>
            <span className="text-xs text-slate-500 font-bold">{inventory.length} référence(s) en magasin</span>
          </div>

          {/* Desktop Table View (≥ 768px) */}
          <div className="hidden md:block overflow-x-auto webkit-overflow-scrolling-touch">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Référence Emballage</th>
                  <th className="p-4">Type Unité</th>
                  <th className="p-4 text-right">Quantité en Magasin (En Stock)</th>
                  <th className="p-4 text-center">Niveau de Réserve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {materials.map((m) => {
                  const item = inventory.find((inv) => inv.packaging_id === m.id);
                  const qtyOnHand = item ? item.quantity_on_hand : 0;
                  const isLow = qtyOnHand < 20;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{m.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {m.unit_type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-sm">
                        {qtyOnHand.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {qtyOnHand === 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                            <X className="w-3 h-3 text-rose-600" /> Épuisé
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Faible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Suffisant
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards Layout (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/50 p-3 space-y-3">
            {materials.map((m) => {
              const item = inventory.find((inv) => inv.packaging_id === m.id);
              const qtyOnHand = item ? item.quantity_on_hand : 0;
              const isLow = qtyOnHand < 20;

              return (
                <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{m.name}</h4>
                        <span className="text-[11px] text-slate-500">Unité: {m.unit_type}</span>
                      </div>
                    </div>
                    {qtyOnHand === 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
                        Épuisé
                      </span>
                    ) : isLow ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                        Faible
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                        Suffisant
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Quantité en Réserve Magasin</span>
                    <span className="font-black text-slate-900 text-base">{qtyOnHand.toLocaleString()} {m.unit_type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVE INCOMING DELIVERIES */}
      {activeTab === 'RECEIVE_DELIVERY' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Livraisons d'Emballages en Provenance du Laboratoire Central
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Confirmez les quantités physiques reçues à l'arrivée du camion pour mettre à jour le stock boutique.
            </p>
          </div>

          <div className="space-y-4">
            {dispatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucun bon de livraison enregistré pour cette boutique.
              </div>
            ) : (
              dispatches.map((disp) => (
                <div
                  key={disp.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    disp.status === 'IN_TRANSIT'
                      ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{disp.dispatch_number}</span>
                        <span className="text-xs text-slate-500 font-bold">par {disp.created_by}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Expédié le {new Date(disp.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>

                    <div>
                      {disp.status === 'IN_TRANSIT' ? (
                        <button
                          onClick={() => handleOpenDeliveryModal(disp)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirmer Réception Physical</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Réceptionné le {new Date(disp.received_at || '').toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-2 text-xs">
                    {disp.items.map((item) => (
                      <span key={item.id} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                        <strong>{item.packaging_name}</strong>: Envoyé {item.quantity_sent} {item.unit_type}
                        {disp.status === 'RECEIVED' && item.quantity_received !== undefined && (
                          <span className="text-emerald-600 font-bold ml-1">
                            (Reçu: {item.quantity_received})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REQUEST PACKAGING SUPPLY */}
      {activeTab === 'REQUEST_SUPPLY' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-600" />
              Créer une Demande de Réapprovisionnement d'Emballages
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Transmettez une réquisition au laboratoire central pour vos besoins en sacs et boîtes pâtissières.
            </p>
          </div>

          <form onSubmit={handleSubmitRequisition} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Articles d'Emballage Souhaités ({reqItems.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddReqLine}
                  className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une Référence</span>
                </button>
              </div>

              {reqItems.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Aucun article sélectionné. Cliquez sur "Ajouter une Référence".
                </div>
              ) : (
                <div className="space-y-2">
                  {reqItems.map((line, idx) => {
                    const selectedMat = materials.find((m) => m.id === line.packaging_id);
                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-[240px]">
                          <select
                            value={line.packaging_id}
                            onChange={(e) => handleUpdateReqLine(idx, 'packaging_id', e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit_type})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Quantité Demandée :</span>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity_requested}
                              onChange={(e) => handleUpdateReqLine(idx, 'quantity_requested', e.target.value)}
                              className="w-24 p-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-xs text-right focus:outline-none"
                            />
                            <span className="text-xs text-slate-600 font-bold">{selectedMat?.unit_type}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveReqLine(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Note / Motif de la Demande :
              </label>
              <input
                type="text"
                placeholder="Ex: Réserve faible avant le ruch du weekend..."
                value={reqNotes}
                onChange={(e) => setReqNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="submit"
                disabled={reqItems.length === 0}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Soumettre la Réquisition d’Emballages</span>
              </button>
            </div>
          </form>

          {/* Past Requisitions List */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historique de vos Demandes</h4>
            {requisitions.length === 0 ? (
              <p className="text-xs text-slate-400">Aucune réquisition soumise.</p>
            ) : (
              <div className="space-y-2">
                {requisitions.map((req) => (
                  <div key={req.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{req.requisition_number}</span>
                      <span className="text-slate-500 ml-2">({req.items.length} références)</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELIVERY CONFIRMATION VERIFICATION MODAL */}
      {selectedDispatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Truck className="w-5 h-5 text-indigo-600" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Confirmer Réception Emballage</h3>
                  <p className="text-xs text-slate-500">{selectedDispatch.dispatch_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDispatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  Vérification des Quantités Physiques Reçues :
                </label>

                {selectedDispatch.items.map((item, idx) => {
                  const verif = receiveVerification.find((v) => v.packaging_id === item.packaging_id);
                  const val = verif ? verif.quantity_received : item.quantity_sent;

                  return (
                    <div key={item.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.packaging_name}</span>
                        <span className="text-[11px] text-slate-500">Expédié: {item.quantity_sent} {item.unit_type}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Reçu:</span>
                        <input
                          type="number"
                          min="0"
                          value={val}
                          onChange={(e) => {
                            const num = parseInt(e.target.value) || 0;
                            setReceiveVerification(
                              receiveVerification.map((v) =>
                                v.packaging_id === item.packaging_id ? { ...v, quantity_received: num } : v
                              )
                            );
                          }}
                          className="w-20 p-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-right focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Nom du Réceptionnaire :
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Anomalies / Articles Endommagés :</label>
                <input
                  type="text"
                  placeholder="Ex: 2 boîtes écrasées dans le transport..."
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDispatch(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider et Créditer le Stock Store</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
