import { useHotkeys } from 'react-hotkeys-hook';
import { notifyToast } from '../services/storage';

export interface ShortcutHandlers {
  onNewEntry?: () => void;
  onGlobalSearch?: () => void;
  onCloseModals?: () => void;
  onQuickPrint?: () => void;
}

/**
 * Custom hook providing global desktop keyboard shortcuts for Electron and web users.
 */
export function useDesktopShortcuts(handlers: ShortcutHandlers) {
  // 1. Ctrl+N / Cmd+N: New Entry
  useHotkeys('ctrl+n, meta+n', (event) => {
    event.preventDefault();
    if (handlers.onNewEntry) {
      handlers.onNewEntry();
    } else {
      notifyToast({
        type: 'info',
        title: 'Raccourci Clavier [Ctrl+N]',
        message: 'Création d\'un nouvel enregistrement...'
      });
    }
  }, { enableOnFormTags: false });

  // 2. Ctrl+F / Cmd+F: Global Search focus
  useHotkeys('ctrl+f, meta+f', (event) => {
    event.preventDefault();
    if (handlers.onGlobalSearch) {
      handlers.onGlobalSearch();
    } else {
      const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Recherch"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  }, { enableOnFormTags: true });

  // 3. Escape: Close open modals / overlays
  useHotkeys('escape', (event) => {
    if (handlers.onCloseModals) {
      handlers.onCloseModals();
    }
  }, { enableOnFormTags: true });

  // 4. Ctrl+P / Cmd+P: Quick Print
  useHotkeys('ctrl+p, meta+p', (event) => {
    event.preventDefault();
    if (handlers.onQuickPrint) {
      handlers.onQuickPrint();
    }
  }, { enableOnFormTags: false });
}
