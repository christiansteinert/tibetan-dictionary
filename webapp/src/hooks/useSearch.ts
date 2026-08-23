/**
 * useSearch – orchestrates search operations.
 * Reads from backend and writes to the Redux search slice.
 */
import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setResults,
  setResultListState,
  setIsSearching,
  setSearchError,
} from '@/store/searchSlice';
import { readTermList } from '@/services/DictionaryApi';
import type { TermListRow } from '@/services/DictionaryApi';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';

const wylieConverter = new WylieConverter();

/**
 * Normalize raw input text into a search term.
 * For Tibetan: converts Unicode → Wylie and trims trailing tsheg/spaces.
 * For English / Sanskrit: returns text as-is.
 */
export function normalizeSearchTerm(
  inputText: string,
  lang: Language,
  useUnicodeTibetan: boolean
): string {
  if (lang === 'tib') {
    if (useUnicodeTibetan) {
      inputText = wylieConverter.uniToWylie(inputText);
    }
    inputText = wylieConverter.trimWylie(inputText);
  }
  // Sanskrit and English: no conversion needed — the term is already in
  // the correct lookup form (IAST for Sanskrit, plain text for English).
  return inputText;
}

interface UseSearchReturn {
  search: (rawInput: string, lang: Language, offset?: number) => Promise<{
    searchTerm: string;
    results: TermListRow[];
  }>;
  normalizeSearchTerm: (raw: string, lang: Language) => string;
}

export default function useSearch(): UseSearchReturn {
  const dispatch = useDispatch();
  const { activeDictionaries, listSize, unicode } = useSelector((s: RootState) => s.settings);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Run a search. Updates Redux with the results.
   * Aborts any previous in-flight request before starting a new one.
   * An empty search term clears the result list.
   *
   * @param rawInput – raw text from the input field
   * @param lang – 'tib' or 'en'
   * @param offset – pagination offset (≥ 0)
   */
  const search = useCallback(
    async (rawInput: string, lang: Language, offset = 0) => {
      const searchTerm = normalizeSearchTerm(
        rawInput,
        lang,
        unicode !== false
      );
      if (offset < 0) offset = 0;

      if (!searchTerm) {
        // Clearing the search: abort any in-flight request and reset state
        // so stale results can never re-populate the list.
        abortControllerRef.current?.abort();
        dispatch(setResults([]));
        dispatch(setIsSearching(false));
        dispatch(setSearchError(null));
        return { searchTerm: '', results: [] };
      }

      // Cancel any previous in-flight request so stale responses never
      // overwrite the results of a newer query.
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      dispatch(setIsSearching(true));
      dispatch(setSearchError(null));

      try {
        const results = await readTermList(
          searchTerm,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries,
          controller.signal
        );

        dispatch(setResultListState({
          query: searchTerm,
          lang: lang,
          offset: offset,
          results: results,
          isSearching: false,
          error: null,
        }));
    
        return { searchTerm, results };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { searchTerm, results: [] }; // stale request — silently discard
        }
        console.error('Search error:', err);
        dispatch(setSearchError(err instanceof Error ? err.message : String(err)));
        dispatch(setIsSearching(false));
        dispatch(setResults([]));
        return { searchTerm, results: [] };
      }
    },
    [dispatch]
  );

  return {
    search,
    normalizeSearchTerm: (raw, lang) =>
      normalizeSearchTerm(raw, lang, typeof unicode === 'boolean' ? unicode : false),
  };
}
