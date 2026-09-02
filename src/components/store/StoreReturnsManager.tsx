import React, { useState, useEffect } from 'react';
import { StoreReturnVoucher, ReturnReason, ReturnAction } from '../../types';
import { 
  getStoreReturnVouchers, 
  createStoreReturnVoucher, 
  updateStoreReturnStatus, 
  getActiveStore, 
  getAuthSession,
  getRetailProducts,
  notifyToast, 
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  RotateCcw, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Package, 
  Truck, 
  Building, 
  FileText, 
  ShieldAlert, 
  ArrowRight 
} from 'lucide-react';

export const StoreReturnsManager: React.FC = () => {
  const [vouchers, setVouchers] = useState<StoreReturnVoucher[]>([]);
  const [activeStore, setActiveStore] = useState(getActiveStore());
  const [session, setSession] = useState(getAuthSession());
  const [products, setProducts] = useState(getRetailProducts());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedProductName, setSelectedProductName] = useState('');
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState<ReturnReason>('UNSOLD_DAY_OLD');
  const [actionTaken, setActionTaken] = useState<ReturnAction>('REPURPOSE_PUDDING_CRUMB');
  const [unitCost, setUnitCost] = useState<number>(48.5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadVouchers();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadVouchers();
      setActiveStore(getActiveStore());
      setSession(getAuthSession());
    });
    return () => unsubscribe();
  }, []);

  const loadVouchers = () => {
    setVouchers(getStoreReturnVouchers());
  };

  const handleProductSelect = (name: string) => {
    setSelectedProductName(name);
    const prod = products.find(p => p.name === name);
    if (prod) {
      setUnitCost(prod.costPrice || (prod as any).unit_cost || 48.5);
    }
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductName || quantity <= 0) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner un produit et une quantité valide.' });
      return;
    }

    const totalLossValue = quantity * unitCost;

    createStoreReturnVoucher({
      storeId: activeStore.id,
      storeName: activeStore.name,
      productName: selectedProductName,
      quantity,
      unit: 'pièces',
      unitCost,
      totalLossValue,
      reason,
      actionTaken,
      notes: notes || undefined,
      status: 'PENDING_COLLECTION'
    });

    notifyToast({
      type: 'success',
      title: 'Bon de Retour Créé',
      message: `${quantity} ${selectedProductName} enregistrés pour retour au labo central.`
    });

    setIsModalOpen(false);
    setSelectedProductName('');
    setNotes('');
  };

  const handleUpdateStatus = (voucherId: string, status: StoreReturnVoucher['status']) => {
    const inspector = session?.user?.name || 'Chef Hakim';
    updateStoreReturnStatus(voucherId, status, inspector);
    notifyToast({
      type: 'info',
      title: 'Statut du Retour Mis à Jour',
      message: `Le bon de retour est désormais ${status === 'RECEIVED_AT_LAB' ? 'réceptionné au labo' : 'finalisé'}.`
    });
  };

  const reasonLabels: Record<ReturnReason, string> = {
    UNSOLD_DAY_OLD: 'Invendu de la Veille (Réutilisation Bostock/Chapelure)',
    TRANSIT_DAMAGE: 'Dégât / Écrasement pendant Transport Camion',
    TEMPERATURE_EXCURSION: 'Rupture Chaîne Froid Vitrine',
    CUSTOMER_COMPLAINT: 'Réclamation Qualité Client',
    RECIPE_FLAW: 'Défaut Cuisson / Aspect Labo'
  };

  const actionLabels: Record<ReturnAction, string> = {
    REPURPOSE_PUDDING_CRUMB: 'Recyclage Labo (Bostock / Pudding / Poudre)',
    DESTROY_COMPOST: 'Destruction & Compostage Conforme',
    DONATION: 'Donation Association Caritative',
    INVESTIGATE_LAB: 'Contrôle & Analyse Qualité'
  };

  const totalReturnedQty = vouchers.reduce((acc, v) => acc + v.quantity, 0);
  const totalReturnedLoss = vouchers.reduce((acc, v) => acc + v.totalLossValue, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 border border-amber-800/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Logistique Inverse & Économie Circulaire
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Protocole Anti-Gaspillage
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bons de Retour & Valorisation des Invendus
            </h1>
            <p className="text-sm text-amber-200/80 mt-1 max-w-2xl">
              Procédure officielle de rapatriement des viennoiseries et gâteaux de la veille vers le laboratoire central pour réutilisation (bostock, chapelures pâtissières) ou déclaration de perte.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Émettre un Bon de Retour Boutique
          </button>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-amber-900/40">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Pièces Rapatriées</span>
            <span className="text-xl font-black text-white">{totalReturnedQty} pièces</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Valorisation Pertes</span>
            <span className="text-xl font-black text-rose-400">{totalReturnedLoss.toLocaleString('fr-DZ')} DZD</span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">En Attente Chauffeur</span>
            <span className="text-xl font-black text-amber-400">
              {vouchers.filter(v => v.status === 'PENDING_COLLECTION').length} bons
            </span>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Recyclé / Réutilisé Labo</span>
            <span className="text-xl font-black text-emerald-400">78 %</span>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" /> Registre des Bons de Rapatriement
          </h2>
          <span className="text-xs font-bold text-slate-500">{vouchers.length} retours enregistrés</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">N° Bon & Date</th>
                <th className="p-4">Boutique Émettrice</th>
                <th className="p-4">Produit & Quantité</th>
                <th className="p-4">Motif du Retour</th>
                <th className="p-4">Action & Destination Labo</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right">Actions Logistiques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {vouchers.map((v) => {
                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-amber-700 block">{v.voucherNumber}</span>
                      <span className="text-xs text-slate-400">{v.createdAt.slice(0, 10)}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{v.storeName.split('-')[0]}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-black text-slate-900">{v.productName}</div>
                      <span className="text-xs font-bold text-slate-500">{v.quantity} {v.unit} ({v.totalLossValue.toLocaleString('fr-DZ')} DZD)</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-slate-700 block">
                        {reasonLabels[v.reason]}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 block">
                        {actionLabels[v.actionTaken]}
                      </span>
                      {v.notes && <span className="text-[11px] text-slate-400 mt-0.5 block italic">{v.notes}</span>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        v.status === 'RECEIVED_AT_LAB' ? 'bg-indigo-100 text-indigo-800' :
                        v.status === 'FINALIZED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {v.status === 'PENDING_COLLECTION' && 'En Attente Navette'}
                        {v.status === 'RECEIVED_AT_LAB' && 'Arrivé au Labo'}
                        {v.status === 'FINALIZED' && 'Traité / Clôturé'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {v.status === 'PENDING_COLLECTION' && (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'RECEIVED_AT_LAB')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Réceptionner au Labo
                        </button>
                      )}
                      {v.status === 'RECEIVED_AT_LAB' && (
                        <button
                          onClick={() => handleUpdateStatus(v.id, 'FINALIZED')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                        >
                          Valider Recyclage Labo
                        </button>
                      )}
                      {v.status === 'FINALIZED' && (
                        <span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clôturé ({v.inspectedBy})
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

      {/* New Return Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" /> Émettre un Bon de Retour Produit
            </h2>

            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Produit à Retourner</label>
                <select
                  value={selectedProductName}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sélectionner une pâtisserie...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name} ({p.costPrice || (p as any).unit_cost || 48.5} DZD)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantité (pièces)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Valeur Coût Estimée</label>
                  <div className="p-2.5 bg-slate-100 rounded-xl text-sm font-black text-slate-800">
                    {(quantity * unitCost).toLocaleString('fr-DZ')} DZD
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Motif du Rapatriement</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="UNSOLD_DAY_OLD">Invendu de la Veille (Réutilisation Bostock)</option>
                  <option value="TRANSIT_DAMAGE">Dégât Transport Camionnette</option>
                  <option value="TEMPERATURE_EXCURSION">Rupture Froid Vitrine</option>
                  <option value="CUSTOMER_COMPLAINT">Réclamation Client</option>
                  <option value="RECIPE_FLAW">Défaut Visuel ou Recette</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Action Préconisée au Labo</label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value as ReturnAction)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  <option value="REPURPOSE_PUDDING_CRUMB">Recyclage en Bostock / Chapelure Sucrée</option>
                  <option value="DESTROY_COMPOST">Destruction & Compostage Conforme</option>
                  <option value="DONATION">Donation Solidaire</option>
                  <option value="INVESTIGATE_LAB">Analyse Qualité Chef</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notes Complémentaires</label>
                <input
                  type="text"
                  placeholder="Ex: Croissants croustillants de la veille, lot intact"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all"
                >
                  Générer le Bon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
