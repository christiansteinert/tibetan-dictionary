/**
 * Service Worker for Tibetan Dictionary PWA
 * Handles caching, offline functionality, and background sync
 */

// Import cache manager
importScripts('./code/js/pwa/cache-manager.js');

const cacheManager = new self.CacheManager();

// Service Worker version
const SW_VERSION = '1.0.0';

console.log(`[ServiceWorker] Starting v${SW_VERSION}`);

/**
 * Install event - cache core resources
 */
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const success = await cacheManager.initializeCache();
        if (success) {
          console.log('[ServiceWorker] Installation successful');
          // Take control immediately
          await self.skipWaiting();
        } else {
          console.error('[ServiceWorker] Installation failed');
        }
      } catch (error) {
        console.error('[ServiceWorker] Installation error:', error);
      }
    })()
  );
});

/**
 * Activate event - cleanup old caches and claim clients
 */
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(name => name.startsWith('tibetan-dict-') && name !== cacheManager.CACHE_NAME)
            .map(name => {
              console.log(`[ServiceWorker] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
        
        // Take control of all clients
        await self.clients.claim();
        
        console.log('[ServiceWorker] Activation successful');
      } catch (error) {
        console.error('[ServiceWorker] Activation error:', error);
      }
    })()
  );
});

/**
 * Fetch event - serve cached resources with cache-first strategy
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip requests to external domains
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip requests to excluded paths
  if (isExcludedPath(request.url)) {
    console.log(`[ServiceWorker] Skipping excluded path: ${request.url}`);
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

/**
 * Handle fetch requests with cache-first strategy
 */
async function handleRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await cacheManager.getCachedResponse(request);
    if (cachedResponse) {
      console.log(`[ServiceWorker] Serving from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // If not in cache, try network
    console.log(`[ServiceWorker] Fetching from network: ${request.url}`);
    const networkResponse = await fetch(request);
    
    // Cache successful responses for future use (only for core resources)
    if (networkResponse.ok && isCacheableResource(request.url)) {
      const cache = await caches.open(cacheManager.CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`[ServiceWorker] Cached new resource: ${request.url}`);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error(`[ServiceWorker] Fetch failed for ${request.url}:`, error);
    
    // For navigation requests, return the cached index.html
    if (request.mode === 'navigate') {
      const cachedIndex = await cacheManager.getCachedResponse(new Request('./index.html'));
      if (cachedIndex) {
        console.log('[ServiceWorker] Serving cached index.html for navigation');
        return cachedIndex;
      }
    }
    
    // Return a basic offline page for other failed requests
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body>' +
      '<h1>You are offline</h1>' +
      '<p>This page is not available offline. Please check your internet connection.</p>' +
      '</body></html>',
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 503,
        statusText: 'Service Unavailable'
      }
    );
  }
}

/**
 * Check if a path should be excluded from caching
 */
function isExcludedPath(url) {
  const excludePatterns = [
    '/data/scan/',
    '/scanned/data/',
    '.db',
    '.directory',
    '/examples/',
    '/spec/',
    'dict.php' // PHP backend calls should go to network
  ];
  
  return excludePatterns.some(pattern => url.includes(pattern));
}

/**
 * Check if a resource should be cached
 */
function isCacheableResource(url) {
  // Only cache resources that are in our core resources list or are basic web assets
  const cacheableExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  const hasValidExtension = cacheableExtensions.some(ext => url.endsWith(ext));
  
  // Don't cache if it's an excluded path
  if (isExcludedPath(url)) {
    return false;
  }
  
  // Cache if it's a valid extension or the root path
  return hasValidExtension || url.endsWith('/') || url.includes('index.html');
}

/**
 * Background sync for update checking
 */
self.addEventListener('sync', event => {
  if (event.tag === 'cache-update-check') {
    console.log('[ServiceWorker] Background sync: cache update check');
    event.waitUntil(
      cacheManager.checkAndUpdateCache().then(hasUpdates => {
        if (hasUpdates) {
          // Notify all clients about available updates
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'CACHE_UPDATED',
                timestamp: Date.now()
              });
            });
          });
        }
      })
    );
  }
});

/**
 * Handle messages from main application
 */
self.addEventListener('message', event => {
  const { data } = event;
  
  switch (data.type) {
    case 'CHECK_FOR_UPDATES':
      console.log('[ServiceWorker] Manual update check requested');
      cacheManager.checkAndUpdateCache().then(hasUpdates => {
        event.source.postMessage({
          type: 'UPDATE_CHECK_COMPLETE',
          hasUpdates: hasUpdates,
          timestamp: Date.now()
        });
      });
      break;
      
    case 'CLEAR_CACHE':
      console.log('[ServiceWorker] Cache clear requested');
      cacheManager.clearCache().then(() => {
        event.source.postMessage({
          type: 'CACHE_CLEARED',
          timestamp: Date.now()
        });
      });
      break;
      
    case 'GET_SW_VERSION':
      event.source.postMessage({
        type: 'SW_VERSION',
        version: SW_VERSION,
        cacheVersion: cacheManager.CACHE_NAME
      });
      break;
  }
});

console.log('[ServiceWorker] Setup complete');