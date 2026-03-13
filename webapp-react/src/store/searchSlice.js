/**
 * Redux slice for search-related state.
 *
 * Tracks the current search term, language, pagination offset,
 * sidebar visibility, and the list of results.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  /** The currently active/displayed term (Wylie for Tibetan) */
  activeTerm: '',

  /** The search language: 'tib' or 'en' */
  lang: 'tib',

  /** The input language (may differ from lang during transitions) */
  inputLang: 'tib',

  /** The last search term that was sent to the API */
  currentListTerm: '',

  /** Whether the sidebar (result list) is visible on small screens */
  sidebarVisible: false,

  /** Pagination offset for search results */
  offset: 0,

  /** Current search results — array of [term] arrays */
  results: [],

  /** Definitions for the active term — { dictId: htmlString, ... } */
  definitions: null,

  /** Inline Tibetan sections that have been confirmed as clickable links */
  inlineSections: {},

  /** Whether a search request is in flight */
  isSearching: false,

  /** Whether a definition-read request is in flight */
  isLoadingDefinition: false,

  /** Any error message from the last failed request */
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setActiveTerm(state, action) {
      state.activeTerm = action.payload || '';
    },
    setLang(state, action) {
      if (action.payload) state.lang = action.payload;
    },
    setInputLang(state, action) {
      if (action.payload) state.inputLang = action.payload;
    },
    setCurrentListTerm(state, action) {
      state.currentListTerm = action.payload || '';
    },
    setSidebarVisible(state, action) {
      state.sidebarVisible = !!action.payload;
    },
    setOffset(state, action) {
      state.offset = Math.max(0, parseInt(action.payload, 10) || 0);
    },
    setResults(state, action) {
      state.results = action.payload || [];
    },
    setDefinitions(state, action) {
      state.definitions = action.payload;
    },
    setInlineSections(state, action) {
      state.inlineSections = action.payload || {};
    },
    setIsSearching(state, action) {
      state.isSearching = !!action.payload;
    },
    setIsLoadingDefinition(state, action) {
      state.isLoadingDefinition = !!action.payload;
    },
    setError(state, action) {
      state.error = action.payload || null;
    },
    /** Reset the search state back to the initial values */
    resetSearch(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setActiveTerm,
  setLang,
  setInputLang,
  setCurrentListTerm,
  setSidebarVisible,
  setOffset,
  setResults,
  setDefinitions,
  setInlineSections,
  setIsSearching,
  setIsLoadingDefinition,
  setError,
  resetSearch,
} = searchSlice.actions;

export default searchSlice.reducer;
