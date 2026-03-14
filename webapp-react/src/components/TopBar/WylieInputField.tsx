/**
 * WylieInputField – the main search input field.
 *
 * Handles Wylie transliteration via the useWylieInput hook and
 * triggers search on syllable completion / Enter.
 */
import { useEffect, forwardRef, useImperativeHandle } from 'react';
import useWylieInput from '@/hooks/useWylieInput';

interface Props {
  inputLang: string;
  useUnicodeTibetan: boolean;
  lowercase: boolean;
  onInputChange: () => void;
  onEnter: () => void;
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
  { inputLang, useUnicodeTibetan, lowercase, onInputChange, onEnter },
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
    inputLang,
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

  // Update placeholder when language changes
  const placeholder =
    inputLang === 'en'
      ? 'Enter an English term...'
      : 'Enter a Tibetan term...';
  const lang = inputLang === 'en' ? 'en' : 'bo';

  // Focus on mount
  useEffect(() => {
    focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
