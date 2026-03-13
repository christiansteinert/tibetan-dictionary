/**
 * Hash Change Handler Module
 * Manages URL hash changes and dispatches nav-state-change events
 * Encapsulates all interaction with window.hashchange events
 */
export class NavHistoryHandler {
  #lastHomeBackButtonTime = 0;
  #hashEventCount = 0;
  #lastHashEvent = 0;

  constructor() {
    this.#bindHashChangeListener();
    this.#bindBackButtonListener();
  }

  /** 
    * handle navigation events: listen to the "back" button on android
    */
  #bindBackButtonListener() {
    document.addEventListener("backbutton", (event) => {
      // If we are on cordova, exit the app if the user presses back twice on the home screen
      if (window.cordova) {
        if (this.#getCurrentHash() === '#home') {
          var now = Date.now();
          if (now - this.#lastHomeBackButtonTime < 1500) {
            if (navigator.app && navigator.app.exitApp) {
              navigator.app.exitApp();
            }
          }
          this.lastHomeBackButtonTime = now;
        }

        // Prevent Cordova / Android default (which would finish the Activity)
        if (event.preventDefault) { event.preventDefault(); }
        if (event.stopPropagation) { event.stopPropagation(); }
      }

      // Navigate back inside the app if we are not already at the home state
      if (this.#getCurrentHash() !== '#home') {
        history.back();
      }

    }, false);
  }

  /**
   * Bind the URL hashchange event listener
   * @private
   */
  #bindHashChangeListener() {
    $(window).hashchange((event) => {
      this.#hashEventCount++;

      if (new Date().getTime() - this.#lastHashEvent < 300) {
        return; // ignore hashchange events that are very quick after a user action
      }

      const state = this.#getCurrentHash();
      const parsedState = this.#parseState(state);

      if (parsedState === 'home') {
        // restore the homepage content
        // but don't refresh the homepage right away again when hitting the home page upon startup
        if (this.#hashEventCount > 1) {
          location.reload();
        }
        return;
      }

      // Dispatch custom event for state change
      this.#dispatchStateChangeEvent(parsedState);
    });
  }

  /**
   * Get current hash from window.location
   * @private
   */
  #getCurrentHash() {
    if (window.location.hash === '' || window.location.hash === '#') {
      return '#home';
    }
    return window.location.hash;
  }

  /**
   * get the state from the URL hash
   * @private
   */
  #parseState(hash) {
    let state = hash;

    if (state.indexOf('#') === 0) {
      state = state.substring(1);
    }

    try {
      state = decodeURIComponent(state);
    } catch (e) {
      state = '';
      console.log('Failed to decode state hash: ' + e.message);
    }

    return state;
  }

  /**
   * Dispatch a custom nav-state-change event with the parsed state
   * @private
   */
  #dispatchStateChangeEvent(state) {
    const event = new CustomEvent('nav-state-change', {
      detail: { state: state },
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Manually trigger a hash change event (e.g., on app initialization)
   * This is useful when the shared text plugin is not available
   * and we need to load state from the URL hash
   */
  triggerHashChange() {
    $(window).hashchange();
  }

  /**
   * Store the last hash event timestamp to throttle rapid hash changes
   * Called from DICT object when storing navigation state
   */
  recordHashEvent() {
    this.#lastHashEvent = new Date().getTime();
  }

  /**
   * Get the current hash from window.location
   * Returns '#home' if hash is empty or '#'
   * @returns {string} The current hash including '#' prefix
   */
  getCurrentHash() {
    return this.#getCurrentHash();
  }

  /**
   * Set the window.location.hash to a new value
   * @param {string} hash - The new hash value to set
   */
  setHash(hash) {
    window.location.hash = hash;
  }

  /**
   * Replace the current URL with a new one that has a different hash
   * @param {string} newUrlHash - The new URL hash to use
   */
  replaceUrl(newUrlHash) {
    const oldUrl = window.location.href;
    let newUrl;
    if (oldUrl.indexOf('#') !== -1) {
      newUrl = oldUrl.replace(window.location.hash, '#' + newUrlHash);
    } else {
      newUrl = oldUrl + '#' + newUrlHash;
    }
    window.location.replace(newUrl);
  }
}
