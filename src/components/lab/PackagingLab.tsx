import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { usePackagingInventory } from '../../hooks/usePackagingInventory';
import { PackagingFormModal } from './PackagingFormModal';
import {
  getStores,
  getPackagingDispatches,
  getPackagingRequisitions,
  receivePackagingSupplierShipment,
  createPackagingDispatch,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  upsertPackagingMaterialToSupabase
} from '../../services/supabaseService';
import {
  PackagingMaterial,
  StoreLocation,
  PackagingDispatch,
  PackagingRequisition
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Package,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Boxes,
  Truck,
  PlusCircle,
  X,
  Search,
  Check,
  FileSpreadsheet,
  ArrowRight,
  Trash2,
  Loader2,
  Edit2
} from 'lucide-react';

export const PackagingLab: React.FC = () => {
  const {
    materials,
    loading: materialsLoading,
    refetchPackagingInventory,
    deletePackagingItem
  } = usePackagingInventory();

  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [dispatches, setDispatches] = useState<PackagingDispatch[]>([]);
  const [requisitions, setRequisitions] = useState<PackagingRequisition[]>([]);
  const [activeTab, setActiveTab] = useState<'STOCK' | 'DISPATCH' | 'HISTORY'>('STOCK');
  const [searchQuery, setSearchQuery] = useState('');

  // Receive Shipment Modal state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>('');
  const [isNewPackaging, setIsNewPackaging] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgUnit, setNewPkgUnit] = useState('piece');
  const [newPkgMinAlert, setNewPkgMinAlert] = useState(500);
  const [receiveQty, setReceiveQty] = useState<number>(100);
  const [receiveUnitCost, setReceiveUnitCost] = useState<number>(50);
  const [receiveNotes, setReceiveNotes] = useState('');

  // Add / Edit Packaging Material Modal state using PackagingFormModal
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingMaterial | null>(null);

  // Create Dispatch form state
  const [dispatchStoreId, setDispatchStoreId] = useState<string>('');
  const [dispatchLines, setDispatchLines] = useState<Array<{ packaging_id: string; quantity_sent: number }>>([]);
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string>('');

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item: PackagingMaterial) => {
    setEditingItem(item);
    setIsAddEditModalOpen(true);
  };

  const loadData = async () => {
    try {
      await refetchPackagingInventory();
    } catch (err: any) {
      console.error('Error refreshing packaging materials:', err);
    } finally {
      const strList = getStores();
      setStores(strList);
      if (strList.length > 0 && !dispatchStoreId) {
        setDispatchStoreId(strList[0].id);
      }
      setDispatches(getPackagingDispatches());
      setRequisitions(getPackagingRequisitions());
    }
  };

  useEffect(() => {
    loadData();
    return subscribeToStoreChanges(() => {
      setDispatches(getPackagingDispatches());
      setRequisitions(getPackagingRequisitions());
    });
  }, []);

  // Filter materials
  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.unit_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = materials.filter((m) => m.central_stock_qty <= m.min_alert_qty).length;
  const totalStockValue = materials.reduce((acc, m) => acc + (m.central_stock_qty * m.unit_cost), 0);

  // Handle Supplier Shipment Submission directly with Supabase
  const handleReceiveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receiveQty <= 0 || receiveUnitCost < 0) {
      notifyToast({
        type: 'error',
        title: 'Valeurs invalides',
        message: 'La quantité et le coût unitaire doivent être valides.'
      });
      return;
    }

    try {
      let matToSave: Partial<PackagingMaterial> & { name: string };
      if (isNewPackaging) {
        if (!newPkgName.trim()) {
          notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez saisir le nom de l’emballage.' });
          return;
        }
        matToSave = {
          id: `pkg-${Date.now()}`,
          name: newPkgName.trim(),
          unit_type: newPkgUnit,
          min_alert_qty: newPkgMinAlert,
          central_stock_qty: receiveQty,
          unit_cost: receiveUnitCost,
        };
      } else {
        if (!selectedPackagingId) {
          notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner un emballage.' });
          return;
        }
        const existing = materials.find((m) => m.id === selectedPackagingId);
        if (!existing) throw new Error('Emballage non trouvé.');
        matToSave = {
          ...existing,
          central_stock_qty: existing.central_stock_qty + receiveQty,
          unit_cost: receiveUnitCost,
        };
      }

      const savedPkg = await upsertPackagingMaterialToSupabase(matToSave as any);

      // Also call local storage helper
      receivePackagingSupplierShipment(
        savedPkg.id,
        receiveQty,
        receiveUnitCost,
        receiveNotes,
        isNewPackaging ? { name: savedPkg.name, unit_type: savedPkg.unit_type, min_alert_qty: savedPkg.min_alert_qty } : undefined
      );

      // Refresh list
      await loadData();

      notifyToast({
        type: 'success',
        title: 'Réception Supabase Enregistrée',
        message: `Stock emballage "${savedPkg.name}" mis à jour dans Supabase (${savedPkg.central_stock_qty} ${savedPkg.unit_type}).`
      });

      // Reset Modal
      setIsReceiveModalOpen(false);
      setIsNewPackaging(false);
      setNewPkgName('');
      setReceiveQty(100);
      setReceiveNotes('');
    } catch (err: any) {
      console.error('Error receiving packaging in Supabase:', err);
      notifyToast({ type: 'error', title: 'Erreur Réception Supabase', message: err.message });
    }
  };

  const handleDeletePackaging = async (pkg: PackagingMaterial) => {
    if (!window.confirm(`Supprimer l'emballage "${pkg.name}" de Supabase ?`)) return;
    try {
      await deletePackagingItem(pkg.id);
      notifyToast({
        type: 'success',
        title: 'Emballage Supprimé',
        message: `"${pkg.name}" a été supprimé de Supabase.`
      });
    } catch (err: any) {
      console.error('Error deleting packaging from Supabase:', err);
      notifyToast({ type: 'error', title: 'Erreur Suppression Supabase', message: err.message });
    }
  };

  // Dispatch Lines Handlers
  const handleAddDispatchLine = () => {
    const availableMat = materials.find(
      (m) => !dispatchLines.some((dl) => dl.packaging_id === m.id) && m.central_stock_qty > 0
    ) || materials[0];

    if (!availableMat) {
      notifyToast({ type: 'warning', title: 'Information', message: 'Tous les emballages sont déjà ajoutés ou en rupture.' });
      return;
    }

    setDispatchLines([...dispatchLines, { packaging_id: availableMat.id, quantity_sent: 50 }]);
  };

  const handleRemoveDispatchLine = (index: number) => {
    setDispatchLines(dispatchLines.filter((_, i) => i !== index));
  };

  const handleUpdateDispatchLine = (index: number, field: 'packaging_id' | 'quantity_sent', value: any) => {
    const updated = [...dispatchLines];
    if (field === 'packaging_id') {
      updated[index].packaging_id = value;
    } else {
      updated[index].quantity_sent = Math.max(1, parseInt(value) || 0);
    }
    setDispatchLines(updated);
  };

  // Populate from Requisition
  const handleFulfillRequisition = (req: PackagingRequisition) => {
    setDispatchStoreId(req.store_id);
    setSelectedRequisitionId(req.id);
    const lines = req.items.map((item) => ({
      packaging_id: item.packaging_id,
      quantity_sent: item.quantity_requested
    }));
    setDispatchLines(lines);
    setDispatchNotes(`Réponse à la réquisition ${req.requisition_number} (${req.requested_by})`);
    setActiveTab('DISPATCH');
    notifyToast({
      type: 'info',
      title: 'Réquisition chargée',
      message: `Formulaire pré-rempli pour ${req.store_name}.`
    });
  };

  // Submit Dispatch
  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchStoreId) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner une boutique cible.' });
      return;
    }
    if (dispatchLines.length === 0) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez ajouter au moins une ligne d’emballage.' });
      return;
    }

    // Validation check stock
    for (const line of dispatchLines) {
      const mat = materials.find((m) => m.id === line.packaging_id);
      if (!mat) continue;
      if (mat.central_stock_qty < line.quantity_sent) {
        notifyToast({
          type: 'error',
          title: 'Stock Insuffisant',
          message: `Stock labo insuffisant pour "${mat.name}". Disponible: ${mat.central_stock_qty}, Demandé: ${line.quantity_sent}`
        });
        return;
      }
    }

    try {
      const created = createPackagingDispatch(
        dispatchStoreId,
        dispatchLines,
        'Chef de Production Labo',
        dispatchNotes,
        selectedRequisitionId || undefined
      );

      notifyToast({
        type: 'success',
        title: 'Bon d’expédition créé',
        message: `Bon ${created.dispatch_number} envoyé avec succès en statut EN TRANSIT.`
      });

      // Reset Form
      setDispatchLines([]);
      setDispatchNotes('');
      setSelectedRequisitionId('');
      setActiveTab('HISTORY');
    } catch (err: any) {
      notifyToast({ type: 'error', title: 'Échec de l’expédition', message: err.message });
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
            <h2 className="text-xl font-black text-slate-900">Gestion Emballage & Colisage Central</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Approvisionnement, stock des boîtes et sacs de pâtisserie au labo central, et réapprovisionnement des boutiques.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReceiveModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Réception Achat Fournisseur</span>
          </button>

          <button
            onClick={() => {
              if (dispatchLines.length === 0) handleAddDispatchLine();
              setActiveTab('DISPATCH');
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Créer Expédition Boutique</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Types d’Emballages</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{materials.length} Références</div>
          <span className="text-[11px] text-slate-500 block mt-1">Sacs, Boîtes à gâteau, rubans</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Valeur Stock Central</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalStockValue)}</div>
          <span className="text-[11px] text-slate-500 block mt-1">Évaluation globale au coût d'achat</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Alertes Stock Bas</span>
          <div className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {lowStockCount} Articles sous le seuil
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Réapprovisionnement suggéré</span>
        </div>
      </div>

      {/* Pending Store Requisitions Alert (if any) */}
      {requisitions.filter((r) => r.status === 'PENDING').length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200/60 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                {requisitions.filter((r) => r.status === 'PENDING').length} Demande(s) d'emballage en attente des boutiques
              </h4>
              <p className="text-xs text-amber-700">
                Les boutiques demandent du réapprovisionnement pour leurs boîtes et sacs.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {requisitions.filter((r) => r.status === 'PENDING').map((req) => (
              <button
                key={req.id}
                onClick={() => handleFulfillRequisition(req)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <span>Honorer {req.store_name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Controls */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 max-w-fit">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'STOCK'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4 text-indigo-600" />
          <span>Section A: Stock & Achats Central</span>
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'DISPATCH'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Send className="w-4 h-4 text-amber-600" />
          <span>Section B: Expédier aux Boutiques</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'HISTORY'
              ? 'bg-white text-slate-900 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Historique des Expéditions ({dispatches.length})</span>
        </button>
      </div>

      {/* SECTION A: CENTRAL PACKAGING STOCK & PURCHASING */}
      {activeTab === 'STOCK' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une référence, code SKU ou catégorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-2xl text-xs font-medium border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs text-slate-500 font-bold hidden sm:inline">
                Affichage de {filteredMaterials.length} sur {materials.length} emballage(s)
              </span>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Emballage</span>
              </button>
            </div>
          </div>

          {/* Desktop Table View (≥ 768px) */}
          <div className="hidden md:block overflow-x-auto webkit-overflow-scrolling-touch">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">SKU / Code</th>
                  <th className="p-4">Nom Emballage</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4">Unité</th>
                  <th className="p-4 text-right">Stock Central</th>
                  <th className="p-4 text-right">Seuil Alerte</th>
                  <th className="p-4 text-right">Coût Unitaire</th>
                  <th className="p-4 text-right">Valeur Stock</th>
                  <th className="p-4 text-center">Statut</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMaterials.map((m) => {
                  const isLow = m.central_stock_qty <= m.min_alert_qty;
                  const skuCode = m.code || `PKG-${m.id.slice(-6)}`;
                  const categoryName = m.category || 'Boxes';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono text-[11px] font-extrabold text-indigo-700">
                        {skuCode}
                      </td>
                      <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>{m.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase border border-indigo-100">
                          {categoryName}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          {m.unit_type}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900 text-sm">
                        {m.central_stock_qty.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-slate-500 font-semibold">
                        {m.min_alert_qty.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {formatCurrency(m.unit_cost)}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-700">
                        {formatCurrency(m.central_stock_qty * m.unit_cost)}
                      </td>
                      <td className="p-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Stock Bas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Optimal
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(m)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Modifier cet emballage"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePackaging(m)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Supprimer de Supabase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards Layout (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/50 p-3 space-y-3">
            {filteredMaterials.map((m) => {
              const isLow = m.central_stock_qty <= m.min_alert_qty;
              const skuCode = m.code || `PKG-${m.id.slice(-6)}`;
              const categoryName = m.category || 'Boxes';
              return (
                <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Package className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">{skuCode}</span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold uppercase">{categoryName}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-1">{m.name}</h4>
                        <span className="text-[11px] text-slate-500">Unité: {m.unit_type}</span>
                      </div>
                    </div>
                    {isLow ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                        Stock Bas
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                        Optimal
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Stock Central</span>
                      <span className="font-black text-slate-900 text-sm">{m.central_stock_qty.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Seuil Alerte</span>
                      <span className="font-bold text-slate-600 text-sm">{m.min_alert_qty.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Coût Unitaire</span>
                      <span className="font-bold text-slate-800 text-xs">{formatCurrency(m.unit_cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Valeur Stock</span>
                      <span className="font-black text-emerald-700 text-xs">{formatCurrency(m.central_stock_qty * m.unit_cost)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenEditModal(m)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDeletePackaging(m)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION B: DISPATCH PACKAGING TO STORES */}
      {activeTab === 'DISPATCH' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" />
              Créer un Bon d’Expédition d’Emballage vers Boutique
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sélectionnez le magasin destinataire et indiquez les quantités d'emballages à expédier depuis le stock central du labo.
            </p>
          </div>

          <form onSubmit={handleSubmitDispatch} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Boutique Destinataire :
                </label>
                <select
                  value={dispatchStoreId}
                  onChange={(e) => setDispatchStoreId(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs focus:outline-none focus:border-indigo-500"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Note / Remarques d'Expédition :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Livré avec la tournée camionnette du matin..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Articles d'Emballage à Expédier ({dispatchLines.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddDispatchLine}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une Référence</span>
                </button>
              </div>

              {dispatchLines.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Aucun article sélectionné. Cliquez sur "Ajouter une Référence" pour constituer le colisage.
                </div>
              ) : (
                <div className="space-y-2">
                  {dispatchLines.map((line, idx) => {
                    const selectedMat = materials.find((m) => m.id === line.packaging_id);
                    const isExceeded = selectedMat ? line.quantity_sent > selectedMat.central_stock_qty : false;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isExceeded ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-[240px]">
                          <select
                            value={line.packaging_id}
                            onChange={(e) => handleUpdateDispatchLine(idx, 'packaging_id', e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-bold focus:outline-none"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit_type}) — Disponible Labo: {m.central_stock_qty}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Qté à Envoyer :</span>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity_sent}
                              onChange={(e) => handleUpdateDispatchLine(idx, 'quantity_sent', e.target.value)}
                              className="w-24 p-2 rounded-xl bg-white border border-slate-200 font-black text-slate-900 text-xs text-right focus:outline-none"
                            />
                            <span className="text-xs text-slate-600 font-bold">{selectedMat?.unit_type}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDispatchLine(idx)}
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

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('STOCK')}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={dispatchLines.length === 0}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Valider et Générer le Bon d’Expédition</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION C: DISPATCH HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">Bons d’Expédition Emballages Générés</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {dispatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Aucune expédition d'emballage enregistrée pour le moment.
              </div>
            ) : (
              dispatches.map((disp) => (
                <div key={disp.id} className="p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                        <Truck className="w-4 h-4 text-indigo-600" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{disp.dispatch_number}</span>
                          <span className="text-xs text-slate-500 font-bold">➔ {disp.target_store_name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Créé le {new Date(disp.created_at).toLocaleString('fr-FR')} par {disp.created_by}
                        </p>
                      </div>
                    </div>

                    <div>
                      {disp.status === 'IN_TRANSIT' && (
                        <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-600" /> En Transit
                        </span>
                      )}
                      {disp.status === 'RECEIVED' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Réceptionné Boutique
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Pills */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap gap-2 text-xs">
                    {disp.items.map((item) => (
                      <span key={item.id} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 font-medium">
                        <strong>{item.packaging_name}</strong>: {item.quantity_sent} {item.unit_type}
                        {disp.status === 'RECEIVED' && item.quantity_received !== undefined && (
                          <span className="text-emerald-600 font-bold ml-1">
                            (Reçu: {item.quantity_received})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  {disp.notes && (
                    <p className="text-xs text-slate-500 italic">Note: {disp.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RECEIVE SUPPLIER SHIPMENT MODAL */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                </span>
                <h3 className="text-base font-black text-slate-900">Réception Achat Fournisseur Emballages</h3>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveShipment} className="space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700">Type de Référence :</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewPackaging(false)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      !isNewPackaging ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Existe Déjà
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewPackaging(true)}
                    className={`px-3 py-1 rounded-xl font-bold transition-all ${
                      isNewPackaging ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    + Nouvelle Référence
                  </button>
                </div>
              </div>

              {!isNewPackaging ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Sélectionner l'Emballage :
                  </label>
                  <select
                    value={selectedPackagingId}
                    onChange={(e) => setSelectedPackagingId(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                  >
                    <option value="">-- Choisir une référence --</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit_type}) — En Stock: {m.central_stock_qty}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Nom de l'Emballage :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Boîte Macarons 12P, Sac Isotherme..."
                      value={newPkgName}
                      onChange={(e) => setNewPkgName(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unité Conditionnement :</label>
                      <select
                        value={newPkgUnit}
                        onChange={(e) => setNewPkgUnit(e.target.value)}
                        className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold"
                      >
                        <option value="piece">pièce (piece)</option>
                        <option value="pack of 100">paquet de 100</option>
                        <option value="bundle">bottes / lot (bundle)</option>
                        <option value="units">unités</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Seuil Alerte Min :</label>
                      <input
                        type="number"
                        value={newPkgMinAlert}
                        onChange={(e) => setNewPkgMinAlert(parseInt(e.target.value) || 0)}
                        className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Quantité Reçue :
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={receiveQty}
                    onChange={(e) => setReceiveQty(parseInt(e.target.value) || 0)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Coût Unitaire (DZD) :
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={receiveUnitCost}
                    onChange={(e) => setReceiveUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarques / Facture Fournisseur :</label>
                <input
                  type="text"
                  placeholder="Ex: Fournisseur Cartonnades d'Alger - Facture #9842"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full p-2.5 rounded-2xl bg-slate-50 border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer l'Entrée Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Packaging Material Modal */}
      <PackagingFormModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        editingItem={editingItem}
        onSuccess={() => {
          refetchPackagingInventory();
        }}
      />

    </div>
  );
};
