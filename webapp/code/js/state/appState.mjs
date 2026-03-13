/**
 * Application State Manager
 * Keeps all application state and allows subscribing to update events for reactive updates.
 */
export class AppState {
  UIState = {
    HOME: {},
    SETTINGS: {},
    SEARCH_RESULTS: {},
  };

  #state = {
    // state based on user preferences
    useUnicodeTibetan: true,

    // active navigation step
    uiState: this.UIState.HOME,

    // dynamic state
    activeTerm: '',
    lang: 'tib',
    inputLang: 'tib',
    currentListTerm: '',
    sidebarVisible: false,
    offset: 0,
    searchMode: 'standard',
  };

  #listeners = {};
  #lastStoredState = {};

  // Generic setter with change detection and event emission
  #set(key, value) {
    if (this.#state[key] !== value) {
      const oldValue = this.#state[key];
      this.#state[key] = value;
      this.#emit(key + 'Changed', { oldValue, newValue: value });
    }
  }

  // Property accessors with validation
  get activeTerm() { return this.#state.activeTerm; }
  set activeTerm(v) { this.#set('activeTerm', v || ''); }

  get lang() { return this.#state.lang; }
  set lang(v) { if (v) this.#set('lang', v); }

  get inputLang() { return this.#state.inputLang; }
  set inputLang(v) { if (v) this.#set('inputLang', v); }

  get currentListTerm() { return this.#state.currentListTerm; }
  set currentListTerm(v) { this.#set('currentListTerm', v || ''); }

  get sidebarVisible() { return this.#state.sidebarVisible; }
  set sidebarVisible(v) { this.#set('sidebarVisible', !!v); }

  get offset() { return this.#state.offset; }
  set offset(v) { this.#set('offset', Math.max(0, parseInt(v, 10) || 0)); }

  get searchMode() { return this.#state.searchMode; }
  set searchMode(v) { if (v === 'standard' || v === 'extended') this.#set('searchMode', v); }

  get useUnicodeTibetan() { return this.#state.useUnicodeTibetan; }
  set useUnicodeTibetan(v) {
    if (v === 'true') v = true;
    if (v === 'false') v = false;
    if (v === true || v === false || v === 'output') this.#set('useUnicodeTibetan', v);
  }

  /**
   * Simple event system: allows subscribing to state changes. 
   * Events are named as "<propertyName>Changed", e.g. "langChanged".
   * 
   * @param {string} event - Event name
   * @param {function} cb - Callback function to invoke on event
   * @returns {function} Unsubscribe function
   */
  on(event, cb) {
    (this.#listeners[event] ||= []).push(cb);
    return () => { this.#listeners[event] = this.#listeners[event].filter(f => f !== cb); };
  }

  #emit(event, data) {
    (this.#listeners[event] || []).forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
  }

  // State snapshots for URL hash serialization
  getSnapshot() {
    const snapshot = {
      searchMode: this.#state.searchMode,
      activeTerm: this.#state.activeTerm,
      lang: this.#state.lang,
      inputLang: this.#state.inputLang,
      currentListTerm: this.#state.currentListTerm,
      forceLeftSideVisible: this.#state.sidebarVisible,
      offset: this.#state.offset,
    };
    return snapshot;
  }

  getSnapshotAsString() { return JSON.stringify(this.getSnapshot()); }

  restoreFromSnapshot(s) {
    if (!s) return;
    ['activeTerm', 'lang', 'inputLang', 'currentListTerm', 'offset', 'searchMode'].forEach(k => {
      if (s[k] !== undefined) this[k] = s[k];
    });
    if (s.forceLeftSideVisible !== undefined) this.sidebarVisible = s.forceLeftSideVisible;
    else if (s.sidebarVisible !== undefined) this.sidebarVisible = s.sidebarVisible;
  }

  // Navigation state tracking
  getLastStoredState() { return { ...this.#lastStoredState }; }
  markStateAsStored() { this.#lastStoredState = this.getSnapshot(); }
}
