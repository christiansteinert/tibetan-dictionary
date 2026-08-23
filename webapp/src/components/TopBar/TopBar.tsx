/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import MultiLangInputField, { MultiLangInputHandle } from './MultiLangInputField';
import ClearButton from './ClearButton';
import HamburgerMenu from './HamburgerMenu';
import SanskritInputBar from './SanskritInputBar';
import ExtendedSearchOptionsBar from '@/components/TopBar/ExtendedSearchOptionsBar';
import { type SearchMode } from '@/store/searchSlice';
import { WylieConverter } from '@/utils/wylieConverter';
import { KeyboardIcon } from '@radix-ui/react-icons';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';
import { Language } from '@/types';
import useInputProcessor from '@/hooks/useInputProcessor';

interface Props {
  onInputChange?: (input: string) => void;
  onModeChange?: (mode: SearchMode) => void;
  onLangChange?: (lang: Language) => void;
  onEnter?: (term: string) => void;
  onOpenExtendedSearch?: () => void;
  onCloseExtendedSearch?: () => void;
  // Keyboard navigation handlers
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
}

export default function TopBar(props: Props) {
  const layout = useSelector((s: RootState) => s.settings.layout);
  const unicode = useSelector((s: RootState) => s.settings.unicode);
  const lowercase = useSelector((s: RootState) => s.settings.lowercase);
  const extendedSettingsVisible = useSelector((s: RootState) => s.search.input.extendedSettingsVisible);
  const searchMode = useSelector((s: RootState) => s.search.input.mode);
  const inputLang = useSelector((s: RootState) => s.search.input.inputLang);
  const isLightMode = layout !== 'layout_black';

  // Whether the Sanskrit diacritics bar is shown (only relevant when inputLang === 'skt')
  const [sanskritBarVisible, setSanskritBarVisible] = useState(false);
  const isSanskrit = inputLang === 'skt';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef<MultiLangInputHandle>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const [topbarHeight, setTopbarHeight] = useState(0);

  // Whether Unicode input is active (true means full Unicode, 'output' means display-only)
  const useUnicodeTibetan = unicode === true;

  // Keep the spacer height in sync with the actual TopBar height.
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTopbarHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pre-fill the input field from the URL on hard reload / shared-link load,
  // before Redux has been populated by SearchLayout.

  const { lang: urlLang, term: urlTerm } = useParams<{ lang: string; term: string }>();
  const initialValue = (urlLang === inputLang || !urlLang) ? decodeURIComponent(urlTerm || '') : '';

  // Stable WylieConverter for the creation of processors.
  const converter = useRef(new WylieConverter());

  // Build the correct input processor pair based on the current search mode and language.
  const { inputProcessor, reverseProcessor } = useMemo(() => {
    return useInputProcessor(inputLang, useUnicodeTibetan, searchMode === 'fulltext')
  }, [inputLang, useUnicodeTibetan, searchMode]);

  /**
   * Change language and clear the search input.
   */
  const handleLangChange = useCallback((lang: Language) => {
    inputRef.current?.clear();
    inputRef.current?.focus();
    props.onLangChange?.(lang);
  }, [props.onLangChange]);

  /**
   * Clear the search input.
   */
  const handleClear = useCallback(() => {
    inputRef.current?.clear();
    inputRef.current?.focus();
    props.onInputChange?.('');
  }, [props]);

  /**
   * Insert a Sanskrit diacritical character at the cursor position in the input field.
   */
  const handleInsertSanskritChar = useCallback((char: string) => {
    inputRef.current?.insertAtCursor(char);
  }, [inputRef]);

  return (
    <>
      <div
        ref={topbarRef}
        className={clsx(
          styles.topbar,
          isLightMode ? styles.light : styles.dark,
          'sm:pt-2',
        )}
        style={(extendedSettingsVisible || (isSanskrit && sanskritBarVisible)) ? { flexDirection: 'column' } : undefined}
      >
        {/* ── Main row: input + clear + [sanskrit toggle] + hamburger ── */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div className={styles.textInputWrap}>
            <MultiLangInputField
              ref={inputRef}
              inputLang={inputLang}
              useUnicodeTibetan={useUnicodeTibetan}
              lowercase={lowercase}
              onInputChange={(input) => props.onInputChange?.(input)}
              onEnter={(term) => props.onEnter?.(term)}
              onArrowUp={props.onArrowUp}
              onArrowDown={props.onArrowDown}
              onPageUp={props.onPageUp}
              onPageDown={props.onPageDown}
              initialValue={initialValue || undefined}
              inputProcessor={inputProcessor}
              reverseProcessor={reverseProcessor}
            />
            <ClearButton onClick={handleClear} />
          </div>

          {/* Sanskrit keyboard toggle – only shown when input language is Sanskrit */}
          {isSanskrit && (
            <button
              type="button"
              className={clsx(
                styles.sanskritToggleBtn,
                !isLightMode && styles.sanskritToggleBtnDark,
                sanskritBarVisible && styles.sanskritToggleBtnActive,
              )}
              title={sanskritBarVisible ? 'Hide diacritics keyboard' : 'Show diacritics keyboard'}
              aria-label={sanskritBarVisible ? 'Hide diacritics keyboard' : 'Show diacritics keyboard'}
              onClick={() => setSanskritBarVisible((v) => !v)}
            >
              <KeyboardIcon width={18} height={18} />
            </button>
          )}

          <span className="mr-3" title="Open menu">
            <HamburgerMenu
              inputLang={inputLang}
              isLightMode={isLightMode}
              onSelectLanguage={handleLangChange}
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

        {/* ── Sanskrit diacritics bar (toggled via keyboard icon) ── */}
        {isSanskrit && sanskritBarVisible && (
          <SanskritInputBar
            isLightMode={isLightMode}
            onInsertChar={handleInsertSanskritChar}
          />
        )}

        {/* ── Options bar (only in extended-search mode) ── */}
        {extendedSettingsVisible && (
          <ExtendedSearchOptionsBar
            mode={searchMode}
            lang={inputLang}
            isLightMode={isLightMode}
            onModeChange={props.onModeChange}
            onLangChange={handleLangChange}
            onClose={props.onCloseExtendedSearch}
          />
        )}
      </div>

      {/* Spacer: reserves exactly the same height as the fixed TopBar to push the rest of the content down */}
      {/* <div style={{ height: topbarHeight, marginTop: "env(safe-area-inset-top)" }} /> */}
      <div style={{ height: topbarHeight }} />
    </>
  );
}
