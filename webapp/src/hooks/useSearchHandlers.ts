/**
 * useSearchHandlers – shared input/navigation callbacks for search views.
 *
 * Encapsulates all TopBar-driven handler logic so it can be reused across
 * SearchLayout, WelcomePage, and the FTS layout without duplication.
 */
import { useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import useSearch from '@/hooks/useSearch';
import { WylieConverter } from '@/utils/wylieConverter';
import { ftsUniToWylie } from '@/utils/fts/ftsInputDecorator';
import {
  type SearchMode,
  setDefinitionHtml,
  setInputLang,
  setSidebarVisible,
} from '@/store/searchSlice';
import type { Language } from '@/types';

interface KeyboardNavState {
  selectedPosition: number;
}

export function useSearchHandlers() {
  const keyboardNavState = useRef<KeyboardNavState>({ selectedPosition: 0 });
  const isLoading = useRef(false);

  const dispatch = useDispatch();
  const navigation = useDictNavigation();
  const { search } = useSearch();
  const wylieConverter = useRef(new WylieConverter());

  const currentTerm = useSelector((s: RootState) => s.search.resultList.query);
  const unicode = useSelector((s: RootState) => s.settings.unicode);
  const inputLang = useSelector((s: RootState) => s.search.input.inputLang);
  const extendedSettingsVisible = useSelector((s: RootState) => s.search.input.extendedSettingsVisible);
  const mode = useSelector((s: RootState) => s.search.input.mode);
  const resultList = useSelector((s: RootState) => s.search.resultList);
  const ftsResultList = useSelector((s: RootState) => s.search.ftsResultList);
  const definitionTerm = useSelector((s: RootState) => s.search.definition.term);
  const listSize = useSelector((s: RootState) => s.settings.listSize);

  /**
   * Triggered when the input changes (syllable complete, backspace, etc.)
   * Navigates to the search route with sidebar=true (soft search).
   */
  const handleInputChange = useCallback(
    (rawInput: string) => {

      keyboardNavState.current = { selectedPosition: -1 };
      if (!rawInput.trim()) {
        dispatch(setDefinitionHtml(''));
        return;
      }

      // Convert display text back to lookup key for the URL.
      // Tibetan: Unicode → Wylie because lookup is in Wylie.
      // English/Sanskrit: use as-is.
      let inputTerm: string;
      if (inputLang === 'tib' && unicode === true) {
        inputTerm = mode === 'fulltext'
          ? ftsUniToWylie(rawInput, wylieConverter.current).trim()
          : wylieConverter.current.uniToWylie(rawInput).trim();
      } else {
        inputTerm = rawInput.trim();
      }

      if (mode === 'fulltext') {
        navigation.fulltextSearch(inputTerm, inputLang, 0, true, extendedSettingsVisible);
      } else {
        navigation.termSearch(inputTerm, inputLang, 0, true, extendedSettingsVisible);
      }
    },
    [dispatch, navigation, inputLang, unicode, extendedSettingsVisible, mode],
  );

  const searchAndGoToListPosition = async (term: string, inputLang: Language, selectedPosition: number) => {
    if (isLoading.current) return; // Prevent race conditions with rapid keyboard navigation
    isLoading.current = true;

    const listOffset = Math.max(0, Math.floor(selectedPosition / listSize) * listSize);
    let selectedPositionInPage = Math.max(0, selectedPosition % listSize);
    const { searchTerm, results: searchResults } = await search(term, inputLang, listOffset);
    if (!searchResults.length) {
      keyboardNavState.current = { selectedPosition: -1 };
    } else {
      selectedPositionInPage = Math.min(selectedPositionInPage, searchResults.length - 1);

      keyboardNavState.current = { selectedPosition: listOffset + selectedPositionInPage };
      const selectedTerm = searchResults[selectedPositionInPage].term;
      navigation.termSearch(searchTerm, inputLang, listOffset, false, extendedSettingsVisible, selectedTerm);
    }
    isLoading.current = false;
  }

  /**
   * Triggered when Enter is pressed — triggers a search and loads the first result.
   */
  const handleEnter = useCallback(
    async (term: string) => {
      if (mode === 'fulltext') {
        navigation.fulltextSearch(term, inputLang, 0, false, extendedSettingsVisible, term);
      } else {
        searchAndGoToListPosition(term, inputLang, 0);
      }
    },
    [navigation, mode, inputLang, extendedSettingsVisible, searchAndGoToListPosition],
  );

  const handleSelectPrevTerm = useCallback(() => {
    if (mode === 'fulltext') return;

    const idx = keyboardNavState.current.selectedPosition - 1;
    searchAndGoToListPosition(resultList.query, resultList.lang, idx);
  }, [mode, resultList, listSize, searchAndGoToListPosition]);

  const handleSelectPrevPage = useCallback(() => {
    if (mode === 'fulltext') return;

    const idx = keyboardNavState.current.selectedPosition - listSize;
    searchAndGoToListPosition(resultList.query, resultList.lang, idx);
  }, [mode, resultList, listSize, searchAndGoToListPosition]);

  const handleSelectNextTerm = useCallback(() => {
    if (mode === 'fulltext') return;

    const hasAnotherPage = resultList.results.length > listSize;
    let idx = keyboardNavState.current.selectedPosition + 1;

    if (idx >= resultList.offset + resultList.results.length && !hasAnotherPage) {
      idx = resultList.offset + resultList.results.length - 1; // Don't go past the end of the list
    }

    searchAndGoToListPosition(resultList.query, resultList.lang, idx);
  }, [mode, resultList, listSize, searchAndGoToListPosition]);

  const handleSelectNextPage = useCallback(() => {
    if (mode === 'fulltext') return;

    const hasAnotherPage = resultList.results.length > listSize;
    let idx = keyboardNavState.current.selectedPosition + listSize;

    if (!hasAnotherPage) {
      idx = resultList.offset + resultList.results.length - 1; // Don't go past the end of the list
    }
    searchAndGoToListPosition(resultList.query, resultList.lang, idx);
  }, [mode, resultList, listSize, searchAndGoToListPosition]);

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
    [navigation, currentTerm, inputLang, extendedSettingsVisible],
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

    // Keyboard navigation handlers (when the cursor is in the unput field)
    handleSelectPrevTerm,
    handleSelectNextTerm,
    handleSelectPrevPage,
    handleSelectNextPage,
  };
}
