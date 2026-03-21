/**
 * Redux slice for search-related state.
 *
 * Tracks the current search term, language, pagination offset,
 * sidebar visibility, and the list of results.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Language } from '@/types';

interface InlineSection {
  id: string;
  content: string;
  title: string;
}

interface SearchState {
  /* --- Loading state --- */

  /** Whether a search request is in flight */
  isSearching: boolean;

  /** Whether a definition-read request is in flight */
  isLoadingDefinition: boolean;

  /** Any error message from the last failed request */
  error: string | null;


  /* --- Input settings --- */

  /** The search language: 'tib' or 'en' */
  lang: Language;

  /** The input language (may differ from lang during transitions) */
  inputLang: Language;

  /* --- Active Results --- */

  /** The last search term that was sent to the API */
  currentListTerm: string; // TODO: rename to query

  /** The inputLang that was active when results were last fetched */
  resultsLang: Language;

  /** Pagination offset for search results */
  offset: number;

  /** Whether the sidebar (result list) is visible on small screens */
  sidebarVisible: boolean;

  /** Current search results — array of term string arrays */
  results: string[][];

  /* --- Definition area --- */

  /** The currently active/displayed term (Wylie for Tibetan) */
  activeTerm: string;

  /** Definitions for the active term — the rendered HTML table */
  definitions: string | null;

  /** Inline Tibetan sections that have been confirmed as clickable links */
  inlineSections: Record<string, InlineSection>;
}

const initialState: SearchState = {
  activeTerm: '',
  lang: 'tib',
  inputLang: 'tib',
  currentListTerm: '',
  sidebarVisible: false,
  offset: 0,
  results: [],
  resultsLang: 'tib',
  definitions: null,
  inlineSections: {},
  isSearching: false,
  isLoadingDefinition: false,
  error: null,
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setActiveTerm(state, action: PayloadAction<string>) {
      state.activeTerm = action.payload || '';
    },
    setLang(state, action: PayloadAction<Language>) {
      if (action.payload) state.lang = action.payload;
    },
    setInputLang(state, action: PayloadAction<Language>) {
      if (action.payload) state.inputLang = action.payload;
    },
    setCurrentListTerm(state, action: PayloadAction<string>) {
      state.currentListTerm = action.payload || '';
    },
    setSidebarVisible(state, action: PayloadAction<boolean>) {
      state.sidebarVisible = !!action.payload;
    },
    setOffset(state, action: PayloadAction<number | string>) {
      state.offset = Math.max(0, parseInt(String(action.payload), 10) || 0);
    },
    setResults(state, action: PayloadAction<string[][]>) {
      state.results = action.payload || [];
      state.resultsLang = state.inputLang;
    },
    setDefinitions(state, action: PayloadAction<string | null>) {
      state.definitions = action.payload || null;
    },
    setInlineSections(state, action: PayloadAction<Record<string, InlineSection>>) {
      state.inlineSections = action.payload || {};
    },
    setIsSearching(state, action: PayloadAction<boolean>) {
      state.isSearching = !!action.payload;
    },
    setIsLoadingDefinition(state, action: PayloadAction<boolean>) {
      state.isLoadingDefinition = !!action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
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
