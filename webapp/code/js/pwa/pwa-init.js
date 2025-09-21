/**
 * PWA Initialization
 * Registers service worker and initializes update checking
 */

class PWAInitializer {
  constructor() {
    this.serviceWorker = null;
    this.cacheManager = null;
    this.updateChecker = null;
  }

  /**
   * Initialize PWA functionality
   */
  async init() {
    console.log('[PWA] Initializing Progressive Web App features...');

    try {
      // Check if service workers are supported
      if ('serviceWorker' in navigator) {
        await this.registerServiceWorker();
        await this.initializeUpdateChecker();
        this.setupMessageListener();
        console.log('[PWA] Initialization complete');
      } else {
        console.warn('[PWA] Service Workers not supported in this browser');
      }
    } catch (error) {
      console.error('[PWA] Initialization failed:', error);
    }
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });

      console.log('[PWA] Service Worker registered successfully:', registration);

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('[PWA] New service worker version found');
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New service worker installed, update available');
            this.notifyServiceWorkerUpdate();
          }
        });
      });

      this.serviceWorker = registration;
      return registration;
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cache manager and update checker
   */
  async initializeUpdateChecker() {
    // Initialize cache manager (for main thread operations)
    this.cacheManager = new CacheManager();
    
    // Initialize update checker
    this.updateChecker = new UpdateChecker(this.cacheManager);
    
    // Start automatic update checks
    this.updateChecker.startAutomaticChecks();
    
    // Add update notification callback
    this.updateChecker.onUpdateAvailable(() => {
      console.log('[PWA] Cache updates detected');
    });

    console.log('[PWA] Update checker initialized');
  }

  /**
   * Setup message listener for service worker communication
   */
  setupMessageListener() {
    navigator.serviceWorker.addEventListener('message', event => {
      const { data } = event;
      
      switch (data.type) {
        case 'CACHE_UPDATED':
          console.log('[PWA] Received cache update notification from service worker');
          if (this.updateChecker) {
            this.updateChecker.notifyUpdateAvailable();
          }
          break;
          
        case 'UPDATE_CHECK_COMPLETE':
          console.log(`[PWA] Update check complete. Has updates: ${data.hasUpdates}`);
          break;
          
        case 'CACHE_CLEARED':
          console.log('[PWA] Cache cleared by service worker');
          break;
          
        case 'SW_VERSION':
          console.log(`[PWA] Service Worker version: ${data.version}, Cache: ${data.cacheVersion}`);
          break;
      }
    });
  }

  /**
   * Notify about service worker updates
   */
  notifyServiceWorkerUpdate() {
    if (this.updateChecker) {
      this.updateChecker.notifyUpdateAvailable();
    }
  }

  /**
   * Manually trigger update check
   */
  async checkForUpdates() {
    if (this.updateChecker) {
      return await this.updateChecker.checkForUpdates();
    }
    return false;
  }

  /**
   * Request service worker to check for updates
   */
  requestServiceWorkerUpdate() {
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage({ type: 'CHECK_FOR_UPDATES' });
    }
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    if (this.cacheManager) {
      await this.cacheManager.clearCache();
    }
    
    if (this.serviceWorker && this.serviceWorker.active) {
      this.serviceWorker.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }

  /**
   * Get PWA status information
   */
  getStatus() {
    const isServiceWorkerActive = navigator.serviceWorker.controller !== null;
    const updateStatus = this.updateChecker ? this.updateChecker.getUpdateStatus() : null;
    
    return {
      serviceWorkerActive: isServiceWorkerActive,
      serviceWorkerRegistered: this.serviceWorker !== null,
      updateChecker: updateStatus,
      isOnline: navigator.onLine,
      isPWA: window.matchMedia('(display-mode: standalone)').matches
    };
  }

  /**
   * Add PWA install prompt handling
   */
  setupInstallPrompt() {
    let deferredPrompt = null;

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install button or notification
      this.showInstallNotification(deferredPrompt);
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', (e) => {
      console.log('[PWA] App successfully installed');
      deferredPrompt = null;
    });
  }

  /**
   * Show install notification
   */
  showInstallNotification(deferredPrompt) {
    // Create install notification (similar to update notification)
    const installNotification = document.createElement('div');
    installNotification.id = 'install-notification';
    installNotification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #2196F3;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 90vw;
        animation: slideInFromBottom 0.3s ease-out;
      ">
        <span>📱 Install this app for offline access!</span>
        <button id="install-app-btn" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Install</button>
        <button onclick="this.closest('#install-notification').remove()" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
    `;

    // Add animation styles for bottom notification
    if (!document.querySelector('#install-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'install-notification-styles';
      styles.textContent = `
        @keyframes slideInFromBottom {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(installNotification);

    // Handle install button click
    document.getElementById('install-app-btn').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        
        if (outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        }
        
        deferredPrompt = null;
        installNotification.remove();
      }
    });

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (installNotification.parentNode) {
        installNotification.remove();
      }
    }, 15000);
  }
}

// Initialize PWA when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePWA);
} else {
  initializePWA();
}

function initializePWA() {
  window.pwaInitializer = new PWAInitializer();
  window.pwaInitializer.init();
  window.pwaInitializer.setupInstallPrompt();
}

// Export for global access
window.PWAInitializer = PWAInitializer;