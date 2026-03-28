/**
 * WylieInputField – the main search input field.
 *
 * Handles Wylie transliteration via the useWylieInput hook and
 * triggers search on syllable completion / Enter.
 */
import { useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import useWylieInput from '@/hooks/useWylieInput';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';

interface Props {
  inputLang: string;
  useUnicodeTibetan: boolean;
  lowercase: boolean;
  onInputChange: (v: string) => void;
  onEnter: (v: string) => void;
  /** Pre-fill the input with a Wylie/English term (e.g. from the URL on first load) */
  initialValue?: string;
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
  { inputLang, useUnicodeTibetan, lowercase, onInputChange, onEnter, initialValue },
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
      : 'Enter a Tibetan term...';
  const lang = inputLang === 'en' ? 'en' : 'bo';

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
