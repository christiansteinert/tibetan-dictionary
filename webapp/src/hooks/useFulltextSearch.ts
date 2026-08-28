/**
 * useFulltextSearch – orchestrates fulltext search operations.
 *
 * Reads from the PHP backend and writes to the Redux searchSlice. 
 * Converts Tibetan Unicode input to Wylie before sending to the backend.
 */
import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setFtsResults,
  setFtsIsSearching,
  setFtsError,
  setFtsOffset,
  setFtsResultListQuery,
} from '@/store/searchSlice';
import { fulltextSearch } from '@/services/DictionaryApi';
import { WylieConverter } from '@/utils/wylieConverter';
import { buildFtsQuery } from '@/utils/fts/ftsQueryBuilder';
import { ftsUniToWylie } from '@/utils/fts/ftsInputDecorator';
import type { Language } from '@/types';

const wylieConverter = new WylieConverter();

interface UseFulltextSearchReturn {
  search: (
    query: string,
    lang: Language,
    offset: number
  ) => Promise<void>;
}

// Use a shared ref outside the hook to prevent race conditions across multiple instances
const abortControllerRef = { current: null as AbortController | null };

export default function useFulltextSearch(): UseFulltextSearchReturn {
  const dispatch = useDispatch();
  const { activeDictionaries, listSize, unicode } = useSelector((s: RootState) => s.settings);

  const search = useCallback(
    async (
      query: string,
      lang: Language,
      offset = 0
    ) => {
      if (!query.trim()) {
        // Clearing the search: abort any in-flight request and reset state
        // so stale results can never re-populate the list.
        abortControllerRef.current?.abort();
        dispatch(setFtsResults([]));
        dispatch(setFtsIsSearching(false));
        dispatch(setFtsError(null));
        return;
      }

      // Convert Tibetan Unicode → Wylie per segment (preserving operators).
      // Sanskrit and English queries are already in their lookup form (IAST / plain text)
      // so no conversion is needed for those languages.
      let backendQuery = query.trim();
      if (lang === 'tib' && (unicode === true || unicode === 'output')) {
        backendQuery = ftsUniToWylie(backendQuery, wylieConverter);
        backendQuery = wylieConverter.trimWylie(backendQuery);
      }

      // Translate user operators (& | ! *) into FTS5 syntax
      backendQuery = buildFtsQuery(backendQuery);

      if (!backendQuery) {
        dispatch(setFtsResults([]));
        return;
      }

      dispatch(setFtsResultListQuery(query));
      dispatch(setFtsOffset(offset));
      dispatch(setFtsIsSearching(true));
      dispatch(setFtsError(null));

      // Cancel any previous in-flight request so stale responses never
      // overwrite the results of a newer query.
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await fulltextSearch(
          backendQuery,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries,
          controller.signal
        );
        dispatch(setFtsResults(results));
        dispatch(setFtsIsSearching(false));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // stale request — silently discard
        }
        console.error('Fulltext search error:', err);
        dispatch(
          setFtsError(err instanceof Error ? err.message : String(err))
        );
        dispatch(setFtsIsSearching(false));
      }
    },
    [dispatch, activeDictionaries, listSize, unicode]
  );

  return { search };
}
