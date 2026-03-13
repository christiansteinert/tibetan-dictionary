/**
 * useWylieInput – React hook that replicates the InputHandler logic.
 *
 * It manages:
 *  - Wylie → Unicode conversion as the user types
 *  - Backspace handling (converting the last syllable back to Wylie)
 *  - Syllable-boundary detection (space triggers conversion)
 *  - Language switching between Tibetan and English
 *
 * Returns a ref to attach to the <input> element and helper functions.
 */
import { useRef, useCallback, useEffect } from 'react';
import { WylieConverter } from '../utils/wylieConverter';

const wylieConverter = new WylieConverter();

/**
 * @param {Object} options
 * @param {boolean} options.useUnicodeTibetan – whether to convert Wylie to Unicode
 * @param {boolean} options.lowercase – auto-lowercase Wylie input
 * @param {string}  options.inputLang – 'tib' or 'en'
 * @param {(value: string) => void} options.onInputChange – called after meaningful input change
 * @param {() => void} options.onEnter – called when Enter is pressed
 */
export default function useWylieInput({
  useUnicodeTibetan,
  lowercase,
  inputLang,
  onInputChange,
  onEnter,
}) {
  const inputRef = useRef(null);
  const lastUniInput = useRef('');
  const currentInput = useRef('');
  const wasTypedInWylie = useRef(false);

  // --- conversion helpers (stable, don't depend on state) ---------------

  const uniToWylie = useCallback(
    (text) =>
      useUnicodeTibetan ? wylieConverter.uniToWylie(text) : text,
    [useUnicodeTibetan]
  );

  const tibetanOutput = useCallback(
    (text) =>
      useUnicodeTibetan ? wylieConverter.wylieToUni(text) : text,
    [useUnicodeTibetan]
  );

  const toLowerIfNeeded = useCallback(
    (text) =>
      lowercase && inputLang === 'tib' ? text.toLowerCase() : text,
    [lowercase, inputLang]
  );

  // --- public helpers ---------------------------------------------------

  const getValue = useCallback(() => inputRef.current?.value ?? '', []);

  const setValue = useCallback(
    (v) => {
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
    (event) => {
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
      let matchMiddle = null;

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
        let inputText;
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

    const onKeypress = (e) => {
      if (e.keyCode === 13) handleEnterKey();
    };
    const onKeyup = (e) => handleKeyupInput(e);
    const onInput = (e) => handleKeyupInput(e);

    el.addEventListener('keypress', onKeypress);
    el.addEventListener('keyup', onKeyup);
    el.addEventListener('input', onInput);

    return () => {
      el.removeEventListener('keypress', onKeypress);
      el.removeEventListener('keyup', onKeyup);
      el.removeEventListener('input', onInput);
    };
  }, [handleEnterKey, handleKeyupInput]);

  return {
    inputRef,
    getValue,
    setValue,
    clear,
    focus,
    /** Expose for state-restoration (legacy URL redirect) */
    setLastUniInput: (v) => { lastUniInput.current = v; },
    setCurrentInput: (v) => { currentInput.current = v; },
    setWasTypedInWylie: (v) => { wasTypedInWylie.current = v; },
  };
}
