import { useState, useCallback, useEffect } from 'react';
import { soundEffects, SoundTheme, SoundEffectType } from '../services/soundEffects';
import { hapticsEngine } from '../services/haptics';

export interface UseHapticsAndSoundReturn {
  // State
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  volume: number;
  soundTheme: SoundTheme;
  hardwareStatus: 'NATIVE_CAPACITOR' | 'WEB_VIBRATION' | 'UNSUPPORTED';

  // Config Setters
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setSoundTheme: (theme: SoundTheme) => void;

  // Semantic Feedback Actions (Sound + Haptic combined)
  triggerAddCart: () => void;
  triggerScanSuccess: () => void;
  triggerCheckoutSuccess: () => void;
  triggerCoinPayment: () => void;
  triggerQuantityChange: () => void;
  triggerItemDelete: () => void;
  triggerSuccess: () => void;
  triggerSyncComplete: () => void;
  triggerMaterialClick: () => void;
  triggerMaterialSelection: () => void;
  triggerSheetExpand: () => void;
  triggerSheetCollapse: () => void;
  triggerWarning: () => void;
  triggerError: () => void;
  triggerClick: () => void;
  triggerToggle: () => void;

  // Direct Audio / Haptic Access
  playSound: (type: SoundEffectType) => void;
  vibrateLight: () => void;
  vibrateMedium: () => void;
  vibrateHeavy: () => void;
  vibrateSuccess: () => void;
  vibrateWarning: () => void;
  vibrateError: () => void;
  vibrateSelection: () => void;
}

export function useHapticsAndSound(): UseHapticsAndSoundReturn {
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => soundEffects.isEnabled());
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() => hapticsEngine.isEnabled());
  const [volume, setVolumeState] = useState<number>(() => soundEffects.getVolume());
  const [soundTheme, setSoundThemeState] = useState<SoundTheme>(() => soundEffects.getTheme());
  const [hardwareStatus, setHardwareStatus] = useState<'NATIVE_CAPACITOR' | 'WEB_VIBRATION' | 'UNSUPPORTED'>('UNSUPPORTED');

  useEffect(() => {
    setHardwareStatus(hapticsEngine.getPlatformStatus());
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    soundEffects.setEnabled(enabled);
    setSoundEnabledState(enabled);
    if (enabled) {
      soundEffects.playAddToCart();
      hapticsEngine.impactLight();
    }
  }, []);

  const setHapticsEnabled = useCallback((enabled: boolean) => {
    hapticsEngine.setEnabled(enabled);
    setHapticsEnabledState(enabled);
    if (enabled) {
      hapticsEngine.impactMedium();
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    soundEffects.setVolume(vol);
    setVolumeState(vol);
  }, []);

  const setSoundTheme = useCallback((theme: SoundTheme) => {
    soundEffects.setTheme(theme);
    setSoundThemeState(theme);
    soundEffects.playAddToCart();
    hapticsEngine.impactLight();
  }, []);

  // Semantic Feedback Actions
  const triggerAddCart = useCallback(() => {
    soundEffects.playAddToCart();
    hapticsEngine.impactLight();
  }, []);

  const triggerScanSuccess = useCallback(() => {
    soundEffects.playBarcodeBeep();
    hapticsEngine.impactMedium();
  }, []);

  const triggerCheckoutSuccess = useCallback(() => {
    soundEffects.playCashRegister();
    hapticsEngine.notificationSuccess();
  }, []);

  const triggerCoinPayment = useCallback(() => {
    soundEffects.playCoinTender();
    hapticsEngine.impactLight();
  }, []);

  const triggerQuantityChange = useCallback(() => {
    soundEffects.playKeyTap();
    hapticsEngine.selectionChanged();
  }, []);

  const triggerItemDelete = useCallback(() => {
    soundEffects.playDeleteItem();
    hapticsEngine.notificationWarning();
  }, []);

  const triggerSuccess = useCallback(() => {
    soundEffects.playSuccess();
    hapticsEngine.notificationSuccess();
  }, []);

  const triggerSyncComplete = useCallback(() => {
    soundEffects.playSyncComplete();
    hapticsEngine.notificationSuccess();
  }, []);

  const triggerMaterialClick = useCallback(() => {
    soundEffects.playMaterialClick();
    hapticsEngine.impactLight();
  }, []);

  const triggerMaterialSelection = useCallback(() => {
    soundEffects.playMaterialSelection();
    hapticsEngine.selectionChanged();
  }, []);

  const triggerSheetExpand = useCallback(() => {
    soundEffects.playSheetExpand();
    hapticsEngine.impactLight();
  }, []);

  const triggerSheetCollapse = useCallback(() => {
    soundEffects.playSheetCollapse();
    hapticsEngine.impactLight();
  }, []);

  const triggerWarning = useCallback(() => {
    soundEffects.playWarning();
    hapticsEngine.notificationWarning();
  }, []);

  const triggerError = useCallback(() => {
    soundEffects.playError();
    hapticsEngine.notificationError();
  }, []);

  const triggerClick = useCallback(() => {
    soundEffects.playMaterialClick();
    hapticsEngine.impactLight();
  }, []);

  const triggerToggle = useCallback(() => {
    soundEffects.playToggle();
    hapticsEngine.impactLight();
  }, []);

  // Direct actions
  const playSound = useCallback((type: SoundEffectType) => {
    soundEffects.play(type);
  }, []);

  const vibrateLight = useCallback(() => {
    hapticsEngine.impactLight();
  }, []);

  const vibrateMedium = useCallback(() => {
    hapticsEngine.impactMedium();
  }, []);

  const vibrateHeavy = useCallback(() => {
    hapticsEngine.impactHeavy();
  }, []);

  const vibrateSuccess = useCallback(() => {
    hapticsEngine.notificationSuccess();
  }, []);

  const vibrateWarning = useCallback(() => {
    hapticsEngine.notificationWarning();
  }, []);

  const vibrateError = useCallback(() => {
    hapticsEngine.notificationError();
  }, []);

  const vibrateSelection = useCallback(() => {
    hapticsEngine.selectionChanged();
  }, []);

  return {
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
    triggerQuantityChange,
    triggerItemDelete,
    triggerSuccess,
    triggerSyncComplete,
    triggerMaterialClick,
    triggerMaterialSelection,
    triggerSheetExpand,
    triggerSheetCollapse,
    triggerWarning,
    triggerError,
    triggerClick,
    triggerToggle,
    playSound,
    vibrateLight,
    vibrateMedium,
    vibrateHeavy,
    vibrateSuccess,
    vibrateWarning,
    vibrateError,
    vibrateSelection,
  };
}
