/**
 * WylieInputField – the main search input field.
 *
 * Handles Wylie transliteration via the useWylieInput hook and
 * triggers search on syllable completion / Enter.
 */
import { useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import useWylieInput from '@/hooks/useWylieInput';
import { WylieConverter } from '@/utils/wylieConverter';
import type { InputProcessor } from '@/utils/fts/ftsInputDecorator';
import type { Language } from '@/types';

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

export interface WylieInputHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  clear: () => void;
  focus: () => void;
  setLastUniInput: (v: string) => void;
  setCurrentInput: (v: string) => void;
  setWasTypedInWylie: (v: boolean) => void;
}

const WylieInputField = forwardRef<WylieInputHandle, Props>(function WylieInputField(
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
    setCurrentInput,
    setWasTypedInWylie,
  } = useWylieInput({
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

  // Expose imperative methods so parent components can control the input
  useImperativeHandle(ref, () => ({
    getValue,
    setValue,
    clear,
    focus,
    setLastUniInput,
    setCurrentInput,
    setWasTypedInWylie,
  }));

  // Stable converter for initial-value Wylie → Unicode conversion.
  const wylieConverter = useRef(new WylieConverter());

  // On mount: populate the field with the initial value supplied by the parent.
  // Convert Wylie → Unicode when unicode mode is on.
  useEffect(() => {
    if (initialValue) {
      const display =
        useUnicodeTibetan && inputLang === 'tib'
          ? wylieConverter.current.wylieToUni(initialValue, true)
          : initialValue;
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

export default WylieInputField;
