import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { StoreDashboardSkeleton } from '../store/StoreDashboardSkeleton';
import { LabDashboardSkeleton } from '../lab/LabDashboardSkeleton';
import { UserRole } from '../../types';
import { getActiveRole } from '../../services/storage';
import { Sparkles, Radio } from 'lucide-react';

interface LoadingScreenProps {
  role?: UserRole;
  isStore?: boolean;
  message?: string;
  submessage?: string;
  isExiting?: boolean;
}

/**
 * High-performance, contextual Skeleton Loader Screen for Délice POS & Lab.
 * Replaces the generic splash screen with direct skeleton representations of
 * StoreDashboard or LabDashboard to optimize perceived performance during initial data hydration.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  role,
  isStore,
  message,
  submessage,
  isExiting = false,
}) => {
  const { t } = useTranslation();
  // Determine active view context
  const activeRole: UserRole = role || (isStore !== undefined ? (isStore ? 'RETAIL_STORE' : 'CENTRAL_LAB') : getActiveRole());
  const isStoreView = isStore !== undefined ? isStore : activeRole === 'RETAIL_STORE';
  const displayMessage = message || t('common.syncDataLoading', 'Synchronisation & Hydratation des données...');

  return (
    <motion.div
      id="delice-contextual-skeleton-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto overflow-x-hidden selection:bg-none"
    >
      {/* Floating Hydration Status Chip */}
      <div className="sticky top-3 z-50 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{isStoreView ? t('nav.storeTitle', 'Espace Boutique') : t('nav.labTitle', 'Laboratoire Central')}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-normal text-[11px]">{displayMessage}</span>
          </div>
        </div>
      </div>

      {/* Render the matching dashboard skeleton */}
      <div className="pt-2">
        {isStoreView ? (
          <StoreDashboardSkeleton />
        ) : (
          <LabDashboardSkeleton />
        )}
      </div>
    </motion.div>
  );
};

export { StoreDashboardSkeleton } from '../store/StoreDashboardSkeleton';
export { LabDashboardSkeleton } from '../lab/LabDashboardSkeleton';

