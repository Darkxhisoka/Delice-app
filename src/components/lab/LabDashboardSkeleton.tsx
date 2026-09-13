import React from 'react';

/**
 * Skeleton Loader for LabDashboard & Executive Central Lab Module.
 * Matches exact geometry, header banner, tab pills, 4 KPI cards, and production/stock split tables.
 */
export const LabDashboardSkeleton: React.FC = () => {
  return (
    <div
      id="lab-dashboard-skeleton"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-pulse select-none pointer-events-none"
      aria-busy="true"
      aria-label="Chargement du laboratoire central..."
    >
      {/* 1. TOP HEADER BANNER SKELETON */}
      <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-indigo-900/40 p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-48 sm:w-60 bg-indigo-500/25 rounded-lg" />
              <div className="h-5 w-24 bg-slate-800 rounded-full" />
              <div className="h-5 w-28 bg-emerald-500/15 rounded-full" />
            </div>
            <div className="h-4 w-72 sm:w-96 bg-slate-800/80 rounded" />
          </div>

          {/* Action Button Skeleton (Chef Voice Notes) */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-44 sm:w-48 bg-amber-400/25 rounded-xl border border-amber-400/30" />
          </div>
        </div>

        {/* 2. DESKTOP HORIZONTAL TAB NAVIGATION SKELETON */}
        <div className="hidden md:flex mt-5 pt-4 border-t border-indigo-900/50 items-center gap-2 overflow-x-hidden">
          <div className="h-9 w-44 bg-amber-400/35 rounded-xl" />
          <div className="h-9 w-40 bg-amber-500/20 rounded-xl" />
          <div className="h-9 w-44 bg-amber-500/20 rounded-xl" />
          <div className="h-9 w-48 bg-indigo-600/30 rounded-xl" />
          <div className="h-9 w-48 bg-indigo-600/30 rounded-xl" />
          <div className="h-9 w-40 bg-slate-800 rounded-xl" />
          <div className="h-9 w-36 bg-amber-500/20 rounded-xl" />
          <div className="h-9 w-36 bg-emerald-500/20 rounded-xl" />
          <div className="h-9 w-32 bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* 3. EXECUTIVE DASHBOARD / PRODUCTION OVERVIEW SKELETON */}
      <div className="space-y-4 sm:space-y-6">
        
        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm flex flex-col justify-between h-28 sm:h-32"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 bg-slate-700 rounded" />
                <div className="w-8 h-8 rounded-xl bg-slate-800" />
              </div>
              <div className="space-y-1">
                <div className="h-7 w-28 bg-slate-700/80 rounded" />
                <div className="h-3 w-36 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* 2-Column Split: Batch Plan / Production Runs (Left) & Raw Materials / POs (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Left Table / Task Plan (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="h-5 w-44 bg-slate-700 rounded" />
                <div className="h-3 w-32 bg-slate-800 rounded" />
              </div>
              <div className="h-8 w-28 bg-amber-500/20 rounded-xl" />
            </div>

            {/* Task list / Batch rows */}
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-700/80 shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-4 w-40 bg-slate-700 rounded" />
                      <div className="h-3 w-28 bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-20 bg-slate-700/80 rounded-lg" />
                    <div className="h-8 w-24 bg-indigo-600/30 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Material Alerts & Stock Health (lg:col-span-5) */}
          <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="h-5 w-40 bg-slate-700 rounded" />
                <div className="h-3 w-28 bg-slate-800 rounded" />
              </div>
              <div className="h-7 w-20 bg-rose-500/20 rounded-lg" />
            </div>

            {/* Material Rows */}
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 bg-slate-700 rounded" />
                    <div className="h-4 w-16 bg-slate-700 rounded" />
                  </div>
                  <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/40 w-2/3 rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs pt-0.5">
                    <div className="h-3 w-20 bg-slate-800 rounded" />
                    <div className="h-3 w-16 bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* 4. MOBILE MATERIAL 3 BOTTOM NAV BAR SKELETON (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-5 h-5 rounded-full bg-slate-800" />
            <div className="w-10 h-2 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};
