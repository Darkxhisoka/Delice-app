import React, { useState, useEffect } from 'react';
import { Requisition, BatchStatus, ChefVoiceNote } from '../../types';
import {
  getRequisitions,
  getRecipes,
  getProductionBatchStatuses,
  updateProductionBatchStatus,
  getChefVoiceNotes,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  Utensils,
  CheckSquare,
  Clock,
  Flame,
  Package,
  CheckCircle2,
  ListTodo,
  ChefHat,
  Sparkles,
  Layers,
  Store,
  Filter,
  BarChart2,
  Mic,
  Volume2
} from 'lucide-react';

interface BatchItem {
  id: string; // e.g., "Croissant_batch_1"
  batchNumber: number;
  size: number;
  status: BatchStatus;
}

interface ConsolidatedProductionTask {
  productName: string;
  category: string;
  totalQuantityNeeded: number;
  unit: string;
  standardBatchSize: number;
  totalBatchesCount: number;
  storeBreakdown: { storeName: string; quantity: number }[];
  batches: BatchItem[];
}

const BATCH_STAGES: { status: BatchStatus; label: string; iconName: string; activeClass: string; textClass: string }[] = [
  {
    status: 'PLANNED',
    label: 'Planifié',
    iconName: 'Clock',
    activeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    textClass: 'text-slate-600'
  },
  {
    status: 'IN_PREPARATION',
    label: 'En Préparation',
    iconName: 'ChefHat',
    activeClass: 'bg-blue-500 text-white border-blue-600 shadow-xs',
    textClass: 'text-blue-700'
  },
  {
    status: 'BAKING',
    label: 'En Cuisson (Four)',
    iconName: 'Flame',
    activeClass: 'bg-amber-500 text-slate-950 font-black border-amber-600 shadow-xs',
    textClass: 'text-amber-700'
  },
  {
    status: 'READY_FOR_PACKING',
    label: 'Prêt pour Emballage',
    iconName: 'Package',
    activeClass: 'bg-purple-600 text-white border-purple-700 shadow-xs',
    textClass: 'text-purple-700'
  },
  {
    status: 'COMPLETED',
    label: 'Terminé (Prêt Expédition)',
    iconName: 'CheckCircle2',
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
    textClass: 'text-emerald-700'
  }
];

export const DailyProductionPlan: React.FC = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [recipes, setRecipes] = useState(getRecipes());
  const [savedBatchStatuses, setSavedBatchStatuses] = useState(getProductionBatchStatuses());
  const [voiceNotes, setVoiceNotes] = useState<ChefVoiceNote[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const loadData = () => {
    setRequisitions(getRequisitions());
    setRecipes(getRecipes());
    setSavedBatchStatuses(getProductionBatchStatuses());
    setVoiceNotes(getChefVoiceNotes());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  // Filter approved or active requisitions
  const activeRequisitions = requisitions.filter(
    (r) => r.status === 'APPROVED' || r.status === 'IN_PRODUCTION' || r.status === 'PROCESSING' || r.status === 'READY_FOR_DISPATCH'
  );

  // Aggregate item quantities across all stores
  const productAggregationMap: {
    [productName: string]: {
      category: string;
      unit: string;
      totalQty: number;
      stores: { storeName: string; quantity: number }[];
    };
  } = {};

  activeRequisitions.forEach((req) => {
    req.items.forEach((item) => {
      if (!productAggregationMap[item.productName]) {
        productAggregationMap[item.productName] = {
          category: item.category || 'Pâtisserie',
          unit: item.unit || 'unités',
          totalQty: 0,
          stores: []
        };
      }
      productAggregationMap[item.productName].totalQty += item.quantityRequested;
      
      const existingStore = productAggregationMap[item.productName].stores.find((s) => s.storeName === req.storeName);
      if (existingStore) {
        existingStore.quantity += item.quantityRequested;
      } else {
        productAggregationMap[item.productName].stores.push({
          storeName: req.storeName,
          quantity: item.quantityRequested
        });
      }
    });
  });

  // Build Master Production Task List with standard batch sizes
  const masterTasks: ConsolidatedProductionTask[] = Object.entries(productAggregationMap).map(([productName, data]) => {
    // Determine batch size (default to 24 or 30 or recipe yield)
    const recipe = recipes.find((r) => r.name.toLowerCase() === productName.toLowerCase());
    const batchSize = recipe?.yieldUnits || (data.category.includes('Croissants') ? 30 : 24);
    const totalBatchesCount = Math.max(1, Math.ceil(data.totalQty / batchSize));

    const batches: BatchItem[] = [];
    for (let i = 1; i <= totalBatchesCount; i++) {
      const batchKey = `${productName.replace(/\s+/g, '_')}_batch_${i}`;
      const savedStatus = savedBatchStatuses[batchKey] || 'PLANNED';
      const size = i === totalBatchesCount && data.totalQty % batchSize !== 0
        ? data.totalQty % batchSize
        : batchSize;

      batches.push({
        id: batchKey,
        batchNumber: i,
        size,
        status: savedStatus
      });
    }

    return {
      productName,
      category: data.category,
      totalQuantityNeeded: data.totalQty,
      unit: data.unit,
      standardBatchSize: batchSize,
      totalBatchesCount,
      storeBreakdown: data.stores,
      batches
    };
  });

  const categories = Array.from(new Set(masterTasks.map((t) => t.category)));

  const filteredTasks = masterTasks.filter((t) =>
    selectedCategory === 'ALL' ? true : t.category === selectedCategory
  );

  // Compute total completion metrics
  let totalBatchesGlobal = 0;
  let completedBatchesGlobal = 0;

  masterTasks.forEach((t) => {
    t.batches.forEach((b) => {
      totalBatchesGlobal++;
      if (b.status === 'COMPLETED') completedBatchesGlobal++;
    });
  });

  const completionPercentage = totalBatchesGlobal > 0
    ? Math.round((completedBatchesGlobal / totalBatchesGlobal) * 100)
    : 0;

  const handleStageChange = (batchKey: string, newStatus: BatchStatus) => {
    updateProductionBatchStatus(batchKey, newStatus);
    notifyToast({
      type: 'info',
      title: 'Étape de Cuisson Mise à Jour',
      message: `Lot ${batchKey.split('_').pop()} mis à jour : ${newStatus}`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 rounded-3xl p-6 text-white shadow-xl border border-amber-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Utensils className="w-4 h-4" />
            <span>Planification de Production Cuisine & Labo Central</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Feuille de Route & Task List des Pâtissiers</h2>
          <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
            Agrégation automatique de l'ensemble des commandes des 6 points de vente en **Lots de Fabrication Standarisés** avec suivi en temps réel par les pâtissiers.
          </p>
        </div>

        {/* Global Kitchen Progress Widget */}
        <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl shrink-0 min-w-56 text-right space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>Avancement Shifts :</span>
            <span className="font-black text-white text-sm">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {completedBatchesGlobal} sur {totalBatchesGlobal} lots terminés
          </p>
        </div>
      </div>

      {/* Active Shift Chef Voice Notes & Transcripts Banner */}
      {voiceNotes.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="font-extrabold text-amber-950">
                  🎙️ {voiceNotes.length} Note{voiceNotes.length > 1 ? 's' : ''} Vocale{voiceNotes.length > 1 ? 's' : ''} de Tournée Active{voiceNotes.length > 1 ? 's' : ''}
                </strong>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                  Dernier enregistrement : {voiceNotes[0]?.chefName} ({new Date(voiceNotes[0]?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
              <p className="text-slate-600 mt-1 line-clamp-1 italic">
                "{voiceNotes[0]?.transcript}"
              </p>
            </div>
          </div>
          <div className="shrink-0 text-slate-500 text-[11px] font-medium flex items-center gap-1.5 self-end md:self-auto">
            <Volume2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Mains-libres activé</span>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            selectedCategory === 'ALL'
              ? 'bg-slate-900 text-amber-400 font-black shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Toutes Catégories ({masterTasks.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Master Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Aucune Commande à Produire Aujourd'hui</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Dès que des magasins valideront leurs réquisitions quotidiennes, les lots de production s'afficheront automatiquement ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.productName}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 transition-all space-y-4"
            >
              {/* Task Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                      {task.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Standard Batch : {task.standardBatchSize} {task.unit}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{task.productName}</h3>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Agrégé Requis</span>
                  <span className="text-xl font-black text-amber-600">
                    {task.totalQuantityNeeded} {task.unit}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-semibold">
                    ({task.totalBatchesCount} {task.totalBatchesCount > 1 ? 'lots' : 'lot'} de {task.standardBatchSize})
                  </span>
                </div>
              </div>

              {/* Stores Allocation Breakdown */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>Répartition Magasins :</span>
                </span>
                {task.storeBreakdown.map((sb) => (
                  <span key={sb.storeName} className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 font-semibold text-[11px]">
                    <strong>{sb.storeName}:</strong> {sb.quantity} {task.unit}
                  </span>
                ))}
              </div>

              {/* Interactive Batch Cards Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Suivi des Lots de Fabrication ({task.batches.length}) :
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {task.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                        batch.status === 'COMPLETED'
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : batch.status === 'BAKING'
                          ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Lot #{batch.batchNumber}</span>
                          <span className="text-slate-400 font-normal">({batch.size} {task.unit})</span>
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {batch.status}
                        </span>
                      </div>

                      {/* Stage Selector Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {BATCH_STAGES.map((st) => (
                          <button
                            key={st.status}
                            type="button"
                            onClick={() => handleStageChange(batch.id, st.status)}
                            className={`p-1.5 rounded-xl text-[10px] font-bold text-center border transition-all ${
                              batch.status === st.status
                                ? st.activeClass
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
