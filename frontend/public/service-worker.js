// Thrifty Curator Service Worker
// Version 4 - Aggressive cache clearing for App Store review

const CACHE_VERSION = 'v4-' + Date.now(); // Unique version on each build
const CACHE_NAME = 'thrifty-curator-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';

// Minimal assets to cache
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json'
];

// Install event - immediately take over
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install - Version:', CACHE_VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - AGGRESSIVELY clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate - Clearing all old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL caches except the current one
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Taking control of all clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - NETWORK FIRST for everything, no caching of app files
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls entirely
  if (event.request.url.includes('/api/')) {
    return;
  }

  // ALWAYS try network first for all requests
  event.respondWith(
    fetch(event.request, {
      // Add cache-busting headers
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).catch(() => {
      // Only use cache as absolute last resort for offline
      if (event.request.mode === 'navigate') {
        return caches.match(OFFLINE_URL);
      }
      return caches.match(event.request);
    })
  );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Force clear all caches on demand
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map(cache => caches.delete(cache)));
      }).then(() => {
        console.log('[ServiceWorker] All caches cleared');
        // Notify clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'CACHES_CLEARED' }));
        });
      })
    );
  }
});
