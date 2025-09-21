/**
 * PWA Cache Manager
 * Handles caching of essential resources for offline functionality
 */

class CacheManager {
  constructor() {
    this.CACHE_NAME = 'tibetan-dict-vcf855f91';
    this.UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.LAST_UPDATE_KEY = 'tibetan-dict-last-update';
    
    // Core resources that must be cached (referenced in index.html)
    this.coreResources = [
      "./",
      "./SQLitePlugin.js",
      "./ShareTextPlugin.js",
      "./code/css/DDC_Uchen-webfont.ttf",
      "./code/css/DDC_Uchen-webfont.woff",
      "./code/css/clear.png",
      "./code/css/en-tib.png",
      "./code/css/loader.gif",
      "./code/css/main.css",
      "./code/css/settings.png",
      "./code/css/tib-en.png",
      "./code/js/dict/dataAccess.js",
      "./code/js/dict/lightbox.js",
      "./code/js/dict/main.js",
      "./code/js/dict/settings.js",
      "./code/js/pwa/cache-manager.js",
      "./code/js/pwa/pwa-init.js",
      "./code/js/pwa/update-checker.js",
      "./cordova.js",
      "./data/syllablelist.js",
      "./icons/icon-144x144.png",
      "./icons/icon-192x192.png",
      "./icons/icon-48x48.png",
      "./icons/icon-512x512.png",
      "./icons/icon-72x72.png",
      "./icons/icon-96x96.png",
      "./index.html",
      "./lib/datatables/media/images/sort_asc.png",
      "./lib/datatables/media/images/sort_asc_disabled.png",
      "./lib/datatables/media/images/sort_both.png",
      "./lib/datatables/media/images/sort_desc.png",
      "./lib/datatables/media/images/sort_desc_disabled.png",
      "./lib/datatables/media/js/jquery.dataTables.min.js",
      "./lib/jquery/jquery.js",
      "./lib/jquery_bbq/jquery.ba-hashchange.min.js",
      "./lib/jquery_textchange/jquery.textchange.js",
      "./lib/jquery_tooltip/tooltip.css",
      "./lib/jquery_tooltip/tooltip.js",
      "./lib/photoswipe/photoswipe.css",
      "./lib/sortable_js/sortable.min.js",
      "./lib/tokenizer/tokenizer-1.0.1.js",
      "./manifest.json",
      "./settings/abbreviations.js",
      "./settings/dictlist.js",
      "./settings/globalsettings.js"
];
  }

  /**
   * Initialize cache with core resources
   */
  async initializeCache() {
    console.log('[CacheManager] Initializing cache...');
    
    try {
      const cache = await caches.open(this.CACHE_NAME);
      
      // Add core resources to cache
      await cache.addAll(this.coreResources);
      
      // Set initial update timestamp
      localStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
      
      console.log('[CacheManager] Cache initialized successfully');
      return true;
    } catch (error) {
      console.error('[CacheManager] Failed to initialize cache:', error);
      return false;
    }
  }

  /**
   * Check if cache needs updating (daily check)
   */
  shouldCheckForUpdates() {
    const lastUpdate = localStorage.getItem(this.LAST_UPDATE_KEY);
    if (!lastUpdate) return true;
    
    const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
    return timeSinceUpdate >= this.UPDATE_CHECK_INTERVAL;
  }

  /**
   * Check for updates and refresh cache if needed
   */
  async checkAndUpdateCache() {
    if (!this.shouldCheckForUpdates()) {
      console.log('[CacheManager] Cache is fresh, no update needed');
      return false;
    }

    console.log('[CacheManager] Checking for updates...');
    
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const updatedResources = [];
      
      // Check critical resources first (HTML, JS, CSS)
      const criticalResources = this.coreResources.filter(url => 
        url.endsWith('.html') || 
        url.endsWith('.js') || 
        url.endsWith('.css') ||
        url === './'
      );
      
      // Check if any critical resources have been updated
      let hasCriticalUpdates = false;
      for (const url of criticalResources) {
        if (await this.hasResourceChanged(url, cache)) {
          hasCriticalUpdates = true;
          break;
        }
      }
      
      if (hasCriticalUpdates) {
        // Atomic update: Download all critical resources first
        console.log('[CacheManager] Critical updates detected, performing atomic update...');
        await this.performAtomicUpdate(criticalResources, cache);
      }
      
      // Update remaining resources
      for (const url of this.coreResources) {
        if (!criticalResources.includes(url)) {
          if (await this.hasResourceChanged(url, cache)) {
            updatedResources.push(url);
            await this.updateResource(url, cache);
          }
        }
      }
      
      // Update timestamp
      localStorage.setItem(this.LAST_UPDATE_KEY, Date.now().toString());
      
      if (updatedResources.length > 0 || hasCriticalUpdates) {
        console.log(`[CacheManager] Updated ${updatedResources.length + (hasCriticalUpdates ? criticalResources.length : 0)} resources`);
        return true;
      }
      
      console.log('[CacheManager] No updates available');
      return false;
    } catch (error) {
      console.error('[CacheManager] Update check failed:', error);
      return false;
    }
  }

  /**
   * Check if a resource has changed on the server
   */
  async hasResourceChanged(url, cache) {
    try {
      const cachedResponse = await cache.match(url);
      if (!cachedResponse) return true;
      
      const networkResponse = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache' 
      });
      
      const cachedDate = cachedResponse.headers.get('date');
      const networkDate = networkResponse.headers.get('date');
      const cachedEtag = cachedResponse.headers.get('etag');
      const networkEtag = networkResponse.headers.get('etag');
      
      if (networkEtag && cachedEtag) {
        return networkEtag !== cachedEtag;
      }
      
      if (networkDate && cachedDate) {
        return new Date(networkDate) > new Date(cachedDate);
      }
      
      // Fallback: assume changed if we can't determine
      return true;
    } catch (error) {
      console.warn(`[CacheManager] Could not check resource ${url}:`, error);
      return false;
    }
  }

  /**
   * Perform atomic update for critical resources
   */
  async performAtomicUpdate(resources, cache) {
    const tempCacheName = this.CACHE_NAME + '-temp';
    
    try {
      // Create temporary cache and download all critical resources
      const tempCache = await caches.open(tempCacheName);
      await tempCache.addAll(resources);
      
      // If successful, move resources to main cache
      for (const url of resources) {
        const response = await tempCache.match(url);
        if (response) {
          await cache.put(url, response);
        }
      }
      
      console.log('[CacheManager] Atomic update completed successfully');
    } catch (error) {
      console.error('[CacheManager] Atomic update failed:', error);
      throw error;
    } finally {
      // Clean up temporary cache
      await caches.delete(tempCacheName);
    }
  }

  /**
   * Update a single resource in cache
   */
  async updateResource(url, cache) {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) {
        await cache.put(url, response);
        console.log(`[CacheManager] Updated resource: ${url}`);
      }
    } catch (error) {
      console.warn(`[CacheManager] Failed to update resource ${url}:`, error);
    }
  }

  /**
   * Get cached response for a request
   */
  async getCachedResponse(request) {
    const cache = await caches.open(this.CACHE_NAME);
    return await cache.match(request);
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('tibetan-dict-'))
        .map(name => caches.delete(name))
    );
    localStorage.removeItem(this.LAST_UPDATE_KEY);
    console.log('[CacheManager] All caches cleared');
  }
}

// Export for use in service worker and main application
if (typeof window !== 'undefined') {
  window.CacheManager = CacheManager;
} else {
  // For service worker context
  self.CacheManager = CacheManager;
}