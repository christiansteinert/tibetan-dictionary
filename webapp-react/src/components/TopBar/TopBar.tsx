/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import { useRef, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import WylieInputField, { WylieInputHandle } from './WylieInputField';
import ClearButton from './ClearButton';
import HamburgerMenu from './HamburgerMenu';
import { setInputLang, setSidebarVisible } from '@/store/searchSlice';
import { WylieConverter } from '@/utils/wylieConverter';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';

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

export default function TopBar() {
  const { layout } = useSelector((s: RootState) => s.settings);
  const isLightMode = layout !== 'layout_black';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef<WylieInputHandle>(null);

  const inputLang = useSelector((s: any) => s.search.input.inputLang);
  const { unicode, lowercase } = useSelector((s: any) => s.settings);

  // Whether Unicode input is active (true means full Unicode, 'output' means display-only)
  const useUnicodeTibetan = unicode === true;

  // Derive the initial input value from the URL hash once (stable across renders).
  // This ensures the field is pre-filled on hard reload / shared link before Redux
  // has been populated by SearchLayout.
  const initialValue = useMemo(() => {
    const { term, lang } = getTermFromHash();
    return lang === inputLang ? term : '';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stable converter instance for converting display value → Wylie for the URL.
  // We need this because useWylieInput writes Unicode Tibetan into el.value when
  // unicode mode is on, but the URL must always use Wylie as the lookup key.
  const wylieConverter = useRef(new WylieConverter());

  /**
   * Triggered when the input changes (syllable complete, backspace, etc.)
   * Navigates to the search route with sidebar=true (soft search).
   * SearchLayout will handle the actual API call.
   */
  const handleInputChange = useCallback(
    () => {
      const raw = inputRef.current?.getValue() ?? '';
      if (!raw.trim()) {
        navigate('/');
        return;
      }
      // The input field contains Unicode Tibetan when unicode mode is on.
      // Convert back to Wylie so the URL always uses the Wylie lookup key.
      const urlTerm =
        inputLang === 'tib' && useUnicodeTibetan
          ? wylieConverter.current.uniToWylie(raw).trim()
          : raw.trim();
      const params = new URLSearchParams({
        offset: '0',
        sidebar: 'true',
      });
      navigate(`/search/${inputLang}/${encodeURIComponent(urlTerm)}?${params}`, { replace: true });
    },
    [navigate, inputLang, useUnicodeTibetan]
  );

  /**
   * Triggered when Enter is pressed — performs a "hard" search.
   * Navigates to the search route so the URL reflects the active term.
   */
  const handleEnter = useCallback(() => {
    const raw = inputRef.current?.getValue() ?? '';
    if (!raw.trim()) return;

    // Same Wylie conversion as handleInputChange.
    const urlTerm =
      inputLang === 'tib' && useUnicodeTibetan
        ? wylieConverter.current.uniToWylie(raw).trim()
        : raw.trim();

    const params = new URLSearchParams({
      offset: '0',
      sidebar: 'false',
    });
    navigate(`/search/${inputLang}/${encodeURIComponent(urlTerm)}?${params}`);
  }, [navigate, inputLang, useUnicodeTibetan]);

  /**
   * Switch to a specific input language (called from HamburgerMenu).
   */
  const handleSelectLanguage = useCallback((lang: 'tib' | 'en') => {
    if (lang === inputLang) return;
    dispatch(setInputLang(lang));
    inputRef.current?.clear();
    inputRef.current?.focus();
    dispatch(setSidebarVisible(false));
  }, [dispatch, inputLang]);

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
          'py-0 sm:py-2'
        )}>
        <div className={styles.textInputWrap}>
          <WylieInputField
            ref={inputRef}
            inputLang={inputLang}
            useUnicodeTibetan={useUnicodeTibetan}
            lowercase={lowercase}
            onInputChange={handleInputChange}
            onEnter={handleEnter}
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
          />
        </span>
      </div>
      <div className={styles.topbarUnderlay}></div>

    </>
  );
}
