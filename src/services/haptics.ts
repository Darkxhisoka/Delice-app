/**
 * Native Haptic Feedback Bridge for Capacitor & Web
 * Integrates @capacitor/haptics with native Android/iOS haptic engine
 * and provides smooth fallback for web/PWA via navigator.vibrate.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const STORAGE_KEYS = {
  HAPTICS_ENABLED: 'delice_haptics_enabled',
};

class HapticsEngine {
  private hapticsEnabled: boolean = true;
  private isNative: boolean = false;

  constructor() {
    this.loadPreferences();
    if (typeof window !== 'undefined') {
      this.isNative = Capacitor.isNativePlatform();
    }
  }

  private loadPreferences() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED);
      if (stored !== null) {
        this.hapticsEnabled = stored === 'true';
      }
    } catch {}
  }

  public isEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(enabled));
    } catch {}
  }

  public getPlatformStatus(): 'NATIVE_CAPACITOR' | 'WEB_VIBRATION' | 'UNSUPPORTED' {
    if (typeof window === 'undefined') return 'UNSUPPORTED';
    if (Capacitor.isNativePlatform()) return 'NATIVE_CAPACITOR';
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) return 'WEB_VIBRATION';
    return 'UNSUPPORTED';
  }

  /**
   * Light tactile tap - for standard button taps, item adds, UI selections
   */
  public async impactLight() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (e) {
      console.debug('Haptics impactLight caught:', e);
    }
  }

  /**
   * Medium tactile punch - for scans, quantity shifts, confirmations
   */
  public async impactMedium() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(22);
      }
    } catch (e) {
      console.debug('Haptics impactMedium caught:', e);
    }
  }

  /**
   * Heavy impact - for large actions, totals, receipts
   */
  public async impactHeavy() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    } catch (e) {
      console.debug('Haptics impactHeavy caught:', e);
    }
  }

  /**
   * Success notification vibration pattern
   */
  public async notificationSuccess() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([15, 60, 25]);
      }
    } catch (e) {
      console.debug('Haptics notificationSuccess caught:', e);
    }
  }

  /**
   * Warning notification vibration pattern
   */
  public async notificationWarning() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
    } catch (e) {
      console.debug('Haptics notificationWarning caught:', e);
    }
  }

  /**
   * Error notification vibration pattern
   */
  public async notificationError() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([50, 40, 50, 40, 50]);
      }
    } catch (e) {
      console.debug('Haptics notificationError caught:', e);
    }
  }

  /**
   * Subtle selection change tick - for sliders, wheels, tabs
   */
  public async selectionChanged() {
    if (!this.hapticsEnabled) return;
    try {
      if (this.isNative) {
        await Haptics.selectionChanged();
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch (e) {
      console.debug('Haptics selectionChanged caught:', e);
    }
  }
}

export const hapticsEngine = new HapticsEngine();
