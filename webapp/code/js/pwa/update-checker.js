/**
 * PWA Update Checker
 * Handles daily update checks and user notifications
 */

class UpdateChecker {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.isChecking = false;
    this.updateAvailableCallbacks = [];
    this.notificationElement = null;
  }

  /**
   * Start automatic update checking
   */
  startAutomaticChecks() {
    console.log('[UpdateChecker] Starting automatic update checks');
    
    // Check immediately if it's been more than 24 hours
    if (this.cacheManager.shouldCheckForUpdates()) {
      setTimeout(() => this.checkForUpdates(), 5000); // Wait 5 seconds after app load
    }
    
    // Set up periodic checks every hour
    setInterval(() => {
      if (this.cacheManager.shouldCheckForUpdates()) {
        this.checkForUpdates();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Manually trigger update check
   */
  async checkForUpdates() {
    if (this.isChecking) {
      console.log('[UpdateChecker] Update check already in progress');
      return false;
    }

    this.isChecking = true;
    console.log('[UpdateChecker] Starting update check...');

    try {
      const hasUpdates = await this.cacheManager.checkAndUpdateCache();
      
      if (hasUpdates) {
        this.notifyUpdateAvailable();
        this.triggerUpdateCallbacks();
      }
      
      return hasUpdates;
    } catch (error) {
      console.error('[UpdateChecker] Update check failed:', error);
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Show update notification to user
   */
  notifyUpdateAvailable() {
    console.log('[UpdateChecker] Notifying user of available updates');
    
    // Remove any existing notification
    this.removeUpdateNotification();
    
    // Create notification element
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'update-notification';
    this.notificationElement.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
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
        animation: slideInFromTop 0.3s ease-out;
      ">
        <span>📱 App updated! Refresh to use the latest version.</span>
        <button onclick="window.location.reload()" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Refresh</button>
        <button onclick="this.closest('#update-notification').remove()" style="
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
    
    // Add animation styles if not already present
    if (!document.querySelector('#update-notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'update-notification-styles';
      styles.textContent = `
        @keyframes slideInFromTop {
          from {
            transform: translate(-50%, -100%);
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
    
    // Add to page
    document.body.appendChild(this.notificationElement);
    
    // Auto-hide after 10 seconds if user doesn't interact
    setTimeout(() => {
      if (this.notificationElement && this.notificationElement.parentNode) {
        this.notificationElement.style.animation = 'slideInFromTop 0.3s ease-out reverse';
        setTimeout(() => this.removeUpdateNotification(), 300);
      }
    }, 10000);
  }

  /**
   * Remove update notification
   */
  removeUpdateNotification() {
    if (this.notificationElement && this.notificationElement.parentNode) {
      this.notificationElement.parentNode.removeChild(this.notificationElement);
      this.notificationElement = null;
    }
  }

  /**
   * Add callback for when updates become available
   */
  onUpdateAvailable(callback) {
    if (typeof callback === 'function') {
      this.updateAvailableCallbacks.push(callback);
    }
  }

  /**
   * Trigger all update available callbacks
   */
  triggerUpdateCallbacks() {
    this.updateAvailableCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[UpdateChecker] Update callback failed:', error);
      }
    });
  }

  /**
   * Force immediate cache refresh
   */
  async forceUpdate() {
    console.log('[UpdateChecker] Forcing cache update...');
    
    try {
      // Clear current cache
      await this.cacheManager.clearCache();
      
      // Reinitialize cache
      await this.cacheManager.initializeCache();
      
      // Reload page to use fresh cache
      window.location.reload();
      
    } catch (error) {
      console.error('[UpdateChecker] Force update failed:', error);
      alert('Failed to update app cache. Please try refreshing manually.');
    }
  }

  /**
   * Get update status information
   */
  getUpdateStatus() {
    const lastUpdate = localStorage.getItem(this.cacheManager.LAST_UPDATE_KEY);
    const nextCheck = lastUpdate ? 
      new Date(parseInt(lastUpdate) + this.cacheManager.UPDATE_CHECK_INTERVAL) : 
      new Date();
    
    return {
      lastUpdate: lastUpdate ? new Date(parseInt(lastUpdate)) : null,
      nextCheck: nextCheck,
      isChecking: this.isChecking,
      shouldCheck: this.cacheManager.shouldCheckForUpdates()
    };
  }
}

// Export for use in main application
if (typeof window !== 'undefined') {
  window.UpdateChecker = UpdateChecker;
}