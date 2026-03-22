/**
 * useExtendedSearch – orchestrates fulltext search operations.
 *
 * Reads from the PHP backend and writes to the Redux searchSlice. 
 * Converts Tibetan Unicode input to Wylie before sending to the backend.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setFtsResults,
  setFtsIsSearching,
  setFtsError,
  setFtsOffset,
  setFtsResultListQuery,
  type SearchMode,
} from '@/store/searchSlice';
import { fulltextSearch } from '@/services/DictionaryApi';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';

const wylieConverter = new WylieConverter();

interface UseExtendedSearchReturn {
  search: (
    query: string,
    lang: Language,
    mode: SearchMode,
    offset?: number
  ) => Promise<void>;
}

export default function useExtendedSearch(): UseExtendedSearchReturn {
  const dispatch = useDispatch();
  const { activeDictionaries, listSize, unicode } = useSelector((s: RootState) => s.settings);

  const search = useCallback(
    async (
      query: string,
      lang: Language,
      mode: SearchMode,
      offset = 0
    ) => {
      if (!query.trim()) {
        dispatch(setFtsResults([]));
        return;
      }

      // Convert Tibetan Unicode input → Wylie for the backend
      let backendQuery = query.trim();
      if (lang === 'tib' && (unicode === true || unicode === 'output')) {
        backendQuery = wylieConverter.uniToWylie(backendQuery);
        backendQuery = wylieConverter.trimWylie(backendQuery);
      }

      if (!backendQuery) {
        dispatch(setFtsResults([]));
        return;
      }

      dispatch(setFtsResultListQuery(query));
      dispatch(setFtsOffset(offset));
      dispatch(setFtsIsSearching(true));
      dispatch(setFtsError(null));

      try {
        const fn = fulltextSearch;
        const results = await fn(
          backendQuery,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries
        );
        dispatch(setFtsResults(results));
        dispatch(setFtsIsSearching(false));
      } catch (err) {
        console.error('Extended search error:', err);
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
