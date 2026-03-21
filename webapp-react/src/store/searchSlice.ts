/**
 * Redux slice for search-related state.
 *
 * State is organised into three sub-objects:
 *   input      – the user's current language selection and sidebar visibility
 *   resultList – the last committed term-list query and its results
 *   definition – the currently open definition entry
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Language } from '@/types';
import type { TermListRow } from '@/services/DictionaryApi';

export interface InlineSection {
  id: string;
  wylie: string;
  content: string;
  title: string;
}

interface InputState {
  /** The search/input language: 'tib' or 'en' */
  inputLang: Language;

  /** Whether the sidebar (result list) is visible on small screens */
  sidebarVisible: boolean;
}

interface ResultListState {
  /** The last search term that was sent to the API */
  query: string;

  /** The inputLang that was active when results were last fetched */
  lang: Language;

  /** Pagination offset for search results */
  offset: number;

  /** Current search results */
  results: TermListRow[];

  /** Whether a search request is in flight */
  isSearching: boolean;

  /** Any error message from the last failed search request */
  error: string | null;
}

interface DefinitionState {
  /** The currently active/displayed term (Wylie for Tibetan) */
  term: string;

  /** Definitions for the active term — the rendered HTML table */
  html: string | null;

  /** Inline Tibetan sections that have been confirmed as clickable links */
  inlineSections: Record<string, InlineSection>;

  /** Whether a definition-read request is in flight */
  isLoading: boolean;

  /** Any error message from the last failed definition request */
  error: string | null;
}

interface SearchState {
  input: InputState;
  resultList: ResultListState;
  definition: DefinitionState;
}

const initialState: SearchState = {
  input: {
    inputLang: 'tib',
    sidebarVisible: false,
  },
  resultList: {
    query: '',
    lang: 'tib',
    offset: 0,
    results: [],
    isSearching: false,
    error: null,
  },
  definition: {
    term: '',
    html: null,
    inlineSections: {},
    isLoading: false,
    error: null,
  },
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setInputLang(state, action: PayloadAction<Language>) {
      if (action.payload) state.input.inputLang = action.payload;
    },
    setSidebarVisible(state, action: PayloadAction<boolean>) {
      state.input.sidebarVisible = !!action.payload;
    },
    setResultListQuery(state, action: PayloadAction<string>) {
      state.resultList.query = action.payload || '';
    },
    setOffset(state, action: PayloadAction<number | string>) {
      state.resultList.offset = Math.max(0, parseInt(String(action.payload), 10) || 0);
    },
    setResults(state, action: PayloadAction<TermListRow[]>) {
      state.resultList.results = action.payload || [];
      state.resultList.lang = state.input.inputLang;
    },
    setIsSearching(state, action: PayloadAction<boolean>) {
      state.resultList.isSearching = !!action.payload;
    },
    setSearchError(state, action: PayloadAction<string | null>) {
      state.resultList.error = action.payload || null;
    },
    setActiveTerm(state, action: PayloadAction<string>) {
      state.definition.term = action.payload || '';
    },
    setDefinitions(state, action: PayloadAction<string | null>) {
      state.definition.html = action.payload || null;
    },
    setInlineSections(state, action: PayloadAction<Record<string, InlineSection>>) {
      state.definition.inlineSections = action.payload || {};
    },
    setIsLoadingDefinition(state, action: PayloadAction<boolean>) {
      state.definition.isLoading = !!action.payload;
    },
    setDefinitionError(state, action: PayloadAction<string | null>) {
      state.definition.error = action.payload || null;
    },
    /** Reset the search state back to the initial values */
    resetSearch(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setInputLang,
  setSidebarVisible,
  setResultListQuery,
  setOffset,
  setResults,
  setIsSearching,
  setSearchError,
  setActiveTerm,
  setDefinitions,
  setInlineSections,
  setIsLoadingDefinition,
  setDefinitionError,
  resetSearch,
} = searchSlice.actions;

export default searchSlice.reducer;
