import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  ShoppingCart,
  ScanLine,
  Coins,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Layers,
  Radio,
  Sliders,
  RefreshCw,
  MousePointerClick,
  ChevronDown
} from 'lucide-react';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';
import { SoundTheme } from '../../services/soundEffects';

export const SoundHapticsSettingsPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    soundEnabled,
    hapticsEnabled,
    volume,
    soundTheme,
    hardwareStatus,
    setSoundEnabled,
    setHapticsEnabled,
    setVolume,
    setSoundTheme,
    triggerAddCart,
    triggerScanSuccess,
    triggerCheckoutSuccess,
    triggerCoinPayment,
    triggerSuccess,
    triggerSyncComplete,
    triggerMaterialClick,
    triggerMaterialSelection,
    triggerSheetExpand,
    triggerWarning,
    triggerError,
    triggerClick,
    playSound,
  } = useHapticsAndSound();

  const themes: { id: SoundTheme; title: string; desc: string; icon: string }[] = [
    {
      id: 'MODERN',
      title: t('sound.themeModern', 'Moderne & Fluide'),
      desc: t('sound.themeModernDesc', 'Cloches douces & bips haute précision'),
      icon: '✨',
    },
    {
      id: 'CLASSIC_POS',
      title: t('sound.themeClassic', 'Caisse Traditionnelle'),
      desc: t('sound.themeClassicDesc', 'Tiroir-caisse rétro & cliquetis mécanique'),
      icon: '🏪',
    },
    {
      id: 'SUBTLE',
      title: t('sound.themeSubtle', 'Discret & Feutré'),
      desc: t('sound.themeSubtleDesc', 'Micro-clics et tonalités acoustiques basses'),
      icon: '🍃',
    },
  ];

  return (
    <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-6 shadow-inner">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              {t('sound.title', 'Effets Sonores & Retours Haptiques')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('sound.subtitle', 'Retours tactiles natifs (Capacitor) et audio synthétique temps-réel zéro latence')}
            </p>
          </div>
        </div>

        {/* Hardware Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
            hardwareStatus === 'NATIVE_CAPACITOR'
              ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/80'
              : hardwareStatus === 'WEB_VIBRATION'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/80'
              : 'bg-slate-900 text-slate-400 border-slate-700'
          }`}>
            <Smartphone className="w-3 h-3" />
            {hardwareStatus === 'NATIVE_CAPACITOR' && t('sound.hardwareNative', 'Vibreur Natif Android')}
            {hardwareStatus === 'WEB_VIBRATION' && t('sound.hardwareWeb', 'Vibreur Web API')}
            {hardwareStatus === 'UNSUPPORTED' && t('sound.hardwareDesktop', 'Mode Bureau (Audio Seul)')}
          </span>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sound Effects Toggle Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg border ${soundEnabled ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-black text-white">{t('sound.soundEffectsTitle', 'Effets Sonores Caisse & UI')}</div>
                <div className="text-[11px] text-slate-400">{t('sound.soundEffectsDesc', 'Tiroir, scans, ajouts et alertes')}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                soundEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={soundEnabled}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  soundEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-slate-500" /> {t('sound.mainVolume', 'Volume Principal')}
              </span>
              <span className="font-mono font-bold text-amber-400">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              disabled={!soundEnabled}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-40"
            />
          </div>
        </div>

        {/* Haptics Feedback Toggle Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg border ${hapticsEnabled ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-white">{t('sound.hapticsTitle', 'Retours Tactiles Haptiques')}</div>
                <div className="text-[11px] text-slate-400">{t('sound.hapticsDesc', 'Vibrations physiques sur touches et scans')}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHapticsEnabled(!hapticsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                hapticsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={hapticsEnabled}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hapticsEnabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{t('sound.adaptiveIntensity', 'Intensité intelligente adaptative')}</span>
            <span className="text-indigo-300 font-semibold">{t('sound.intensityLevels', 'Légère • Moyenne • Succès')}</span>
          </div>
        </div>
      </div>

      {/* Sound Profiles / Themes */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {t('sound.soundProfileTitle', 'Profil Sonore de la Caisse')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {themes.map((themeItem) => {
            const isSelected = soundTheme === themeItem.id;
            return (
              <button
                key={themeItem.id}
                type="button"
                onClick={() => setSoundTheme(themeItem.id)}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-md shadow-amber-950/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{themeItem.icon}</span>
                  <span className="text-xs font-black">{themeItem.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{themeItem.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Sound & Haptic Test Bench */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-emerald-400" /> {t('sound.testBenchTitle', 'Banc de Test Interactif')}
          </div>
          <span className="text-[10px] text-slate-500">{t('sound.testBenchDesc', 'Cliquez pour tester son + vibration')}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={triggerCheckoutSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testCashDrawer', 'Tiroir Caisse')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testCashDrawerDesc', 'Encaissement / Vente')}</div>
          </button>

          <button
            type="button"
            onClick={triggerScanSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testScanner', 'Bip Scanner')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testScannerDesc', 'Scan Code-Barres')}</div>
          </button>

          <button
            type="button"
            onClick={triggerAddCart}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testAddCart', 'Ajout Panier')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testAddCartDesc', 'Sélection pâtisserie')}</div>
          </button>

          <button
            type="button"
            onClick={triggerCoinPayment}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testCoins', 'Monnaie Pièces')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testCoinsDesc', 'Appoint espèces')}</div>
          </button>

          <button
            type="button"
            onClick={triggerSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testSuccess', 'Accord / Succès')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testSuccessDesc', 'Validation commande')}</div>
          </button>

          <button
            type="button"
            onClick={triggerWarning}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testWarning', 'Avertissement')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testWarningDesc', 'Stock faible / alerte')}</div>
          </button>

          <button
            type="button"
            onClick={triggerError}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testError', 'Erreur Buzz')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testErrorDesc', 'Refus transaction')}</div>
          </button>

          <button
            type="button"
            onClick={triggerSyncComplete}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testSync', 'Sync Complete')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testSyncDesc', 'Cloche synchronisation')}</div>
          </button>

          <button
            type="button"
            onClick={triggerMaterialClick}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testMaterialClick', 'Material Click')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testMaterialClickDesc', 'Bouton discret UI')}</div>
          </button>

          <button
            type="button"
            onClick={triggerMaterialSelection}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testTabSelect', 'Sélection Onglet')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testTabSelectDesc', 'Pill / switch tactiles')}</div>
          </button>

          <button
            type="button"
            onClick={triggerSheetExpand}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testModalExpand', 'Modal Expand')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testModalExpandDesc', 'Ouverture volet')}</div>
          </button>

          <button
            type="button"
            onClick={triggerClick}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-400/50 rounded-xl text-start transition-all active:scale-95 group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-bold text-slate-200">{t('sound.testKeyClick', 'Clic Touche')}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('sound.testKeyClickDesc', 'Navigation clavier')}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
