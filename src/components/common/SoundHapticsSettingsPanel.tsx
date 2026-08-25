import React from 'react';
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
      title: 'Moderne & Fluide',
      desc: 'Cloches douces & bips haute précision',
      icon: '✨',
    },
    {
      id: 'CLASSIC_POS',
      title: 'Caisse Traditionnelle',
      desc: 'Tiroir-caisse rétro & cliquetis mécanique',
      icon: '🏪',
    },
    {
      id: 'SUBTLE',
      title: 'Discret & Feutré',
      desc: 'Micro-clics et tonalités acoustiques basses',
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
              Effets Sonores & Retours Haptiques
            </h3>
            <p className="text-xs text-slate-400">
              Retours tactiles natifs (Capacitor) et audio synthétique temps-réel zéro latence
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
            {hardwareStatus === 'NATIVE_CAPACITOR' && 'Vibreur Natif Android'}
            {hardwareStatus === 'WEB_VIBRATION' && 'Vibreur Web API'}
            {hardwareStatus === 'UNSUPPORTED' && 'Mode Bureau (Audio Seul)'}
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
                <div className="text-xs font-black text-white">Effets Sonores Caisse & UI</div>
                <div className="text-[11px] text-slate-400">Tiroir, scans, ajouts et alertes</div>
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
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-slate-500" /> Volume Principal
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
                <div className="text-xs font-black text-white">Retours Tactiles Haptiques</div>
                <div className="text-[11px] text-slate-400">Vibrations physiques sur touches et scans</div>
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
                  hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Intensité intelligente adaptative</span>
            <span className="text-indigo-300 font-semibold">Légère • Moyenne • Succès</span>
          </div>
        </div>
      </div>

      {/* Sound Profiles / Themes */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Profil Sonore de la Caisse
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {themes.map((t) => {
            const isSelected = soundTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSoundTheme(t.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/60 text-white shadow-md shadow-amber-950/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{t.icon}</span>
                  <span className="text-xs font-black">{t.title}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Sound & Haptic Test Bench */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-emerald-400" /> Banc de Test Interactif
          </div>
          <span className="text-[10px] text-slate-500">Cliquez pour tester son + vibration</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={triggerCheckoutSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Tiroir Caisse</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Encaissement / Vente</div>
          </button>

          <button
            type="button"
            onClick={triggerScanSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Bip Scanner</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Scan Code-Barres</div>
          </button>

          <button
            type="button"
            onClick={triggerAddCart}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Ajout Panier</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sélection pâtisserie</div>
          </button>

          <button
            type="button"
            onClick={triggerCoinPayment}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Monnaie Pièces</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Appoint espèces</div>
          </button>

          <button
            type="button"
            onClick={triggerSuccess}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Accord / Succès</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Validation commande</div>
          </button>

          <button
            type="button"
            onClick={triggerWarning}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Avertissement</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stock faible / alerte</div>
          </button>

          <button
            type="button"
            onClick={triggerError}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Erreur Buzz</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Refus transaction</div>
          </button>

          <button
            type="button"
            onClick={triggerSyncComplete}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Sync Complete</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cloche synchronisation</div>
          </button>

          <button
            type="button"
            onClick={triggerMaterialClick}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Material Click</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bouton discret UI</div>
          </button>

          <button
            type="button"
            onClick={triggerMaterialSelection}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Sélection Onglet</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Pill / switch tactiles</div>
          </button>

          <button
            type="button"
            onClick={triggerSheetExpand}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-teal-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Modal Expand</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ouverture volet</div>
          </button>

          <button
            type="button"
            onClick={triggerClick}
            className="min-h-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-400/50 rounded-xl text-left transition-all active:scale-95 group"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-200">Clic Touche</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Navigation clavier</div>
          </button>
        </div>
      </div>
    </div>
  );
};
