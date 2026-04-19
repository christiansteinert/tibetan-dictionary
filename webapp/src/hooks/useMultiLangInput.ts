/**
 * React hook that handles input events for transliterated input.
 *
 * It manages:
 *  - Wylie → Unicode conversion as the user types (Tibetan, via an InputProcessor)
 *  - Harvard-Kyoto → IAST conversion as the user types (Sanskrit, via an InputProcessor)
 *  - Backspace handling (converting the last syllable back to Wylie — Tibetan only)
 *  - Syllable-boundary detection (space triggers conversion — Tibetan only)
 *  - Language switching between Tibetan, English, and Sanskrit
 *
 * Languages with `hasInputConversion` (Tibetan, Sanskrit) use the
 * `inputProcessor` / `reverseProcessor` pair for display ↔ storage conversion.
 * Tibetan has additional syllable-level logic (tseg detection, normalizeWylie,
 * backspace syllable reversion).  Sanskrit conversion is simpler — each
 * keystroke is converted character-by-character via the processor.
 *
 * Returns a ref to attach to the <input> element and helper functions.
 */
import { useRef, useCallback, useEffect, RefObject } from 'react';
import { WylieConverter } from '@/utils/wylieConverter';
import { ftsSegmentConvert, hasFtsOperators } from '@/utils/fts/ftsInputDecorator';
import type { Language } from '@/types';
import { InputProcessor } from './useInputProcessor';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
  
const wylieConverter = new WylieConverter();

interface UseMultiLangInputOptions {
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

interface UseMultiLangInputReturn {
  inputRef: RefObject<HTMLInputElement | null>;
  getValue: () => string;
  setValue: (v: string) => void;
  clear: () => void;
  focus: () => void;
  setLastUniInput: (v: string) => void;
  setWasTypedInWylie: (v: boolean) => void;
}

export default function useMultiLangInput({
  useUnicodeTibetan,
  lowercase: lowercaseTibetan,
  inputLang,
  onInputChange,
  onEnter,
  inputProcessor,
  reverseProcessor,
  onArrowUp,
  onArrowDown,
  onPageUp,
  onPageDown,
}: UseMultiLangInputOptions): UseMultiLangInputReturn {
  const searchMode = useSelector((s: RootState) => s.search.input.mode);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastUniInput = useRef('');
  const wasTypedInWylie = useRef(false);

  // Store processors in refs so event handlers always see the latest version
  // without needing to re-register listeners.
  const processorRef = useRef(inputProcessor);
  processorRef.current = inputProcessor;
  const reverseRef = useRef(reverseProcessor);
  reverseRef.current = reverseProcessor;

  // --- conversion helpers (stable, don't depend on state) ---------------

  /** e.g. Display→Wylie: uses reverseProcessor if available */
  const revertOutputToInputFormat = useCallback(
    (text: string) => reverseRef.current?.(text) || text,
    [useUnicodeTibetan]
  );

  /** e.g. Wylie→Unicode: uses inputProcessor if available. */
  const convertInputToOutputFormat = useCallback(
    (text: string) => processorRef.current?.(text) || text,
    [useUnicodeTibetan]
  );

  const toLowerIfNeeded = useCallback(
    (text: string) =>
      lowercaseTibetan && inputLang === 'tib' ? text.toLowerCase() : text,
    [lowercaseTibetan, inputLang]
  );

  /**
   * Normalise Wylie text, respecting FTS operators when a processor is active.
   * In FTS mode each segment between operators is normalised individually so
   * that `normalizeWylie` never sees operator characters like `!`.
   */
  const normalizeWylie = useCallback(
    (text: string) => {
      if (processorRef.current && hasFtsOperators(text)) {
        return ftsSegmentConvert(text, seg => convertInputToOutputFormat(seg));
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
    },
    [revertOutputToInputFormat]
  );

  const clear = useCallback(() => {
    if (!inputRef.current) return;
    inputRef.current.value = '';
    lastUniInput.current = '';
    wasTypedInWylie.current = false;
  }, []);

  const focus = useCallback(() => inputRef.current?.focus(), []);

  // --- core event handlers ----------------------------------------------
  
  /** Remove unsupported search operators and other special chars that may cause trouble */
  const removeUnsupportedOperators = (lang: Language, text: string) => {
    if (searchMode === 'term') {
      text = text.replace(/[&|!]/g, ''); // remove FTS operators when in term search mode
      if (lang != 'skt') {
        text = text.replace(/[~]/g, ''); // ~ must always be allowed for sanskrit for sequences like ~n = ñ
      }
    } else {
      text = text.replace(/[*?]/g, ''); // remove term search operators when in FTS mode
    }
    text = text.replace(/[%",]/g, ''); // remove other characters that may cause trouble
    text = text.replace(/[\u0000-\u001F\u007F]/g, ''); // Remove other non-printable characters

    return text;
  };

  const handleEnterKey = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    let uniInput = toLowerIfNeeded(el.value);

    if (useUnicodeTibetan && inputLang === 'tib') {
      uniInput = uniInput.replace(/[-_ /།]+/g, ' ');
      uniInput = normalizeWylie(uniInput);

      const newInput = revertOutputToInputFormat(uniInput);
      el.value = convertInputToOutputFormat(newInput);

      if (/.*['a-zA-Z].*/.test(uniInput)) {
        wasTypedInWylie.current = true;
      }
    } else if (inputLang === 'skt') {
      // Sanskrit: run the full input through the processor (HK→IAST)
      uniInput = uniInput.replace(/[-\s/]+/g, ' ');
      el.value = convertInputToOutputFormat(uniInput);
    } else {
      uniInput = uniInput.replace(/[-\s/]+/g, ' ');
      el.value = uniInput;
    }

    onEnter?.(uniInput);
  }, [useUnicodeTibetan, inputLang, toLowerIfNeeded, revertOutputToInputFormat, convertInputToOutputFormat, normalizeWylie, onEnter]);

  const handleTibBackspaceKey = useCallback((event: KeyboardEvent) => {
    const el = inputRef.current;
    if (!el) return false;

    const uniInput = toLowerIfNeeded(el.value);
    const prev = lastUniInput.current;

    const isBackspaceEvent = event.keyCode === 8 || (uniInput.length < prev.length && prev.startsWith(uniInput));
    if (!isBackspaceEvent) {
      return false;
    }

    lastUniInput.current = uniInput;
    const isCursorAtEnd = el.selectionStart === uniInput.length;
    const isAtEndOfSyllable =
      isCursorAtEnd &&
      /(^|[_ /་།])[^a-zA-Z'_ /་།]+$/.test(uniInput);

    if (
      wasTypedInWylie.current &&
      useUnicodeTibetan &&
      inputLang === 'tib' &&
      isAtEndOfSyllable
    ) {
      let adjusted = revertOutputToInputFormat(uniInput).replace(/[_  ]*$/, '');
      const splitPos = adjusted.lastIndexOf(' ');
      if (splitPos > 0) {
        const beforeLastSyllable = adjusted.substring(0, splitPos + 1);
        // In FTS mode, use the processor so operators aren't fed directly
        // into the Wylie converter (which would turn `!` into `༈`).
        let convertedPrefix = convertInputToOutputFormat(beforeLastSyllable);
        if (/[&|!~]$/.test(convertedPrefix)) {
          convertedPrefix += ' '; // re-add space after FTS operators, when the Wylie converter has removed it
        }

        adjusted =
          convertedPrefix +
          adjusted.substring(splitPos + 1);
      }
      el.value = adjusted;
      onInputChange?.(adjusted);
    } else {
      onInputChange?.(el.value);
    }
    return true;
  }, [useUnicodeTibetan, inputLang, revertOutputToInputFormat, onInputChange]);

  const handleTibMidSyllableCompletion = useCallback((event: KeyboardEvent) => {
    const el = inputRef.current;
    if (!el) return false;

    const uniInput = toLowerIfNeeded(el.value);
    const prev = lastUniInput.current;
    const isOnlyTibetan = !/.*['a-zA-Z].*/.test(uniInput);

    if (
      useUnicodeTibetan &&
      uniInput.length > prev.length &&
      !isOnlyTibetan
    ) {
      const matchMiddle = uniInput.match(
        /(^|^.*་)([a-zA-Z']+) (.*$|$)/
      );
      if (!matchMiddle) return false;

      // In FTS mode, if the "syllable" contains an operator (& | !)
      // use segment-aware conversion so the operator isn't fed into the
      // Wylie converter (which would turn `!` into `༈` and `|` into `༑`).
      const rawMiddle = matchMiddle[2];
      const insertedSyllable = convertInputToOutputFormat(
        wylieConverter.normalizeWylie(rawMiddle)
      );
      const result =
        matchMiddle[1] + insertedSyllable + matchMiddle[3];

      const newCursorPos = matchMiddle[1].length + insertedSyllable.length;
      el.value = result;
      lastUniInput.current = result;
      onInputChange?.(result);
      el.setSelectionRange(newCursorPos, newCursorPos);


      return true;
    }
    return false;

  }, [useUnicodeTibetan, toLowerIfNeeded, onInputChange]);


  /* handle cases where a space or a search operator was added */
  const handleTibSpaceOrOperatorAtEnd = useCallback((event: KeyboardEvent) => {
    const el = inputRef.current;
    if (!el) return false;
    const uniInput = toLowerIfNeeded(el.value);
console.log('Handling space/operator at end for Tibetan input: ', { uniInput, eventKey: event.key, eventKeyCode: event.keyCode });    
    const isCursorAtEnd = el.selectionStart === uniInput.length;
    const prev = lastUniInput.current;
    const isSpace = event.keyCode === 32;
    const isOnlyTibetan = !/.*['a-zA-Z].*/.test(uniInput);

    const wasCharAddedAtEnd = uniInput.length > prev.length && uniInput.startsWith(prev);
    const isSearchOperatorAtEnd = /[&|!*?~]$/.test(uniInput);
    const isSyllableEndCharacterAtEnd = /[- /་།\s]$/.test(uniInput)
    const isSeparatorAppended = wasCharAddedAtEnd && (isSyllableEndCharacterAtEnd || isSearchOperatorAtEnd);

    const newInputAsWylie = revertOutputToInputFormat(uniInput);

    // --- syllable complete (space / separator) ---
    if (isSpace || isSeparatorAppended) {
      let inputText: string;
      if (useUnicodeTibetan) {
        if (!isOnlyTibetan) {
          let n = normalizeWylie(newInputAsWylie);
          //n = newInputAsWylie;
          n = n.replace(/[-_ /\s]+/g, ' ');
          inputText = convertInputToOutputFormat(n);
          inputText = inputText.replace(/[་།]+/g, '་');
        } else {
          inputText = uniInput.replace(/[-་།/_]+/g, '་');
        }
        inputText = inputText.replace(/[\s]+$/g, '');
      } else {
        inputText = newInputAsWylie;
      }

      el.value = inputText;
      lastUniInput.current = inputText;
      onInputChange?.(inputText);

      // Restore cursor if it was at end
      if (isCursorAtEnd) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }

      return true;
    }
  }, [useUnicodeTibetan, toLowerIfNeeded, convertInputToOutputFormat, normalizeWylie, onInputChange]);


  const handleKeyupInput = useCallback(
    (event: KeyboardEvent) => {
      // Ignore Enter key since it is handled separately by onKeypress/handleEnterKey
      if (event.keyCode === 13 || event.key === 'Enter') return;

      // get inpupt field
      const el = inputRef.current;
      if (!el) return;

      const uniInput = toLowerIfNeeded(el.value);
      const prev = lastUniInput.current;


      // === SKT + EN input handling ===

      // Sanskrit + English doesn't use syllable-boundary logic — just run the
      // input processor on every keystroke and trigger search on every change.
      if (inputLang === 'en' || inputLang === 'skt') { // English or Skt
        let converted = processorRef.current?.(uniInput) ?? uniInput;
        converted = removeUnsupportedOperators(inputLang, converted);

        el.value = converted;
        if (converted != prev){
          lastUniInput.current = converted;
          onInputChange?.(el.value);
        }
        return;
      }

      // === TIBETAN input handling ===
      if (uniInput === '') {
        wasTypedInWylie.current = false;
      }

      if (handleTibBackspaceKey(event)) {
        return;
      }

      // --- syllable completion handling ---
      el.value = removeUnsupportedOperators(inputLang, el.value);
      if (handleTibSpaceOrOperatorAtEnd(event) || handleTibMidSyllableCompletion(event)) {
        if (/.*['a-zA-Z].*/.test(uniInput)) {
          wasTypedInWylie.current = true;
        }
        return;
      }
    },
    [
      useUnicodeTibetan,
      inputLang,
      toLowerIfNeeded,
      revertOutputToInputFormat,
      convertInputToOutputFormat,
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

    // keyboard shortcut handling for keybard based navigation in terms search mode
    const onKeydown = (e: KeyboardEvent) => {
      // Arrow keys and Page keys should move selection / paginate but keep
      // focus inside the input field. Prevent default so the caret doesn't move.
      let wasEventHandled = true;
      if (e.key === 'ArrowUp') {
        e.getModifierState('Shift') ? onPageUp?.() : onArrowUp?.();
      } else if (e.key === 'ArrowDown') {
        e.getModifierState('Shift') ? onPageDown?.() : onArrowDown?.();
      } else if (e.key === 'PageUp') {
        const scrollAmount = window.innerHeight * 0.8;
        window.scrollBy(0, -scrollAmount);
      } else if (e.key === 'PageDown') {
        const scrollAmount = window.innerHeight * 0.8;
        window.scrollBy(0, scrollAmount);
      } else {
        wasEventHandled = false;
      }

      if (wasEventHandled) {
        e.preventDefault();
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
    setWasTypedInWylie: (v: boolean) => { wasTypedInWylie.current = v; },
  };
}
