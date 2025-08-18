// Service Worker for ShopPOS Offline Support
const CACHE_NAME = 'shoppos-v1';
const OFFLINE_DATA_CACHE = 'shoppos-data-v1';
const OFFLINE_QUEUE_KEY = 'offline-queue';

// Assets to cache for offline use
const urlsToCache = [
  '/',
  '/floor',
  '/orders',
  '/games',
  '/offline',
  '/_next/static/css/app-layout.css',
  '/_next/static/chunks/main-app.js',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache essential pages and assets
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_DATA_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests (assets, etc.)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline fallback for images
        if (request.destination === 'image') {
          return caches.match('/offline-image.png');
        }
      })
  );
});

// Handle API requests with offline queue
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Try to fetch from network first
  try {
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(OFFLINE_DATA_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE, queue the request for later
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      await queueOfflineRequest(request);
      return new Response(
        JSON.stringify({ 
          offline: true, 
          queued: true,
          message: 'Request queued for sync when online' 
        }),
        { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        offline: true, 
        error: 'Network unavailable' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // Fallback to a basic offline message
  return new Response(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Offline - ShopPOS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f3f4f6;
          }
          .offline-message {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          p { color: #6b7280; margin-bottom: 1.5rem; }
          .status { 
            display: inline-block;
            padding: 0.5rem 1rem;
            background: #fef3c7;
            color: #92400e;
            border-radius: 4px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="offline-message">
          <h1>You're Offline</h1>
          <p>The POS system is currently offline. Some features may be limited.</p>
          <div class="status">Waiting for connection...</div>
          <script>
            // Auto-reload when back online
            window.addEventListener('online', () => {
              setTimeout(() => window.location.reload(), 1000);
            });
          </script>
        </div>
      </body>
    </html>
    `,
    { 
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Queue offline requests for later sync
async function queueOfflineRequest(request) {
  const queue = await getOfflineQueue();
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
    body: await request.text(),
    timestamp: Date.now()
  };
  
  queue.push(requestData);
  await saveOfflineQueue(queue);
}

// Get offline queue from IndexedDB
async function getOfflineQueue() {
  return new Promise((resolve) => {
    const request = indexedDB.open('ShopPOS', 1);
    
    request.onerror = () => resolve([]);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue');
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offline-queue'], 'readonly');
      const store = transaction.objectStore('offline-queue');
      const getRequest = store.get(OFFLINE_QUEUE_KEY);
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || []);
      };
      
      getRequest.onerror = () => resolve([]);
    };
  });
}

// Save offline queue to IndexedDB
async function saveOfflineQueue(queue) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ShopPOS', 1);
    
    request.onerror = () => reject(new Error('Failed to save queue'));
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['offline-queue'], 'readwrite');
      const store = transaction.objectStore('offline-queue');
      const putRequest = store.put(queue, OFFLINE_QUEUE_KEY);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(new Error('Failed to save queue'));
    };
  });
}

// Sync queued requests when back online
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const queue = await getOfflineQueue();
  
  if (queue.length === 0) return;
  
  const failedRequests = [];
  
  for (const requestData of queue) {
    try {
      const response = await fetch(requestData.url, {
        method: requestData.method,
        headers: requestData.headers,
        body: requestData.method !== 'GET' ? requestData.body : undefined
      });
      
      if (!response.ok) {
        failedRequests.push(requestData);
      }
    } catch (error) {
      failedRequests.push(requestData);
    }
  }
  
  // Save failed requests back to queue
  await saveOfflineQueue(failedRequests);
  
  // Notify clients about sync completion
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'sync-complete',
      failed: failedRequests.length,
      synced: queue.length - failedRequests.length
    });
  });
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data.type === 'sync-now') {
    syncOfflineQueue();
  }
});