/**
 * useSearch – orchestrates search operations.
 * Reads from backend and writes to the Redux search slice.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setResults,
  setResultListState,
  setIsSearching,
  setSearchError,
  setSidebarVisible,
} from '@/store/searchSlice';
import { readTermList } from '@/services/DictionaryApi';
import type { TermListRow } from '@/services/DictionaryApi';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';

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
    results: TermListRow[];
  }>;
  normalizeSearchTerm: (raw: string, lang: Language) => string;
}

export default function useSearch(): UseSearchReturn {
  const dispatch = useDispatch();
  const { activeDictionaries, listSize, unicode } = useSelector((s: RootState) => s.settings);

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
        unicode !== false
      );
      if (offset < 0) offset = 0;

      if (!searchTerm) {
        dispatch(setResults([]));
        dispatch(setSidebarVisible(true));
        return { searchTerm: '', results: [] };
      }

      dispatch(setIsSearching(true));
      dispatch(setSearchError(null));

      try {
        const results = await readTermList(
          searchTerm,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries
        );

        dispatch(setResultListState({
          query: searchTerm,
          lang: lang,
          offset: offset,
          results: results,
          sidebarVisible: true,
          isSearching: false,
          error: null,
        }));
    
        return { searchTerm, results };
      } catch (err) {
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
