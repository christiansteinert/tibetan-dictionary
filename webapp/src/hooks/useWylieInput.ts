/**
 * useWylieInput – React hook that handles input event for Wylie input and English input
 *
 * It manages:
 *  - Wylie → Unicode conversion as the user types (via an InputProcessor)
 *  - Backspace handling (converting the last syllable back to Wylie)
 *  - Syllable-boundary detection (space triggers conversion)
 *  - Language switching between Tibetan and English
 *
 * The actual Wylie↔Unicode conversion is delegated to an `InputProcessor`
 * function.  In term-search mode this is a plain wylieToUni; in fulltext
 * mode it splits on FTS operators, converts each segment individually, and
 * applies operator-spacing rules — preventing characters like `!` from
 * being fed into the Wylie converter.
 *
 * Returns a ref to attach to the <input> element and helper functions.
 */
import { useRef, useCallback, useEffect, RefObject } from 'react';
import { WylieConverter } from '@/utils/wylieConverter';
import { type InputProcessor, ftsSegmentConvert, hasFtsOperators } from '@/utils/fts/ftsInputDecorator';
import type { Language } from '@/types';

const wylieConverter = new WylieConverter();

interface UseWylieInputOptions {
  useUnicodeTibetan: boolean;
  lowercase: boolean;
  inputLang: Language;
  onInputChange?: (value: string) => void;
  onEnter?: (value: string) => void;
  /**
   * Converts normalised Wylie text into display text.
   * In term mode: plain wylieToUni.
   * In FTS mode: segment-aware conversion + operator spacing.
   * When undefined, a plain identity function is used (Wylie-as-is).
   */
  inputProcessor?: InputProcessor;
  /**
   * Converts display text back to Wylie.  Must be the inverse of the
   * processor's conversion.  In FTS mode this splits on operators and
   * converts each segment individually.
   * When undefined, the built-in uniToWylie is used.
   */
  reverseProcessor?: (text: string) => string;
  // Keyboard navigation handlers: used to move selection / paginate while
  // keeping focus inside the input box.
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
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
  inputProcessor,
  reverseProcessor,
  onArrowUp,
  onArrowDown,
  onPageUp,
  onPageDown,
}: UseWylieInputOptions): UseWylieInputReturn {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastUniInput = useRef('');
  const currentInput = useRef('');
  const wasTypedInWylie = useRef(false);

  // Store processors in refs so event handlers always see the latest version
  // without needing to re-register listeners.
  const processorRef = useRef(inputProcessor);
  processorRef.current = inputProcessor;
  const reverseRef = useRef(reverseProcessor);
  reverseRef.current = reverseProcessor;

  // --- conversion helpers (stable, don't depend on state) ---------------

  /** Display→Wylie: uses reverseProcessor if available, else built-in uniToWylie. */
  const uniToWylie = useCallback(
    (text: string) => {
      if (reverseRef.current) return reverseRef.current(text);
      return useUnicodeTibetan ? wylieConverter.uniToWylie(text) : text;
    },
    [useUnicodeTibetan]
  );

  /** Wylie→Display: uses inputProcessor if available, else built-in wylieToUni. */
  const tibetanOutput = useCallback(
    (text: string) => {
      if (processorRef.current) return processorRef.current(text);
      return useUnicodeTibetan ? wylieConverter.wylieToUni(text) : text;
    },
    [useUnicodeTibetan]
  );

  const toLowerIfNeeded = useCallback(
    (text: string) =>
      lowercase && inputLang === 'tib' ? text.toLowerCase() : text,
    [lowercase, inputLang]
  );

  /**
   * Normalise Wylie text, respecting FTS operators when a processor is active.
   * In FTS mode each segment between operators is normalised individually so
   * that `normalizeWylie` never sees operator characters like `!`.
   */
  const normalizeWylie = useCallback(
    (text: string) => {
      if (processorRef.current && hasFtsOperators(text)) {
        return ftsSegmentConvert(text, seg => wylieConverter.normalizeWylie(seg));
      }
      return wylieConverter.normalizeWylie(text);
    },
    []
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
      uniInput = normalizeWylie(uniInput);
      const newInput = uniToWylie(uniInput);
      el.value = tibetanOutput(newInput);

      if (/.*['a-zA-Z].*/.test(uniInput)) {
        wasTypedInWylie.current = true;
      }
    } else {
      uniInput = uniInput.replace(/[-\s/]+/g, ' ');
      el.value = uniInput;
    }

    onEnter?.(uniInput);
  }, [useUnicodeTibetan, inputLang, toLowerIfNeeded, uniToWylie, tibetanOutput, normalizeWylie, onEnter]);

  const handleKeyupInput = useCallback(
    (event: KeyboardEvent) => {
      // Ignore navigation keys handled (ArrowUp/Down, PageUp/Down) since those are handled separately in a keydown handler
      if (event.key === 'Shift' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown') {
        return;
      }

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

      const isOnlyTibetan = !/.*['a-zA-Z].*/.test(uniInput + prev) && !(processorRef.current && hasFtsOperators(uniInput + prev));
      const endsWithTseg = /[-  /་།\s]$/.test(uniInput);
      const isBackspaceEvent = event.keyCode === 8 || (uniInput.length < prev.length && prev.startsWith(uniInput));

      // Skip Wylie logic if typing pure Tibetan without syllable completion or backspace.
      // Crucial: do this for BOTH input AND keyup so we don't interrupt native IME composition with setSelectionRange!
      if (isOnlyTibetan && !endsWithTseg && !isBackspaceEvent) {
        lastUniInput.current = el.value;
        currentInput.current = uniToWylie(el.value);
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
      // In FTS mode, operators (& | !) count as "Wylie-like" content so that
      // the Wylie conversion branch is taken instead of the native-Tibetan branch.
      const hasFtsOps = processorRef.current && hasFtsOperators(uniInput);

      if (inputLang === 'tib' && (/.*['a-zA-Z].*/.test(uniInput) || hasFtsOps)) {
        wasTypedInWylie.current = true;
        currentInputContainsWylie = true;
        matchMiddle = uniInput.match(
          /(^|^[^ ]*་)([^་ ]+) ([^ ]+$|$)/
        );
      } else if (uniInput === '') {
        wasTypedInWylie.current = false;
      }

      const isSpace = event.keyCode === 32;
      // In FTS mode, operators (& | ! *) also act as separators that trigger
      // syllable conversion — just like space or tseg.
      // Only when text actually grew: otherwise a backspace that lands on an
      // operator would immediately re-trigger decoration, making the operator
      // impossible to delete.
      const isFtsOperatorAppended =
        !!processorRef.current &&
        /[&|!*]$/.test(uniInput) &&
        uniInput.length > prev.length &&
        uniInput.startsWith(prev);
      const isSeparatorAppended =
        (/[-  /་།\s]$/.test(uniInput) &&
          uniInput.startsWith(prev) &&
          !/[a-zA-Z'].*་/.test(prev)) ||
        isFtsOperatorAppended;
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
        // In FTS mode, if the "syllable" contains an operator (& | !)
        // use segment-aware conversion so the operator isn't fed into the
        // Wylie converter (which would turn `!` into `༈` and `|` into `༑`).
        const rawMiddle = matchMiddle[2];
        const insertedSyllable =
          processorRef.current && hasFtsOperators(rawMiddle)
            ? ftsSegmentConvert(rawMiddle, seg =>
              wylieConverter.wylieToUni(wylieConverter.normalizeWylie(seg))
            )
            : wylieConverter.wylieToUni(
              wylieConverter.normalizeWylie(rawMiddle)
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
            let n = normalizeWylie(newInput);
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
            const beforeLastSyllable = adjusted.substring(0, splitPos + 1);
            // In FTS mode, use the processor so operators aren't fed directly
            // into the Wylie converter (which would turn `!` into `༈`).
            const convertedPrefix =
              processorRef.current
                ? tibetanOutput(beforeLastSyllable)
                : wylieConverter.wylieToUni(beforeLastSyllable);
            adjusted =
              convertedPrefix +
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
      normalizeWylie,
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
    const onKeydown = (e: KeyboardEvent) => {
      // Arrow keys and Page keys should move selection / paginate but keep
      // focus inside the input field. Prevent default so the caret doesn't move.
      if (e.key === 'ArrowUp') {
        e.getModifierState('Shift') ? onPageUp?.() : onArrowUp?.();
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        e.getModifierState('Shift') ? onPageDown?.() : onArrowDown?.();
        e.preventDefault();
      } else if (e.key === 'PageUp') {
        const scrollAmount = window.innerHeight * 0.9;
        e.preventDefault();
        window.scrollBy(0, -scrollAmount);
      } else if (e.key === 'PageDown') {
        const scrollAmount = window.innerHeight * 0.9;
        e.preventDefault();
        window.scrollBy(0, scrollAmount);
      }
    };

    el.addEventListener('keypress', onKeypress as EventListener);
    el.addEventListener('keyup', onKeyup as EventListener);
    el.addEventListener('input', onInput as EventListener);
    el.addEventListener('keydown', onKeydown as EventListener);

    return () => {
      el.removeEventListener('keypress', onKeypress as EventListener);
      el.removeEventListener('keyup', onKeyup as EventListener);
      el.removeEventListener('input', onInput as EventListener);
      el.removeEventListener('keydown', onKeydown as EventListener);
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
