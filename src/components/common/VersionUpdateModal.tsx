import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Clock
} from 'lucide-react';
import {
  AppVersionManifest,
  applyUpdateAndReload,
  dismissUpdate
} from '../../services/versionService';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';

interface VersionUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  localVersion: string;
  remoteVersion: string;
  manifest: AppVersionManifest | null;
  isMandatory: boolean;
  migrationsApplied: string[];
}

export const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  isOpen,
  onClose,
  localVersion,
  remoteVersion,
  manifest,
  isMandatory,
  migrationsApplied
}) => {
  const { triggerSyncComplete, triggerClick } = useHapticsAndSound();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyUpdate = async () => {
    try {
      setIsUpdating(true);
      triggerSyncComplete();
      await applyUpdateAndReload(remoteVersion);
    } catch (err) {
      console.error('[VersionUpdateModal] Reload error:', err);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    if (isMandatory) return;
    triggerClick();
    dismissUpdate(remoteVersion);
    onClose();
  };

  const changelog = manifest?.changelog || [
    'Améliorations des performances et intégrité du cache de synchronisation',
    'Stabilité renforcée des transactions et de la persistance locale'
  ];

  return (
    <div
      id="version-update-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <motion.div
        id="version-update-modal-container"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  {manifest?.title || 'Nouvelle Version Disponible'}
                </h3>
                {isMandatory ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
                    Obligatoire
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider">
                    Recommandée
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pâtisserie le Délice • Mise à jour logicielle
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar text-slate-300">
          {/* Version Transition Badge */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Version Installée
              </span>
              <div className="text-sm font-mono font-bold text-slate-300">
                v{localVersion}
              </div>
            </div>

            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-end gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> Nouvelle Version
              </span>
              <div className="text-sm font-mono font-black text-emerald-300">
                v{remoteVersion}
              </div>
            </div>
          </div>

          {/* Migration Status Notice if migrations were applied */}
          {migrationsApplied.length > 0 && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Migrations de données et caches exécutées</span>
              </div>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Les structures de données locales ont été automatiquement ajustées pour garantir l'intégrité de vos stocks et recettes ({migrationsApplied.join(', ')}).
              </p>
            </div>
          )}

          {/* Changelog Highlights */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Nouveautés & Corrections :
            </div>
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              {changelog.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Release Date info */}
          {manifest?.releasedAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Publiée le {new Date(manifest.releasedAt).toLocaleDateString('fr-FR')}</span>
            </div>
          )}

          {isMandatory && (
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl text-[11px] text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                Cette mise à jour inclut des modifications critiques de synchronisation et requiert un rechargement immédiat de l'application.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          {!isMandatory && (
            <button
              id="btn-version-update-later"
              onClick={handleDismiss}
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors min-h-[40px] disabled:opacity-50"
            >
              Plus tard
            </button>
          )}

          <button
            id="btn-version-update-confirm"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[40px] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Mise à jour en cours...' : 'Actualiser l\'Application'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
