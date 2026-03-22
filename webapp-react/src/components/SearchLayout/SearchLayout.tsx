/**
 * SearchLayout – the main search view.
 *
 * Displays a two-pane layout:
 *   Left:  ResultList (sidebar with matching terms)
 *   Right: DefinitionView (formatted dictionary definitions)
 *
 * Reads the search term from the URL, triggers the search, and manages pagination.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store/store';
import TopBar from '@/components/TopBar/TopBar';
import ResultList from './ResultList';
import DefinitionView from './DefinitionView';
import { viewScan } from './scannedPageViewer';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import useSearch from '@/hooks/useSearch';
import useDictionaryLookup from '@/hooks/useDictionaryLookup';
import { WylieConverter } from '@/utils/wylieConverter';

import {
  type SearchMode,
  setStateFromUrl,
  setDefinitionHtml,
  setDefinitionOnly,
  setSearchMode,
  setInputLang,
  setSidebarVisible,
} from '@/store/searchSlice';
import { Language } from '@/types';

interface Props {
  mode: SearchMode;
}

export default function SearchLayout(props: Props) {

  const isFirstRender = useRef(true);

  const { lang: urlLangParam, term: urlTermParam } = useParams<{ lang: string; term: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { search } = useSearch();
  const { lookupTerm } = useDictionaryLookup();
  const navigation = useDictNavigation();
  const wylieConverter = useRef(new WylieConverter());

  const settings = useSelector((s: RootState) => s.settings);
  const { input: searchInput, resultList: result, definition } = useSelector((s: RootState) => s.search);

  // Sync URL params → Redux on URL change
  useEffect(() => {
    if (isFirstRender.current) {
      // when the app first loads, initialize the input language from the URL parameters (if present)
      dispatch(setInputLang((urlLangParam || 'tib') as Language));
      isFirstRender.current = false;

      const definitionOnly = searchParams.get('definitionOnly') === 'true';
      if(definitionOnly) {
        dispatch(setDefinitionOnly(true));
      }
    }

    dispatch(setStateFromUrl({
      mode: (searchParams.get('mode') as SearchMode) || 'term',
      extendedSettingsVisible: searchParams.get('ext') === 'true',
      sidebarVisible: searchParams.get('sidebar') === 'true',
      resultLang: (urlLangParam as Language) || 'tib',
      resultQuery: decodeURIComponent(urlTermParam || ''),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      definitionTerm: decodeURIComponent(searchParams.get('selected') || ''),
    }))

  }, [dispatch, urlLangParam, urlTermParam, searchParams]);


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
      navigation.termSearch(result.query, result.lang, result.offset, false, searchInput.extendedSettingsVisible,  wylieTerm);
    }, [navigation, result.query, result.lang, result.offset, searchInput.extendedSettingsVisible]
  );

  /**
   * Navigate to previous page of results.
   */
  const handlePrev = useCallback(() => {
    const newOffset = Math.max(0, result.offset - settings.listSize);
    navigation.termSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  /**
   * Navigate to next page of results.
   */
  const handleNext = useCallback(() => {
    const newOffset = result.offset + settings.listSize;
    navigation.termSearch(result.query, result.lang, newOffset, result.sidebarVisible, searchInput.extendedSettingsVisible);
  }, [navigation, result.query, result.lang, result.sidebarVisible, searchInput.extendedSettingsVisible, settings.listSize]);

  /**
   * Handle clicking an inline Tibetan term inside a definition.
   */
  const handleInlineTermClick = useCallback(
    (wylie: string, termLang: Language) => {
      navigation.termSearch(wylie, termLang, 0, false, searchInput.extendedSettingsVisible, wylie);
    },
    [navigation, result.query, searchInput.extendedSettingsVisible]
  );

  /**
   * Handle clicking a "view scan" link.
   */
  const handleScanClick = useCallback((dictId: string, termId: string, pageInfo?: unknown) => {
    viewScan(dictId, termId, pageInfo as any);
  }, []);

  /**
   * Triggered when the input changes (syllable complete, backspace, etc.)
   * Navigates to the search route with sidebar=true (soft search).
   */
  const handleInputChange = useCallback(
    (rawInput: string) => {
      if (!rawInput.trim()) {
        dispatch(setDefinitionHtml(''));
        return;
      }

      // Convert Unicode Tibetan back to Wylie so the URL always uses the Wylie lookup key.
      const inputTerm = searchInput.inputLang === 'tib' && settings.unicode === true
        ? wylieConverter.current.uniToWylie(rawInput).trim()
        : rawInput.trim();
      navigation.termSearch(inputTerm, searchInput.inputLang, 0, true, searchInput.extendedSettingsVisible);
    },
    [dispatch, navigation, searchInput.inputLang, settings.unicode, searchInput.extendedSettingsVisible]
  );

  const handleOpenExtendedSearch = useCallback(() => {
    navigation.setExtSearchEnabled(true);
  }, [navigation]);

  const handleCloseExtendedSearch = useCallback(() => {
    navigation.setExtSearchEnabled(false);
  }, [navigation]);

  const handleModeChange = useCallback(
    (m: SearchMode) => dispatch(setSearchMode(m)),
    [dispatch]);

  const handleLangChange = useCallback((lang: Language) => {
    dispatch(setInputLang(lang));
    dispatch(setSidebarVisible(false));
  }, [dispatch]);

  /**
   * When Enter is pressed — trigger a search and load the first result from the result list
   */
  const handleEnter = useCallback(async (term: string) => {
    const { searchTerm, results: searchResults } = await search(term, searchInput.inputLang, 0);

    // Load the definition of the first result if there is at least one match.
    if (searchResults.length) {
      const firstTerm = searchResults[0].term;
      navigation.termSearch(searchTerm, searchInput.inputLang, 0, false, searchInput.extendedSettingsVisible, firstTerm);
    }
  }, [navigation, search, searchInput.inputLang, dispatch]);

  return (
    <>
      {!definition.isDefinitionOnly && <TopBar
        onInputChange={handleInputChange}
        onOpenExtendedSearch={handleOpenExtendedSearch}
        onCloseExtendedSearch={handleCloseExtendedSearch}
        onModeChange={handleModeChange}
        onLangChange={handleLangChange}
        onEnter={handleEnter}
      />}
      <div className="page">
        <div className="contentArea">
          {!definition.isDefinitionOnly && <ResultList
            onTermSelected={handleTermSelected}
            onPrev={handlePrev}
            onNext={handleNext}
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
