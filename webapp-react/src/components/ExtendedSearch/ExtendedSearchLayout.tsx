/**
 * ExtendedSearchLayout – the route component for fulltext / wildcard search.
 *
 * Reads search parameters from URL query params so that the search state
 * survives browser back/forward navigation.
 *
 * The search input and options bar live in TopBar; this component only
 * handles syncing URL params → Redux, triggering API calls, pagination,
 * and rendering the result list.
 *
 * URL format:
 *   #/extended-search?q=<query>&lang=<tib|en>&mode=<fulltext|wildcard>&offset=0
 */
import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import {
  setInputLang,
  setSearchMode,
  type SearchMode,
} from '@/store/searchSlice';
import useExtendedSearch from '@/hooks/useExtendedSearch';
import TopBarExtended from '@/components/TopBar/TopBarExtended';
import ExtendedResultList from './ExtendedResultList';
import styles from './ExtendedSearch.module.css';
import { Language } from '@/types';
import { encodeQueryParam } from '@/utils/escape';

/** Parse and validate the mode param from the URL. */
function parseMode(val: string | null): SearchMode {
  if (val === 'term') return 'term';
  return 'fulltext';
}

export default function ExtendedSearchLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { search } = useExtendedSearch();

  // Read URL params
  const urlQuery = searchParams.get('q') || '';
  const urlLang = (searchParams.get('lang') || 'tib') as Language;
  const urlMode = parseMode(searchParams.get('mode'));
  const urlOffset = parseInt(searchParams.get('offset') || '0', 10);

  // Redux state
  const { isSearching } = useSelector(
    (s: RootState) => s.search.ftsResultList
  );
  const { listSize } = useSelector((s: RootState) => s.settings);

  // Track the last search we triggered to avoid duplicate API calls
  const lastSearchKey = useRef('');

  // Sync URL → Redux and trigger search when URL changes
  useEffect(() => {
    dispatch(setInputLang(urlLang));
    dispatch(setSearchMode(urlMode));

    if (!urlQuery) return;

    const searchKey = `${urlQuery}|${urlLang}|${urlMode}|${urlOffset}`;
    if (searchKey === lastSearchKey.current) return;
    lastSearchKey.current = searchKey;

    search(urlQuery, urlLang, urlMode, urlOffset);
  }, [urlQuery, urlLang, urlMode, urlOffset, dispatch, search]);

  /**
   * Navigate to the normal search view when a result term is clicked.
   */
  const handleTermClick = useCallback(
    (term: string, termLang: string) => {
      const params = new URLSearchParams({
        offset: '0',
        sidebar: 'false',
      });
      navigate(`/search/${termLang}/${encodeQueryParam(term)}?${params}`);
    },
    [navigate]
  );

  /**
   * Pagination: previous page.
   */
  const handlePrev = useCallback(() => {
    const newOffset = Math.max(0, urlOffset - listSize);
    setSearchParams({
      q: urlQuery,
      lang: urlLang,
      mode: urlMode,
      offset: String(newOffset),
    });
  }, [setSearchParams, urlQuery, urlLang, urlMode, urlOffset, listSize]);

  /**
   * Pagination: next page.
   */
  const handleNext = useCallback(() => {
    const newOffset = urlOffset + listSize;
    setSearchParams({
      q: urlQuery,
      lang: urlLang,
      mode: urlMode,
      offset: String(newOffset),
    });
  }, [setSearchParams, urlQuery, urlLang, urlMode, urlOffset, listSize]);

  return (
    <>
      <TopBarExtended />
      <div className="page">
        <div className="contentArea">
          <div className={styles.extendedSearchWrap}>
            <ExtendedResultList
              onTermClick={handleTermClick}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          </div>
        </div>
      </div>
    </>
  );
}
