/**
 * SearchLayout – the main search view.
 *
 * Displays a two-pane layout:
 *   Left:  ResultList (sidebar with matching terms)
 *   Right: DefinitionView (formatted dictionary definitions)
 *
 * Reads the search term from the URL, triggers the search, and manages pagination.
 */
import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import TopBar from '@/components/TopBar/TopBar';
import ResultList from './ResultList';
import DefinitionView from './DefinitionView';
import { viewScan } from './scannedPageViewer';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import useSearch from '@/hooks/useSearch';
import useDictionaryLookup from '@/hooks/useDictionaryLookup';
import { useSearchHandlers } from '@/hooks/useSearchHandlers';
import { useSyncStateFromUrl } from '@/hooks/useSyncStateFromUrl';

import {
  type SearchMode,
  setDefinitionHtml,
} from '@/store/searchSlice';
import { Language } from '@/types';

interface Props {
  mode: SearchMode;
}

export default function SearchLayout(props: Props) {

  useSyncStateFromUrl();

  const dispatch = useDispatch();
  const { search } = useSearch();
  const { lookupTerm } = useDictionaryLookup();
  const navigation = useDictNavigation();
  const handlers = useSearchHandlers();

  const settings = useSelector((s: RootState) => s.settings);
  const { input: searchInput, resultList: result, definition } = useSelector((s: RootState) => s.search);

  // Trigger search + definition load when the URL changes.
  useEffect(() => {
    (async () => {
      await search(result.query, result.lang, result.offset);
    })();
  }, [dispatch, result.query, result.offset, result.lang, search]);

  useEffect(() => {
    (async () => {
      // If the user clicked a specific result item, load that definition.
      // Otherwise pick the exact match or the first result.
      if (definition.term) {
        await lookupTerm(definition.term, result.lang);
      } else {
        dispatch(setDefinitionHtml(''));
      }
    })();
  }, [definition.term, lookupTerm]);


  /**
   * Handle clicking a term in the result list.
   * Keep the search :term path unchanged — only update ?selected= so the
   * effect loads that term's definition without re-running the list search.
   * The URL reflects the active selection and works correctly on reload.
   */
  const handleTermSelected = useCallback(
    (wylieTerm: string) => {
      navigation.termSearch(result.query, result.lang, result.offset, false, searchInput.extendedSettingsVisible, wylieTerm);
    }, [navigation, result.query, result.lang, result.offset, searchInput.extendedSettingsVisible]
  );

  /** Navigate to previous page of results. */
  const handlePaginationPrev = useCallback(() => {
    const newOffset = Math.max(0, result.offset - settings.listSize);
    navigation.termSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  /** Navigate to next page of results. */
  const handlePaginationNext = useCallback(() => {
    const newOffset = result.offset + settings.listSize;
    navigation.termSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  /** Handle clicking an inline Tibetan term inside a definition. */
  const handleInlineTermClick = useCallback(
    (wylie: string, termLang: Language) => {
      navigation.termSearch(wylie, termLang, 0, false, searchInput.extendedSettingsVisible, wylie);
    },
    [navigation, searchInput.extendedSettingsVisible]
  );

  /** Handle clicking a "view scan" link. */
  const handleScanClick = useCallback((dictId: string, termId: string, pageInfo?: unknown) => {
    viewScan(dictId, termId, pageInfo as any);
  }, []);

  return (
    <>
      {!definition.isDefinitionOnly && <TopBar
        onInputChange={handlers.handleInputChange}
        onOpenExtendedSearch={handlers.handleOpenExtendedSearch}
        onCloseExtendedSearch={handlers.handleCloseExtendedSearch}
        onModeChange={handlers.handleModeChange}
        onLangChange={handlers.handleLangChange}
        onEnter={handlers.handleEnter}
      />}
      <div className="page">
        <div className="contentArea">
          {!definition.isDefinitionOnly && <ResultList
            onTermSelected={handleTermSelected}
            onPrev={handlePaginationPrev}
            onNext={handlePaginationNext}
            selectedTerm={definition.term}
          />}
          <div className="mainWrap">
            <DefinitionView
              onTermClick={handleInlineTermClick}
              onScanClick={handleScanClick}
            />
          </div>
        </div>
      </div>
    </>
  );
}
