/**
 * useSearch – orchestrates search operations.
 *
 * Encapsulates the logic that was formerly spread across
 * DICT.search(), DICT._processSearchResults(), and SearchController.
 *
 * Reads from and writes to the Redux search slice.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

const wylieConverter = new WylieConverter();

/**
 * Normalize raw input text into a search term.
 * For Tibetan: converts Unicode → Wylie and trims trailing tsheg/spaces.
 * For English: returns text as-is.
 */
export function normalizeSearchTerm(inputText, lang, useUnicodeTibetan) {
  if (lang === 'tib') {
    if (useUnicodeTibetan) {
      inputText = wylieConverter.uniToWylie(inputText);
    }
    inputText = wylieConverter.trimWylie(inputText);
  }
  return inputText;
}

export default function useSearch() {
  const dispatch = useDispatch();
  const { currentListTerm, offset: storeOffset } = useSelector(
    (s) => s.search
  );
  const { activeDictionaries, listSize, unicode } = useSelector(
    (s) => s.settings
  );

  /**
   * Run a search. Updates Redux with the results.
   *
   * @param {string} rawInput  – raw text from the input field
   * @param {string} lang      – 'tib' or 'en'
   * @param {number} offset    – pagination offset (≥ 0)
   * @returns {Promise<{searchTerm: string, results: Array}>}
   */
  const search = useCallback(
    async (rawInput, lang, offset = 0) => {
      const searchTerm = normalizeSearchTerm(rawInput, lang, unicode);
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
        dispatch(setError(err.message));
        dispatch(setIsSearching(false));
        return { searchTerm, results: [] };
      }
    },
    [dispatch, currentListTerm, storeOffset, activeDictionaries, listSize, unicode]
  );

  return { search, normalizeSearchTerm: (raw, lang) => normalizeSearchTerm(raw, lang, unicode) };
}
