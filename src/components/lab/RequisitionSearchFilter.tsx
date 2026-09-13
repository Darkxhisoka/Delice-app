import React from 'react';
import { StoreLocation, RequisitionStatus } from '../../types';
import {
  Search,
  Building2,
  Filter,
  Calendar,
  X,
  RotateCcw,
  ArrowUpDown,
  Tag,
  Clock
} from 'lucide-react';

export type DatePreset = 'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM';
export type SortOption = 'dateRequested_desc' | 'dateRequested_asc' | 'dateNeeded_asc' | 'amount_desc' | 'amount_asc';

export interface RequisitionFilterState {
  searchTerm: string;
  selectedStoreId: string;
  selectedStatus: string;
  dateFilterType: 'dateRequested' | 'dateNeeded';
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  sortBy: SortOption;
}

interface RequisitionSearchFilterProps {
  stores: StoreLocation[];
  filters: RequisitionFilterState;
  onFilterChange: (newFilters: RequisitionFilterState) => void;
  onResetFilters: () => void;
  totalResultsCount: number;
  totalRequisitionsCount: number;
  totalFilteredValue: number;
}

export const RequisitionSearchFilter: React.FC<RequisitionSearchFilterProps> = ({
  stores,
  filters,
  onFilterChange,
  onResetFilters,
  totalResultsCount,
  totalRequisitionsCount,
  totalFilteredValue,
}) => {
  const updateFilter = <K extends keyof RequisitionFilterState>(
    key: K,
    value: RequisitionFilterState[K]
  ) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const handlePresetChange = (preset: DatePreset) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'ALL') {
      onFilterChange({
        ...filters,
        datePreset: 'ALL',
        startDate: '',
        endDate: '',
      });
    } else if (preset === 'TODAY') {
      onFilterChange({
        ...filters,
        datePreset: 'TODAY',
        startDate: todayStr,
        endDate: todayStr,
      });
    } else if (preset === 'LAST_7_DAYS') {
      const past7 = new Date();
      past7.setDate(today.getDate() - 7);
      const past7Str = past7.toISOString().split('T')[0];
      onFilterChange({
        ...filters,
        datePreset: 'LAST_7_DAYS',
        startDate: past7Str,
        endDate: todayStr,
      });
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const firstDayStr = firstDay.toISOString().split('T')[0];
      onFilterChange({
        ...filters,
        datePreset: 'THIS_MONTH',
        startDate: firstDayStr,
        endDate: todayStr,
      });
    } else if (preset === 'CUSTOM') {
      onFilterChange({
        ...filters,
        datePreset: 'CUSTOM',
      });
    }
  };

  const isFiltered =
    filters.searchTerm.trim() !== '' ||
    filters.selectedStoreId !== 'ALL' ||
    filters.selectedStatus !== 'ALL' ||
    filters.datePreset !== 'ALL' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  const activeStoreName = stores.find((s) => s.id === filters.selectedStoreId)?.name;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      
      {/* Header & Main Search Input */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Rechercher par N° commande, magasin, demandeur, article, notes..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="w-full pl-10 pr-9 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {filters.searchTerm && (
            <button
              onClick={() => updateFilter('searchTerm', '')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort By Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Trier :</span>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="dateRequested_desc">Date Demande (Récents d'abord)</option>
              <option value="dateRequested_asc">Date Demande (Anciens d'abord)</option>
              <option value="dateNeeded_asc">Date Requise (Proches d'abord)</option>
              <option value="amount_desc">Montant le Plus Élevé (DZD)</option>
              <option value="amount_asc">Montant le Plus Bas (DZD)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Secondary Filter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
        
        {/* Store Location Filter */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Magasin / Boutique</span>
          </label>
          <select
            value={filters.selectedStoreId}
            onChange={(e) => updateFilter('selectedStoreId', e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          >
            <option value="ALL">Les 6 Points de Vente</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Order Status Filter */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Statut Commande</span>
          </label>
          <select
            value={filters.selectedStatus}
            onChange={(e) => updateFilter('selectedStatus', e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          >
            <option value="ALL">Tous les Statuts</option>
            <option value="PENDING">En Attente de Révision</option>
            <option value="APPROVED">Approuvée</option>
            <option value="PROCESSING">En Préparation / Cuisson</option>
            <option value="DISPATCHED">Expédiée pour Livraison</option>
            <option value="DELIVERED">Livrée en Magasin</option>
            <option value="REJECTED">Rejetée</option>
          </select>
        </div>

        {/* Date Field Target */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Base de Date</span>
          </label>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => updateFilter('dateFilterType', 'dateRequested')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                filters.dateFilterType === 'dateRequested'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Demande
            </button>
            <button
              type="button"
              onClick={() => updateFilter('dateFilterType', 'dateNeeded')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                filters.dateFilterType === 'dateNeeded'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Requise
            </button>
          </div>
        </div>

        {/* Date Range Presets */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-600 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Période</span>
          </label>
          <select
            value={filters.datePreset}
            onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
            className="w-full text-xs font-semibold bg-slate-50 text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          >
            <option value="ALL">Toutes les Dates</option>
            <option value="TODAY">Aujourd'hui</option>
            <option value="LAST_7_DAYS">7 Derniers Jours</option>
            <option value="THIS_MONTH">Ce Mois-ci</option>
            <option value="CUSTOM">Période Personnalisée...</option>
          </select>
        </div>

      </div>

      {/* Custom Date Pickers (Shown if CUSTOM preset selected or custom dates set) */}
      {(filters.datePreset === 'CUSTOM' || filters.startDate || filters.endDate) && (
        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-indigo-900 mb-1 uppercase">Du</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  datePreset: 'CUSTOM',
                  startDate: e.target.value,
                });
              }}
              className="w-full text-xs font-medium bg-white text-slate-900 border border-indigo-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-indigo-900 mb-1 uppercase">Au</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                onFilterChange({
                  ...filters,
                  datePreset: 'CUSTOM',
                  endDate: e.target.value,
                });
              }}
              className="w-full text-xs font-medium bg-white text-slate-900 border border-indigo-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}

      {/* Active Filter Chips & Results Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        
        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Filtres Actifs :</span>
          
          {!isFiltered && (
            <span className="text-[11px] text-slate-400 italic">Affichage de toutes les commandes</span>
          )}

          {filters.searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
              Recherche : "{filters.searchTerm}"
              <button onClick={() => updateFilter('searchTerm', '')} className="hover:text-indigo-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.selectedStoreId !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              Magasin : {activeStoreName || filters.selectedStoreId}
              <button onClick={() => updateFilter('selectedStoreId', 'ALL')} className="hover:text-blue-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.selectedStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
              Statut : {filters.selectedStatus}
              <button onClick={() => updateFilter('selectedStatus', 'ALL')} className="hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.datePreset !== 'ALL' || filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {filters.dateFilterType === 'dateRequested' ? 'Demande' : 'Requise'} :{' '}
              {filters.datePreset !== 'CUSTOM' ? filters.datePreset : `${filters.startDate || 'Indéfinie'} au ${filters.endDate || 'Indéfinie'}`}
              <button onClick={() => handlePresetChange('ALL')} className="hover:text-emerald-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors ml-1"
            >
              <RotateCcw className="w-3 h-3" /> Effacer Tout
            </button>
          )}
        </div>

        {/* Count & Cost Summary */}
        <div className="flex items-center gap-3 font-semibold text-slate-600 shrink-0">
          <span>
            Affichage de <strong className="text-slate-900">{totalResultsCount}</strong> sur {totalRequisitionsCount}
          </span>
          <span>•</span>
          <span>
            Valeur Filtrée : <strong className="text-indigo-700">{totalFilteredValue.toFixed(2)} DZD</strong>
          </span>
        </div>

      </div>

    </div>
  );
};
