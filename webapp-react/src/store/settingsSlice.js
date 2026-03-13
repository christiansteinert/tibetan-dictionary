/**
 * Redux slice for user settings.
 *
 * Persisted to localStorage so they survive page reloads.
 * Includes dictionary selection, layout, unicode mode, etc.
 */
import { createSlice } from '@reduxjs/toolkit';
import { DICTLIST, GROUPED_DICTLIST } from '../config/dictlist';
import { GLOBAL_SETTINGS } from '../config/globalSettings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isMobileDevice =
  /iPhone|iPad|iPod|Android|BlackBerry|IEMobile/i.test(navigator.userAgent);

/**
 * Return all dictionary IDs that should be available to the user.
 * Filters out private dictionaries when running in public-only mode and
 * webOnly dictionaries when running inside Cordova.
 */
function getAllDictionaryIds() {
  const isLocalhost =
    window.location?.hostname?.startsWith('localhost');
  const publicOnly = GLOBAL_SETTINGS.publicOnly && !isLocalhost;

  return Object.keys(DICTLIST).filter((id) => {
    const info = DICTLIST[id];
    if (info.webOnly && window.cordova) return false;
    if (publicOnly && info.public !== 'true') return false;
    return true;
  });
}

/**
 * Build the default settings object.
 */
function getDefaultSettings() {
  return {
    layout: 'layout_white',
    unicode: true,
    lowercase: isMobileDevice,
    activeDictionaries: getAllDictionaryIds(),
    inactiveDictionaries: [],
    listSize: 10,
  };
}

/**
 * Load settings from localStorage, merging with defaults so that
 * newly-added dictionaries are automatically included.
 */
function loadSettings() {
  if (!window.localStorage) return getDefaultSettings();

  const raw = localStorage.getItem('settings');
  if (!raw) return getDefaultSettings();

  try {
    const saved = JSON.parse(raw);

    // Normalise legacy string booleans
    if (saved.unicode === 'true') saved.unicode = true;
    if (saved.unicode === 'false') saved.unicode = false;

    if (!saved.inactiveDictionaries) saved.inactiveDictionaries = [];
    if (!saved.listSize) saved.listSize = 10;
    if (saved.listSize > 500) saved.listSize = 500;

    // Add any dictionaries that were added since the user last saved
    const allIds = getAllDictionaryIds();
    const newDicts = allIds.filter(
      (id) =>
        !saved.activeDictionaries?.includes(id) &&
        !saved.inactiveDictionaries?.includes(id)
    );
    saved.activeDictionaries = (saved.activeDictionaries || []).concat(newDicts);

    return saved;
  } catch {
    return getDefaultSettings();
  }
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const loaded = loadSettings();

const initialState = {
  unicode: loaded.unicode,
  lowercase: loaded.lowercase,
  listSize: loaded.listSize,
  layout: loaded.layout,
  activeDictionaries: loaded.activeDictionaries,
  inactiveDictionaries: loaded.inactiveDictionaries,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUnicode(state, action) {
      let v = action.payload;
      if (v === 'true') v = true;
      if (v === 'false') v = false;
      if (v === true || v === false || v === 'output') {
        state.unicode = v;
      }
    },
    setLowercase(state, action) {
      state.lowercase = !!action.payload;
    },
    setListSize(state, action) {
      const n = Number(action.payload);
      if (n > 0 && n <= 500) state.listSize = n;
    },
    setLayout(state, action) {
      state.layout = action.payload;
    },
    setDictionaries(state, action) {
      const { active, inactive } = action.payload;
      state.activeDictionaries = active;
      state.inactiveDictionaries = inactive;
    },
    /** Replace the entire settings object (e.g. on "Reset to defaults") */
    resetSettings(state) {
      const defaults = getDefaultSettings();
      Object.assign(state, defaults);
    },
    /** Restore settings from a previously-captured snapshot (e.g. on Cancel) */
    restoreSettings(state, action) {
      Object.assign(state, action.payload);
    },
  },
});

export const {
  setUnicode,
  setLowercase,
  setListSize,
  setLayout,
  setDictionaries,
  resetSettings,
  restoreSettings,
} = settingsSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectAllDictionaryIds = () => getAllDictionaryIds();
export const selectGroupedDictlist = () => GROUPED_DICTLIST;
export const selectDictlist = () => DICTLIST;

// ---------------------------------------------------------------------------
// Export helpers used by components
// ---------------------------------------------------------------------------

export { getAllDictionaryIds, getDefaultSettings, isMobileDevice };

export default settingsSlice.reducer;
