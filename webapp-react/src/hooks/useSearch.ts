/**
 * useSearch – orchestrates search operations.
 * Reads from backend and writes to the Redux search slice.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import {
  setResults,
  setCurrentListTerm,
  setOffset,
  setIsSearching,
  setError,
  setSidebarVisible,
} from '../store/searchSlice';
import { readTermList } from '../services/DictionaryApi';
import { WylieConverter } from '../utils/wylieConverter';
import type { Language } from '../types';

const wylieConverter = new WylieConverter();

/**
 * Normalize raw input text into a search term.
 * For Tibetan: converts Unicode → Wylie and trims trailing tsheg/spaces.
 * For English: returns text as-is.
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
  return inputText;
}

interface UseSearchReturn {
  search: (rawInput: string, lang: Language, offset?: number) => Promise<{
    searchTerm: string;
    results: string[][];
  }>;
  normalizeSearchTerm: (raw: string, lang: Language) => string;
}

export default function useSearch(): UseSearchReturn {
  const dispatch = useDispatch();
  const { currentListTerm, offset: storeOffset } = useSelector(
    (s: RootState) => s.search
  );
  const { activeDictionaries, listSize, unicode } = useSelector(
    (s: RootState) => s.settings
  );

  /**
   * Run a search. Updates Redux with the results.
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
        typeof unicode === 'boolean' ? unicode : false
      );
      if (offset < 0) offset = 0;

      if (!searchTerm) {
        dispatch(setResults([]));
        dispatch(setSidebarVisible(true));
        return { searchTerm: '', results: [] };
      }

      // Skip API call if the list is already showing the same term & offset
      if (searchTerm === currentListTerm && offset === storeOffset) {
        return { searchTerm, results: [] };
      }

      dispatch(setIsSearching(true));
      dispatch(setError(null));

      try {
        const results = await readTermList(
          searchTerm,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries
        );

        dispatch(setResults(results));
        dispatch(setCurrentListTerm(searchTerm));
        dispatch(setOffset(offset));
        dispatch(setIsSearching(false));

        return { searchTerm, results };
      } catch (err) {
        console.error('Search error:', err);
        dispatch(setError(err instanceof Error ? err.message : String(err)));
        dispatch(setIsSearching(false));
        return { searchTerm, results: [] };
      }
    },
    [dispatch, currentListTerm, storeOffset, activeDictionaries, listSize, unicode]
  );

  return {
    search,
    normalizeSearchTerm: (raw, lang) =>
      normalizeSearchTerm(raw, lang, typeof unicode === 'boolean' ? unicode : false),
  };
}
