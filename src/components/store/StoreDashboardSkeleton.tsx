import React from 'react';

/**
 * Skeleton Loader for StoreDashboard & POS Retail Sales View.
 * Matches exact geometry, header banner, tab pills, product grid, and cart panel.
 */
export const StoreDashboardSkeleton: React.FC = () => {
  return (
    <div
      id="store-dashboard-skeleton"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8 space-y-4 sm:space-y-6 pb-28 md:pb-8 animate-pulse select-none pointer-events-none"
      aria-busy="true"
      aria-label="Chargement de l'espace boutique..."
    >
      {/* 1. TOP HEADER BANNER SKELETON */}
      <div className="bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-36 sm:w-48 bg-amber-500/20 rounded-lg" />
              <div className="h-5 w-24 bg-slate-800 rounded-full" />
              <div className="hidden sm:block h-5 w-28 bg-emerald-500/15 rounded-full" />
            </div>
            <div className="h-4 w-64 sm:w-80 bg-slate-800/80 rounded" />
          </div>

          {/* Store Selector Pill Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-44 sm:w-52 bg-slate-800 rounded-xl border border-slate-700/60" />
            <div className="h-10 w-10 bg-slate-800 rounded-xl border border-slate-700/60" />
          </div>
        </div>

        {/* 2. DESKTOP HORIZONTAL TAB NAVIGATION SKELETON */}
        <div className="hidden md:flex mt-5 pt-4 border-t border-slate-800/80 items-center gap-2 overflow-x-hidden">
          <div className="h-9 w-32 bg-amber-500/30 rounded-lg" />
          <div className="h-9 w-44 bg-pink-500/20 rounded-lg" />
          <div className="h-9 w-40 bg-purple-500/20 rounded-lg" />
          <div className="h-9 w-36 bg-emerald-500/20 rounded-lg" />
          <div className="h-9 w-32 bg-slate-800 rounded-lg" />
          <div className="h-9 w-40 bg-indigo-500/20 rounded-lg" />
          <div className="h-9 w-36 bg-slate-800 rounded-lg" />
          <div className="h-9 w-32 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* 3. MAIN POS VIEW SKELETON (Product Catalog + Cart Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left / Center: Catalog, Filters, and Product Grid (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Search bar & Quick scan row */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
            <div className="h-6 flex-1 bg-slate-100 rounded-md" />
            <div className="h-8 w-24 bg-slate-100 rounded-xl" />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-hidden py-1">
            <div className="h-8 w-20 bg-amber-500/30 rounded-xl shrink-0" />
            <div className="h-8 w-36 bg-slate-200 rounded-xl shrink-0" />
            <div className="h-8 w-32 bg-slate-200 rounded-xl shrink-0" />
            <div className="h-8 w-28 bg-slate-200 rounded-xl shrink-0" />
            <div className="h-8 w-32 bg-slate-200 rounded-xl shrink-0" />
            <div className="h-8 w-24 bg-slate-200 rounded-xl shrink-0" />
          </div>

          {/* Product Cards Grid (2 cols mobile, 3-4 cols desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col justify-between h-48 sm:h-52 space-y-2"
              >
                <div className="w-full h-24 sm:h-28 bg-slate-100 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 left-2 h-4 w-12 bg-slate-200 rounded-full" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="h-5 w-14 bg-amber-100 rounded-md" />
                  <div className="h-7 w-7 bg-amber-500/30 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart & Checkout Summary Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-md flex flex-col h-[520px] sm:h-[620px] justify-between">
          <div className="space-y-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/30" />
                <div className="h-5 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>

            {/* Cart Item Rows */}
            <div className="space-y-3 pt-1">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="space-y-1 flex-1 min-w-0 pr-2">
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-1/3 bg-slate-100 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-slate-200 rounded-lg" />
                    <div className="h-4 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Calculation Lines & Checkout Button */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-slate-200 rounded" />
                <div className="h-3 w-14 bg-slate-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-slate-100 rounded" />
                <div className="h-3 w-10 bg-slate-100 rounded" />
              </div>
              <div className="flex justify-between pt-1">
                <div className="h-5 w-24 bg-slate-300 rounded" />
                <div className="h-5 w-20 bg-amber-500/30 rounded" />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>

            {/* Checkout Action Button */}
            <div className="h-12 w-full bg-amber-500/40 rounded-2xl" />
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
