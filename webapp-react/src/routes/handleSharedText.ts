/**
 * Android share-intent handler for the Tibetan Dictionary PWA / Cordova app.
 *
 * When another Android app shares text to this app, the Cordova
 * ShareTextPlugin delivers the raw text and a detected language.
 * This module receives that payload, normalises the term exactly as
 * the old `handleSharedText()` in main.js did, and then navigates
 * to the appropriate React-Router hash URL:
 *
 *   #/search/{lang}/{encodedTerm}?offset=0&selected=term&sidebar=false
 *
 * Call `handleShare()` once at app startup (after Cordova's deviceready).
 * It is a no-op outside of Cordova environments.
 */

import { WylieConverter } from '@/utils/wylieConverter';
import { Language } from '@/types';

// ─── Cordova plugin type stubs ────────────────────────────────────────────────
// These types are not supplied by any @types package, so we declare minimal
// shapes here to keep TypeScript happy without casting everything to `any`.

interface ShareData {
  /** The raw shared text */
  text: string;
  /** Language hint from the plugin: 'tib' | 'en' | undefined */
  language?: Language;
}

interface ShareTextPluginStatic {
  getSharedText(
    successCallback: (data: ShareData) => void,
    errorCallback: (error: string) => void
  ): void;
}

declare global {
  interface Window {
    cordova?: unknown;
    ShareTextPlugin?: ShareTextPluginStatic;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of characters accepted from a share payload */
const MAX_SHARE_LENGTH = 200;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Normalise a Tibetan-script or Wylie-transliteration share payload.
 *
 * Mirrors the processing in `handleSharedText()` from main.js:
 * 1. Strip punctuation / separators that can't be part of a dictionary key.
 * 2. If the text looks like Wylie (contains Latin letters), convert it from
 *    Wylie to Unicode for the input field (so it round-trips correctly).
 * 3. If the text is already Unicode Tibetan, convert it to Wylie for the
 *    dictionary lookup, then back to Unicode for display.
 */
function normaliseTibetanShareText(raw: string, converter: WylieConverter): string {
  // Strip characters that serve as word separators / punctuation in Tibetan text
  let text = raw.replace(/[\s\-\/()\[\]{},།:–—!.?]+/g, ' ');

  // Determine whether the input is Wylie (Latin) or Unicode Tibetan
  const looksLikeWylie = /.*['a-zA-Z].*/.test(text);

  if (looksLikeWylie) {
    // Input is Wylie transliteration — convert to Unicode for display
    text = converter.wylieToUni(text.trim());
  } else {
    // Input is probably Unicode Tibetan — convert to Wylie for the hash term, then back
    text = converter.uniToWylie(text.trim());
  }

  return text.trim();
}

/**
 * Normalise an English share payload.
 * Strips full-stops used as sentence separators (as done in main.js).
 */
function normaliseEnglishShareText(raw: string): string {
  return raw.replace(/[.]+/g, ' ').trim();
}

/**
 * Derive the Wylie lookup key from a (possibly Unicode) Tibetan term.
 * For English terms the term itself is the lookup key.
 */
function toLookupTerm(displayTerm: string, lang: string, converter: WylieConverter): string {
  if (lang !== 'tib') return displayTerm;

  // If it contains Unicode Tibetan characters, convert to Wylie first
  if (/[^\x00-\x7F]/.test(displayTerm)) {
    return converter.normalizeWylieWhitespace(converter.uniToWylie(displayTerm));
  }
  return converter.normalizeWylieWhitespace(displayTerm);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to receive a share payload from the Android ShareTextPlugin.
 *
 * @returns `true` if the plugin was present and a callback was registered
 *          (regardless of whether actual shared text was received),
 *          `false` if the plugin is unavailable (e.g. running in a browser).
 */
export function handleSharedText(): boolean {
  if (!window.cordova || !window.ShareTextPlugin) {
    console.log('ShareTextPlugin not available (running in web mode or plugin not loaded)');
    return false;
  }

  window.ShareTextPlugin.getSharedText(
    (sharedData: ShareData) => {
      if (!sharedData?.text?.trim()) {
        console.log('Share handler: no shared text received');
        return;
      }

      // Truncate excessively long shares
      let sharedText = sharedData.text.trim();
      if (sharedText.length > MAX_SHARE_LENGTH) {
        sharedText = sharedText.substring(0, MAX_SHARE_LENGTH);
        console.log(`Share handler: truncated shared text to ${MAX_SHARE_LENGTH} characters`);
      }

      // Language: plugin hint, defaulting to Tibetan
      const lang: string = sharedData.language || 'tib';

      const converter = new WylieConverter();

      // Normalise and build the lookup term
      let displayTerm: string;
      if (lang === 'tib') {
        displayTerm = normaliseTibetanShareText(sharedText, converter);
      } else {
        displayTerm = normaliseEnglishShareText(sharedText);
      }

      if (!displayTerm) {
        console.log('Share handler: normalised term is empty, ignoring');
        return;
      }

      const lookupTerm = toLookupTerm(displayTerm, lang, converter);

      console.log(`Share handler: lang=${lang} display="${displayTerm}" lookup="${lookupTerm}"`);

      // Navigate to the search route and the searched term should also be opened if possible
      window.location.replace(
        `#/search/${lang}/${encodeURIComponent(lookupTerm)}`
      );
    },
    (error: string) => {
      console.error('Share handler: error getting shared text:', error);
    }
  );

  return true;
}
