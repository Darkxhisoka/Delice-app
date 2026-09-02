import { ActivityLogItem, ActivityType } from '../types';
import { getActivityLogs, addActivityLog, getActiveRole, notifyToast, notifyListeners } from './storage';

export interface TrackActivityInput {
  type: ActivityType;
  title: string;
  description: string;
  actor?: string;
  sourceInterface?: 'STORE' | 'LAB' | 'SYSTEM';
  badgeText?: string;
  severity?: 'info' | 'success' | 'warning' | 'purple' | 'danger';
  metadata?: {
    amount?: number;
    storeName?: string;
    referenceNumber?: string;
    supplierName?: string;
    recipeName?: string;
    status?: string;
    itemCount?: number;
    sourceInterface?: 'STORE' | 'LAB' | 'SYSTEM';
    notes?: string;
  };
}

export interface ActivityFeedFilter {
  searchTerm?: string;
  sourceInterface?: 'ALL' | 'STORE' | 'LAB' | 'SYSTEM';
  category?: 'ALL' | 'SALES' | 'REQUISITIONS' | 'RECEIPTS' | 'PRODUCTION' | 'STOCK' | 'WASTE' | 'SUPPLIERS';
  severity?: 'ALL' | 'info' | 'success' | 'warning' | 'purple' | 'danger';
  limit?: number;
}

/**
 * Tracks a new user interaction or system event in the central activity database
 */
export function logUserActivity(input: TrackActivityInput): ActivityLogItem {
  const activeRole = getActiveRole();
  const defaultInterface: 'STORE' | 'LAB' = activeRole === 'RETAIL_STORE' ? 'STORE' : 'LAB';
  const sourceInterface = input.sourceInterface || defaultInterface;

  const defaultActor = input.actor || (sourceInterface === 'STORE' ? 'Équipe Caisse Boutique' : 'Chef Pâtissier Labo');

  const newLog = addActivityLog({
    type: input.type,
    title: input.title,
    description: input.description,
    actor: defaultActor,
    sourceInterface,
    badgeText: input.badgeText,
    severity: input.severity || 'info',
    metadata: {
      ...input.metadata,
      sourceInterface,
    },
  });

  return newLog;
}

/**
 * Retrieves and filters the activity logs for display in the Activity Feed
 */
export function getActivityFeed(filter: ActivityFeedFilter = {}): {
  logs: ActivityLogItem[];
  stats: {
    total: number;
    storeCount: number;
    labCount: number;
    salesCount: number;
    requisitionCount: number;
    wasteCount: number;
  };
} {
  const rawLogs = getActivityLogs();

  const stats = {
    total: rawLogs.length,
    storeCount: rawLogs.filter(l => l.sourceInterface === 'STORE' || l.metadata?.sourceInterface === 'STORE' || l.type === 'SALE_RECORDED' || l.type === 'UNSOLD_LOGGED' || l.type === 'RECONCILIATION_CLOSED').length,
    labCount: rawLogs.filter(l => l.sourceInterface === 'LAB' || l.metadata?.sourceInterface === 'LAB' || l.type === 'RECEIPT_CREATED' || l.type === 'SEMI_FINISHED_PRODUCED' || l.type === 'RECIPE_CREATED').length,
    salesCount: rawLogs.filter(l => l.type === 'SALE_RECORDED').length,
    requisitionCount: rawLogs.filter(l => l.type.startsWith('REQUISITION')).length,
    wasteCount: rawLogs.filter(l => l.type === 'WASTE_LOGGED' || l.type === 'UNSOLD_LOGGED').length,
  };

  let filtered = [...rawLogs];

  // Interface filter
  if (filter.sourceInterface && filter.sourceInterface !== 'ALL') {
    filtered = filtered.filter(log => {
      const src = log.sourceInterface || log.metadata?.sourceInterface;
      if (src) return src === filter.sourceInterface;
      if (filter.sourceInterface === 'STORE') {
        return ['SALE_RECORDED', 'UNSOLD_LOGGED', 'RECONCILIATION_CLOSED'].includes(log.type);
      }
      if (filter.sourceInterface === 'LAB') {
        return ['RECEIPT_CREATED', 'SEMI_FINISHED_PRODUCED', 'RECIPE_CREATED', 'SUPPLIER_ADDED'].includes(log.type);
      }
      return true;
    });
  }

  // Category filter
  if (filter.category && filter.category !== 'ALL') {
    switch (filter.category) {
      case 'SALES':
        filtered = filtered.filter(l => l.type === 'SALE_RECORDED' || l.type === 'RECONCILIATION_CLOSED');
        break;
      case 'REQUISITIONS':
        filtered = filtered.filter(l => l.type.startsWith('REQUISITION') || l.type === 'DELIVERY_MANIFEST_CREATED');
        break;
      case 'RECEIPTS':
        filtered = filtered.filter(l => l.type === 'RECEIPT_CREATED');
        break;
      case 'PRODUCTION':
        filtered = filtered.filter(l => l.type === 'SEMI_FINISHED_PRODUCED' || l.type === 'RECIPE_CREATED' || l.type === 'DAILY_PLAN_UPDATED');
        break;
      case 'STOCK':
        filtered = filtered.filter(l => l.type === 'STOCK_ADJUSTED' || l.type === 'PACKAGING_DISPATCHED');
        break;
      case 'WASTE':
        filtered = filtered.filter(l => l.type === 'WASTE_LOGGED' || l.type === 'UNSOLD_LOGGED');
        break;
      case 'SUPPLIERS':
        filtered = filtered.filter(l => l.type === 'SUPPLIER_ADDED');
        break;
    }
  }

  // Severity filter
  if (filter.severity && filter.severity !== 'ALL') {
    filtered = filtered.filter(l => l.severity === filter.severity);
  }

  // Search term filter
  if (filter.searchTerm && filter.searchTerm.trim() !== '') {
    const term = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(l => 
      l.title.toLowerCase().includes(term) ||
      l.description.toLowerCase().includes(term) ||
      l.actor.toLowerCase().includes(term) ||
      (l.metadata?.referenceNumber && l.metadata.referenceNumber.toLowerCase().includes(term)) ||
      (l.metadata?.storeName && l.metadata.storeName.toLowerCase().includes(term)) ||
      (l.metadata?.supplierName && l.metadata.supplierName.toLowerCase().includes(term)) ||
      (l.metadata?.recipeName && l.metadata.recipeName.toLowerCase().includes(term))
    );
  }

  // Limit if specified
  if (filter.limit && filter.limit > 0) {
    filtered = filtered.slice(0, filter.limit);
  }

  return { logs: filtered, stats };
}

/**
 * Export activity logs to CSV format
 */
export function exportActivityLogsToCSV(): void {
  const logs = getActivityLogs();
  if (!logs.length) {
    notifyToast({ type: 'warning', title: 'Export Impossible', message: 'Aucun journal d\'activité enregistré.' });
    return;
  }

  const headers = ['ID', 'Horodateur', 'Interface', 'Type Evénement', 'Titre', 'Description', 'Acteur', 'Numéro Réf', 'Montant (DZD)', 'Statut/Magasin'];
  const rows = logs.map(l => [
    l.id,
    new Date(l.timestamp).toLocaleString('fr-FR'),
    l.sourceInterface || l.metadata?.sourceInterface || 'SYSTEM',
    l.type,
    `"${l.title.replace(/"/g, '""')}"`,
    `"${l.description.replace(/"/g, '""')}"`,
    `"${l.actor.replace(/"/g, '""')}"`,
    l.metadata?.referenceNumber || '',
    l.metadata?.amount !== undefined ? l.metadata.amount.toString() : '',
    l.metadata?.storeName || l.metadata?.supplierName || l.metadata?.status || ''
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `journal_activite_patisserie_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  notifyToast({ type: 'success', title: 'Export CSV Réussi', message: `${logs.length} activités exportées au format CSV.` });
}

/**
 * Clear all activity logs
 */
export function clearActivityLogs(): void {
  localStorage.setItem('pastry_app_activity_logs', JSON.stringify([]));
  notifyListeners();
  notifyToast({ type: 'info', title: 'Journal Effacé', message: 'L\'historique des activités a été réinitialisé.' });
}
