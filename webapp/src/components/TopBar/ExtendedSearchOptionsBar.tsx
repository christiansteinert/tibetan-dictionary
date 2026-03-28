/**
 * ExtendedSearchOptionsBar – the options strip that appears in the TopBar
 * when extended search is active.
 *
 * Contains:
 *  - Mode toggle (Fulltext / Wildcard)
 *  - Search-in selector (All / Terms / Definitions)
 *  - Language switcher (Tibetan→English / English→Tibetan)
 *  - Help button
 *  - Close (×) button to return to normal search
 */
import type { SearchMode } from '@/store/searchSlice';
import styles from './TopBar.module.css';
import { Language } from '@/types';
import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import HelpDialog from './HelpDialog';
import { useState } from 'react';



interface Props {
  mode: SearchMode;
  lang: Language;
  isSearching: boolean;
  isLightMode: boolean;
  onModeChange?: (mode: SearchMode) => void;
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
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
    <div className={`${styles.optionsBar} ${isLightMode ? styles.optionsBarLight : styles.optionsBarDark}`}>
      {/* ── Mode ── */}
      <span className={styles.optionsGroup}>
        <span className={styles.optionsLabel}>Mode:</span>
        <label className={styles.optionsRadio}
          title="Search only in dictionary headwords (terms)">
          <input
            type="radio"
            name="extMode"
            checked={mode === 'term'}
            onChange={() => onModeChange && onModeChange('fulltext')}
          />
          Terms
        </label>
        <label className={styles.optionsRadio} 
        title="Search both in dictionary headwords and dictionary definitions (fulltext search)">
          <input
            type="radio"
            name="extMode"
            checked={mode === 'fulltext'}
            onChange={() => onModeChange && onModeChange('term')}
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
            title="Search the Tibetan–English dictionary"
          />
          Tib → En
        </label>
        <label className={styles.optionsRadio}>
          <input
            type="radio"
            name="extLang"
            checked={lang === 'en'}
            onChange={() => onLangChange && onLangChange('en')}
            title="Search the English–Tibetan dictionary"
          />
          En → Tib
        </label>
      </span>

      <span className={styles.optionsGroup}>
        <button type="button" title="Help" className={styles.optionsHelpBtn} onClick={() => setHelpOpen(true)}>
          <QuestionMarkCircledIcon /> Help
        </button>
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
        <HelpDialog
          open={helpOpen}
          isLightMode={isLightMode}
          onOpenChange={setHelpOpen}
        />
        </>
  );
}
