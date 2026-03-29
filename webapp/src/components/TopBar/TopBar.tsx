/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import WylieInputField, { WylieInputHandle } from './WylieInputField';
import ClearButton from './ClearButton';
import HamburgerMenu from './HamburgerMenu';
import ExtendedSearchOptionsBar from '@/components/TopBar/ExtendedSearchOptionsBar';
import { type SearchMode } from '@/store/searchSlice';
import {
  makeDefaultInputProcessor,
  makeFtsInputProcessor,
  stripFtsOperators,
  stripTermOperators,
  ftsUniToWylie,
} from '@/utils/fts/ftsInputDecorator';
import { WylieConverter } from '@/utils/wylieConverter';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';
import { Language } from '@/types';

interface Props {
  onInputChange?: (input: string) => void;
  onModeChange?: (mode: SearchMode) => void;
  onLangChange?: (lang: Language) => void;
  onEnter?: (term: string) => void;
  onOpenExtendedSearch?: () => void;
  onCloseExtendedSearch?: () => void;
}

export default function TopBar(props: Props) {
  const layout = useSelector((s: RootState) => s.settings.layout);
  const unicode = useSelector((s: RootState) => s.settings.unicode);
  const lowercase = useSelector((s: RootState) => s.settings.lowercase);
  const extendedSettingsVisible = useSelector((s: RootState) => s.search.input.extendedSettingsVisible);
  const searchMode = useSelector((s: RootState) => s.search.input.mode);
  const inputLang = useSelector((s: RootState) => s.search.input.inputLang);
  const isFtsSearching = useSelector((s: RootState) => s.search.ftsResultList.isSearching);
  const isLightMode = layout !== 'layout_black';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef<WylieInputHandle>(null);
  // Skip the first inputLang value — that's the URL-driven initialisation, not a user switch.
  const isLangInitialized = useRef(false);

  // Whether Unicode input is active (true means full Unicode, 'output' means display-only)
  const useUnicodeTibetan = unicode === true;

  // Pre-fill the input field from the URL on hard reload / shared-link load,
  // before Redux has been populated by SearchLayout.
  const { lang: urlLang, term: urlTerm } = useParams<{ lang: string; term: string }>();
  const initialValue = (urlLang === inputLang) ? decodeURIComponent(urlTerm || '') : '';

  // Stable WylieConverter for the creation of processors.
  const converter = useRef(new WylieConverter());

  // Build the correct input processor pair based on the current search mode.
  // useMemo ensures stable references unless the mode or unicode setting changes.
  const { inputProcessor, reverseProcessor } = useMemo(() => {
    if (searchMode === 'fulltext') {
      return {
        inputProcessor: makeFtsInputProcessor(converter.current, useUnicodeTibetan),
        reverseProcessor: (text: string) =>
          useUnicodeTibetan ? ftsUniToWylie(text, converter.current) : text,
      };
    }
    return {
      inputProcessor: makeDefaultInputProcessor(converter.current, useUnicodeTibetan),
      reverseProcessor: undefined,
    };
  }, [searchMode, useUnicodeTibetan]);

  // Track previous mode to detect mode switches.
  const prevModeRef = useRef(searchMode);
  useEffect(() => {
    if (prevModeRef.current !== searchMode) {
      const wasFulltext = prevModeRef.current === 'fulltext';
      prevModeRef.current = searchMode;
      if (inputRef.current) {
        const raw = inputRef.current.getValue();
        // fulltext → term: remove &, |, !, ~ operators
        // term → fulltext: remove *, ? wildcards
        const cleaned = wasFulltext
          ? stripFtsOperators(raw)
          : stripTermOperators(raw);
        if (cleaned !== raw) {
          inputRef.current.setValue(cleaned);
        }
        // Re-trigger the search with the (possibly cleaned) value
        const current = inputRef.current.getValue();
        if (current.trim()) {
          props.onInputChange?.(current);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  useEffect(() => { // clear input field when user actively changes language
    if (!isLangInitialized.current) {
      isLangInitialized.current = true;
      return;
    }
    inputRef.current?.clear();
    inputRef.current?.focus();
  }, [inputLang]);

  /**
   * Clear the search input.
   */
  const handleClear = useCallback(() => {
    inputRef.current?.clear();
    inputRef.current?.focus();
    navigate('/');
  }, [navigate]);

  return (
    <>
      <div
        className={clsx(
          styles.topbar,
          isLightMode ? styles.light : styles.dark,
          'py-0 sm:py-2',
        )}
        style={extendedSettingsVisible ? { flexDirection: 'column' } : undefined}
      >
        {/* ── Main row: input + clear + hamburger ── */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div className={styles.textInputWrap}>
            <WylieInputField
              ref={inputRef}
              inputLang={inputLang}
              useUnicodeTibetan={useUnicodeTibetan}
              lowercase={lowercase}
              onInputChange={(input) => props.onInputChange?.(input)}
              onEnter={(term) => props.onEnter?.(term)}
              initialValue={initialValue || undefined}
              inputProcessor={inputProcessor}
              reverseProcessor={reverseProcessor}
            />
            <ClearButton onClick={handleClear} />
          </div>

          <span className="mr-3" title="Open menu">
            <HamburgerMenu
              inputLang={inputLang}
              isLightMode={isLightMode}
              onSelectLanguage={(lang) => props.onLangChange?.(lang)}
              onOpenExtendedSearch={() => {
                if (extendedSettingsVisible) {
                  props.onCloseExtendedSearch?.();
                } else {
                  props.onOpenExtendedSearch?.();
                }
              }}
              onOpenSettings={() => navigate('/settings')}
            />
          </span>
        </div>
        {/* ── Options bar (only in extended-search mode) ── */}
        {extendedSettingsVisible && (
          <ExtendedSearchOptionsBar
            mode={searchMode}
            lang={inputLang}
            isLightMode={isLightMode}
            onModeChange={props.onModeChange}
            onLangChange={props.onLangChange}
            onClose={props.onCloseExtendedSearch}
          />
        )}
      </div>

      <div
        className={
          extendedSettingsVisible ? styles.topbarUnderlayExtended : styles.topbarUnderlay
        }
      ></div>
    </>
  );
}
