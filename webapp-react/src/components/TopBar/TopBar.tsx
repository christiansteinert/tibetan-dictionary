/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import { useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import WylieInputField, { WylieInputHandle } from './WylieInputField';
import LanguageSwitchButton from './LanguageSwitchButton';
import ClearButton from './ClearButton';
import { setInputLang, setSidebarVisible } from '@/store/searchSlice';
import settingsImg from '~assets/images/settings.png';
import styles from './TopBar.module.css';
import type { RootState } from '@/store/store';

export default function TopBar() {
  const { layout } = useSelector((s: RootState) => s.settings);
  const isLightMode = layout !== 'layout_black';

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inputRef = useRef<WylieInputHandle>(null);

  const inputLang = useSelector((s: any) => s.search.inputLang);
  const { unicode, lowercase } = useSelector((s: any) => s.settings);

  // Whether Unicode input is active (true means full Unicode, 'output' means display-only)
  const useUnicodeTibetan = unicode === true;

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
      const params = new URLSearchParams({
        offset: '0',
        sidebar: 'true',
      });
      navigate(`/search/${inputLang}/${encodeURIComponent(raw)}?${params}`, { replace: true });
    },
    [navigate, inputLang]
  );

  /**
   * Triggered when Enter is pressed — performs a "hard" search.
   * Navigates to the search route so the URL reflects the active term.
   */
  const handleEnter = useCallback(() => {
    const raw = inputRef.current?.getValue() ?? '';
    if (!raw.trim()) return;

    const params = new URLSearchParams({
      offset: '0',
      sidebar: 'false',
    });
    navigate(`/search/${inputLang}/${encodeURIComponent(raw)}?${params}`);
  }, [navigate, inputLang]);

  /**
   * Switch between Tibetan and English input.
   */
  const handleLanguageSwitch = useCallback(() => {
    const newLang = inputLang === 'tib' ? 'en' : 'tib';
    dispatch(setInputLang(newLang));
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
          />
          <ClearButton onClick={handleClear} />
        </div>

        <LanguageSwitchButton
          inputLang={inputLang}
          onSwitch={handleLanguageSwitch}
        />

        <a
          href="#/settings"
          id="settingsBtn"
          title="Settings"
          onClick={(e) => {
            e.preventDefault();
            navigate('/settings');
          }}
        >
          <img src={settingsImg} alt="Settings" width="32" height="43" />
        </a>
      </div>
      <div className={styles.topbarUnderlay}></div>
    </>
  );
}
