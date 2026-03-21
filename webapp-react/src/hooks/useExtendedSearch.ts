/**
 * useExtendedSearch – orchestrates fulltext search operations.
 *
 * Reads from the PHP backend and writes to the Redux extendedSearchSlice.
 * Converts Tibetan Unicode input to Wylie before sending to the backend.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setExtResults,
  setExtIsSearching,
  setExtError,
  setExtOffset,
  setExtQuery,
  type ExtendedSearchMode,
} from '@/store/extendedSearchSlice';
import { fulltextSearch } from '@/services/DictionaryApi';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';

const wylieConverter = new WylieConverter();

interface UseExtendedSearchReturn {
  search: (
    query: string,
    lang: Language,
    mode: ExtendedSearchMode,
    offset?: number
  ) => Promise<void>;
}

export default function useExtendedSearch(): UseExtendedSearchReturn {
  const dispatch = useDispatch();
  const { activeDictionaries, listSize } = useSelector(
    (s: RootState) => s.settings
  );
  const unicode = useSelector((s: RootState) => s.settings.unicode);

  const search = useCallback(
    async (
      query: string,
      lang: Language,
      mode: ExtendedSearchMode,
      offset = 0
    ) => {
      if (!query.trim()) {
        dispatch(setExtResults([]));
        return;
      }

      // Convert Tibetan Unicode input → Wylie for the backend
      let backendQuery = query.trim();
      if (lang === 'tib' && (unicode === true || unicode === 'output')) {
        backendQuery = wylieConverter.uniToWylie(backendQuery);
        backendQuery = wylieConverter.trimWylie(backendQuery);
      }

      if (!backendQuery) {
        dispatch(setExtResults([]));
        return;
      }

      dispatch(setExtQuery(query));
      dispatch(setExtOffset(offset));
      dispatch(setExtIsSearching(true));
      dispatch(setExtError(null));

      try {
        const fn = fulltextSearch;
        const results = await fn(
          backendQuery,
          lang,
          offset,
          listSize + 1, // fetch one extra to detect "has next page"
          activeDictionaries
        );
        dispatch(setExtResults(results));
        dispatch(setExtIsSearching(false));
      } catch (err) {
        console.error('Extended search error:', err);
        dispatch(
          setExtError(err instanceof Error ? err.message : String(err))
        );
        dispatch(setExtIsSearching(false));
      }
    },
    [dispatch, activeDictionaries, listSize, unicode]
  );

  return { search };
}
