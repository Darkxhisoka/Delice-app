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

