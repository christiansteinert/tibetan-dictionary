/**
 * useSyncStateFromUrl – syncs URL params into the Redux store on every navigation.
 *
 * Reads route params and query string, then dispatches the corresponding
 * Redux actions. Also handles one-time initialization on first render
 * (input language, definitionOnly flag).
 *
 * Reusable across SearchLayout, FtsSearchLayout, and any other view that
 * is driven by the same URL scheme.
 */
import { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  type SearchMode,
  setStateFromUrl,
  setDefinitionOnly,
  setInputLang,
} from '@/store/searchSlice';
import type { Language } from '@/types';
import { WylieConverter } from '@/utils/wylieConverter';

export function useSyncStateFromUrl() {
  const { lang: urlLangParam, term: urlTermParam } = useParams<{ lang: string; term: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const isFirstRender = useRef(true);
  const wylieConverter = useRef(new WylieConverter());

  useEffect(() => {
    if (isFirstRender.current) {
      // On first load, initialize input language from the URL (if present).
      dispatch(setInputLang((urlLangParam || 'tib') as Language));
      isFirstRender.current = false;

      if (searchParams.get('definitionOnly') === 'true') {
        dispatch(setDefinitionOnly(true));
      }
    }

    const isFts = location.hash.startsWith('#/fts-search');

    // handle cases where the URL contains Unicode Tibetan (e.g. from a shared link) by converting it back to Wylie
    let resultQuery = decodeURIComponent(urlTermParam || searchParams.get('activeTerm') || '');
    if (/[\u0F00-\u0FFF]/.test(resultQuery)) {
      resultQuery = wylieConverter.current.uniToWylie(resultQuery);
    }
    let definitionTerm = decodeURIComponent(searchParams.get('activeTerm') || '');
    if (/[\u0F00-\u0FFF]/.test(definitionTerm)) {
      definitionTerm = wylieConverter.current.uniToWylie(definitionTerm);
    }

    dispatch(setStateFromUrl({
      mode: isFts ? 'fulltext' : 'term',
      extendedSettingsVisible: searchParams.get('ext') === 'true',
      sidebarVisible: searchParams.get('sidebar') === 'true',
      resultLang: (urlLangParam as Language) || 'tib',
      resultQuery,
      offset: parseInt(searchParams.get('offset') || '0', 10),
      definitionTerm,
    }));
  }, [dispatch, urlLangParam, urlTermParam, searchParams, location]);
}
