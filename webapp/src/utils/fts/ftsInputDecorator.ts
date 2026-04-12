/**
 * ftsInputDecorator – input-field decoration and processing for fulltext search.#
 */
import { WylieConverter } from '../wylieConverter';

/** Characters that are FTS operators in user input. */
const FTS_OPS = /[&|!~]/;

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Apply operator-spacing rules to raw input text.
 *
 * - `&`, `|`, `!` → ensure exactly one space on each side
 * - `~`           → remove any preceding whitespace (must be glued to word),
 *                   ensure one space after (unless at end of string)
 */
export function decorateFtsInput(text: string): string {
  // Normalise boolean operators: ensure spaces around & | !
  let result = text.replace(/\s*([&|!])\s*([^\s])/g, ' $1 $2');
  // Normalise suffix wildcard ~: strip spaces before, add one space after (unless at end)
  result = result.replace(/\s*~/g, '~');      // remove any space before ~
  result = result.replace(/~([^\s])/g, '~ $1');   // add space after ~ when not already there

  // Remove initial space and collapse multiple spaces into one
  result = result.trimStart();
  result = result.replace(/ {2,}/g, ' ');
  return result;
}

/**
 * Convert each text segment between FTS operators using the given converter
 * function while preserving operator tokens and spacing.
 *
 * @param text      The full input string (may contain & | ! *)
 * @param convert   A function that converts one text segment (e.g. uniToWylie)
 * @returns         The reassembled string with converted segments
 */
export function ftsSegmentConvert(
  text: string,
  convert: (segment: string) => string,
): string {
  // Boolean operators (&|!) split the input into independent segments that are
  // each converted separately.  ~ is a suffix wildcard that must stay glued to
  // the preceding word, so we keep it inside the buffer and only split on &|!.
  const BOOL_OPS = /[&|!]/;

  const parts: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (BOOL_OPS.test(ch)) {
      if (buf) { parts.push(buf); buf = ''; }
      parts.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) parts.push(buf);

  return parts
    .map(p => (BOOL_OPS.test(p) ? p : convert(p)))
    .join('');
}

/**
 * Convert Tibetan Unicode segments to Wylie while preserving FTS operators.
 */
export function ftsUniToWylie(
  text: string,
  converter: WylieConverter,
): string {
  return ftsSegmentConvert(text, seg => converter.uniToWylie(seg));
}

/**
 * Convert Wylie segments to Tibetan Unicode while preserving FTS operators.
 */
export function ftsWylieToUni(
  text: string,
  converter: WylieConverter,
): string {
  return ftsSegmentConvert(text, seg => converter.wylieToUni(seg, true));
}

/**
 * Strip FTS-only operators when switching from fulltext → term search.
 * Retains only the first segment (before the first & | ! operator).
 * ~ (suffix wildcard) is removed; * and ? are valid in term search and kept.
 */
export function stripFtsOperators(text: string): string {
  // Cut at the first boolean operator
  const match = text.match(/[&|!]/);
  const firstPart = match?.index != null ? text.substring(0, match.index) : text;
  // Remove ~ (suffix wildcard not valid in term search)
  return firstPart.replace(/~/g, '').replace(/ {2,}/g, ' ').trim();
}

/**
 * Strip term-search wildcards (* ?) when switching from term → fulltext search.
 * These characters have no meaning in FTS mode.
 */
export function stripTermOperators(text: string): string {
  return text.replace(/[*?]/g, '').replace(/ {2,}/g, ' ').trim();
}

/**
 * Check whether `text` contains any FTS operator characters (& | ! ~).
 */
export function hasFtsOperators(text: string): boolean {
  return FTS_OPS.test(text);
}
