import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import frTranslation from './fr.json';
import arTranslation from './ar.json';

export type AppLanguage = 'fr' | 'ar';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGE_STORAGE_KEY = 'delice_app_language';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'fr',
    label: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr'
  },
  {
    code: 'ar',
    label: 'Arabe',
    nativeName: 'العربية',
    flag: '🇩🇿',
    dir: 'rtl'
  }
];

export const resources = {
  fr: {
    translation: frTranslation
  },
  ar: {
    translation: arTranslation
  }
} as const;

/**
 * Retrieve user's preferred language from localStorage with fallback to French ('fr')
 */
export function getStoredLanguage(): AppLanguage {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null;
      if (stored === 'fr' || stored === 'ar') {
        return stored;
      }
    }
  } catch (err) {
    console.warn('[i18n] Error reading language from localStorage:', err);
  }
  return 'fr';
}

/**
 * Dynamically adjusts document direction and lang attributes (LTR vs RTL)
 */
export function applyDirection(lang: AppLanguage): void {
  if (typeof document === 'undefined') return;

  const isRtl = lang === 'ar';
  const html = document.documentElement;
  const body = document.body;

  html.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  html.setAttribute('lang', lang);

  if (body) {
    body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    if (isRtl) {
      body.classList.add('rtl-mode');
    } else {
      body.classList.remove('rtl-mode');
    }
  }
}

/**
 * Changes active language, saves preference to localStorage, and switches text direction
 */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  try {
    await i18n.changeLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
    applyDirection(lang);
    
    // Dispatch custom event for non-React listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('delice:languageChanged', { detail: { language: lang } }));
    }
  } catch (err) {
    console.error('[i18n] Failed to switch language:', err);
  }
}

const initialLang = getStoredLanguage();

// Initialize document text direction immediately
applyDirection(initialLang);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
