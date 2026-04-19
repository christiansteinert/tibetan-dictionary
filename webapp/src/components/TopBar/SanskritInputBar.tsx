/**
 * SanskritInputBar – a row of small buttons with diacritical characters.
 *
 * Each button inserts its character into the search input at the current
 * cursor position via the `onInsertChar` callback.
 */
import styles from './TopBar.module.css';

/** IAST characters that have no simple keyboard equivalent. */
const SANSKRIT_CHARS = [
  'ā', 'ī', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'ṃ', 'ḥ', 'ṅ', 'ñ', 'ṭ', 'ḍ', 'ṇ', 'ś', 'ṣ',
] as const;

interface Props {
  isLightMode: boolean;
  /** Called when the user clicks one of the character buttons. */
  onInsertChar: (char: string) => void;
}

export default function SanskritInputBar({ isLightMode, onInsertChar }: Props) {
  return (
    <div
      className={`${styles.sanskritBar} ${isLightMode ? styles.sanskritBarLight : styles.sanskritBarDark}`}
    >
      {SANSKRIT_CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          className={`${styles.sanskritCharBtn} ${isLightMode ? styles.sanskritCharBtnLight : styles.sanskritCharBtnDark}`}
          // Use onMouseDown + preventDefault so the search input does not lose
          // focus (and therefore its cursor position) before the click fires.
          onMouseDown={(e) => {
            e.preventDefault();
            onInsertChar(ch);
          }}
          title={`Insert ${ch}`}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
