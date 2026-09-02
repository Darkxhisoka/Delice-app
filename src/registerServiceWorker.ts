export function registerSW() {
  if ('serviceWorker' in navigator) {
    if (process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[ServiceWorker] Registered with scope: ', registration.scope);
          })
          .catch((err) => {
            console.warn('[ServiceWorker] Registration failed: ', err);
          });
      });
    } else {
      // In dev mode, unregister active service workers to prevent stale request interception
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {
        // ignore
      });
    }
  }
}

