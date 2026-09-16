import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App.tsx';
import './index.css';
import { registerSW } from './registerServiceWorker';
import { initLiveUpdates } from './services/liveUpdates';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Robust Bootstrap Sequence for Délice POS
 * Ensures that the application provides visual feedback even if
 * critical initialization (Dexie, i18n, liveUpdates) fails on Android WebView.
 */
const bootstrap = () => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Fatal: Root element not found in DOM.');
    return;
  }

  try {
    // 1. Initialize Service Worker & Live Updates
    try {
      registerSW();
      initLiveUpdates();
    } catch (pluginErr) {
      console.warn('Capacitor plugin initialization warning:', pluginErr);
    }

    // 2. Render React Application wrapped in ErrorBoundary
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary fallbackTitle="Délice POS - Initialisation interrompue">
          <App />
        </ErrorBoundary>
      </StrictMode>
    );

    console.log('Délice POS: React bootstrap completed successfully.');
  } catch (fatalErr) {
    console.error('Délice POS: Fatal bootstrap error:', fatalErr);

    // Last-resort visual fallback if React fails to mount entirely
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #0f172a; color: #f87171; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <h1 style="margin-bottom: 10px;">Initialisation Échouée</h1>
        <p style="color: #94a3b8; font-size: 14px;">Une erreur critique est survenue lors du démarrage de l'application.</p>
        <pre style="background: #1e293b; padding: 15px; border-radius: 8px; margin-top: 20px; color: #fda4af; max-width: 90%; overflow: auto; text-align: left;">${fatalErr instanceof Error ? fatalErr.message : String(fatalErr)}</pre>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Réessayer</button>
      </div>
    `;
  }
};

// Execute bootstrap
bootstrap();
