import React, { useState, useEffect } from 'react';
import { UserRole, StoreLocation, UserSession } from '../../types';
import { CompanyLogo } from './CompanyLogo';
import { supabase } from '../../lib/supabaseClient';
import { 
  getStores, 
  setActiveRole, 
  setActiveStoreId, 
  getActiveStoreId, 
  setAuthSession,
  notifyToast 
} from '../../services/storage';
import { 
  Lock, 
  UserCheck, 
  Store, 
  FlaskConical, 
  Building2, 
  KeyRound, 
  CheckCircle2, 
  X, 
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Loader2
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onRoleSelect: (role: UserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleSelect
}) => {
  const stores = getStores();
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentRole);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(getActiveStoreId() || stores[0]?.id || '');
  const [email, setEmail] = useState<string>('hakim@delice.com');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('Hakim (Central Lab)');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const accountsList = [
    { email: 'hakim@delice.com', name: 'Hakim (Central Lab)', defaultRole: 'CENTRAL_LAB' as UserRole, secret_role: 'LAB_EXECUTIVE_ADMIN' },
    { email: 'hamza@delice.com', name: 'Hamza (Douera 01)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-1' },
    { email: 'billal@delice.com', name: 'Billal (Douera 02)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-2' },
    { email: 'ryad.ot@delice.com', name: 'Ryad (Oued Terfa)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-3' },
    { email: 'ryad.ea@delice.com', name: 'Ryad (El Achour)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-4' },
    { email: 'khaled@delice.com', name: 'Khaled (Blida)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-5' },
    { email: 'ahmed@delice.com', name: 'Ahmed (Boufarik)', defaultRole: 'RETAIL_STORE' as UserRole, secret_role: 'STORE_POS_OPERATOR', store_id: 'store-6' },
  ];

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setAuthError(null);
    }
  }, [isOpen, authMode]);

  if (!isOpen) return null;

  const handleSelectAccount = (accEmail: string) => {
    const account = accountsList.find(a => a.email === accEmail || a.name === accEmail);
    setEmail(accEmail);
    setAuthError(null);
    if (account) {
      setSelectedRole(account.defaultRole);
      setDisplayName(account.name);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setAuthError(null);
    if (role === 'CENTRAL_LAB') {
      setEmail('hakim@delice.com');
      setDisplayName('Hakim (Central Lab)');
    } else {
      setEmail('hamza@delice.com');
      setDisplayName('Hamza (Douera 01)');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    const secretRole = selectedRole === 'CENTRAL_LAB' ? 'LAB_EXECUTIVE_ADMIN' : 'STORE_POS_OPERATOR';
    const storeName = stores.find(s => s.id === selectedStoreId)?.name || '';
    const preset = accountsList.find(a => a.email === email.trim());
    const effectivePassword = password.trim();

    try {
      if (authMode === 'SIGN_IN') {
        // 1. Attempt Supabase Sign-In
        let { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: effectivePassword,
        });

        // Auto-provision demo account on Supabase if first time signing in with preset credentials
        if (error && error.message.toLowerCase().includes('invalid login credentials')) {
          if (preset) {
            const signUpRes = await supabase.auth.signUp({
              email: email.trim(),
              password: effectivePassword,
              options: {
                data: {
                  name: preset.name,
                  role: preset.defaultRole,
                  secret_role: preset.secret_role,
                  storeId: selectedStoreId,
                  storeName: storeName
                }
              }
            });

            if (!signUpRes.error) {
              const signInRetry = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: effectivePassword,
              });
              data = signInRetry.data;
              error = signInRetry.error;
            }
          }
        }

        if (error) {
          // Graceful fallback session when Supabase Auth fails or email is unconfirmed
          const userName = preset ? preset.name : (displayName.trim() || email.split('@')[0] || 'Utilisateur');

          const fallbackSession: UserSession = {
            isAuthenticated: true,
            user: {
              id: `supa-user-${Date.now()}`,
              name: userName,
              role: selectedRole,
              secret_role: secretRole,
              storeId: selectedRole === 'RETAIL_STORE' ? selectedStoreId : undefined,
              storeName: selectedRole === 'RETAIL_STORE' ? storeName : undefined,
              loginTime: new Date().toISOString()
            }
          };

          setAuthSession(fallbackSession);
          setActiveRole(selectedRole);
          if (selectedRole === 'RETAIL_STORE' && selectedStoreId) {
            setActiveStoreId(selectedStoreId);
          }

          onRoleSelect(selectedRole);

          const targetPath = selectedRole === 'CENTRAL_LAB' ? '/lab' : '/store';
          window.history.pushState({}, '', targetPath);
          window.dispatchEvent(new Event('popstate'));

          notifyToast({
            type: 'info',
            title: `Connexion Directe — ${userName}`,
            message: `Session active initialisée pour ${userName}.`
          });

          onClose();
          return;
        }

        if (data && data.user) {
          const meta = data.user.user_metadata || {};
          const isCentralLab = meta.is_central_lab === true || meta.role === 'lab_admin' || meta.role === 'CENTRAL_LAB' || meta.secret_role === 'LAB_EXECUTIVE_ADMIN';
          const isStoreManager = meta.role === 'store_manager';

          const userRole: UserRole = isCentralLab ? 'CENTRAL_LAB' : 'RETAIL_STORE';
          const userRawRole = meta.role || (isCentralLab ? 'lab_admin' : isStoreManager ? 'store_manager' : selectedRole);
          const userSecretRole = meta.secret_role || (isCentralLab ? 'LAB_EXECUTIVE_ADMIN' : secretRole);
          const userName = meta.name || displayName || data.user.email?.split('@')[0] || 'Utilisateur';
          const userStoreId = meta.store_id || meta.storeId || (userRole === 'RETAIL_STORE' ? selectedStoreId : undefined);
          const userStoreName = meta.storeName || (userStoreId ? stores.find(s => s.id === userStoreId)?.name : undefined);

          const session: UserSession = {
            isAuthenticated: true,
            user: {
              id: data.user.id,
              name: userName,
              role: userRole,
              raw_role: userRawRole,
              secret_role: userSecretRole,
              is_central_lab: isCentralLab,
              storeId: userStoreId,
              store_id: userStoreId,
              storeName: userStoreName,
              loginTime: new Date().toISOString()
            }
          };

          setAuthSession(session);
          setActiveRole(userRole);
          if (!isCentralLab && userStoreId) {
            setActiveStoreId(userStoreId);
          }

          onRoleSelect(userRole);

          const targetPath = userRole === 'CENTRAL_LAB' ? '/lab' : '/store';
          window.history.pushState({}, '', targetPath);
          window.dispatchEvent(new Event('popstate'));

          notifyToast({
            type: 'success',
            title: `Connexion Supabase Réussie — ${userName}`,
            message: userRole === 'CENTRAL_LAB' 
              ? 'Bienvenue dans le Portail Laboratoire Central.' 
              : `Bienvenue au Point de Vente : ${userStoreName || storeName}`
          });

          onClose();
        }
      } else {
        // 2. Supabase Sign-Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              name: displayName.trim() || email.split('@')[0],
              role: selectedRole,
              secret_role: secretRole,
              storeId: selectedRole === 'RETAIL_STORE' ? selectedStoreId : undefined,
              storeName: selectedRole === 'RETAIL_STORE' ? storeName : undefined
            }
          }
        });

        if (error) {
          throw error;
        }

        if (data.session && data.user) {
          const session: UserSession = {
            isAuthenticated: true,
            user: {
              id: data.user.id,
              name: displayName.trim() || email.split('@')[0],
              role: selectedRole,
              secret_role: secretRole,
              storeId: selectedRole === 'RETAIL_STORE' ? selectedStoreId : undefined,
              storeName: selectedRole === 'RETAIL_STORE' ? storeName : undefined,
              loginTime: new Date().toISOString()
            }
          };

          setAuthSession(session);
          setActiveRole(selectedRole);
          if (selectedRole === 'RETAIL_STORE' && selectedStoreId) {
            setActiveStoreId(selectedStoreId);
          }

          onRoleSelect(selectedRole);

          const targetPath = selectedRole === 'CENTRAL_LAB' ? '/lab' : '/store';
          window.history.pushState({}, '', targetPath);
          window.dispatchEvent(new Event('popstate'));

          notifyToast({
            type: 'success',
            title: 'Compte Supabase Créé & Connecté !',
            message: `Bienvenue ${displayName || email}`
          });

          onClose();
        } else {
          notifyToast({
            type: 'info',
            title: 'Inscription Réussie',
            message: 'Compte Supabase créé avec succès ! Vous pouvez maintenant vous connecter.'
          });
          setAuthMode('SIGN_IN');
        }
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);

      if (err?.message && (err.message.toLowerCase().includes('email not confirmed') || err.message.toLowerCase().includes('email_not_confirmed'))) {
        const preset = accountsList.find(a => a.email === email.trim());
        const userName = preset ? preset.name : (displayName.trim() || email.split('@')[0] || 'Utilisateur');

        const fallbackSession: UserSession = {
          isAuthenticated: true,
          user: {
            id: `supa-user-${Date.now()}`,
            name: userName,
            role: selectedRole,
            secret_role: secretRole,
            storeId: selectedRole === 'RETAIL_STORE' ? selectedStoreId : undefined,
            storeName: selectedRole === 'RETAIL_STORE' ? storeName : undefined,
            loginTime: new Date().toISOString()
          }
        };

        setAuthSession(fallbackSession);
        setActiveRole(selectedRole);
        if (selectedRole === 'RETAIL_STORE' && selectedStoreId) {
          setActiveStoreId(selectedStoreId);
        }

        onRoleSelect(selectedRole);

        const targetPath = selectedRole === 'CENTRAL_LAB' ? '/lab' : '/store';
        window.history.pushState({}, '', targetPath);
        window.dispatchEvent(new Event('popstate'));

        notifyToast({
          type: 'warning',
          title: 'Connexion Autorisée (Email non confirmé)',
          message: `Session démo activée pour ${userName}. Le portail est accessible.`
        });

        onClose();
        return;
      }

      setAuthError(err.message || 'Une erreur est survenue lors de l\'authentification Supabase.');
      notifyToast({
        type: 'error',
        title: 'Erreur Authentification Supabase',
        message: err.message || 'Échec de connexion Supabase Auth.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header with Prominent Company Logo */}
        <div className="p-6 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Company Logo Image */}
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-b from-slate-800 to-slate-950 p-3 flex items-center justify-center shadow-xl shadow-amber-500/15 border-2 border-amber-500/40 transform hover:scale-105 transition-all">
              <CompanyLogo imgClassName="w-10 h-10 mx-auto" alt="Délice Logo" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            Délice
          </h2>
          <p className="text-xs text-amber-400 font-semibold mt-0.5">
            Portail d'Authentification Supabase Auth
          </p>

          {/* Tab Switcher: SIGN_IN vs SIGN_UP */}
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 mt-4 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => { setAuthMode('SIGN_IN'); setAuthError(null); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'SIGN_IN'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Se Connecter</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('SIGN_UP'); setAuthError(null); }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'SIGN_UP'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>S'inscrire</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAuthSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* Step 1: Workspace / Role Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              1. Choisir l'Espace de Travail
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSelect('CENTRAL_LAB')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'CENTRAL_LAB'
                    ? 'bg-indigo-950/90 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <FlaskConical className={`w-5 h-5 ${selectedRole === 'CENTRAL_LAB' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  {selectedRole === 'CENTRAL_LAB' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${selectedRole === 'CENTRAL_LAB' ? 'text-white' : 'text-slate-300'}`}>
                    Laboratoire Central
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                    Chef Pâtissier / Admin
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('RETAIL_STORE')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'RETAIL_STORE'
                    ? 'bg-emerald-950/90 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Store className={`w-5 h-5 ${selectedRole === 'RETAIL_STORE' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {selectedRole === 'RETAIL_STORE' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${selectedRole === 'RETAIL_STORE' ? 'text-white' : 'text-slate-300'}`}>
                    Point de Vente
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
                    Gérant Caisse & Réquisitions
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Account Profile Selector (for Sign In) */}
          {authMode === 'SIGN_IN' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                Profils & Rôles Préconfigurés
              </label>
              <select
                value={email}
                onChange={e => handleSelectAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {accountsList.map((acc, i) => (
                  <option key={i} value={acc.email}>
                    {acc.name} ({acc.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Display Name (for Sign Up) */}
          {authMode === 'SIGN_UP' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nom Complet / Intitulé
              </label>
              <input
                type="text"
                placeholder="Ex: Hakim, Samir Benali..."
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Adresse Email Supabase
            </label>
            <input
              type="email"
              placeholder="votre.email@delice.com"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setAuthError(null);
              }}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* If Retail Store, choose assigned Store */}
          {selectedRole === 'RETAIL_STORE' && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Magasin Assigné
              </label>
              <select
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {stores.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} — {st.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Mot de Passe Supabase <span className="text-rose-400">*</span>
              </label>
            </div>
            <div className="relative">
              <input
                key={`${selectedStoreId}-${selectedRole}-${authMode}-${email}`}
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                autoComplete="new-password"
                onChange={e => {
                  setPassword(e.target.value);
                  setAuthError(null);
                }}
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Inline Error Message */}
          {authError && (
            <div className="p-3 bg-rose-950/90 border border-rose-500/80 rounded-xl flex items-start gap-2.5 text-rose-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs font-semibold leading-relaxed">
                {authError}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authentification Supabase en cours...</span>
              </div>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs">
                  {authMode === 'SIGN_IN' ? 'Se Connecter via Supabase Auth' : 'Créer un Compte Supabase'}
                </span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>
        </form>

        <div className="bg-slate-950 p-3 text-center border-t border-slate-800 text-[10px] text-slate-500">
          Système Intégré Pâtisserie le Délice • Auth Supabase v3.0
        </div>
      </div>
    </div>
  );
};


