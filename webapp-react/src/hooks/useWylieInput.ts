/**
 * useWylieInput – React hook that handles input event for Wylie input and English input
 *
 * It manages:
 *  - Wylie → Unicode conversion as the user types
 *  - Backspace handling (converting the last syllable back to Wylie)
 *  - Syllable-boundary detection (space triggers conversion)
 *  - Language switching between Tibetan and English
 *
 * Returns a ref to attach to the <input> element and helper functions.
 */
import { useRef, useCallback, useEffect, RefObject } from 'react';
import { WylieConverter } from '../utils/wylieConverter';
import type { Language } from '../types';

const wylieConverter = new WylieConverter();

interface UseWylieInputOptions {
  useUnicodeTibetan: boolean;
  lowercase: boolean;
  inputLang: Language;
  onInputChange?: (value: string) => void;
  onEnter?: () => void;
}

interface UseWylieInputReturn {
  inputRef: RefObject<HTMLInputElement | null>;
  getValue: () => string;
  setValue: (v: string) => void;
  clear: () => void;
  focus: () => void;
  setLastUniInput: (v: string) => void;
  setCurrentInput: (v: string) => void;
  setWasTypedInWylie: (v: boolean) => void;
}

export default function useWylieInput({
  useUnicodeTibetan,
  lowercase,
  inputLang,
  onInputChange,
  onEnter,
}: UseWylieInputOptions): UseWylieInputReturn {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUniInput = useRef('');
  const currentInput = useRef('');
  const wasTypedInWylie = useRef(false);

  // --- conversion helpers (stable, don't depend on state) ---------------

  const uniToWylie = useCallback(
    (text: string) =>
      useUnicodeTibetan ? wylieConverter.uniToWylie(text) : text,
    [useUnicodeTibetan]
  );

  const tibetanOutput = useCallback(
    (text: string) =>
      useUnicodeTibetan ? wylieConverter.wylieToUni(text) : text,
    [useUnicodeTibetan]
  );

  const toLowerIfNeeded = useCallback(
    (text: string) =>
      lowercase && inputLang === 'tib' ? text.toLowerCase() : text,
    [lowercase, inputLang]
  );

  // --- public helpers ---------------------------------------------------

  const getValue = useCallback(() => inputRef.current?.value ?? '', []);

  const setValue = useCallback(
    (v: string) => {
      if (!inputRef.current) return;
      inputRef.current.value = v;
      lastUniInput.current = v;
      currentInput.current = uniToWylie(v);
    },
    [uniToWylie]
  );

  const clear = useCallback(() => {
    if (!inputRef.current) return;
    inputRef.current.value = '';
    lastUniInput.current = '';
    currentInput.current = '';
    wasTypedInWylie.current = false;
  }, []);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  // --- core event handlers ----------------------------------------------

  const handleEnterKey = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    let uniInput = toLowerIfNeeded(el.value);

    if (useUnicodeTibetan && inputLang === 'tib') {
      uniInput = uniInput.replace(/[-_ /།]+/g, ' ');
      uniInput = wylieConverter.normalizeWylie(uniInput);
      const newInput = uniToWylie(uniInput);
      el.value = tibetanOutput(newInput);

      if (/.*['a-zA-Z].*/.test(uniInput)) {
        wasTypedInWylie.current = true;
      }
    } else {
      uniInput = uniInput.replace(/[-\s/]+/g, ' ');
      el.value = uniInput;
    }

    onEnter?.();
  }, [useUnicodeTibetan, inputLang, toLowerIfNeeded, uniToWylie, tibetanOutput, onEnter]);

  const handleKeyupInput = useCallback(
    (event: KeyboardEvent) => {
      // Don't process Enter key — that is handled exclusively by handleEnterKey
      // to prevent the keyup firing after keypress from overwriting the
      // sidebar=false navigation with sidebar=true.
      if (event.keyCode === 13 || event.key === 'Enter') return;

      const el = inputRef.current;
      if (!el) return;

      const uniInput = toLowerIfNeeded(el.value);
      const prev = lastUniInput.current;
      let newInput = uniInput;
      const isCursorAtEnd = el.selectionStart === uniInput.length;

      // Skip if no Wylie-relevant chars (avoids interfering with native keyboards)
      if (
        event.type === 'input' &&
        !/.*['a-zA-Z].*/.test(uniInput + prev)
      ) {
        return;
      }

      // Convert based on language
      if (inputLang === 'tib' && useUnicodeTibetan) {
        newInput = uniToWylie(uniInput).replace(/_/g, ' ');
      } else {
        newInput = newInput.replace(/[-\s/]+/g, ' ');
      }

      // Track Wylie input
      let currentInputContainsWylie = false;
      let matchMiddle: RegExpMatchArray | null = null;

      if (inputLang === 'tib' && /.*['a-zA-Z].*/.test(uniInput)) {
        wasTypedInWylie.current = true;
        currentInputContainsWylie = true;
        matchMiddle = uniInput.match(
          /(^|^[^ ]*་)([^་ ]+) ([^ ]+$|$)/
        );
      } else if (uniInput === '') {
        wasTypedInWylie.current = false;
      }

      const isSpace = event.keyCode === 32;
      const isSeparatorAppended =
        /[-  /་།\s]$/.test(uniInput) &&
        uniInput.startsWith(prev) &&
        !/[a-zA-Z'].*་/.test(prev);
      const isEnglishThreeChars =
        newInput.length >= 3 && inputLang === 'en';
      const isBackspace =
        event.keyCode === 8 ||
        (uniInput.length < prev.length && prev.startsWith(uniInput));

      // --- syllable in the middle ---
      if (
        useUnicodeTibetan &&
        uniInput.length > prev.length &&
        matchMiddle
      ) {
        const insertedSyllable = wylieConverter.wylieToUni(
          wylieConverter.normalizeWylie(matchMiddle[2])
        );
        const result =
          matchMiddle[1] + insertedSyllable + matchMiddle[3];
        const cursorPos = matchMiddle[1].length + insertedSyllable.length;
        el.value = result;
        onInputChange?.(el.value);
        el.setSelectionRange(cursorPos, cursorPos);
        lastUniInput.current = el.value;
        currentInput.current = uniToWylie(el.value);
        return;
      }

      // --- syllable complete (space / separator) ---
      if (isSpace || isSeparatorAppended || isEnglishThreeChars) {
        let inputText: string;
        if (useUnicodeTibetan && inputLang === 'tib') {
          if (currentInputContainsWylie) {
            let n = wylieConverter.normalizeWylie(newInput);
            n = n.replace(/[-_ /་།\s]+/g, ' ');
            inputText = tibetanOutput(n);
          } else {
            inputText = uniInput.replace(/[-_ /་།\s]+/g, '་');
          }
        } else {
          inputText = newInput;
        }
        el.value = inputText;
        onInputChange?.(el.value);
      }

      // --- backspace ---
      else if (isBackspace) {
        const isAtEndOfSyllable =
          isCursorAtEnd &&
          /(^|[_ /་།])[^a-zA-Z'_ /་།]+$/.test(uniInput);

        if (
          wasTypedInWylie.current &&
          useUnicodeTibetan &&
          inputLang === 'tib' &&
          isAtEndOfSyllable
        ) {
          let adjusted = uniToWylie(uniInput).replace(/[_  ]*$/, '');
          const splitPos = adjusted.lastIndexOf(' ');
          if (splitPos > 0) {
            adjusted =
              wylieConverter.wylieToUni(adjusted.substring(0, splitPos + 1)) +
              adjusted.substring(splitPos + 1);
          }
          el.value = adjusted;
          onInputChange?.(el.value);
        } else {
          onInputChange?.(el.value);
        }
      }

      // Update refs
      lastUniInput.current = el.value;
      currentInput.current = uniToWylie(el.value);

      // Restore cursor if it was at end
      if (isCursorAtEnd) {
        requestAnimationFrame(() => {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        });
      }
    },
    [
      useUnicodeTibetan,
      inputLang,
      toLowerIfNeeded,
      uniToWylie,
      tibetanOutput,
      onInputChange,
    ]
  );

  // --- attach native event listeners ------------------------------------

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const onKeypress = (e: KeyboardEvent) => {
      if (e.keyCode === 13) handleEnterKey();
    };
    const onKeyup = (e: KeyboardEvent) => handleKeyupInput(e);
    const onInput = (e: KeyboardEvent) => handleKeyupInput(e);

    el.addEventListener('keypress', onKeypress as EventListener);
    el.addEventListener('keyup', onKeyup as EventListener);
    el.addEventListener('input', onInput as EventListener);

    return () => {
      el.removeEventListener('keypress', onKeypress as EventListener);
      el.removeEventListener('keyup', onKeyup as EventListener);
      el.removeEventListener('input', onInput as EventListener);
    };
  }, [handleEnterKey, handleKeyupInput]);

  return {
    inputRef,
    getValue,
    setValue,
    clear,
    focus,
    setLastUniInput: (v: string) => { lastUniInput.current = v; },
    setCurrentInput: (v: string) => { currentInput.current = v; },
    setWasTypedInWylie: (v: boolean) => { wasTypedInWylie.current = v; },
  };
}
