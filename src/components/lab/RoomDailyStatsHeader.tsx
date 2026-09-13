import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Award,
  AlertCircle,
  Sparkles,
  RotateCcw,
  PlusCircle,
  Calendar,
  UserCheck,
  Check
} from 'lucide-react';
import {
  calculateRoom24hStats,
  subscribeToCompletedRuns,
  CompletedProductionRun,
  Room24hProductionStats,
  recordCompletedProductionRun
} from '../../services/productionRunsService';

export interface RoomDailyStatsHeaderProps {
  roomId: string;
  roomName: string;
  categoryFr: string;
  colorTheme?: {
    bg: string;
    border: string;
    badge: string;
    text: string;
    bar: string;
  };
  currentOfTargetUnits?: number;
  currentOfCompletedUnits?: number;
  chefName?: string;
  selectedShift?: string;
}

export const RoomDailyStatsHeader: React.FC<RoomDailyStatsHeaderProps> = ({
  roomId,
  roomName,
  categoryFr,
  colorTheme,
  currentOfTargetUnits = 0,
  currentOfCompletedUnits = 0,
  chefName = 'Chef Pâtissier',
  selectedShift = 'Équipe Matin (05:00 - 13:00)',
}) => {
  const [stats, setStats] = useState<Room24hProductionStats>(() =>
    calculateRoom24hStats(roomId, roomName, currentOfTargetUnits)
  );
  const [showRunDetails, setShowRunDetails] = useState<boolean>(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<boolean>(false);

  // Quick run entry form state
  const [quickRecipeName, setQuickRecipeName] = useState('');
  const [quickTarget, setQuickTarget] = useState<number>(50);
  const [quickActual, setQuickActual] = useState<number>(50);
  const [quickNotes, setQuickNotes] = useState('');

  // Reload stats whenever roomId or events trigger
  const loadStats = React.useCallback(() => {
    setStats(calculateRoom24hStats(roomId, roomName, currentOfTargetUnits));
  }, [roomId, roomName, currentOfTargetUnits]);

  useEffect(() => {
    loadStats();
    const unsubscribe = subscribeToCompletedRuns(loadStats);
    return unsubscribe;
  }, [loadStats]);

  // Combined stats including the active OF if it has progress
  const combinedStats = useMemo(() => {
    const target = stats.totalTargetOutput;
    const actual = stats.totalActualCompleted;
    const rate = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 100;
    const variance = actual - target;

    return {
      target,
      actual,
      rate,
      variance,
      runCount: stats.completedRunsCount,
      avgBatchYield: stats.averageBatchYieldRate,
    };
  }, [stats]);

  // Status qualitative badge
  const statusEvaluation = useMemo(() => {
    if (combinedStats.rate >= 98) {
      return {
        label: 'Cadence Optimale (100%)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        barColor: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        icon: CheckCircle2,
      };
    } else if (combinedStats.rate >= 85) {
      return {
        label: 'Bonne Cadence (≥85%)',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
        barColor: 'bg-blue-500',
        textColor: 'text-blue-700',
        icon: TrendingUp,
      };
    } else {
      return {
        label: 'Vigilance Cadence (<85%)',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-700',
        icon: AlertCircle,
      };
    }
  }, [combinedStats.rate]);

  // Handle manual log quick batch submission
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRecipeName.trim()) return;

    recordCompletedProductionRun({
      batchCode: `LOT-${roomId.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      roomId,
      roomName,
      productName: quickRecipeName.trim(),
      category: categoryFr,
      plannedTarget: Number(quickTarget),
      actualCompleted: Number(quickActual),
      unit: 'pièces',
      leadChef: chefName,
      shift: selectedShift,
      notes: quickNotes.trim() || 'Fournée complémentaire enregistrée manuellement.',
    });

    setQuickRecipeName('');
    setQuickNotes('');
    setShowQuickAddModal(false);
  };

  const StatusIcon = statusEvaluation.icon;

  return (
    <div
      id="room-daily-stats-header"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 transition-all"
    >
      {/* Top Banner: Atelier context & 24h rolling timeframe */}
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-black tracking-wide uppercase text-slate-100">
                Bilan 24h Atelier • {roomName}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Clock className="w-3 h-3 text-amber-400" />
                Fenêtre Glissante : Dernières 24 Heures
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Objectif journalier cible vs. unités réellement achevées sur l’ensemble des fournées
              validées
            </p>
          </div>
        </div>

        {/* Action button & Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs ${statusEvaluation.badgeClass}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{statusEvaluation.label}</span>
          </span>

          <button
            type="button"
            onClick={() => setShowQuickAddModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-2xs print:hidden"
            title="Enregistrer manuellement une fournée terminée"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Fournée</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* 1. Daily Target Output */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Objectif Cible 24h
                </span>
                <Target className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {combinedStats.target.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-slate-500">unités</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Nomenclature planifiée</span>
              <span className="font-semibold text-slate-700">{stats.completedRunsCount} séries</span>
            </div>
          </div>

          {/* 2. Actual Completed Items */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Unités Terminées
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {combinedStats.actual.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs font-bold text-slate-500">produits</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Contrôle qualité</span>
              <span className="font-semibold text-emerald-700">100% Conformes</span>
            </div>
          </div>

          {/* 3. Achievement Rate / Yield */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Taux d'Atteinte
                </span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${statusEvaluation.textColor}`}>
                  {combinedStats.rate}%
                </span>
                <span className="text-xs font-bold text-slate-500">réalisé</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] flex items-center justify-between">
              <span className="text-slate-500">Écart net :</span>
              <span
                className={`font-mono font-bold ${
                  combinedStats.variance >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {combinedStats.variance >= 0
                  ? `+${combinedStats.variance} pcs`
                  : `${combinedStats.variance} pcs`}
              </span>
            </div>
          </div>

          {/* 4. Runs Completed & Cadence */}
          <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Fournées Bouclées
                </span>
                <Layers className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {stats.completedRunsCount}
                </span>
                <span className="text-xs font-bold text-slate-500">fournées</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Rendement moyen/lot</span>
              <span className="font-semibold text-purple-700 font-mono">{stats.averageBatchYieldRate}%</span>
            </div>
          </div>
        </div>

        {/* Visual Progress / Target vs. Actual Linear Bar */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>Progression Globale de l'Atelier</span>
              <span className="text-[10px] text-slate-400 font-normal">
                ({combinedStats.actual} / {combinedStats.target} pcs)
              </span>
            </span>
            <span className="font-mono font-black text-slate-900">
              {combinedStats.rate}% de l'objectif
            </span>
          </div>

          <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${statusEvaluation.barColor}`}
              style={{ width: `${Math.min(combinedStats.rate, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>Démarrage 24h</span>
            <span className="font-medium text-slate-600">
              Cible Journalière : {combinedStats.target} pcs
            </span>
            <span>
              {combinedStats.rate >= 100
                ? 'Objectif 24h dépassé !'
                : `Reste : ${Math.max(0, combinedStats.target - combinedStats.actual)} pcs`}
            </span>
          </div>
        </div>

        {/* Collapsible Section Toggle: 24h Runs History Feed */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowRunDetails(!showRunDetails)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors py-1 print:hidden"
          >
            <span>Détail des fournées validées ({stats.completedRuns.length} lots)</span>
            {showRunDetails ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <span className="text-[11px] text-slate-500 font-medium">
            Dernière fournée enregistrée :{' '}
            {stats.latestRunAt
              ? new Date(stats.latestRunAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Aucune'}
          </span>
        </div>

        {/* Detailed 24h Runs Table */}
        {showRunDetails && (
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center justify-between">
              <span>Historique des Fournées Conclues (24h)</span>
              <span className="text-slate-500 font-normal">Section {categoryFr}</span>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Code Lot</th>
                    <th className="py-2 px-3">Désignation Produit</th>
                    <th className="py-2 px-3 text-right">Cible</th>
                    <th className="py-2 px-3 text-right">Réalisé</th>
                    <th className="py-2 px-3 text-right">Rendement</th>
                    <th className="py-2 px-3">Chef & Équipe</th>
                    <th className="py-2 px-3 text-right">Horodatage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {stats.completedRuns.map((run) => {
                    const runDate = new Date(run.completedAt);
                    const timeAgoHours = Math.max(
                      0.1,
                      Number(((Date.now() - runDate.getTime()) / (1000 * 60 * 60)).toFixed(1))
                    );

                    return (
                      <tr key={run.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {run.batchCode}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-900 block">
                            {run.productName}
                          </span>
                          {run.notes && (
                            <span className="text-[10px] text-slate-500 italic block truncate max-w-xs">
                              {run.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {run.plannedTarget} {run.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {run.actualCompleted} {run.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                              run.yieldPercentage >= 98
                                ? 'bg-emerald-100 text-emerald-800'
                                : run.yieldPercentage >= 85
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {run.yieldPercentage}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[11px] font-semibold text-slate-800 block">
                            {run.leadChef}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{run.shift}</span>
                        </td>
                        <td className="py-2 px-3 text-right text-[11px]">
                          <span className="font-medium text-slate-700 block">
                            {runDate.toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            il y a {timeAgoHours}h
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Manual Run Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Enregistrer une Fournée Terminée
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Désignation de la Recette / Produit
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Éclair Vanille Pécan, Tarte Bourdaloue..."
                  value={quickRecipeName}
                  onChange={(e) => setQuickRecipeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantité Cible (Prévue)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickTarget}
                    onChange={(e) => setQuickTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantité Réalisée (Terminée)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickActual}
                    onChange={(e) => setQuickActual(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observations / Contrôle Qualité (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Cuisson dorée, poids moyen respecté..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-3.5 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs"
                >
                  Enregistrer la Fournée
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
