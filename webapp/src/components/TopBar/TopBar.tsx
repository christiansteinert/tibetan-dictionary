/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import { useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import WylieInputField, { WylieInputHandle } from './WylieInputField';
import ClearButton from './ClearButton';
import HamburgerMenu from './HamburgerMenu';
import ExtendedSearchOptionsBar from './ExtendedSearchOptionsBar';
import { type SearchMode } from '@/store/searchSlice';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';
import { Language } from '@/types';
import { useDictNavigation } from '@/hooks/useDictNavigation';

interface Props {
  onInputChange?: (input: string) => void;
  onModeChange?: (mode: SearchMode) => void;
  onLangChange?: (lang: Language) => void;
  onEnter?: (term: string) => void;
  onOpenExtendedSearch?: () => void;
  onCloseExtendedSearch?: () => void;
}

export default function TopBar(props: Props) {
  const navigation = useDictNavigation()
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
            isSearching={isFtsSearching}
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
