import React, { useState, useEffect } from 'react';
import { 
  getRawMaterials, 
  getInventoryAdjustments, 
  recordInventoryAdjustment, 
  notifyToast,
  subscribeToStoreChanges,
  getAuthSession
} from '../../services/storage';
import {
  fetchRawMaterialsFromSupabase,
  upsertRawMaterialToSupabase,
  fetchInventoryAdjustmentsFromSupabase,
  insertInventoryAdjustmentToSupabase
} from '../../services/supabaseService';
import { isAppOffline } from '../../services/indexedDbQueue';
import { RawMaterial, InventoryAdjustment, DestockingReasonCategory } from '../../types';
import { 
  Trash2, 
  AlertTriangle, 
  TrendingDown, 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  BarChart3, 
  Package, 
  DollarSign, 
  ShieldAlert, 
  Clock, 
  UserCheck, 
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Loader2
} from 'lucide-react';

export const REASON_CONFIG: Record<DestockingReasonCategory, {
  label: string;
  sublabel: string;
  badgeBg: string;
  borderColor: string;
  iconColor: string;
  emoji: string;
}> = {
  EXPIRED: {
    label: 'Périmé (Expired)',
    sublabel: 'Matière ayant dépassé sa date limite de consommation',
    badgeBg: 'bg-rose-500/20 text-rose-300',
    borderColor: 'border-rose-500/40',
    iconColor: 'text-rose-400',
    emoji: '🔴'
  },
  QUALITY_DAMAGE: {
    label: 'Avarie / Dégât Qualité',
    sublabel: 'Emballage déchiré, altération goût/odeur ou contamination',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    borderColor: 'border-amber-500/40',
    iconColor: 'text-amber-400',
    emoji: '🟠'
  },
  RANDOM_DISTRIBUTION: {
    label: 'Distribution Diverses / Échantillons',
    sublabel: 'Prelevé pour essais R&D, dégustations ou labo externe',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    borderColor: 'border-sky-500/40',
    iconColor: 'text-sky-400',
    emoji: '🔵'
  },
  SPILLAGE_WASTE: {
    label: 'Perte / Mousse / Déversement',
    sublabel: 'Perte lors de la pesée, manipulation ou déversement accidentel',
    badgeBg: 'bg-orange-500/20 text-orange-300',
    borderColor: 'border-orange-500/40',
    iconColor: 'text-orange-400',
    emoji: '🟡'
  },
  INVENTORY_CORRECTION: {
    label: 'Correction de Stock (Inventaire)',
    sublabel: 'Ajustement suite au comptage physique périodique',
    badgeBg: 'bg-slate-500/20 text-slate-300',
    borderColor: 'border-slate-500/40',
    iconColor: 'text-slate-400',
    emoji: '⚪'
  }
};

export const RawMaterialDestocking: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FORM' | 'LOGS'>('FORM');
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Form state
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [quantityToRemove, setQuantityToRemove] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<DestockingReasonCategory>('QUALITY_DAMAGE');
  const [notes, setNotes] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>(() => getAuthSession()?.user?.name || 'Chef Hakim');
  const [materialSearchQuery, setMaterialSearchQuery] = useState<string>('');

  // Audit logs filters
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logReasonFilter, setLogReasonFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const supaMats = await fetchRawMaterialsFromSupabase();
      if (supaMats && supaMats.length > 0) {
        setRawMaterials(supaMats);
      } else {
        setRawMaterials(getRawMaterials());
      }

      const supaLogs = await fetchInventoryAdjustmentsFromSupabase();
      if (supaLogs && supaLogs.length > 0) {
        setAdjustments(supaLogs);
      } else {
        setAdjustments(getInventoryAdjustments());
      }
    } catch (err: any) {
      console.error('Error fetching data for destocking from Supabase:', err);
      notifyToast({
        title: 'Erreur Supabase',
        message: err.message || 'Échec de chargement depuis Supabase.',
        type: 'error'
      });
      setRawMaterials(getRawMaterials());
      setAdjustments(getInventoryAdjustments());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(loadData);
    return () => unsubscribe();
  }, []);

  const selectedMaterial = rawMaterials.find(m => m.id === selectedMaterialId);
  const qtyNumber = parseFloat(quantityToRemove) || 0;
  const isQtyValid = selectedMaterial ? (qtyNumber > 0 && qtyNumber <= selectedMaterial.currentStock) : false;
  const totalLossValue = selectedMaterial ? (qtyNumber * (selectedMaterial.currentAvgCost || 0)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || !selectedMaterial) {
      notifyToast({
        title: 'Sélection Requise',
        message: 'Veuillez sélectionner une matière première.',
        type: 'error'
      });
      return;
    }

    if (!isQtyValid) {
      notifyToast({
        title: 'Quantité Invalide',
        message: `La quantité doit être entre 0.01 et le stock disponible (${selectedMaterial.currentStock} ${selectedMaterial.unit}).`,
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const newStock = Math.max(0, selectedMaterial.currentStock - qtyNumber);

      // 1. If online, log inventory adjustment directly into Supabase
      if (!isAppOffline()) {
        await insertInventoryAdjustmentToSupabase({
          raw_material_id: selectedMaterial.id,
          raw_material_name: selectedMaterial.name,
          unit: selectedMaterial.unit,
          unit_cost_at_time: selectedMaterial.currentAvgCost,
          quantity_removed: qtyNumber,
          total_loss_value: totalLossValue,
          reason_category: reasonCategory,
          notes,
          created_by: createdBy
        });

        // 2. Decrement stock in raw_materials table in Supabase
        await upsertRawMaterialToSupabase({
          ...selectedMaterial,
          currentStock: newStock,
          lastUpdated: new Date().toISOString()
        });
      }

      // 3. Keep local storage & IndexedDB queue synced
      recordInventoryAdjustment({
        rawMaterialId: selectedMaterialId,
        quantityRemoved: qtyNumber,
        reasonCategory,
        notes,
        createdBy
      });

      const offlineNote = isAppOffline() ? ' (💾 Enregistré localement dans la file IndexedDB)' : '';
      notifyToast({
        title: isAppOffline() ? '🔴 Déstockage Hors-Ligne' : '🔴 Déstockage Enregistré',
        message: `${qtyNumber} ${selectedMaterial.unit} de ${selectedMaterial.name} déstockés.\nValeur écrite en perte: ${totalLossValue.toLocaleString('fr-DZ')} DZD${offlineNote}`,
        type: isAppOffline() ? 'info' : 'success'
      });

      // Reset form & reload
      setSelectedMaterialId('');
      setQuantityToRemove('');
      setNotes('');
      await loadData();
      setActiveTab('LOGS');
    } catch (err: any) {
      console.warn('Network destocking failed, falling back to local IndexedDB queue:', err);
      // Fallback local update
      recordInventoryAdjustment({
        rawMaterialId: selectedMaterialId,
        quantityRemoved: qtyNumber,
        reasonCategory,
        notes,
        createdBy
      });

      notifyToast({
        title: 'Déstockage Hors-Ligne (IndexedDB)',
        message: `${qtyNumber} ${selectedMaterial.unit} de ${selectedMaterial.name} déstockés et placés en file d'attente IndexedDB locale.`,
        type: 'info'
      });

      setSelectedMaterialId('');
      setQuantityToRemove('');
      setNotes('');
      await loadData();
      setActiveTab('LOGS');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Monthly statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthAdjustments = adjustments.filter(adj => {
    const d = new Date(adj.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalLossThisMonth = thisMonthAdjustments.reduce((sum, item) => sum + item.total_loss_value, 0);

  // Reason breakdown
  const reasonCounts: Record<DestockingReasonCategory, { count: number; value: number }> = {
    EXPIRED: { count: 0, value: 0 },
    QUALITY_DAMAGE: { count: 0, value: 0 },
    RANDOM_DISTRIBUTION: { count: 0, value: 0 },
    SPILLAGE_WASTE: { count: 0, value: 0 },
    INVENTORY_CORRECTION: { count: 0, value: 0 },
  };

  adjustments.forEach(adj => {
    if (reasonCounts[adj.reason_category]) {
      reasonCounts[adj.reason_category].count += 1;
      reasonCounts[adj.reason_category].value += adj.total_loss_value;
    }
  });

  // Top 3 destocked materials
  const materialLossMap: Record<string, { name: string; totalVal: number; totalQty: number; unit: string }> = {};
  adjustments.forEach(adj => {
    if (!materialLossMap[adj.raw_material_id]) {
      materialLossMap[adj.raw_material_id] = {
        name: adj.raw_material_name,
        totalVal: 0,
        totalQty: 0,
        unit: adj.unit
      };
    }
    materialLossMap[adj.raw_material_id].totalVal += adj.total_loss_value;
    materialLossMap[adj.raw_material_id].totalQty += adj.quantity_removed;
  });

  const topDestockedMaterials = Object.values(materialLossMap)
    .sort((a, b) => b.totalVal - a.totalVal)
    .slice(0, 3);

  // Filtered materials for search
  const filteredRawMaterials = rawMaterials.filter(m => 
    m.name.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(materialSearchQuery.toLowerCase()) ||
    m.sku.toLowerCase().includes(materialSearchQuery.toLowerCase())
  );

  // Filtered audit logs
  const filteredLogs = adjustments.filter(log => {
    const matchesSearch = 
      log.raw_material_name.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
      (log.created_by && log.created_by.toLowerCase().includes(logSearchQuery.toLowerCase()));
    
    const matchesReason = logReasonFilter === 'ALL' || log.reason_category === logReasonFilter;
    return matchesSearch && matchesReason;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 text-xs font-bold rounded-full border border-rose-500/30 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Laboratoire Central • Sorties & Pertes
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Déstockage & Perte de Matières Premières
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enregistrement systématique des pertes, péremptions, casses, échantillons et corrections d'inventaire. Mise à jour immédiate du stock central et journal comptable de valorisation.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('FORM')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'FORM'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Nouveau Déstockage</span>
            </button>
            <button
              onClick={() => setActiveTab('LOGS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'LOGS'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Journal & Historique</span>
              {adjustments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-[10px] bg-white/20 text-white rounded-full font-extrabold">
                  {adjustments.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Analytics & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Monthly Total Financial Loss */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Perte Financière Ce Mois</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">
                {totalLossThisMonth.toLocaleString('fr-DZ')} <span className="text-sm font-semibold text-rose-300">DZD</span>
              </h3>
            </div>
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{thisMonthAdjustments.length} opérations de déstockage enregistrées en {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          </p>
        </div>

        {/* Card 2: Top 3 Most Destocked Materials */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                Top 3 Pertes Significatives
              </p>
            </div>
            {topDestockedMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 italic mt-2">Aucun déstockage enregistré</p>
            ) : (
              <div className="space-y-2 mt-2">
                {topDestockedMaterials.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-lg text-xs border border-slate-700/50">
                    <span className="text-slate-200 font-medium truncate max-w-[170px]">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="font-bold text-rose-300">
                      {item.totalVal.toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Reasons Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
              Répartition par Motif
            </p>
            <div className="space-y-1.5 text-xs">
              {(Object.keys(REASON_CONFIG) as DestockingReasonCategory[]).map(catKey => {
                const info = REASON_CONFIG[catKey];
                const stats = reasonCounts[catKey];
                const totalAdjustmentsCount = adjustments.length || 1;
                const pct = Math.round((stats.count / totalAdjustmentsCount) * 100);

                return (
                  <div key={catKey} className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5 text-[11px] truncate max-w-[180px]">
                      <span>{info.emoji}</span>
                      <span>{info.label.split('(')[0]}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${info.badgeBg.split(' ')[0]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-400 text-[10px] w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'FORM' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Formulaire de Sortie / Écriture en Perte
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sélectionnez l'article concerné, renseignez le motif de sortie et validez pour mettre à jour automatiquement l'inventaire du labo central.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Material Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  1. Sélectionner la Matière Première <span className="text-rose-400">*</span>
                </label>
                
                {/* Search box for long material lists */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={materialSearchQuery}
                    onChange={e => setMaterialSearchQuery(e.target.value)}
                    placeholder="Filtrer la liste par nom, catégorie ou SKU..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <select
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                  required
                >
                  <option value="">-- Choisir une matière première --</option>
                  {filteredRawMaterials.map(mat => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} ({mat.category}) — Stock Dispo: {mat.currentStock} {mat.unit} | {mat.currentAvgCost.toLocaleString('fr-DZ')} DZD/{mat.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Material Overview Banner when selected */}
              {selectedMaterial && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Matière Sélectionnée</span>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400" />
                        {selectedMaterial.name}
                      </h4>
                      <p className="text-xs text-slate-400">SKU: {selectedMaterial.sku} • Catégorie: {selectedMaterial.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stock Actuel Dispo</span>
                      <p className="text-lg font-black text-amber-400">
                        {selectedMaterial.currentStock} <span className="text-xs text-slate-300 font-bold">{selectedMaterial.unit}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Coût Moyen Unitaire</span>
                      <span className="text-white font-bold">{selectedMaterial.currentAvgCost.toLocaleString('fr-DZ')} DZD / {selectedMaterial.unit}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Valeur Totale en Stock</span>
                      <span className="text-emerald-400 font-bold">{(selectedMaterial.currentStock * selectedMaterial.currentAvgCost).toLocaleString('fr-DZ')} DZD</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Quantity & Real-time Loss calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    2. Quantité à Déstocker <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max={selectedMaterial ? selectedMaterial.currentStock : undefined}
                      value={quantityToRemove}
                      onChange={e => setQuantityToRemove(e.target.value)}
                      placeholder="Ex: 5.5"
                      className={`w-full bg-slate-950 border rounded-2xl pl-4 pr-16 py-3 text-base font-bold text-white focus:outline-none focus:ring-2 ${
                        qtyNumber > 0 && !isQtyValid
                          ? 'border-rose-500 focus:ring-rose-500/50'
                          : 'border-slate-700/80 focus:ring-rose-500'
                      }`}
                      required
                    />
                    <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">
                      {selectedMaterial ? selectedMaterial.unit : 'Unité'}
                    </span>
                  </div>
                  
                  {/* Validation errors */}
                  {selectedMaterial && qtyNumber > selectedMaterial.currentStock && (
                    <p className="text-xs text-rose-400 font-semibold mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Attention: La quantité dépasse le stock disponible ({selectedMaterial.currentStock} {selectedMaterial.unit}).
                    </p>
                  )}
                </div>

                {/* Real-time Loss Summary */}
                <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                    Impact Financier de la Perte
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-rose-400">
                      {totalLossValue.toLocaleString('fr-DZ')}
                    </span>
                    <span className="text-xs font-bold text-rose-300 ml-1">DZD</span>
                  </div>
                  <span className="text-[11px] text-rose-200/70">
                    Calculé: {qtyNumber || 0} {selectedMaterial?.unit || ''} × {(selectedMaterial?.currentAvgCost || 0).toLocaleString('fr-DZ')} DZD
                  </span>
                </div>
              </div>

              {/* Step 3: Reason Category */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  3. Motif du Déstockage <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(REASON_CONFIG) as DestockingReasonCategory[]).map(catKey => {
                    const cfg = REASON_CONFIG[catKey];
                    const isSelected = reasonCategory === catKey;

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setReasonCategory(catKey)}
                        className={`text-left p-3 rounded-2xl border transition-all relative flex items-start gap-3 ${
                          isSelected
                            ? `${cfg.borderColor} bg-slate-800 shadow-md ring-2 ring-rose-500/40`
                            : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="text-xl mt-0.5">{cfg.emoji}</span>
                        <div className="space-y-0.5">
                          <h5 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {cfg.label}
                          </h5>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            {cfg.sublabel}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Notes & Created By */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    4. Remarques / Numéro de Lot / Justification
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ex: Moisissures détectées sur le sac #402, échantillon envoyé pour test bactériologique..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Responsable Saisie
                  </label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={e => setCreatedBy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Nom du chef ou opérateur ayant validé le déstockage.</p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={!selectedMaterialId || !isQtyValid}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black transition-all ${
                    selectedMaterialId && isQtyValid
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/30 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Valider le Déstockage & Enregistrer Perte</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Guidance Side Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                Règles de Gestion des Perte
              </h3>
              
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Déduction Immédiate:</strong> Toute validation soustrait instantanément la quantité du stock central.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Traçabilité Comptable:</strong> Le coût unitaire pondéré du moment sert à calculer la perte financière exacte.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Alertes R&D:</strong> Les échantillons donnés pour tests doivent utiliser la catégorie <em>Distribution Diverses</em>.</span>
                </li>
              </ul>
            </div>

            {/* Recent 3 Adjustments Quick List */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Dernières Sorties Effectuées</span>
                <button onClick={() => setActiveTab('LOGS')} className="text-rose-400 hover:underline text-[10px]">Tout voir</button>
              </h3>

              {adjustments.slice(0, 3).map(adj => {
                const reason = REASON_CONFIG[adj.reason_category];
                return (
                  <div key={adj.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate max-w-[150px]">{adj.raw_material_name}</span>
                      <span className="font-extrabold text-rose-400">{adj.total_loss_value.toLocaleString('fr-DZ')} DZD</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>-{adj.quantity_removed} {adj.unit}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${reason.badgeBg}`}>
                        {reason.emoji} {reason.label.split('(')[0]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Audit Log View */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Journal d'Audit des Déstockages & Écritures en Perte
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Historique complet des sorties d'inventaire du laboratoire central avec détails financiers et motifs.
              </p>
            </div>

            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
                placeholder="Rechercher par nom de matière, responsable ou remarques..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <select
                value={logReasonFilter}
                onChange={e => setLogReasonFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
              >
                <option value="ALL">Tous les Motifs</option>
                {(Object.keys(REASON_CONFIG) as DestockingReasonCategory[]).map(catKey => (
                  <option key={catKey} value={catKey}>
                    {REASON_CONFIG[catKey].emoji} {REASON_CONFIG[catKey].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Table (Desktop) & Stacked Cards (Mobile) */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
            {/* Desktop Table View (≥ 768px) */}
            <div className="hidden md:block overflow-x-auto webkit-overflow-scrolling-touch">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-bold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date & Heure</th>
                    <th className="p-3.5">Matière Première</th>
                    <th className="p-3.5 text-right">Quantité Retirée</th>
                    <th className="p-3.5 text-right">Coût Unitaire</th>
                    <th className="p-3.5 text-right">Perte Totale</th>
                    <th className="p-3.5">Motif</th>
                    <th className="p-3.5">Auteur / Opérateur</th>
                    <th className="p-3.5">Remarques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                        <Trash2 className="w-8 h-8 text-slate-700 mx-auto mb-2 opacity-50" />
                        Aucune opération de déstockage ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => {
                      const reason = REASON_CONFIG[log.reason_category] || REASON_CONFIG.QUALITY_DAMAGE;
                      const dateFormatted = new Date(log.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                            {dateFormatted}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {log.raw_material_name}
                          </td>
                          <td className="p-3.5 text-right font-extrabold text-amber-300 whitespace-nowrap">
                            -{log.quantity_removed} {log.unit}
                          </td>
                          <td className="p-3.5 text-right text-slate-400 whitespace-nowrap">
                            {log.unit_cost_at_time.toLocaleString('fr-DZ')} DZD
                          </td>
                          <td className="p-3.5 text-right font-black text-rose-400 whitespace-nowrap">
                            {log.total_loss_value.toLocaleString('fr-DZ')} DZD
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${reason.badgeBg} ${reason.borderColor}`}>
                              <span>{reason.emoji}</span>
                              <span>{reason.label.split('(')[0]}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300 font-semibold whitespace-nowrap">
                            {log.created_by}
                          </td>
                          <td className="p-3.5 text-slate-400 max-w-xs truncate text-[11px]" title={log.notes}>
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards Layout (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-800 p-3 space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-xs">
                  Aucune opération de déstockage trouvée.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const reason = REASON_CONFIG[log.reason_category] || REASON_CONFIG.QUALITY_DAMAGE;
                  const dateFormatted = new Date(log.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div key={log.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-white text-sm">{log.raw_material_name}</h4>
                          <span className="text-[11px] text-slate-400">{dateFormatted} • {log.created_by}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${reason.badgeBg} ${reason.borderColor}`}>
                          {reason.emoji} {reason.label.split('(')[0]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Quantité Retirée</span>
                          <span className="font-extrabold text-amber-300 text-sm">-{log.quantity_removed} {log.unit}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Perte Financière</span>
                          <span className="font-black text-rose-400 text-sm">{log.total_loss_value.toLocaleString('fr-DZ')} DZD</span>
                        </div>
                      </div>

                      {log.notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
