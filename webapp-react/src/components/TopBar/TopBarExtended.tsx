/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 *
 * When the user navigates to /extended-search the same input field
 * is reused, with an options bar flushed below it.
 */
import { useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import WylieInputField, { WylieInputHandle } from './WylieInputField';
import ClearButton from './ClearButton';
import HamburgerMenu from './HamburgerMenu';
import ExtendedSearchOptionsBar from './ExtendedSearchOptionsBar';
import { setInputLang, setSearchMode, setSidebarVisible, type SearchMode } from '@/store/searchSlice';
import { WylieConverter } from '@/utils/wylieConverter';
import { encodeQueryParam } from '@/utils/escape';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';
import { Language } from '@/types';

/**
 * Parse the search term from the current URL hash so the input field
 * can be pre-filled on a hard reload or shared-link load.
 * Returns the Wylie/English term and its language, or empty strings.
 */
function getTermFromHash(): { term: string; lang: string } {
  const hash = window.location.hash; // e.g. "#/search/tib/rangs?offset=0&sidebar=false"
  const match = hash.match(/^#\/search\/([^/]+)\/([^?]+)/);
  if (!match) return { term: '', lang: '' };
  return { lang: match[1], term: decodeURIComponent(match[2]) };
}

/**
 * Parse the extended-search query from the URL hash so the input field
 * can be pre-filled on a hard reload.
 */
function getExtQueryFromHash(): string {
  const hash = window.location.hash;
  const match = hash.match(/[?&]q=([^&]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function TopBar() {
  const { layout, unicode, lowercase } = useSelector((s: RootState) => s.settings);
  const { inputLang } = useSelector((s: RootState) => s.search.input);

  const isLightMode = layout !== 'layout_black';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef<WylieInputHandle>(null);

  // Are we on the extended-search route?
  const isExtendedSearch = location.pathname === '/extended-search';



  const { lang: extLang, mode: extMode, isSearching } =
    useSelector((s: RootState) => ({
      lang: s.search.input.inputLang,
      mode: s.search.input.mode,
      isSearching: s.search.ftsResultList.isSearching,
    }));

  // The language that drives the input field: extLang in extended mode, inputLang otherwise.
  const effectiveLang = isExtendedSearch ? extLang : inputLang;

  // Whether Unicode input is active (true means full Unicode, 'output' means display-only)
  const useUnicodeTibetan = unicode === true;

  // Derive the initial input value from the URL hash once (stable across renders).
  const initialValue = useMemo(() => {
    if (window.location.hash.startsWith('#/extended-search')) {
      return getExtQueryFromHash();
    }
    const { term, lang } = getTermFromHash();
    return lang === inputLang ? term : '';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable converter instance for converting display value → Wylie for the URL.
  const wylieConverter = useRef(new WylieConverter());

  /** Get the raw Wylie value from the input (converts from Unicode if needed). */
  const getWylieValue = useCallback(
    (lang: Language) => {
      const raw = inputRef.current?.getValue() ?? '';
      if (!raw.trim()) return '';
      return lang === 'tib' && useUnicodeTibetan
        ? wylieConverter.current.uniToWylie(raw).trim()
        : raw.trim();
    },
    [useUnicodeTibetan],
  );

  // ── Normal-mode callbacks ──────────────────────────────────

  const handleNormalInputChange = useCallback(() => {
    const urlTerm = getWylieValue(inputLang);
    if (!urlTerm) { navigate('/'); return; }
    const params = new URLSearchParams({ offset: '0', sidebar: 'true' });
    navigate(`/search/${inputLang}/${encodeQueryParam(urlTerm)}?${params}`, { replace: true });
  }, [navigate, inputLang, getWylieValue]);

  const handleNormalEnter = useCallback(() => {
    const urlTerm = getWylieValue(inputLang);
    if (!urlTerm) return;
    const params = new URLSearchParams({ offset: '0', sidebar: 'false' });
    navigate(`/search/${inputLang}/${encodeQueryParam(urlTerm)}?${params}`);
  }, [navigate, inputLang, getWylieValue]);

  // ── Extended-mode callbacks ────────────────────────────────

  /** Trigger the extended search by writing into the URL (ExtendedSearchLayout reacts). */
  const triggerExtendedSearch = useCallback(() => {
    const q = getWylieValue(extLang);
    if (!q) return;
    setSearchParams({
      q,
      lang: extLang,
      mode: extMode,
      offset: '0',
    });
  }, [setSearchParams, extLang, extMode, getWylieValue]);

  const handleExtModeChange = useCallback(
    (m: SearchMode) => dispatch(setSearchMode(m)),
    [dispatch],
  );
  const handleExtLangChange = useCallback(
    (lang: Language) => dispatch(setInputLang(lang)),
    [dispatch],
  );

  // ── Shared callbacks ──────────────────────────────────────

  const handleSelectLanguage = useCallback(
    (lang: Language) => {
      if (lang === inputLang) return;
      dispatch(setInputLang(lang));
      inputRef.current?.clear();
      inputRef.current?.focus();
      dispatch(setSidebarVisible(false));
    },
    [dispatch, inputLang],
  );

  /**
   * Clear the search input.
   */
  const handleClear = useCallback(() => {
    inputRef.current?.clear();
    inputRef.current?.focus();
    if (isExtendedSearch) {
      setSearchParams({});
    } else {
      navigate('/');
    }
  }, [navigate, isExtendedSearch, setSearchParams]);

  /** Open extended search – carry over whatever is currently in the input. */
  const handleOpenExtendedSearch = useCallback(() => {
    const q = getWylieValue(inputLang);
    dispatch(setInputLang(inputLang));
    if (q) {
      navigate(`/extended-search?q=${encodeQueryParam(q)}&lang=${inputLang}&mode=${extMode}&offset=0`);
    } else {
      navigate('/extended-search');
    }
  }, [navigate, inputLang, extMode, dispatch, getWylieValue]);

  /** Close extended search – return to the welcome page. */
  const handleCloseExtendedSearch = useCallback(() => {
    inputRef.current?.clear();
    navigate('/');
  }, [navigate]);

  // In extended search mode, typing doesn't trigger a search – the user must click "Search" or press Enter.
  const noop = useCallback(() => { }, []);
  const onInputChange = isExtendedSearch ? noop : handleNormalInputChange;
  const onEnter = isExtendedSearch ? triggerExtendedSearch : handleNormalEnter;

  return (
    <>
      <div
        className={clsx(
          styles.topbar,
          isLightMode ? styles.light : styles.dark,
          'py-0 sm:py-2',
        )}
        style={isExtendedSearch ? { flexDirection: 'column' } : undefined}
      >
        {/* ── Main row: input + clear + hamburger ── */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <div className={styles.textInputWrap}>
            <WylieInputField
              ref={inputRef}
              inputLang={effectiveLang}
              useUnicodeTibetan={useUnicodeTibetan}
              lowercase={lowercase}
              onInputChange={onInputChange}
              onEnter={onEnter}
              initialValue={initialValue || undefined}
            />
            <ClearButton onClick={handleClear} />
          </div>

          <span className="mr-3" title="Open menu">
            <HamburgerMenu
              inputLang={inputLang}
              isLightMode={isLightMode}
              onSelectLanguage={handleSelectLanguage}
              onOpenSettings={() => navigate('/settings')}
              onOpenExtendedSearch={handleOpenExtendedSearch}
            />
          </span>
        </div>

        {/* ── Options bar (only in extended-search mode) ── */}
        {isExtendedSearch && (
          <ExtendedSearchOptionsBar
            mode={extMode}
            lang={extLang}
            isSearching={isSearching}
            isLightMode={isLightMode}
            onModeChange={handleExtModeChange}
            onLangChange={handleExtLangChange}
            onSearch={triggerExtendedSearch}
            onClose={handleCloseExtendedSearch}
          />
        )}
      </div>
      <div
        className={
          isExtendedSearch ? styles.topbarUnderlayExtended : styles.topbarUnderlay
        }
      ></div>
    </>
  );
}
