/**
 * ExtendedSearchOptionsBar – the options strip that appears in the TopBar
 * when extended search is active.
 *
 * Contains:
 *  - Mode toggle (Fulltext / Wildcard)
 *  - Search-in selector (All / Terms / Definitions)
 *  - Language switcher (Tibetan→English / English→Tibetan)
 *  - Search button
 *  - Close (×) button to return to normal search
 */
import type { ExtendedSearchMode } from '@/store/extendedSearchSlice';
import styles from './TopBar.module.css';
import { Language } from '@/types';

interface Props {
  mode: ExtendedSearchMode;
  lang: Language;
  isSearching: boolean;
  isLightMode: boolean;
  onModeChange?: (mode: ExtendedSearchMode) => void;
  onLangChange?: (lang: Language) => void;
  onClose?: () => void;
}

export default function ExtendedSearchOptionsBar({
  mode,
  lang,
  isSearching,
  isLightMode,
  onModeChange,
  onLangChange,
  onClose,
}: Props) {
  return (
    <div className={`${styles.optionsBar} ${isLightMode ? styles.optionsBarLight : styles.optionsBarDark}`}>
      {/* ── Mode ── */}
      <span className={styles.optionsGroup}>
        <span className={styles.optionsLabel}>Mode:</span>
        <label className={styles.optionsRadio}>
          <input
            type="radio"
            name="extMode"
            checked={mode === 'term'}
            onChange={() => onModeChange && onModeChange('term')}
          />
          Terms
        </label>
        <label className={styles.optionsRadio}>
          <input
            type="radio"
            name="extMode"
            checked={mode === 'fulltext'}
            onChange={() => onModeChange && onModeChange('fulltext')}
          />
          Fulltext
        </label>
      </span>

      {/* ── Language ── */}
      <span className={styles.optionsGroup}>
        <span className={styles.optionsLabel}>Direction:</span>
        <label className={styles.optionsRadio}>
          <input
            type="radio"
            name="extLang"
            checked={lang === 'tib'}
            onChange={() => onLangChange && onLangChange('tib')}
          />
          Tib → En
        </label>
        <label className={styles.optionsRadio}>
          <input
            type="radio"
            name="extLang"
            checked={lang === 'en'}
            onChange={() => onLangChange && onLangChange('en')}
          />
          En → Tib
        </label>
      </span>

      {/* ── Close button ── */}
      <button
        type="button"
        className={styles.optionsCloseBtn}
        title="Close extended search"
        aria-label="Close extended search"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
