import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe, ArrowLeftRight } from 'lucide-react';
import i18n, {
  AppLanguage,
  SUPPORTED_LANGUAGES,
  setAppLanguage
} from '../../i18n';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';

export interface LanguageSwitcherProps {
  /**
   * Presentation style:
   * - 'compact': Side-by-side pill selector (ideal for navbar header)
   * - 'toggle': Single quick-toggle button switching between FR & AR (ideal for mobile headers)
   * - 'segmented': Full-width rich cards with details (ideal for modals & settings)
   * - 'dropdown': Native select / dropdown style
   */
  variant?: 'compact' | 'toggle' | 'segmented' | 'dropdown';
  className?: string;
  onLanguageChanged?: (lang: AppLanguage) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  className = '',
  onLanguageChanged
}) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { triggerClick } = useHapticsAndSound();

  // Determine current active language (fallback to 'fr')
  const activeLanguageCode = (i18nInstance?.language?.startsWith('ar') ? 'ar' : 'fr') as AppLanguage;
  const targetLanguageCode: AppLanguage = activeLanguageCode === 'fr' ? 'ar' : 'fr';
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === activeLanguageCode) || SUPPORTED_LANGUAGES[0];
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguageCode) || SUPPORTED_LANGUAGES[1];

  const handleSelectLanguage = async (lang: AppLanguage) => {
    if (lang === activeLanguageCode) return;
    triggerClick();
    await setAppLanguage(lang);
    if (onLanguageChanged) {
      onLanguageChanged(lang);
    }
  };

  const handleToggleLanguage = async () => {
    triggerClick();
    await setAppLanguage(targetLanguageCode);
    if (onLanguageChanged) {
      onLanguageChanged(targetLanguageCode);
    }
  };

  // 1. Single Quick-Toggle Variant (Ideal for mobile headers and space-constrained bars)
  if (variant === 'toggle') {
    return (
      <button
        type="button"
        id="language-switcher-toggle"
        onClick={handleToggleLanguage}
        className={`min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 active:scale-95 border border-slate-700 hover:border-amber-500/50 text-slate-200 transition-all flex items-center gap-2 shadow-sm cursor-pointer select-none group ${className}`}
        title={`Passer en ${targetLangObj.label} (${targetLangObj.nativeName})`}
        aria-label={`Changer la langue vers ${targetLangObj.label}`}
      >
        <span className="text-base leading-none group-hover:scale-110 transition-transform">
          {currentLangObj.flag}
        </span>
        <span className="text-xs font-black tracking-wider uppercase text-amber-400">
          {activeLanguageCode.toUpperCase()}
        </span>
        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 transition-colors" />
      </button>
    );
  }

  // 2. Compact Pill Variant (Ideal for desktop / tablet header in Navbar)
  if (variant === 'compact') {
    return (
      <div
        id="language-switcher-compact"
        className={`inline-flex items-center p-1 bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 rounded-xl shadow-inner transition-colors ${className}`}
        role="group"
        aria-label="Sélecteur de langue"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = activeLanguageCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              id={`lang-btn-compact-${lang.code}`}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`relative px-2.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer min-h-[34px] select-none ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-bold'
              }`}
              title={lang.label}
              aria-label={`Changer la langue vers ${lang.label}`}
              aria-pressed={isSelected}
            >
              <span className="text-sm leading-none">{lang.flag}</span>
              <span className="text-xs">{lang.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 3. Dropdown Native Style
  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <div className="absolute start-3 pointer-events-none text-slate-400">
          <Globe className="w-4 h-4" />
        </div>
        <select
          id="language-switcher-dropdown"
          value={activeLanguageCode}
          onChange={(e) => handleSelectLanguage(e.target.value as AppLanguage)}
          className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-100 text-xs font-bold rounded-xl ps-9 pe-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
          aria-label={t('common.selectLanguage', 'Sélection de la langue')}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
              {lang.flag} {lang.nativeName} ({lang.label})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // 4. Segmented Rich Cards Variant (Default for Modals and Settings drawer)
  return (
    <div className={`w-full ${className}`}>
      <div
        id="language-switcher-segmented"
        className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-inner"
        role="group"
        aria-label="Sélection de la langue"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = activeLanguageCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              id={`lang-btn-${lang.code}`}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`relative flex items-center justify-between px-4 py-3 rounded-xl transition-all border cursor-pointer select-none text-start ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-amber-500/60 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-sm leading-none">
                  {lang.flag}
                </span>
                <div className="flex flex-col">
                  <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                    {lang.nativeName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {lang.label} • {lang.dir.toUpperCase()}
                  </span>
                </div>
              </div>

              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-slate-700/60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
