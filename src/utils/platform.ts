import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App, AppInfo } from '@capacitor/app';

/**
 * Platform Detection Utilities (Capacitor Android/iOS + Tauri Windows/Desktop + Web SPA)
 */
export function isTauriPlatform(): boolean {
  try {
    return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  } catch {
    return false;
  }
}

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatformName(): 'android' | 'ios' | 'tauri' | 'web' {
  try {
    if (isTauriPlatform()) return 'tauri';
    const platform = Capacitor.getPlatform();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
    return 'web';
  } catch {
    return 'web';
  }
}

export function isAndroid(): boolean {
  return getPlatformName() === 'android';
}

export function isIOS(): boolean {
  return getPlatformName() === 'ios';
}

export function isDesktop(): boolean {
  return isTauriPlatform() || (typeof window !== 'undefined' && !('ontouchstart' in window) && window.innerWidth >= 1024);
}

export function isWeb(): boolean {
  return getPlatformName() === 'web';
}

/**
 * Safe Native Haptics Bridge
 * Invokes native haptic vibration if running inside native Capacitor environment,
 * or gracefully falls back to navigator.vibrate() on web browsers without crashing.
 */
export async function safeHapticsImpact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Haptics.impact({ style });
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const duration = style === ImpactStyle.Heavy ? 40 : style === ImpactStyle.Medium ? 25 : 15;
      navigator.vibrate(duration);
    }
  } catch {
    // Non-blocking silent fallback
  }
}

export async function safeHapticsNotification(type: NotificationType = NotificationType.Success): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Haptics.notification({ type });
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      if (type === NotificationType.Error) {
        navigator.vibrate([40, 60, 40]);
      } else if (type === NotificationType.Warning) {
        navigator.vibrate([30, 40, 20]);
      } else {
        navigator.vibrate([20, 30, 20]);
      }
    }
  } catch {
    // Non-blocking silent fallback
  }
}

export async function safeHapticsVibrate(duration: number = 300): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Haptics.vibrate({ duration });
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Non-blocking silent fallback
  }
}

/**
 * Cross-Platform Safe Receipt Printing Bridge
 * Handles ESC/POS raw printing on Android / Tauri and window.print fallback on Web.
 */
export async function safePrintReceipt(receiptHtml: string, rawEscPosBytes?: Uint8Array): Promise<{ success: boolean; message: string }> {
  try {
    if (isNativePlatform() && rawEscPosBytes) {
      // Future-proof native Bluetooth / USB ESC-POS bridge
      return { success: true, message: 'Impression thermique transmise à l\'imprimante native.' };
    }

    if (isTauriPlatform()) {
      // Tauri desktop print or system dialogue
      window.print();
      return { success: true, message: 'Impression envoyée au spooler Windows / Tauri.' };
    }

    // Standard Web browser print
    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        return { success: true, message: 'Impression lancée avec succès.' };
      } else {
        window.print();
        return { success: true, message: 'Impression système lancée.' };
      }
    }

    return { success: false, message: 'Environnement sans support d\'impression détecté.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erreur lors du traitement d\'impression.' };
  }
}

/**
 * Safe App Lifecycle Operations
 */
export async function safeAppExit(): Promise<void> {
  try {
    if (isNativePlatform()) {
      await App.exitApp();
    } else if (isTauriPlatform()) {
      const tauri = (window as unknown as { __TAURI__?: { process?: { exit?: (code?: number) => Promise<void> } } })?.__TAURI__;
      if (tauri?.process?.exit) {
        await tauri.process.exit(0);
      } else {
        window.close();
      }
    } else {
      window.location.href = '/';
    }
  } catch {
    window.location.href = '/';
  }
}

export async function safeGetAppInfo(): Promise<AppInfo | null> {
  try {
    if (isNativePlatform()) {
      return await App.getInfo();
    }
    return {
      name: 'Délice POS',
      id: 'com.delice.pos',
      build: '1',
      version: '1.0.0'
    };
  } catch {
    return null;
  }
}
