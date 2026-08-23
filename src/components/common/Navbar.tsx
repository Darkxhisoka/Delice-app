import React, { useState, useEffect } from 'react';
import {
  getActiveRole,
  setActiveRole,
  getActiveStoreId,
  setActiveStoreId,
  getStores,
  getAuthSession,
  logoutUser,
  subscribeToStoreChanges,
  resetToDemoData,
  notifyToast,
  isCentralLabAdmin,
  getActiveViewContext,
  setActiveViewContext
} from '../../services/storage';
import { UserRole, StoreLocation, UserSession } from '../../types';
import { Store, FlaskConical, RotateCcw, Building2, UserCheck, LogOut, ShieldAlert, Menu, X, Search, ChevronDown, Check, Shield, Settings } from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { GlobalSearchBar } from './GlobalSearchBar';
import { LoginModal } from './LoginModal';
import { SettingsModal } from './SettingsModal';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigateToModule?: (moduleName: string, payload?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onRoleChange, onNavigateToModule }) => {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [activeStoreId, setActiveStoreIdState] = useState<string>('');
  const [activeContext, setActiveContextState] = useState<string>(() => getActiveViewContext());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState<boolean>(false);
  const [session, setSessionState] = useState<UserSession>(() => getAuthSession());

  useEffect(() => {
    const updateData = () => {
      setStores(getStores());
      setActiveStoreIdState(getActiveStoreId());
      setActiveContextState(getActiveViewContext());
      setSessionState(getAuthSession());
    };
    updateData();
    return subscribeToStoreChanges(updateData);
  }, []);

  const isCentralAdmin = isCentralLabAdmin(session);

  const handleContextSelect = (contextKey: string) => {
    setIsContextDropdownOpen(false);
    setIsMobileMenuOpen(false);

    if (contextKey === 'LAB-CENTRAL') {
      setActiveViewContext('LAB-CENTRAL');
      onRoleChange('CENTRAL_LAB');
      window.history.pushState({}, '', '/lab');
      window.dispatchEvent(new Event('popstate'));
      notifyToast({
        type: 'info',
        title: 'Contexte : Laboratoire Central',
        message: 'Accès administrateur au Hub de Production Centralisé (MP, COGS, Recettes).'
      });
    } else {
      setActiveViewContext(contextKey);
      const selectedStore = stores.find((s) => s.id === contextKey);
      onRoleChange('RETAIL_STORE');
      window.history.pushState({}, '', '/store');
      window.dispatchEvent(new Event('popstate'));
      notifyToast({
        type: 'info',
        title: `Contexte Activé : ${selectedStore?.name || 'Magasin'}`,
        message: `Session magasin active pour ${selectedStore?.name}. Votre compte Admin conserve ses accès.`
      });
    }
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStoreId = e.target.value;
    handleContextSelect(newStoreId);
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    setIsContextDropdownOpen(false);
    logoutUser();
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new Event('popstate'));
    setIsLoginModalOpen(true);
  };

  const handleReset = () => {
    if (window.confirm('Réinitialiser tous les stocks, réceptions et réquisitions aux données de démonstration ?')) {
      resetToDemoData();
      setIsMobileMenuOpen(false);
      setIsContextDropdownOpen(false);
      notifyToast({
        type: 'warning',
        title: 'Réinitialisation effectuée',
        message: 'Toutes les données de démonstration ont été restaurées.',
      });
    }
  };

  const currentActiveStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            
            {/* Logo & Brand: Minimal Bakery Icon & strictly "Délice" title */}
            <div 
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer group select-none min-h-[44px] py-1"
              title="Cliquer pour ouvrir l'espace de connexion Délice"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-500/40 p-1.5 flex items-center justify-center shadow-md shadow-amber-500/10 group-hover:border-amber-400 group-hover:scale-105 group-hover:shadow-amber-500/25 transition-all shrink-0">
                <CompanyLogo imgClassName="w-6 h-6 sm:w-7 sm:h-7" alt="Délice Logo" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-black text-base sm:text-lg lg:text-xl tracking-tight text-white group-hover:text-amber-400 transition-colors">
                    Délice
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20 shrink-0">
                    v2.4
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-slate-400 font-medium leading-none mt-0.5 max-w-[210px] truncate">
                  {isCentralAdmin 
                    ? 'Lab Central & Multi-Boutiques' 
                    : `Boutique : ${currentActiveStore?.name || 'Point de Vente'}`}
                </p>
              </div>
            </div>

            {/* Desktop Search Bar (Centered) */}
            <div className="hidden md:flex flex-1 max-w-md mx-2">
              <GlobalSearchBar onNavigateToModule={onNavigateToModule} />
            </div>

            {/* Visually distinct active facility indicator with subtle pulse animation */}
            <div 
              className={`hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border shadow-sm transition-all select-none ${
                currentRole === 'CENTRAL_LAB'
                  ? 'bg-gradient-to-r from-indigo-950/90 to-slate-900 border-indigo-500/60 text-indigo-100 shadow-indigo-950/50'
                  : 'bg-gradient-to-r from-emerald-950/90 to-slate-900 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50'
              }`}
              title={`Établissement actif : ${currentRole === 'CENTRAL_LAB' ? 'Laboratoire Central (Production)' : currentActiveStore?.name || 'Boutique'}`}
            >
              {/* Subtle Pulsing Beacon Indicator */}
              <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                <span 
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 duration-1000 ${
                    currentRole === 'CENTRAL_LAB' ? 'bg-indigo-400' : 'bg-emerald-400'
                  }`} 
                />
                <span 
                  className={`relative inline-flex rounded-full h-2 w-2 ring-2 ${
                    currentRole === 'CENTRAL_LAB' 
                      ? 'bg-indigo-400 ring-indigo-900' 
                      : 'bg-emerald-400 ring-emerald-900'
                  }`} 
                />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 leading-tight flex items-center gap-1">
                  {currentRole === 'CENTRAL_LAB' ? 'Hub Central' : 'Boutique Active'}
                </span>
                <span className="text-xs font-black tracking-tight text-white flex items-center gap-1 max-w-[180px] truncate">
                  {currentRole === 'CENTRAL_LAB' ? (
                    <>
                      <FlaskConical className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Laboratoire Central</span>
                    </>
                  ) : (
                    <>
                      <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{currentActiveStore?.name || 'Boutique'}</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Desktop Role Switcher & Controls */}
            <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* 1. Global Context Switcher Dropdown (Visible to Admin / Central Lab accounts) */}
              {isCentralAdmin ? (
                <div className="relative">
                  <button
                    onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
                    className="flex items-center gap-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 hover:border-amber-400 rounded-xl px-3 py-1.5 shadow-md transition-all text-left group min-h-[44px]"
                    title="Ouvrir le menu de bascule de contexte (Laboratoire Central ou Magasin)"
                  >
                    <div className="relative">
                      <div className={`p-1.5 rounded-lg border ${currentRole === 'CENTRAL_LAB' ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'}`}>
                        {currentRole === 'CENTRAL_LAB' ? <FlaskConical className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                      </div>
                      {/* Pulse beacon on the button icon */}
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentRole === 'CENTRAL_LAB' ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${currentRole === 'CENTRAL_LAB' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 leading-none flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                        Contexte Admin
                      </span>
                      <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors flex items-center gap-1 max-w-[200px] truncate">
                        {currentRole === 'CENTRAL_LAB' ? 'Central Lab (Production Hub)' : (currentActiveStore?.name || 'Point de Vente')}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isContextDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
                  </button>

                  {/* Context Dropdown Menu */}
                  {isContextDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsContextDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">SÉLECTIONNER UN CONTEXTE</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">Chef / Admin</span>
                        </div>

                        {/* Central Lab Option */}
                        <button
                          onClick={() => handleContextSelect('LAB-CENTRAL')}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border ${
                            currentRole === 'CENTRAL_LAB'
                              ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 shrink-0">
                              <FlaskConical className="w-4 h-4" />
                            </div>
                            <div className="text-left min-w-0">
                              <div className="font-black text-slate-100 truncate">Central Lab (Production Hub)</div>
                              <div className="text-[10px] text-slate-400 font-normal truncate">Gestion globale MP, recettes & COGS</div>
                            </div>
                          </div>
                          {currentRole === 'CENTRAL_LAB' && (
                            <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
                          )}
                        </button>

                        {/* Retail Stores Section */}
                        <div className="pt-1">
                          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Store className="w-3 h-3 text-emerald-400" />
                            Magasins Points de Vente ({stores.length})
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                            {stores.map((s) => {
                              const isSelected = currentRole === 'RETAIL_STORE' && activeStoreId === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleContextSelect(s.id)}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all border ${
                                    isSelected
                                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-sm'
                                      : 'bg-slate-900/40 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`p-1.5 rounded-lg border shrink-0 ${isSelected ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                      <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left min-w-0 truncate">
                                      <div className="font-bold truncate text-slate-200">{s.name}</div>
                                      <div className="text-[10px] text-slate-400 font-normal truncate">{s.address}</div>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* Standard Store View (Store Manager - Locked to Assigned Store) */
                <div className="hidden lg:flex items-center gap-2.5 bg-slate-900 border border-emerald-500/50 rounded-xl px-3.5 py-1.5 shadow-sm">
                  <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 duration-1000" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-2 ring-emerald-900" />
                  </div>
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-tight">Magasin Assigné</span>
                    <span className="text-xs font-black text-emerald-300">
                      {currentActiveStore?.name || 'Point de Vente'}
                    </span>
                  </div>
                  <span className="ml-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 font-extrabold">
                    Actif
                  </span>
                </div>
              )}

              {/* Active User Session & Open Login Modal */}
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Afficher la session active"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {session?.user?.name || 'Session'}
                </span>
              </button>

              {/* Settings & Manual Sync Trigger Button */}
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl transition-all shadow-sm group"
                title="Paramètres de synchronisation et gestion des stocks"
              >
                <Settings className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-transform group-hover:rotate-45 duration-200" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Déconnexion et clôture de la session"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Déconnexion</span>
              </button>

              {/* Reset Demo Data Button */}
              <button
                onClick={handleReset}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
                title="Réinitialiser les données de démonstration"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Menu Toggle (< 768px) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-2.5 py-1.5 min-h-[44px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="max-w-[70px] truncate">{session?.user?.name?.split(' ')[0] || 'User'}</span>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2.5 min-h-[44px] min-w-[44px] text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 flex items-center justify-center"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-slate-200" />}
              </button>
            </div>

          </div>
        </div>

        {/* Collapsible Mobile Drawer Navigation (< 768px) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-4 space-y-4 animate-in slide-in-from-top duration-200">
            {/* Mobile Active Facility Indicator */}
            <div className={`p-3 rounded-xl border flex items-center justify-between shadow-sm ${
              currentRole === 'CENTRAL_LAB'
                ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-100'
                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 duration-1000 ${
                    currentRole === 'CENTRAL_LAB' ? 'bg-indigo-400' : 'bg-emerald-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ring-2 ${
                    currentRole === 'CENTRAL_LAB' ? 'bg-indigo-400 ring-indigo-900' : 'bg-emerald-400 ring-emerald-900'
                  }`} />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block leading-tight">
                    Établissement Actif
                  </span>
                  <span className="text-xs font-black text-white flex items-center gap-1">
                    {currentRole === 'CENTRAL_LAB' ? (
                      <>
                        <FlaskConical className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Laboratoire Central</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{currentActiveStore?.name || 'Point de Vente'}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                currentRole === 'CENTRAL_LAB'
                  ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60'
                  : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
              }`}>
                En Ligne
              </span>
            </div>

            {/* Global Search Bar in Drawer */}
            <div>
              <GlobalSearchBar onNavigateToModule={(mod, payload) => {
                setIsMobileMenuOpen(false);
                if (onNavigateToModule) onNavigateToModule(mod, payload);
              }} />
            </div>

            {/* Mobile Context Switcher for Admin or Store Staff */}
            {isCentralAdmin ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Contexte d'Accès Admin
                </span>
                
                {/* Central Lab Option */}
                <button
                  onClick={() => handleContextSelect('LAB-CENTRAL')}
                  className={`w-full p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border ${
                    currentRole === 'CENTRAL_LAB' 
                      ? 'bg-indigo-950 border-indigo-500 text-indigo-200' 
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-indigo-400" />
                    <span>Central Lab (Production Hub)</span>
                  </div>
                  {currentRole === 'CENTRAL_LAB' && <Check className="w-4 h-4 text-indigo-400" />}
                </button>

                {/* Store list */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold px-1">Choisir un Magasin Retail</span>
                  {stores.map((s) => {
                    const isSelected = currentRole === 'RETAIL_STORE' && activeStoreId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleContextSelect(s.id)}
                        className={`w-full p-2 rounded-lg text-xs font-semibold flex items-center justify-between border ${
                          isSelected 
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-200' 
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium uppercase block">Magasin Assigné</span>
                    <span className="text-sm font-bold text-emerald-300">{currentActiveStore?.name || 'Point de Vente'}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-700">
                  Verrouillé
                </span>
              </div>
            )}

            {/* Mobile Actions: Settings, Logout & Reset */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSettingsModalOpen(true);
                }}
                className="flex-1 min-h-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Paramètres & Sync</span>
              </button>

              <button
                onClick={handleLogout}
                className="min-h-[44px] px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Sortir</span>
              </button>

              <button
                onClick={handleReset}
                className="p-3 min-h-[44px] min-w-[44px] bg-slate-900 text-slate-400 hover:text-amber-400 border border-slate-800 rounded-xl flex items-center justify-center"
                title="Réinitialiser la démo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Login & Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentRole={currentRole}
        onRoleSelect={(role) => {
          onRoleChange(role);
        }}
      />

      {/* Dedicated Settings & Inventory Sync Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
};



