/**
 * Input Handler Module for the Tibetan Dictionary
 * 
 * Handles keyboard input for Tibetan/English dictionary search, including:
 * - Wylie transliteration to Unicode conversion
 * - Backspace handling for Tibetan syllables
 * - Language switching (Tibetan / English)
 * 
 * Each instance manages a single input field and is multi-instance capable.
 * Communication with the main application happens through callbacks.
 */

import { WylieConverter } from './wylieConverter.mjs';

/**
 * @typedef {Object} InputHandlerCallbacks
 * @property {function(): void} onInputChange - called when input value changes in a way that should trigger an update (e.g. after Tibetan syllable completion, English >= 3 letters, or backspace)
 * @property {function(): void} onEnter - called when enter key is pressed
 */

/**
 * @typedef {Object} InputHandlerOptions
 * @property {boolean} useUnicodeTibetan - Returns whether Unicode Tibetan output is enabled
 * @property {boolean} lowercaseSetting - Returns whether automatic conversion to lowercase is enabled during Wylie input
 */
export class InputHandler {
  // Private fields
  #inputElement;
  #callbacks;
  #wylieConverter;
  #useUnicodeTibetan;
  #lowercaseSetting;
  #inputLang;
  #lastUniInput;
  #currentInput;
  #wasTypedInWylie;
  #needsBackspaceWorkaround = null;

  /**
   * Create a new InputHandler instance
   * @param {HTMLInputElement|string} inputElement - Input element or selector
   * @param {InputHandlerCallbacks} callbacks - Callback functions for app communication
   * @param {InputHandlerOptions} options - Configuration options
   */
  constructor(inputElement, callbacks, options) {
    this.#inputElement = document.querySelector(inputElement);
    this.#callbacks = callbacks;
    this.#wylieConverter = new WylieConverter();

    // Store options/dependencies
    this.#useUnicodeTibetan = options.useUnicodeTibetan;
    this.#lowercaseSetting = options.lowercaseSetting;

    // Instance state
    this.#inputLang = 'tib';  // 'tib' or 'en'
    this.#lastUniInput = '';
    this.#currentInput = '';
    this.#wasTypedInWylie = false;

    // Attach events
    this.#attachEvents();
  }

  // ==================== Public API ====================

  /**
   * Get the current input language
   * @returns {'tib'|'en'} Current input language
   */
  getInputLang() {
    return this.#inputLang || 'tib';
  }

  /**
   * Set the input language
   * @param {'tib'|'en'} lang - Language to set
   */
  setInputLang(lang) {
    if (lang === 'tib' || lang === 'en') {
      this.#inputLang = lang;
      this.#wasTypedInWylie = false;
      this.#lastUniInput = '';
      this.#currentInput = '';

      if (lang === "en") {
        this.#inputElement.setAttribute("placeholder", "Enter an English term...");
        this.#inputElement.setAttribute("lang", "en");
      } else {
        this.#inputElement.setAttribute("placeholder", "Enter a Tibetan term...");
        this.#inputElement.setAttribute("lang", "bo");
      }
    }
  }

  /**
   * Get current input value
   * @returns {string} Current value of the input field
   */
  getValue() {
    return this.#inputElement.value;
  }

  /**
   * Set input value
   * @param {string} value - Value to set
   */
  setValue(value) {
    this.#inputElement.value = value;
    this.#lastUniInput = value;
    this.#currentInput = this.#uniToWylie(value);
  }

  /**
   * Clear the input field and reset state
   */
  clear() {
    this.#inputElement.value = '';
    this.#lastUniInput = '';
    this.#currentInput = '';
    this.#wasTypedInWylie = false;
  }

  /**
   * Focus the input field
   */
  focus() {
    this.#inputElement.focus();
  }

  /**
   * Set the last Unicode input value (for state restoration)
   * @param {string} value
   */
  setLastUniInput(value) {
    this.#lastUniInput = value;
  }

  /**
   * Set the current Wylie input value (for state restoration)
   * @param {string} value
   */
  setCurrentInput(value) {
    this.#currentInput = value;
  }

  /**
   * Set wasTypedInWylie flag
   * @param {boolean} value
   */
  setWasTypedInWylie(value) {
    this.#wasTypedInWylie = value;
  }

  // ==================== Private Methods ====================

  /**
   * Attach event handlers to the input element
   * @private
   */
  #attachEvents() {
    this.#inputElement.addEventListener('keypress', (event) => this.#handleKeypress(event));
    this.#inputElement.addEventListener('keyup', (event) => this.#handleKeyupInput(event));
    this.#inputElement.addEventListener('input', (event) => this.#handleKeyupInput(event));

    // use jQuery mobiletextchange event (if jQuery is available)
    if (typeof jQuery !== 'undefined' && jQuery.fn && jQuery.fn.on) {
      jQuery(this.#inputElement).on('mobiletextchange', (event) => this.#handleKeyupInput(event));
    }
  }

  /**
   * Convert input to lowercase if needed based on settings
   * @param {string} input
   * @returns {string}
   * @private
   */
  #inputToLowerIfNeeded(input) {
    if (this.#lowercaseSetting && this.getInputLang() === 'tib') {
      return input.toLowerCase();
    }
    return input;
  }

  /**
   * Convert Unicode to Wylie (if Unicode Tibetan is enabled)
   * @param {string} text
   * @returns {string}
   * @private
   */
  #uniToWylie(text) {
    if (this.#useUnicodeTibetan) {
      return this.#wylieConverter.uniToWylie(text);
    }
    return text;
  }

  /**
   * Convert Wylie to Unicode Tibetan (if Unicode Tibetan is enabled)
   * @param {string} text
   * @returns {string}
   * @private
   */
  #tibetanOutput(text) {
    if (this.#useUnicodeTibetan) {
      return this.#wylieConverter.wylieToUni(text);
    }
    return text;
  }

  /**
   * Set selection range on the input element
   * @param {number} start
   * @param {number} [end]
   * @private
   */
  #selectRange(start, end) {
    if (end === undefined) {
      end = start;
    }
    if ('selectionStart' in this.#inputElement) {
      this.#inputElement.selectionStart = start;
      this.#inputElement.selectionEnd = end;
    } else if (this.#inputElement.setSelectionRange) {
      this.#inputElement.setSelectionRange(start, end);
    } else if (this.#inputElement.createTextRange) {
      var range = this.#inputElement.createTextRange();
      range.collapse(true);
      range.moveEnd('character', end);
      range.moveStart('character', start);
      range.select();
    }
  }

  /**
   * Handle keypress event (primarily for Enter key)
   * @param {KeyboardEvent} event
   * @private
   */
  #handleKeypress(event) {
    if (event.keyCode === 13) { // Enter
      this.#handleEnterKey();
    }
  }

  /**
   * Handle Enter key press - convert all syllables and trigger search
   * @private
   */
  #handleEnterKey() {
    var uniInput = this.#inputToLowerIfNeeded(this.#inputElement.value);
    var inputText;

    if (this.#useUnicodeTibetan && this.getInputLang() === 'tib') {
      uniInput = uniInput.replace(/[\- _/།]+/g, ' ');
      uniInput = this.#wylieConverter.normalizeWylie(uniInput);
      var newInput = this.#uniToWylie(uniInput);
      inputText = this.#tibetanOutput(newInput);

      if (this.getInputLang() === 'tib' && /.*['a-zA-Z].*/.test(uniInput)) {
        // Remember that something was typed in Wylie
        this.#wasTypedInWylie = true;
      }
    } else {
      uniInput = uniInput.replace(/[-\s\/]+/g, ' ');
      inputText = uniInput;
    }

    this.#inputElement.value = inputText;
    this.#callbacks.onEnter();
  }

  /**
   * Handle keyup/input events - process typing
   * @param {Event} event
   * @private
   */
  #handleKeyupInput(event) {
    var uniInput = this.#inputToLowerIfNeeded(this.#inputElement.value);
    var lastUniInput = this.#lastUniInput;
    var newInput = uniInput;
    var isCursorAtTheEnd = (this.#inputElement.selectionStart === uniInput.length);

    // Skip handling for input events without Wylie-relevant characters
    // (to avoid interfering with native Tibetan Unicode input on iPhones)
    if (event.type === 'input' && !/.*['a-zA-Z].*/.test(uniInput + lastUniInput)) {
      return;
    }

    // Convert input based on language mode
    if (this.getInputLang() === 'tib' && this.#useUnicodeTibetan) {
      newInput = this.#uniToWylie(uniInput).replace(/_/g, ' ');
    } else {
      newInput = newInput.replace(/[-\s\/]+/g, ' ');
    }

    // Track Wylie input for backspace handling
    var currentInputContainsWylie = false;
    var matchFullWylieSyllableInTheMiddleOfTibetan = null;

    if (this.getInputLang() === 'tib' && /.*['a-zA-Z].*/.test(uniInput)) {
      this.#wasTypedInWylie = true;
      currentInputContainsWylie = true;
      matchFullWylieSyllableInTheMiddleOfTibetan = uniInput.match(/(^|^[^ ]*་)([^་ ]+) ([^ ]+$|$)/);
    } else if (uniInput === '') {
      this.#wasTypedInWylie = false;
    }

    // Handle different input scenarios
    if (this.#useUnicodeTibetan &&
      uniInput.length > lastUniInput.length &&
      matchFullWylieSyllableInTheMiddleOfTibetan) {
      // Wylie syllable inserted in the middle of Tibetan text
      var matches = matchFullWylieSyllableInTheMiddleOfTibetan;
      this.#handleWylieSyllableInMiddle(matches[1], matches[2], matches[3]);
      isCursorAtTheEnd = false;

    } else if (event.keyCode === 32 ||
      (/[\- \/་།\s]$/.test(uniInput) && uniInput.startsWith(lastUniInput) && !/[a-zA-Z'].*་/.test(lastUniInput)) ||
      (newInput.length >= 3 && this.getInputLang() === 'en')) {
      // Space at end, or syllable separator, or English input >= 3 chars
      this.#handleSyllableComplete(uniInput, newInput, currentInputContainsWylie);

    } else if (event.keyCode === 8 || (uniInput.length < lastUniInput.length && lastUniInput.startsWith(uniInput))) {
      // Backspace or deletion
      this.#handleBackspace(uniInput, isCursorAtTheEnd);
    }

    // Update state
    this.#lastUniInput = this.#inputElement.value;
    this.#currentInput = this.#uniToWylie(this.#lastUniInput);

    // Restore cursor position if it was at the end
    if (isCursorAtTheEnd) {
      var self = this;
      window.setTimeout(function () {
        self.#selectRange(self.#inputElement.value.length);
      }, 10);
    }
  }

  /**
   * Handle Wylie syllable typed in the middle of Tibetan text
   * @private
   */
  #handleWylieSyllableInMiddle(textBeforeInsertion, insertedText, textAfterInsertion) {
    var insertedSyllable = this.#wylieConverter.normalizeWylie(insertedText);
    insertedSyllable = this.#wylieConverter.wylieToUni(insertedSyllable);
    var inputText = textBeforeInsertion + insertedSyllable + textAfterInsertion;
    var newCursorPos = textBeforeInsertion.length + insertedSyllable.length;

    console.log(insertedText);

    this.#inputElement.value = inputText;
    this.#callbacks.onInputChange();
    this.#selectRange(newCursorPos);
  }

  /**
   * Handle syllable completion (space/separator or English input)
   * @param {string} uniInput
   * @param {string} newInput
   * @param {boolean} currentInputContainsWylie
   * @private
   */
  #handleSyllableComplete(uniInput, newInput, currentInputContainsWylie) {
    var inputText;

    if (this.#useUnicodeTibetan && this.getInputLang() === 'tib') {
      if (currentInputContainsWylie) {
        newInput = this.#wylieConverter.normalizeWylie(newInput);
        newInput = newInput.replace(/[\-_ \/་།\s]+/g, ' '); // Normalize separators
        inputText = this.#tibetanOutput(newInput);
      } else {
        inputText = uniInput.replace(/[\-_ \/་།\s]+/g, '་'); // Convert to tseg
      }
    } else {
      inputText = newInput;
    }

    this.#inputElement.value = inputText;
    this.#callbacks.onInputChange();
  }

  /**
   * Handle backspace/deletion
   * @param {string} uniInput
   * @param {boolean} isCursorAtTheEnd
   * @private
   */
  #handleBackspace(uniInput, isCursorAtTheEnd) {
    var isAtEndOfSyllable = isCursorAtTheEnd && /(^|[_ /་།])[^a-zA-Z'_ /་།]+$/.test(uniInput);

    if (this.#wasTypedInWylie && this.#useUnicodeTibetan && this.getInputLang() === 'tib' && isAtEndOfSyllable) {
      // Backspace at end of Tibetan syllable after typing in Wylie
      // => Convert last syllable back to Wylie for editing
      var adjusted = this.#uniToWylie(uniInput).replace(/[_  ]*$/, '');
      var splitPos = adjusted.lastIndexOf(' ');
      if (splitPos > 0) {
        adjusted = this.#wylieConverter.wylieToUni(adjusted.substring(0, splitPos + 1)) + adjusted.substring(splitPos + 1);
      }

      this.#inputElement.value = adjusted;
      this.#callbacks.onInputChange();

    } else if (this.#useUnicodeTibetan && this.getInputLang() === 'tib' && this.#getNeedsBackspaceWorkaround() && isAtEndOfSyllable) {
      // Backspace on old Android devices - delete whole syllable
      var adjusted = uniInput.replace(/(^|[_ /་།])[^a-zA-Z'_ /་།]+$/, '$1');
      this.#inputElement.value = adjusted;
      this.#callbacks.onInputChange();

    } else {
      // Normal backspace - just trigger search
      this.#callbacks.onInputChange();
    }
  }

  #getNeedsBackspaceWorkaround() {
    // old versions of Android cannot delete Tibetan script when pressing backspace
    // in that case we need workarounds
    if (this.#needsBackspaceWorkaround === null) {
      this.#needsBackspaceWorkaround = /Android [1234][^0-9]/.test(navigator.userAgent)
    }
    return this.#needsBackspaceWorkaround;
  }
}
