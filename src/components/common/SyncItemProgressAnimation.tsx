import React from 'react';
import { Database, Cloud, Sparkles, RefreshCw, Check, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

/**
 * Lottie-style animated Data Stream Vector
 * Depicts data packets flowing from local IndexedDB storage to Cloud Firebase / Supabase
 */
export const SyncLottieDataFlow: React.FC<{
  currentStep?: string;
  className?: string;
}> = ({
  currentStep = 'Réplication Firebase Firestore',
  className = ''
}) => {
  return (
    <div className={`p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-indigo-500/15 to-amber-500/10 border border-amber-500/30 overflow-hidden relative ${className}`}>
      {/* Background Animated Shimmer Layer */}
      <div className="absolute inset-0 animate-sync-shimmer opacity-40 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Source node (IndexedDB) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/20">
            <Database className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold block leading-none">
              Source
            </span>
            <span className="text-xs font-semibold text-slate-200">
              IndexedDB
            </span>
          </div>
        </div>

        {/* Center: Animated Flow Stream Channel */}
        <div className="flex-1 w-full sm:w-auto px-2 flex flex-col items-center justify-center">
          {/* Flow track with moving light packets */}
          <div className="w-full relative h-2.5 bg-slate-950/80 rounded-full border border-slate-700/80 overflow-hidden flex items-center">
            {/* Ambient track beam */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/30 via-indigo-500/40 to-emerald-500/30" />
            
            {/* Packet 1 */}
            <div className="absolute top-0.5 bottom-0.5 w-4 rounded-full bg-gradient-to-r from-amber-300 to-amber-100 shadow-xs shadow-amber-300 animate-sync-packet-1" />
            {/* Packet 2 */}
            <div className="absolute top-0.5 bottom-0.5 w-4 rounded-full bg-gradient-to-r from-indigo-300 to-indigo-100 shadow-xs shadow-indigo-300 animate-sync-packet-2" />
            {/* Packet 3 */}
            <div className="absolute top-0.5 bottom-0.5 w-4 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-100 shadow-xs shadow-emerald-300 animate-sync-packet-3" />
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-300/90 font-medium">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{currentStep}</span>
          </div>
        </div>

        {/* Right: Target node (Firebase Firestore & Supabase) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold block leading-none">
              Cible
            </span>
            <span className="text-xs font-semibold text-slate-200">
              Firebase & Cloud
            </span>
          </div>
          <div className="relative w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-400 shadow-sm shadow-indigo-500/20">
            <Cloud className="w-4 h-4" />
            <Flame className="w-2.5 h-2.5 text-amber-400 absolute -bottom-1 -right-1" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Animated SVG Radar Pulse Icon Wrapper
 * Surrounds the active item's icon with glowing, expanding radar waves
 */
export const SyncProcessingRadarIcon: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Wave 1 */}
      <span className="absolute inset-0 rounded-xl bg-amber-400/30 animate-sync-radar pointer-events-none" />
      {/* Wave 2 */}
      <span className="absolute inset-0 rounded-xl bg-indigo-500/30 animate-sync-radar pointer-events-none" style={{ animationDelay: '0.9s' }} />
      {/* Inner Icon */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

/**
 * Animated Active Status Badge
 * Rotating dual-ring spinner with lively status message
 */
export const SyncActiveBadge: React.FC<{
  label?: string;
  step?: string;
}> = ({
  label = 'En cours de traitement...',
  step
}) => {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10 backdrop-blur-xs">
      <div className="relative w-3.5 h-3.5 flex items-center justify-center">
        {/* Circular SVG Dash Spinner */}
        <svg className="w-3.5 h-3.5 animate-android-spin" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <path
            className="opacity-90 text-amber-400"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold tracking-tight text-white animate-pulse">
          {label}
        </span>
        {step && (
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
            {step}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Top Card Shimmer Border Strip
 * Positioned at top of currently processed list item
 */
export const SyncCardShimmerBorder: React.FC = () => {
  return (
    <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden z-20">
      <div className="w-full h-full animate-sync-shimmer" />
    </div>
  );
};

/**
 * Mini In-Card Sub-Step Pipeline Tracker
 */
export const SyncItemStepPipeline: React.FC<{
  stage?: 'STARTING' | 'SYNCING' | 'VALIDATING' | 'SYNCED' | 'FAILED';
}> = ({ stage = 'SYNCING' }) => {
  const steps = [
    { id: '1', name: 'IndexedDB', icon: Database, active: true },
    { id: '2', name: 'Checksum', icon: ShieldCheck, active: stage !== 'STARTING' },
    { id: '3', name: 'Firestore Cloud', icon: Cloud, active: stage === 'SYNCING' || stage === 'VALIDATING' || stage === 'SYNCED' },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 pt-2 border-t border-amber-500/20 text-[10px]">
      <span className="text-slate-400 font-medium">Pipeline :</span>
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono ${
                s.active
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}>
                <Icon className="w-2.5 h-2.5" />
                <span>{s.name}</span>
              </span>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-2.5 h-2.5 text-amber-500/50" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
