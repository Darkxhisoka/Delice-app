import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ogwvpnhhxtjzdebyfeem.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uBrh_mcJmhQGUJoVqFyKrg_g-kwLtCY';

// Force live production database mode by default across Electron & Mobile
export const isDemoMode = false;
export const useMockData = false;

export const getSecretRole = (): string => {
  try {
    const sessionStr = localStorage.getItem('delice_session');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      if (parsed?.user?.secret_role) {
        return parsed.user.secret_role;
      }
    }
  } catch (e) {
    // fallback
  }
  return 'LAB_EXECUTIVE_ADMIN';
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-secret-role': getSecretRole(),
    },
  },
});


