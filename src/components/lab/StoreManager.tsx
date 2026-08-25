import React, { useState, useEffect } from 'react';
import { getStores, addStore, updateStore, deleteStore, resetStoresToDefault, getRequisitions, subscribeToStoreChanges, notifyToast } from '../../services/storage';
import { StoreLocation, Requisition } from '../../types';
import {
  Store,
  Plus,
  Search,
  MapPin,
  UserCheck,
  Phone,
  Building2,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

export const StoreManager: React.FC = () => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [managerName, setManagerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const loadData = () => {
    setStores(getStores());
    setRequisitions(getRequisitions());
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(loadData);
  }, []);

  const openAddModal = () => {
    setName('');
    setCode('');
    setAddress('');
    setManagerName('');
    setPhone('');
    setEditingStore(null);
    setShowAddModal(true);
  };

  const openEditModal = (store: StoreLocation) => {
    setEditingStore(store);
    setName(store.name);
    setCode(store.code);
    setAddress(store.address);
    setManagerName(store.managerName);
    setPhone(store.phone);
    setShowAddModal(true);
  };

  const handleDelete = (store: StoreLocation) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le magasin "${store.name}" ?`)) {
      deleteStore(store.id);
      notifyToast({
        type: 'info',
        title: 'Boutique Supprimée',
        message: `Le point de vente ${store.name} a été retiré du réseau.`,
      });
      loadData();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Voulez-vous réinitialiser la liste des boutiques aux points de vente officiels (Douera 01, Douera 02, Oued Terfa, El Achour, Blida, Boufarik) ?')) {
      const resetList = resetStoresToDefault();
      setStores(resetList);
      notifyToast({
        type: 'success',
        title: 'Réseau Réinitialisé',
        message: 'La liste officielle des 6 boutiques a été restaurée avec succès.',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingStore) {
      updateStore(editingStore.id, {
        name: name.trim(),
        code: code.trim() || editingStore.code,
        address: address.trim() || editingStore.address,
        managerName: managerName.trim() || editingStore.managerName,
        phone: phone.trim() || editingStore.phone,
      });

      notifyToast({
        type: 'success',
        title: 'Informations Mises à Jour',
        message: `Les informations de ${name} ont été mises à jour avec succès.`,
      });
    } else {
      const newStore = addStore({
        name: name.trim(),
        code: code.trim() || `STR-${(stores.length + 1).toString().padStart(3, '0')}`,
        address: address.trim() || 'Alger, Algérie',
        managerName: managerName.trim() || 'Gérant Point de Vente',
        phone: phone.trim() || '0550 00 00 00',
      });

      notifyToast({
        type: 'success',
        title: 'Nouveau Point de Vente Enregistré',
        message: `${newStore.name} est maintenant relié au Laboratoire Central.`,
      });
    }

    setShowAddModal(false);
    loadData();
  };

  const filteredStores = stores.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.code.toLowerCase().includes(term) ||
      s.managerName.toLowerCase().includes(term) ||
      s.address.toLowerCase().includes(term)
    );
  });

  // Calculate requisition metrics for each store
  const getStoreMetrics = (storeId: string) => {
    const storeReqs = requisitions.filter((r) => r.storeId === storeId);
    const pendingCount = storeReqs.filter((r) => r.status === 'PENDING').length;
    const totalCost = storeReqs.reduce((sum, r) => sum + r.totalEstimatedCost, 0);
    return {
      totalReqs: storeReqs.length,
      pendingCount,
      totalCost,
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Réseau des Boutiques & Points de Vente</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {stores.length} Boutiques Actives
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Annuaire des boutiques Pâtisserie Le Délice connectées au Laboratoire Central pour les réquisitions et réceptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher boutique, code, gérant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleResetDefaults}
              title="Restaurer la liste officielle des boutiques"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Ajouter Boutique
            </button>
          </div>
        </div>

        {/* Global Stores Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
            <div className="text-[11px] font-semibold text-slate-500">Points de Vente</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{stores.length} Boutiques</div>
          </div>
          <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100">
            <div className="text-[11px] font-semibold text-indigo-700">Total Réquisitions</div>
            <div className="text-lg font-black text-indigo-900 mt-0.5">{requisitions.length} Commandes</div>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100">
            <div className="text-[11px] font-semibold text-amber-700">En Attente Validation</div>
            <div className="text-lg font-black text-amber-900 mt-0.5">
              {requisitions.filter((r) => r.status === 'PENDING').length} En attente
            </div>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
            <div className="text-[11px] font-semibold text-emerald-700">Volume Total Réseau</div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">
              {requisitions.reduce((sum, r) => sum + r.totalEstimatedCost, 0).toFixed(2)} DZD
            </div>
          </div>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.map((store) => {
          const metrics = getStoreMetrics(store.id);

          return (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                
                {/* Store Name & Code Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{store.name}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {store.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(store)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                      title="Modifier les informations"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(store)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                      title="Supprimer la boutique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Gérant: <strong className="text-slate-800">{store.managerName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.phone}</span>
                  </div>
                </div>

              </div>

              {/* Requisition Metrics Box */}
              <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Réquisitions</span>
                  <strong className="text-xs font-extrabold text-slate-800">{metrics.totalReqs}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 font-bold block">En Attente</span>
                  <strong className="text-xs font-extrabold text-amber-800">{metrics.pendingCount}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-700 font-bold block">Valeur Est.</span>
                  <strong className="text-xs font-extrabold text-indigo-900">{metrics.totalCost.toFixed(0)} DZD</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStore ? 'Modifier les Coordonnées de la Boutique' : 'Enregistrer une Nouvelle Boutique'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de la Boutique / Point de Vente</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Douera 03, Hydra, Cheraga..."
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code Boutique</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="ex: STR-007"
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0550 12 34 56"
                    className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Gérant / Responsable</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="ex: Karim (Gérant)"
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Complète & Commune</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ex: Rue 1er Novembre, Douera, Alger"
                  className="w-full text-xs font-medium bg-slate-50 text-slate-900 rounded-lg p-2.5 border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {editingStore ? 'Enregistrer les Modifications' : 'Créer la Boutique'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
