import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLanguage } from '../i18n';

export interface UseI18nReturn {
  language: AppLanguage;
  isRTL: boolean;
  t: (key: string) => string;
  changeLanguage: (lang: AppLanguage) => void;
}

/**
 * Hook to manage application-wide language and directionality (LTR/RTL)
 * Wrapper around react-i18next's useTranslation
 */
export function useI18n(): UseI18nReturn {
  const { t, i18n } = useTranslation();

  const language = i18n.language as AppLanguage;
  const isRTL = language === 'ar';

  const changeLanguage = useCallback((lang: AppLanguage) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app_lang', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [i18n]);

  return {
    language,
    isRTL,
    t,
    changeLanguage,
  };
}
