// Fix for sandboxed environments where Window.prototype.fetch has only a getter
try {
  if (typeof window !== 'undefined' && typeof Window !== 'undefined' && Window.prototype) {
    const protoDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
    if (protoDesc && protoDesc.get && !protoDesc.set) {
      const originalGetter = protoDesc.get;
      Object.defineProperty(Window.prototype, 'fetch', {
        configurable: true,
        enumerable: true,
        get() {
          return (this as any)._customFetch || originalGetter.call(this);
        },
        set(val) {
          (this as any)._customFetch = val;
        }
      });
    }
  }
} catch {
  // Ignore if prototype modification is restricted
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import './index.css';
import { registerSW } from './registerServiceWorker';
import { initLiveUpdates } from './services/liveUpdates';

// Register Service Worker for offline caching
registerSW();

// Initialize Capgo Live Updates for Capacitor Android / iOS
initLiveUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

