/**
 * useSearchHandlers – shared input/navigation callbacks for search views.
 *
 * Encapsulates all TopBar-driven handler logic so it can be reused across
 * SearchLayout, WelcomePage, and the FTS layout without duplication.
 */
import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import useSearch from '@/hooks/useSearch';
import { WylieConverter } from '@/utils/wylieConverter';
import {
  type SearchMode,
  setDefinitionHtml,
  setSearchMode,
  setInputLang,
  setSidebarVisible,
} from '@/store/searchSlice';
import type { Language } from '@/types';

export function useSearchHandlers() {
  const dispatch = useDispatch();
  const navigation = useDictNavigation();
  const { search } = useSearch();
  const wylieConverter = useRef(new WylieConverter());

  const currentTerm = useSelector((s: RootState) => s.search.resultList.query);
  const unicode = useSelector((s: RootState) => s.settings.unicode);
  const inputLang = useSelector((s: RootState) => s.search.input.inputLang);
  const extendedSettingsVisible = useSelector((s: RootState) => s.search.input.extendedSettingsVisible);
  const mode = useSelector((s: RootState) => s.search.input.mode);


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
      const inputTerm =
        inputLang === 'tib' && unicode === true
          ? wylieConverter.current.uniToWylie(rawInput).trim()
          : rawInput.trim();
      if (mode === 'fulltext') {
        navigation.fulltextSearch(inputTerm, inputLang, 0, true, extendedSettingsVisible);
      } else {
        navigation.termSearch(inputTerm, inputLang, 0, true, extendedSettingsVisible);
      }
    },
    [dispatch, navigation, inputLang, unicode, extendedSettingsVisible],
  );

  /**
   * Triggered when Enter is pressed — triggers a search and loads the first result.
   */
  const handleEnter = useCallback(
    async (term: string) => {
      const { searchTerm, results: searchResults } = await search(term, inputLang, 0);
      if (searchResults.length) {
        const firstTerm = searchResults[0].term;
        if (mode === 'fulltext') {
          navigation.fulltextSearch(searchTerm, inputLang, 0, false, extendedSettingsVisible, firstTerm);
        } else {
          navigation.termSearch(searchTerm, inputLang, 0, false, extendedSettingsVisible, firstTerm);
        }
      }
    },
    [navigation, search, inputLang, extendedSettingsVisible],
  );

  /** Open the extended search options bar. */
  const handleOpenExtendedSearch = useCallback(() => {
    navigation.setExtSearchEnabled(true);
  }, [navigation]);

  /** Close the extended search options bar. */
  const handleCloseExtendedSearch = useCallback(() => {
    navigation.setExtSearchEnabled(false);
  }, [navigation]);

  /** Change the search mode (term / fulltext). */
  const handleModeChange = useCallback(
    (mode: SearchMode) => {
      if (mode === 'fulltext') {
        navigation.termSearch(currentTerm, inputLang, 0, false, extendedSettingsVisible);
      } else {
        navigation.fulltextSearch(currentTerm, inputLang, 0, false, extendedSettingsVisible);
      }
    },
    [navigation],
  );

  /** Switch input language and clear the sidebar. */
  const handleLangChange = useCallback(
    (lang: Language) => {
      dispatch(setInputLang(lang));
      dispatch(setSidebarVisible(false));
    },
    [dispatch],
  );

  return {
    handleInputChange,
    handleEnter,
    handleOpenExtendedSearch,
    handleCloseExtendedSearch,
    handleModeChange,
    handleLangChange,
  };
}
