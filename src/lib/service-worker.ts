export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('New service worker available, reload to update');
                // You could show a notification to the user here
              }
            });
          }
        });

        // Request background sync permission
        if ('sync' in registration) {
          try {
            await registration.sync.register('sync-offline-queue');
          } catch (error) {
            console.log('Background sync registration failed:', error);
          }
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'sync-complete') {
        console.log(`Synced ${event.data.synced} requests, ${event.data.failed} failed`);
        // Trigger a notification or update UI
        window.dispatchEvent(new CustomEvent('offline-sync-complete', { 
          detail: event.data 
        }));
      }
    });
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

// Manually trigger sync
export async function triggerOfflineSync() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'sync-now' });
  }
}