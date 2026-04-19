/**
 * The main search input field.
 *
 * Handles input methods and triggers search on syllable completion / Enter.
 */
import { useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import useMultiLangInput from '@/hooks/useMultiLangInput';
import { WylieConverter } from '@/utils/wylieConverter';
import { hkToIast } from '@/utils/harvardKyotoConverter';
import type { Language } from '@/types';
import type { InputProcessor } from '@/hooks/useInputProcessor';

interface Props {
  inputLang: string;
  useUnicodeTibetan: boolean;
  lowercase: boolean;
  onInputChange: (v: string) => void;
  onEnter: (v: string) => void;
  /** Pre-fill the input with a Wylie/English term (e.g. from the URL on first load) */
  initialValue?: string;
  /** Wylie→Display processor (term-mode default or FTS segment-aware). */
  inputProcessor?: InputProcessor;
  /** Display→Wylie reverse processor (must match inputProcessor). */
  reverseProcessor?: (text: string) => string;
  // Keyboard navigation handlers: move selection / paginate without leaving focus
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
}

export interface MultiLangInputHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  clear: () => void;
  focus: () => void;
  setLastUniInput: (v: string) => void;
  setWasTypedInWylie: (v: boolean) => void;
  /** Insert text at the current cursor position (or at the end if unknown). */
  insertAtCursor: (text: string) => void;
}

const MultiLangInputField = forwardRef<MultiLangInputHandle, Props>(function MultiLangInputField(
  { inputLang, useUnicodeTibetan, lowercase, onInputChange, onEnter, initialValue, inputProcessor, reverseProcessor,  onArrowUp, onArrowDown, onPageUp, onPageDown },
  ref
) {
  const {
    inputRef,
    getValue,
    setValue,
    clear,
    focus,
    setLastUniInput,
    setWasTypedInWylie,
  } = useMultiLangInput({
    useUnicodeTibetan,
    lowercase,
    inputLang: inputLang as Language,
    onInputChange,
    onEnter,
    inputProcessor,
    reverseProcessor,
    onArrowUp,
    onArrowDown,
    onPageUp,
    onPageDown,
  });

  /**
   * Insert text at the current cursor position in the input field.
   * After insertion, triggers the onInputChange callback so the search updates.
   */
  const insertAtCursor = useCallback((text: string) => {
    const el = inputRef.current;
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newValue = before + text + after;
    el.value = newValue;

    // Place the cursor right after the inserted text
    const newPos = start + text.length;
    el.setSelectionRange(newPos, newPos);

    // Sync internal hook state and trigger search
    setValue(newValue);
    onInputChange(newValue);
    el.focus();
  }, [setValue, onInputChange]);

  // Expose imperative methods so parent components can control the input
  useImperativeHandle(ref, () => ({
    getValue,
    setValue,
    clear,
    focus,
    setLastUniInput,
    setWasTypedInWylie,
    insertAtCursor,
  }));

  // Stable converter for initial-value Wylie → Unicode conversion.
  const wylieConverter = useRef(new WylieConverter());

  // On mount: populate the field with the initial value supplied by the parent.
  // Convert Wylie → Unicode for Tibetan, HK → IAST for Sanskrit.
  useEffect(() => {
    if (initialValue) {
      let display: string;
      if (useUnicodeTibetan && inputLang === 'tib') {
        display = wylieConverter.current.wylieToUni(initialValue, true);
      } else if (inputLang === 'skt') {
        display = hkToIast(initialValue);
      } else {
        display = initialValue;
      }
      setValue(display);
    }
    focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder =
    inputLang === 'en'
      ? 'Enter an English term...'
      : inputLang === 'skt'
      ? 'Enter a Sanskrit term...'
      : 'Enter a Tibetan term...';
  const lang = inputLang === 'en' ? 'en' : inputLang === 'skt' ? 'sa' : 'bo';

  return (
    <input
      ref={inputRef}
      id="searchTerm"
      type="text"
      className="searchTerm"
      placeholder={placeholder}
      lang={lang}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
    />
  );
});

export default MultiLangInputField;
