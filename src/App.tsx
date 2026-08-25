import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/common/Navbar';
import { ToastContainer } from './components/common/ToastContainer';
import { LabAssistantChatbot } from './components/common/LabAssistantChatbot';
import { OfflineStatusBanner } from './components/common/OfflineStatusBanner';
import { StoreDashboard } from './components/store/StoreDashboard';
import { LabDashboard } from './components/lab/LabDashboard';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginModal } from './components/common/LoginModal';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initBackgroundSync } from './services/backgroundSync';
import { useDesktopShortcuts } from './hooks/useDesktopShortcuts';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { initPersistentStorage } from './db/database';
import { supabase } from './lib/supabaseClient';
import { subscribeToSupabaseRealtime } from './services/supabaseService';
import { 
  getActiveRole, 
  getAuthSession, 
  setAuthSession,
  setActiveStoreId,
  subscribeToStoreChanges, 
  notifyToast 
} from './services/storage';
import { UserRole, UserSession } from './types';

export default function App() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [session, setSession] = useState<UserSession>(() => getAuthSession());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => getActiveRole());
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '') {
      return getActiveRole() === 'CENTRAL_LAB' ? '/lab' : '/store';
    }
    return path;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Global Android Hardware / Gesture Back Button Handling
  useAndroidBackButton({
    canExitApp: true
  });

  // Global desktop keyboard shortcuts (Ctrl+N, Ctrl+F, Esc, Ctrl+P)
  useDesktopShortcuts({
    onCloseModals: () => setIsLoginModalOpen(false)
  });

  useEffect(() => {
    // 0. Initialize persistent storage (prevents Android WebView cache purge) & background sync
    initPersistentStorage().catch((err) => console.warn('Persistent storage init note:', err));
    initBackgroundSync();

    // Notify Capgo update engine of successful boot
    (async () => {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        await CapacitorUpdater.notifyAppReady();
      } catch {
        // Non-Capacitor environment safe fallback
      }
    })();

    // 1. Check Supabase Auth active session on mount & initial app readiness
    const initApp = async () => {
      try {
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user) {
          const meta = supaSession.user.user_metadata || {};
          const isCentralLab = meta.is_central_lab === true || meta.role === 'lab_admin' || meta.role === 'CENTRAL_LAB' || meta.secret_role === 'LAB_EXECUTIVE_ADMIN';
          const role: UserRole = isCentralLab ? 'CENTRAL_LAB' : 'RETAIL_STORE';
          const secretRole = meta.secret_role || (role === 'CENTRAL_LAB' ? 'LAB_EXECUTIVE_ADMIN' : 'STORE_POS_OPERATOR');
          const storeId = meta.store_id || meta.storeId;

          const activeSession: UserSession = {
            isAuthenticated: true,
            user: {
              id: supaSession.user.id,
              name: meta.name || supaSession.user.email?.split('@')[0] || 'Utilisateur',
              role,
              raw_role: meta.role,
              secret_role: secretRole,
              is_central_lab: isCentralLab,
              storeId: storeId,
              store_id: storeId,
              storeName: meta.storeName,
              loginTime: new Date().toISOString()
            }
          };
          setAuthSession(activeSession);
          if (!isCentralLab && storeId) {
            setActiveStoreId(storeId);
          }
        }
      } catch (err) {
        console.warn('Initial session lookup note:', err);
      } finally {
        // Smooth graceful transition
        setTimeout(() => {
          setIsInitializing(false);
        }, 650);
      }
    };

    initApp();

    // 2. Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      if (supaSession?.user) {
        const meta = supaSession.user.user_metadata || {};
        const isCentralLab = meta.is_central_lab === true || meta.role === 'lab_admin' || meta.role === 'CENTRAL_LAB' || meta.secret_role === 'LAB_EXECUTIVE_ADMIN';
        const role: UserRole = isCentralLab ? 'CENTRAL_LAB' : 'RETAIL_STORE';
        const secretRole = meta.secret_role || (role === 'CENTRAL_LAB' ? 'LAB_EXECUTIVE_ADMIN' : 'STORE_POS_OPERATOR');
        const storeId = meta.store_id || meta.storeId;

        const activeSession: UserSession = {
          isAuthenticated: true,
          user: {
            id: supaSession.user.id,
            name: meta.name || supaSession.user.email?.split('@')[0] || 'Utilisateur',
            role,
            raw_role: meta.role,
            secret_role: secretRole,
            is_central_lab: isCentralLab,
            storeId: storeId,
            store_id: storeId,
            storeName: meta.storeName,
            loginTime: new Date().toISOString()
          }
        };
        setAuthSession(activeSession);
        if (!isCentralLab && storeId) {
          setActiveStoreId(storeId);
        }
      } else {
        setAuthSession(null);
      }
    });

    const handleStorageChange = () => {
      const activeSession = getAuthSession();
      setSession(activeSession);
      setCurrentRole(getActiveRole());
    };

    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path.startsWith('/lab')) {
        setCurrentRole('CENTRAL_LAB');
      } else if (path.startsWith('/store')) {
        setCurrentRole('RETAIL_STORE');
      }
    };

    window.addEventListener('popstate', handlePopState);
    const unsubscribe = subscribeToStoreChanges(handleStorageChange);
    const unsubscribeSupabaseRealtime = subscribeToSupabaseRealtime();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
      unsubscribe();
      unsubscribeSupabaseRealtime();
    };
  }, []);

  const handleRedirect = (targetPath: string) => {
    setCurrentPath(targetPath);
    window.history.replaceState({}, '', targetPath);
    if (targetPath.startsWith('/lab')) {
      setCurrentRole('CENTRAL_LAB');
    } else if (targetPath.startsWith('/store')) {
      setCurrentRole('RETAIL_STORE');
    } else if (targetPath === '/login') {
      setIsLoginModalOpen(true);
    }
  };

  const handleNavigateToModule = (moduleName: string, payload?: any) => {
    const labModules = ['INVENTORY', 'RECIPES', 'REQUISITIONS', 'RECEIPT_HISTORY', 'PRODUCTION_RUNNER', 'PRODUCTION_OVERVIEW', 'SUPPLIERS', 'STORES', 'ACTIVITY_LOG'];
    const storeModules = ['POS_SALES', 'UNSOLD_LOGS', 'SALES_ANALYTICS', 'NEW_REQ', 'HISTORY'];

    if (labModules.includes(moduleName)) {
      if (session.user?.role === 'RETAIL_STORE') {
        notifyToast({
          type: 'error',
          title: 'Accès Bloqué',
          message: 'Les fonctionnalités du Laboratoire Central ne sont pas accessibles avec un compte Point de Vente.'
        });
        return;
      }
      setCurrentRole('CENTRAL_LAB');
      handleRedirect('/lab');
    } else if (storeModules.includes(moduleName)) {
      setCurrentRole('RETAIL_STORE');
      handleRedirect('/store');
    }
  };

  const isStoreView = currentRole === 'RETAIL_STORE' || currentPath.startsWith('/store');

  return (
    <ErrorBoundary fallbackTitle="Pâtisserie le Délice - Mode Récupération">
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white overflow-x-hidden">
        {/* Initial App Initialization & Data Fetching Loading Screen */}
        <AnimatePresence>
          {isInitializing && (
            <LoadingScreen key="app-loading-screen" />
          )}
        </AnimatePresence>

        {/* Offline Network Cache Banner */}
        <OfflineStatusBanner />

        {/* Top Navbar with Role Switcher & Context Controls */}
        <Navbar 
          currentRole={currentRole} 
          onRoleChange={(role) => {
            setCurrentRole(role);
            const target = role === 'CENTRAL_LAB' ? '/lab' : '/store';
            handleRedirect(target);
          }} 
          onNavigateToModule={handleNavigateToModule}
        />

        {/* Protected Main Router */}
        <main className="flex-1 pb-12 relative">
          <ProtectedRoute
            session={session}
            currentPath={currentPath}
            allowedRole={currentPath.startsWith('/lab') ? 'CENTRAL_LAB' : undefined}
            onRedirect={handleRedirect}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isStoreView ? 'STORE' : 'LAB'}
                initial={{ opacity: 0, y: 12, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {isStoreView ? <StoreDashboard /> : <LabDashboard />}
              </motion.div>
            </AnimatePresence>
          </ProtectedRoute>
        </main>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200">Pâtisserie le Délice</span>
              <span>•</span>
              <span>6 Points de Vente & Unité de Production Centralisée</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Session Active : </span>
              <strong className="text-amber-400 font-mono">
                {session?.user?.name || 'Inconnue'} ({session?.user?.role === 'RETAIL_STORE' ? 'MAGASIN /store' : 'LABO /lab'})
              </strong>
            </div>
          </div>
        </footer>

        {/* Login Screen Modal overlay when /login is triggered or requested */}
        <LoginModal
          isOpen={isLoginModalOpen || currentPath === '/login'}
          onClose={() => setIsLoginModalOpen(false)}
          currentRole={currentRole}
          onRoleSelect={(role) => {
            setCurrentRole(role);
            const path = role === 'CENTRAL_LAB' ? '/lab' : '/store';
            handleRedirect(path);
            setIsLoginModalOpen(false);
          }}
        />

        {/* Global Toast Container & AI Assistant Chatbot */}
        <ToastContainer />
        <LabAssistantChatbot />
      </div>
    </ErrorBoundary>
  );
}
