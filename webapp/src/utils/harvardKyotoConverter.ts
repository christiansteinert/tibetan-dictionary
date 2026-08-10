/**
 * harvardKyotoConverter – bidirectional Harvard-Kyoto ↔ IAST converter
 * for Sanskrit input.
 *
 * The input may send text that is *already partially converted* — earlier
 * keystrokes have already been turned into IAST.  So the converter must
 * handle mixed IAST+HK text, converting only the HK characters while
 * passing through existing IAST diacritics unchanged.
 *
 * Two-letter HK sequences (like `RR` → `ṝ`) need special handling because
 * the first `R` is converted to `ṛ` on the first keystroke, producing `ṛR`
 * when the second key arrives.  Post-conversion combination rules turn
 * `ṛR` into `ṝ` etc.
 *
 * Usage:
 *   - `hkToIast()`  — inputProcessor  (user types HK → displayed as IAST)
 *   - `iastToHk()`  — reverseProcessor (IAST display → HK for backend)
 */

// ─── Mapping tables ──────────────────────────────────────────────────────────

/**
 * Mapping from Harvard-Kyoto and many itrans ASCII sequences to IAST Unicode.
 * Longer sequences must come before shorter ones so that
 * e.g. "lRR" is matched before "lR", and "Th" before "T".
 */
const HK_TO_IAST: [string, string][] = [
  
  // Multi-character sequences (longest first)
  ['RRi', 'ṛ'],
  ['R^i', 'ṛ'],

  ['LLi', 'ḷ'],   
  ['L^i', 'ḷ'],   
  ['lRR', 'ḹ'],    
  ['LLI', 'ḹ'],     
  ['L^I', 'ḹ'],     
  ['RRi', 'ṝ'],    
  ['R^I', 'ṝ'],    
  ['LL', 'ḹ'],     
  ['lR', 'ḷ'],    
  ['RR', 'ṝ'],  
  ['R', 'ṛ'],

  ['AUM', 'Oṃ'],
  ['oM', 'Oṃ'],
  ['OM', 'Oṃ'],

  ['.Dh', 'ṛh'],
  ['Th', 'ṭh'],
  ['Dh', 'ḍh'],
  ['.D', 'ṛ'],

  ['~N', 'ṅ'],
  ['N^', 'ṅ'],

  ['~n', 'ñ'],
  ['dny', 'jñ'],
  ['GY', 'jñ'],
  ['JN', 'ñ'],
  ['ñN', 'ñ'],
  ['J', 'ñ'],
  ['chh', 'ch'],
  ['Ch', 'ch'],
  ['shh', 'ṣ'],
  ['Sh', 'ṣ'],
  ['ṣh', 'ṣ'],
  ['S', 'ṣ'],
  ['Z', 'ṣ'],
  ['sh', 'ś'],
  ['z', 'ś'],
  ['.m', 'ṃ'],
  ['.n', 'ṃ'],
  ['M', 'ṃ'],
  ['.h', 'ḥ'],
  ['H', 'ḥ'],

  ['aa', 'ā'],
  ['A', 'ā'],
  ['ee', 'ī'],
  ['ii', 'ī'],
  ['I', 'ī'],
  ['uu', 'ū'],
  ['U', 'ū'],
  ['ee', 'ē'],
  ['E', 'ē'],
  ['oo', 'ō'],
  ['O', 'ō'],

  ['T', 'ṭ'],
  ['D', 'ḍ'],
  ['N', 'ṇ'],
  ['G', 'ṅ'],
  ['ṇ^', 'ṅ'],

  ['w', 'v'],
];

/**
 * Post-conversion combination rules for incremental typing.
 *
 * When the user types character-by-character, earlier keystrokes are already
 * converted to IAST before the next character arrives.  The converter
 * (step 1) then converts the new HK character, but cannot "see" that the
 * preceding IAST character was part of a multi-char HK sequence.
 *
 * These rules run as a post-pass (step 2) to merge such sequences.
 *
 * Example flow for typing R then R:
 *   keystroke 1: "R"  → step1 → "ṛ"             (displayed)
 *   keystroke 2: "ṛR" → step1 → "ṛṛ" → step2 → "ṝ"
 *
 * Example flow for typing l then R:
 *   keystroke 1: "l"  → step1 → "l"              (displayed)
 *   keystroke 2: "lR" → step1 → "lṛ" → step2 → "ḷ"
 *
 * Example flow for typing l, R, R:
 *   keystroke 3: "ḷR" → step1 → "ḷṛ" → step2 → "ḹ"
 */
const IAST_COMBINATION_RULES: [string, string][] = [
  // Vocalic L long: ḷ + ṛ → ḹ  (typed: l, R, R → l → ḷ → ḹ)
  ['ḷṛ', 'ḹ'],
  // Vocalic L: l + ṛ → ḷ  (typed: l, R → step1 gives lṛ)
  ['lṛ', 'ḷ'],
  // Vocalic R long: ṛ + ṛ → ṝ  (typed: R, R → step1 gives ṛṛ)
  ['ṛṛ', 'ṝ'],
];

// Build a reverse table IAST → HK for the inverse conversion.
const IAST_TO_HK: [string, string][] = [
  // Multi-char sequences
  ['ṝ', 'RR'],
  ['ḹ', 'lRR'],
  ['ḷ', 'lR'],
  ['ṭh', 'Th'],
  ['ḍh', 'Dh'],
  // Single-char
  ['ṭ', 'T'],
  ['ḍ', 'D'],
  ['ṇ', 'N'],
  ['ṅ', 'G'],
  ['ñ', 'J'],
  ['ś', 'z'],
  ['ṣ', 'S'],
  ['ṃ', 'M'],
  ['ḥ', 'H'],
  ['ṛ', 'R'],
  ['ā', 'A'],
  ['ī', 'I'],
  ['ū', 'U'],
  ['ē', 'E'],
  ['ō', 'O'],
];

// Sort reverse table by descending IAST length so longer sequences match first
IAST_TO_HK.sort((a, b) => b[0].length - a[0].length);

// ─── Core conversion functions ───────────────────────────────────────────────

/**
 * Convert a (possibly mixed IAST + Harvard-Kyoto) string to IAST Unicode.
 */
export function hkToIast(text: string): string {
  // Step 1: Convert HK characters to IAST, passing through existing IAST
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    // Try HK mappings (longest first)
    for (const [hk, iast] of HK_TO_IAST) {
      if (text.startsWith(hk, i)) {
        result += iast;
        i += hk.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Character is either already IAST or a plain ASCII letter — pass through.
      // Convert any remaining uppercase ASCII letters that have no special HK meaning to lower case
      const ch = text[i];
      result += (ch >= 'A' && ch <= 'Z') ? ch.toLowerCase() : ch;
      i++;
    }
  }

  // Step 2: Apply combination rules to merge sequences that arise from
  // incremental typing.  E.g. after step 1: "lṛ" → "ḷ", "ṛṛ" → "ṝ", ...
  for (const [pattern, replacement] of IAST_COMBINATION_RULES) {
    result = result.split(pattern).join(replacement);
  }

  return result;
}

/**
 * Convert an IAST Unicode string back to Harvard-Kyoto ASCII.
 *
 * This is the **reverseProcessor**: takes the IAST display text and produces HK
 */
export function iastToHk(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [iast, hk] of IAST_TO_HK) {
      if (text.startsWith(iast, i)) {
        result += hk;
        i += iast.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** IAST-specific diacritical characters. */
const IAST_CHARS = /[āīūṛṝḷḹṃḥñṅṭḍṇśṣĀĪŪṚṜḶḸṂḤÑṄṬḌṆŚṢ]/;

/**
 * Returns `true` if `text` contains IAST diacritics, i.e. the user has
 * pasted or typed native IAST rather than Harvard-Kyoto ASCII.
 */
export function isIast(text: string): boolean {
  return IAST_CHARS.test(text);
}
