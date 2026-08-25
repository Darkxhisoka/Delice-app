import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App, AppInfo } from '@capacitor/app';

/**
 * Platform Detection Utilities
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatformName(): 'android' | 'ios' | 'web' {
  try {
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
  } catch (err) {
    console.debug('Safe haptics impact fallback notice:', err);
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
  } catch (err) {
    console.debug('Safe haptics notification fallback notice:', err);
  }
}

export async function safeHapticsVibrate(duration: number = 300): Promise<void> {
  try {
    if (isNativePlatform()) {
      await Haptics.vibrate({ duration });
    } else if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch (err) {
    console.debug('Safe haptics vibrate fallback notice:', err);
  }
}

/**
 * Safe App Lifecycle Operations
 */
export async function safeAppExit(): Promise<void> {
  try {
    if (isNativePlatform()) {
      await App.exitApp();
    } else {
      console.log('App.exitApp() requested on Web platform - closing session or navigating to home.');
      window.location.href = '/';
    }
  } catch (err) {
    console.warn('Safe app exit error:', err);
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
