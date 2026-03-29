/**
 * FulltextSearchLayout – the component for fulltext search.
 *
 */
import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import { useSyncStateFromUrl } from '@/hooks/useSyncStateFromUrl';
import styles from './FulltextSearch.module.css';

import FtsResultList from './FtsResultList';
import useFulltextSearch from '@/hooks/useFulltextSearch';

export default function FulltextSearchLayout() {

  useSyncStateFromUrl();

  const { search: fulltextSearch } = useFulltextSearch();

  const dispatch = useDispatch();
  const navigation = useDictNavigation();

  const settings = useSelector((s: RootState) => s.settings);
  const { input: searchInput, resultList: result, definition } = useSelector((s: RootState) => s.search);

  // Trigger search + definition load when the URL changes.
  useEffect(() => {
    (async () => {
      await fulltextSearch(result.query, result.lang, result.offset);
    })();
  }, [dispatch, result.query, result.offset, result.lang, fulltextSearch]);


  /**
   * Handle clicking a term in the result list.
   * Keep the search :term path unchanged — only update ?selected= so the
   * effect loads that term's definition without re-running the list search.
   * The URL reflects the active selection and works correctly on reload.
   */
  const handleTermSelected = useCallback(
    (wylieTerm: string) => {
      navigation.termSearch(wylieTerm, result.lang, result.offset, false, searchInput.extendedSettingsVisible, wylieTerm);
    }, [navigation, result.lang, result.offset, searchInput.extendedSettingsVisible]
  );

  /** Navigate to previous page of results. */
  const handlePaginationPrev = useCallback(() => {
    const newOffset = Math.max(0, result.offset - settings.listSize);
    navigation.fulltextSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  /** Navigate to next page of results. */
  const handlePaginationNext = useCallback(() => {
    const newOffset = result.offset + settings.listSize;
    navigation.fulltextSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  return (
    <>
      <div className="page">
        <div className="contentArea">
          <div className={styles.ftsSearchWrap}>
            <FtsResultList
              onTermClick={handleTermSelected}
              onPrev={handlePaginationPrev}
              onNext={handlePaginationNext}
            />
          </div>
        </div>
      </div>
    </>
  );
}