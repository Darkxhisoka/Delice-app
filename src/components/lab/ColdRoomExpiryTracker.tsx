import React, { useState, useEffect } from 'react';
import { ColdRoomBatchExpiryItem } from '../../types';
import { 
  getColdRoomBatches, 
  addColdRoomBatch, 
  deleteColdRoomBatch, 
  getRawMaterials, 
  notifyToast, 
  subscribeToStoreChanges 
} from '../../services/storage';
import { 
  Snowflake, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Thermometer, 
  Calendar, 
  Search, 
  Filter 
} from 'lucide-react';

export const ColdRoomExpiryTracker: React.FC = () => {
  const [batches, setBatches] = useState<ColdRoomBatchExpiryItem[]>([]);
  const [materials, setMaterials] = useState(getRawMaterials());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'EXPIRING_SOON' | 'FRESH'>('ALL');

  // Form State
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState('Chambre Froide Positive A (+3°C)');
  const [quantity, setQuantity] = useState<number>(10);
  const [expiryDate, setExpiryDate] = useState('');
  const [storageTemp, setStorageTemp] = useState<number>(3.5);

  useEffect(() => {
    loadBatches();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadBatches();
      setMaterials(getRawMaterials());
    });
    return () => unsubscribe();
  }, []);

  const loadBatches = () => {
    setBatches(getColdRoomBatches());
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const mat = materials.find(m => m.id === selectedMaterialId);
    if (!mat || !batchNumber || !expiryDate) {
      notifyToast({ type: 'error', title: 'Erreur', message: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    addColdRoomBatch({
      rawMaterialId: mat.id,
      materialName: mat.name,
      category: mat.category,
      batchNumber,
      storageLocation,
      quantity,
      unit: mat.unit,
      receivedDate: new Date().toISOString().split('T')[0],
      expiryDate,
      storageTempCelsius: storageTemp
    });

    notifyToast({
      type: 'success',
      title: 'Lot Enregistré en Chambre Froide',
      message: `${quantity} ${mat.unit} de ${mat.name} (Lot: ${batchNumber}) sous surveillance FIFO.`
    });

    setIsModalOpen(false);
    setSelectedMaterialId('');
    setBatchNumber('');
    setExpiryDate('');
  };

  const handleDelete = (id: string) => {
    deleteColdRoomBatch(id);
    notifyToast({ type: 'info', title: 'Lot Retiré', message: 'Le lot a été retiré du suivi de chambre froide.' });
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.storageLocation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'ALL' || b.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const criticalCount = batches.filter(b => b.status === 'CRITICAL' || b.status === 'EXPIRED').length;
  const soonCount = batches.filter(b => b.status === 'EXPIRING_SOON').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-800/40 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> Traçabilité FIFO & Chaîne du Froid
              </span>
              {criticalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> {criticalCount} Lot(s) Urgent(s)
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Surveillance Chambres Froides & DLC Matières Premières
            </h1>
            <p className="text-sm text-cyan-200/80 mt-1 max-w-2xl">
              Suivi en temps réel des dates limites de consommation (DLC/DLUO), gestion des priorités de déstockage FIFO et température des réserves.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Entrer un Lot en Chambre Froide
          </button>
        </div>

        {/* Cold Storage Status Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-cyan-900/50">
          <div className="bg-slate-900/70 p-4 rounded-2xl border border-cyan-900/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chambre Positive A</span>
              <span className="text-xl font-black text-cyan-300">+3.2 °C <span className="text-xs font-normal text-emerald-400">● Conforme</span></span>
            </div>
          </div>

          <div className="bg-slate-900/70 p-4 rounded-2xl border border-cyan-900/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Snowflake className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chambre Négative B</span>
              <span className="text-xl font-black text-indigo-300">-18.4 °C <span className="text-xs font-normal text-emerald-400">● Surgélation</span></span>
            </div>
          </div>

          <div className="bg-slate-900/70 p-4 rounded-2xl border border-cyan-900/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Alertes Péremption</span>
              <span className="text-xl font-black text-rose-300">{criticalCount + soonCount} lots prioritaires</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher matière, n° lot, emplacement..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les Lots ({batches.length})
          </button>
          <button
            onClick={() => setFilterStatus('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'CRITICAL' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Urgence ≤ 48h ({criticalCount})
          </button>
          <button
            onClick={() => setFilterStatus('EXPIRING_SOON')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'EXPIRING_SOON' ? 'bg-amber-500 text-slate-950' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Périme sous 5j ({soonCount})
          </button>
          <button
            onClick={() => setFilterStatus('FRESH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'FRESH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Stock Frais
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">Matière & N° Lot</th>
                <th className="p-4">Emplacement / Chambre</th>
                <th className="p-4 text-center">Quantité Restante</th>
                <th className="p-4 text-center">Date DLC / DLUO</th>
                <th className="p-4 text-center">Jours Restants (FIFO)</th>
                <th className="p-4 text-center">Statut d'Alerte</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Aucun lot en chambre froide ne correspond à vos critères.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-slate-900">{batch.materialName}</div>
                        <span className="font-mono text-xs text-slate-500">Lot : {batch.batchNumber}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-700 block">{batch.storageLocation}</span>
                        {batch.storageTempCelsius !== undefined && (
                          <span className="text-[11px] text-cyan-600 font-medium">{batch.storageTempCelsius > 0 ? `+${batch.storageTempCelsius}` : batch.storageTempCelsius}°C</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-xl bg-slate-100 font-black text-slate-800 text-xs">
                          {batch.quantity} {batch.unit}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-bold text-slate-700">{batch.expiryDate}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                          batch.daysRemaining <= 2
                            ? 'bg-rose-500 text-white animate-pulse'
                            : batch.daysRemaining <= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {batch.daysRemaining <= 0 ? 'PÉRIMÉ' : `${batch.daysRemaining} jour(s)`}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {batch.status === 'CRITICAL' && (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                            UTILISATION IMMÉDIATE
                          </span>
                        )}
                        {batch.status === 'EXPIRING_SOON' && (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            PRIORITAIRE FIFO
                          </span>
                        )}
                        {batch.status === 'FRESH' && (
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200">
                            CONFORME
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(batch.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Supprimer du suivi"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-cyan-600" /> Enregistrer un Lot en Chambre Froide
            </h2>

            <form onSubmit={handleAddBatch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Matière Première</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sélectionner un ingrédient...</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Numéro de Lot Fournisseur</label>
                <input
                  type="text"
                  placeholder="Ex: LOT-CR35-9901"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantité</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date DLC / DLUO</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Emplacement de Stockage</label>
                <select
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:border-cyan-500"
                >
                  <option value="Chambre Froide Positive A (+3°C)">Chambre Froide Positive A (+3°C)</option>
                  <option value="Chambre Froide Positive B (+4°C)">Chambre Froide Positive B (+4°C)</option>
                  <option value="Chambre Froide Négative (-18°C)">Chambre Froide Négative (-18°C)</option>
                  <option value="Chambre Tempérée Légumière (+8°C)">Chambre Tempérée Légumière (+8°C)</option>
                </select>
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
                  className="px-5 py-2 text-xs font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-md transition-all"
                >
                  Ajouter au Suivi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
