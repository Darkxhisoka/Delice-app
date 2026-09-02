import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { isNativePlatform, safeHapticsImpact } from '../utils/platform';
import { ImpactStyle } from '@capacitor/haptics';
import { notifyToast } from '../services/storage';

type BackButtonHandler = () => boolean | Promise<boolean>;

interface RegisteredHandler {
  id: string;
  priority: number; // Higher number gets checked first (e.g. Modals = 100, Drawers = 80, Views = 50)
  handler: BackButtonHandler;
}

// Global stack of active back button interceptors
const handlersStack: RegisteredHandler[] = [];

/**
 * Register a modal, drawer, or view handler to intercept back button presses.
 * Handler should return `true` if it consumed the back event (e.g. closed a modal),
 * or `false` to pass control to the next handler down the stack.
 */
export function registerBackButtonHandler(id: string, handler: BackButtonHandler, priority: number = 50): () => void {
  // Remove existing with same ID if any
  const existingIdx = handlersStack.findIndex((h) => h.id === id);
  if (existingIdx !== -1) {
    handlersStack.splice(existingIdx, 1);
  }

  handlersStack.push({ id, priority, handler });
  // Sort descending by priority
  handlersStack.sort((a, b) => b.priority - a.priority);

  return () => {
    unregisterBackButtonHandler(id);
  };
}

export function unregisterBackButtonHandler(id: string): void {
  const index = handlersStack.findIndex((h) => h.id === id);
  if (index !== -1) {
    handlersStack.splice(index, 1);
  }
}

export interface UseAndroidBackButtonOptions {
  onExitAttempt?: () => void;
  canExitApp?: boolean;
  exitDoubleTapDelayMs?: number;
}

/**
 * Global React Hook to manage Android physical / gesture Back Button behavior.
 */
export function useAndroidBackButton(options: UseAndroidBackButtonOptions = {}) {
  const {
    onExitAttempt,
    canExitApp = true,
    exitDoubleTapDelayMs = 2000
  } = options;

  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let isListenerActive = true;

    const backButtonListenerPromise = App.addListener('backButton', async (event) => {
      if (!isListenerActive) return;

      safeHapticsImpact(ImpactStyle.Light);

      // 1. Check registered high-priority handlers (Modals, Dialogs, Drawers, Dropdowns)
      for (const registered of handlersStack) {
        try {
          const handled = await Promise.resolve(registered.handler());
          if (handled) {
            // Event was consumed by the top-most modal or active overlay
            return;
          }
        } catch (err) {
          console.warn(`Back button handler [${registered.id}] failed:`, err);
        }
      }

      // 2. Check if browser/app history can go back
      if (event.canGoBack || window.history.length > 1) {
        const currentPath = window.location.pathname;
        // If not already at root screens (/store or /lab)
        if (currentPath !== '/store' && currentPath !== '/lab' && currentPath !== '/') {
          window.history.back();
          return;
        }
      }

      // 3. Root Level Exit Handling
      if (!canExitApp) {
        if (onExitAttempt) {
          onExitAttempt();
        }
        return;
      }

      const now = Date.now();
      const timeSinceLastPress = now - lastBackPressTimeRef.current;

      if (timeSinceLastPress < exitDoubleTapDelayMs) {
        // Confirmed second tap: exit app
        safeHapticsImpact(ImpactStyle.Heavy);
        await App.exitApp();
      } else {
        // First tap: warn user
        lastBackPressTimeRef.current = now;
        safeHapticsImpact(ImpactStyle.Medium);
        notifyToast({
          type: 'info',
          title: 'Quitter l\'application',
          message: 'Appuyez à nouveau sur Retour pour fermer Pâtisserie le Délice.'
        });
      }
    });

    return () => {
      isListenerActive = false;
      backButtonListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [canExitApp, exitDoubleTapDelayMs, onExitAttempt]);
}
