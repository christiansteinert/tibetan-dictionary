/**
 * Redux slice for user settings.
 *
 * Persisted to localStorage so they survive page reloads.
 * Includes dictionary selection, layout, unicode mode, etc.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DICTLIST, GROUPED_DICTLIST, type DictEntry } from '@/config/dictlist';
import { GLOBAL_SETTINGS } from '@/config/globalSettings';

interface SettingsState {
  unicode: boolean | 'output';
  lowercase: boolean;
  listSize: number;
  layout: string;
  activeDictionaries: string[];
  inactiveDictionaries: string[];
}

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
function getAllDictionaryIds(): string[] {
  const isLocalhost =
    window.location?.hostname?.startsWith('localhost');
  const publicOnly = GLOBAL_SETTINGS.publicOnly && !isLocalhost;

  return Object.keys(DICTLIST).filter((id) => {
    const info = DICTLIST[id] as DictEntry;
    if (info.webOnly && !!(window as any).cordova) return false;
    if (publicOnly && info.public) return false;
    return true;
  });
}

/**
 * Build the default settings object.
 */
function getDefaultSettings(): SettingsState {
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
function loadSettings(): SettingsState {
  if (!window.localStorage) return getDefaultSettings();

  const raw = localStorage.getItem('settings');
  if (!raw) return getDefaultSettings();

  try {
    const saved: Record<string, unknown> = JSON.parse(raw);

    // Normalise legacy string booleans
    if (saved.unicode === 'true') saved.unicode = true;
    if (saved.unicode === 'false') saved.unicode = false;

    if (!saved.inactiveDictionaries) saved.inactiveDictionaries = [];
    if (!saved.listSize) saved.listSize = 10;
    if (typeof saved.listSize === 'number' && saved.listSize > 500) saved.listSize = 500;

    // Add any dictionaries that were added since the user last saved
    const allIds = getAllDictionaryIds();
    const savedActiveDicts = Array.isArray(saved.activeDictionaries) ? saved.activeDictionaries : [];
    const savedInactiveDicts = Array.isArray(saved.inactiveDictionaries) ? saved.inactiveDictionaries : [];
    
    const newDicts = allIds.filter(
      (id) =>
        !savedActiveDicts.includes(id as never) &&
        !savedInactiveDicts.includes(id as never)
    );
    saved.activeDictionaries = (savedActiveDicts as string[]).concat(newDicts);

    return saved as unknown as SettingsState;
  } catch {
    return getDefaultSettings();
  }
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const loaded = loadSettings();

const initialState: SettingsState = {
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
    setUnicode(state, action: PayloadAction<boolean | 'output' | string>) {
      let v: boolean | 'output' | string = action.payload;
      if (v === 'true') v = true;
      if (v === 'false') v = false;
      if (v === true || v === false || v === 'output') {
        state.unicode = v;
      }
    },
    setLowercase(state, action: PayloadAction<boolean>) {
      state.lowercase = !!action.payload;
    },
    setListSize(state, action: PayloadAction<number>) {
      const n = Number(action.payload);
      if (n > 0 && n <= 500) state.listSize = n;
    },
    setLayout(state, action: PayloadAction<string>) {
      state.layout = action.payload;
    },
    setDictionaries(state, action: PayloadAction<{ active: string[]; inactive: string[] }>) {
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
    restoreSettings(state, action: PayloadAction<SettingsState>) {
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
