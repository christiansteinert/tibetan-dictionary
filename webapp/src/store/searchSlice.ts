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

export type SearchMode = 'term' | 'fulltext';

export interface InlineSection {
  id: string;
  wylie: string;
  content: string;
  title: string;
}

interface InputState {
  /** the current search mode */
  mode: SearchMode;

  /** Whether the extended settings panel is visible */
  extendedSettingsVisible: boolean;

  /** The search/input language: 'tib' or 'en' */
  inputLang: Language;
}

interface ResultListState {
  /** Whether the sidebar (result list) is visible on small screens */
  sidebarVisible: boolean;

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

/** A single result row returned by the fulltextSearch backend. */
export interface FTSSearchResult {
  /** The Wylie term that matched */
  term: string;
  /** The Wylie term with highlighted matches */
  highlightedTerm: string;
  /** The dictionary key (e.g. "RangjungYeshe") */
  dictionary: string;
  /** The numeric dictionary ID */
  dictionaryId: number;
  /** HTML snippet with <b> highlights */
  snippet: string;
  /** Complete dictionary entry */
  definition: string;
  /** Language of the headword */
  lang: Language;
  /** true when the snippet is only a portion of the full definition */
  isSnippetAbbreviated: boolean;
}

/** result list state for fulltext search results */
interface FTSResultListState {
  /** The current search query text */
  query: string;
  /** The inputLang that was active when results were last fetched */
  lang: Language;
  /** Pagination offset */
  offset: number;
  /** Current result set */
  results: FTSSearchResult[];
  /** Whether a search request is in flight */
  isSearching: boolean;
  /** Error message, if any */
  error: string | null;
}

interface DefinitionState {
  /** The currently active/displayed term (Wylie for Tibetan) */
  term: string;

  /** Definitions for the active term — the rendered HTML table */
  html: string;

  /** Inline Tibetan sections that have been confirmed as clickable links */
  inlineSections: Record<string, InlineSection>;

  /** Whether only the definition should be displayed without the sidebar or top bar */
  isDefinitionOnly: boolean;

  /** Whether a definition-read request is in flight */
  isLoading: boolean;

  /** Any error message from the last failed definition request */
  error: string | null;
}

interface SearchState {
  input: InputState;
  resultList: ResultListState;
  ftsResultList: FTSResultListState;
  definition: DefinitionState;
}

const initialState: SearchState = {
  input: {
    mode: 'term',
    extendedSettingsVisible: false,
    inputLang: 'tib',
  },
  resultList: {
    sidebarVisible: false,
    query: '',
    lang: 'tib',
    offset: 0,
    results: [],
    isSearching: false,
    error: null,
  },
  ftsResultList: {
    query: '',
    lang: 'tib',
    offset: 0,
    results: [],
    isSearching: false,
    error: null,
  },
  definition: {
    term: '',
    html: '',
    inlineSections: {},
    isLoading: false,
    isDefinitionOnly: false,
    error: null,
  },
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {

    setStateFromUrl(state, action: PayloadAction<{
      mode: SearchMode;
      extendedSettingsVisible: boolean;
      sidebarVisible: boolean;
      resultLang: Language;
      resultQuery: string;
      offset: number;
      definitionTerm: string;
    }>) {      
      state.input.mode = action.payload.mode;
      state.input.extendedSettingsVisible = action.payload.extendedSettingsVisible;
      state.resultList.sidebarVisible = action.payload.sidebarVisible;
      state.resultList.lang = action.payload.resultLang;
      state.resultList.query = action.payload.resultQuery;
      state.resultList.offset = action.payload.offset;
      state.definition.term = action.payload.definitionTerm;
      console.log('Set search state from URL:', action.payload);
    },

    /* --- Input --- */
    setInputState(state, action: PayloadAction<InputState>) {
      state.input = action.payload;
    },

    setSearchMode(state, action: PayloadAction<SearchMode>) {
      state.input.mode = action.payload || 'term';
    },
    setInputLang(state, action: PayloadAction<Language>) {
      if (action.payload) state.input.inputLang = action.payload;
    },
    setExtendedSettingsVisible(state, action: PayloadAction<boolean>) {
      state.input.extendedSettingsVisible = !!action.payload;
    },

    /* --- Term search results --- */
    setResultListState(state, action: PayloadAction<ResultListState>) {
      state.resultList = action.payload;
    },

    setSidebarVisible(state, action: PayloadAction<boolean>) {
      state.resultList.sidebarVisible = !!action.payload;
    },
    setResultListQuery(state, action: PayloadAction<string>) {
      state.resultList.query = action.payload || '';
    },
    setOffset(state, action: PayloadAction<number | string>) {
      state.resultList.offset = Math.max(0, parseInt(String(action.payload), 10) || 0);
    },
    setResultLang(state, action: PayloadAction<Language>) {
      state.resultList.lang = action.payload;
    },
    setResults(state, action: PayloadAction<TermListRow[]>) {
      state.resultList.results = action.payload || [];
      state.resultList.lang = state.input.inputLang;
    },
    setInlineSections(state, action: PayloadAction<Record<string, InlineSection>>) {
      state.definition.inlineSections = action.payload || {};
    },
    setIsSearching(state, action: PayloadAction<boolean>) {
      state.resultList.isSearching = !!action.payload;
    },
    setSearchError(state, action: PayloadAction<string | null>) {
      state.resultList.error = action.payload || null;
    },

    /* --- FTS search result --- */
    setFtsResultListState(state, action: PayloadAction<FTSResultListState>) {
      state.ftsResultList = action.payload;
    },

    setFtsResultListQuery(state, action: PayloadAction<string>) {
      state.ftsResultList.query = action.payload || '';
    },
    setFtsOffset(state, action: PayloadAction<number | string>) {
      state.ftsResultList.offset = Math.max(0, parseInt(String(action.payload), 10) || 0);
    },
    setFtsResults(state, action: PayloadAction<FTSSearchResult[]>) {
      state.ftsResultList.results = action.payload || [];
      state.ftsResultList.lang = state.input.inputLang;
    },
    setFtsIsSearching(state, action: PayloadAction<boolean>) {
      state.ftsResultList.isSearching = !!action.payload;
    },
    setFtsError(state, action: PayloadAction<string | null>) {
      state.ftsResultList.error = action.payload || null;
    },

    /* --- Definition --- */
    setDefinitionState(state, action: PayloadAction<DefinitionState>) {
      state.definition = action.payload;
    },
    setActiveTerm(state, action: PayloadAction<string>) {
      state.definition.term = action.payload || '';
    },
    setDefinitionHtml(state, action: PayloadAction<string>) {
      state.definition.html = action.payload;
    },
    setDefinitionOnly(state, action: PayloadAction<boolean>) {
      state.definition.isDefinitionOnly = !!action.payload;
    },
    setDefinitionError(state, action: PayloadAction<string>) {
      state.definition.error = action.payload;
    },
    setIsLoadingDefinition(state, action: PayloadAction<boolean>) {
      state.definition.isLoading = !!action.payload;
    },

    /** Reset the search state back to the initial values */
    resetSearch(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setStateFromUrl,

  setInputState,
  setSearchMode,
  setExtendedSettingsVisible,
  setInputLang,

  setResultListState,
  setSidebarVisible,
  setResultListQuery,
  setOffset,
  setResultLang,
  setResults,
  setInlineSections,
  setIsSearching,
  setSearchError,

  setFtsResultListState,
  setFtsResultListQuery,
  setFtsOffset,
  setFtsResults,
  setFtsIsSearching,
  setFtsError,

  setDefinitionState,
  setActiveTerm,
  setDefinitionHtml,
  setDefinitionOnly,
  setDefinitionError,
  setIsLoadingDefinition,

  resetSearch,
} = searchSlice.actions;

export default searchSlice.reducer;
