/**
 * ftsInputDecorator – input-field decoration and processing for fulltext search.
 *
 * Core concept: an **InputProcessor** is a function that the input hook calls
 * instead of doing its own Wylie→Unicode conversion.  This allows the FTS
 * processor to split on operators, convert only the text segments, and
 * reassemble with correct spacing — preventing operators like `!` from being
 * fed into the Wylie converter (which would turn `!` into `༈`).
 *
 * Two processors are provided:
 *   - `defaultInputProcessor` — plain Wylie→Unicode (term search mode)
 *   - `makeFtsInputProcessor` — segment-aware conversion + operator spacing
 *
 * Additional helpers:
 *   - `decorateFtsInput` — operator spacing only (pure text transform)
 *   - `ftsSegmentConvert` / `ftsUniToWylie` / `ftsWylieToUni` — segment-aware
 *     conversion preserving operators
 *   - `stripFtsOperators` — remove operators for fulltext→term mode switch
 */
import { WylieConverter } from './wylieConverter';

/** Characters that are FTS operators in user input. */
const FTS_OPS = /[&|!]/;

// ─── InputProcessor type ─────────────────────────────────────────────────────

/**
 * An InputProcessor converts raw Wylie (or mixed Wylie/Unicode) text into
 * display text.  The input hook calls this instead of doing its own conversion.
 *
 * @param wylie  The normalised Wylie text (spaces as separators)
 * @returns      Display text (Unicode Tibetan or Wylie, depending on settings)
 */
export type InputProcessor = (wylie: string) => string;

// ─── Processor factories ─────────────────────────────────────────────────────

/**
 * Default processor for term-search mode.
 * Simply converts the full Wylie string to Tibetan Unicode.
 */
export function makeDefaultInputProcessor(
  converter: WylieConverter,
  useUnicode: boolean,
): InputProcessor {
  return (wylie: string) =>
    useUnicode ? converter.wylieToUni(wylie) : wylie;
}

/**
 * FTS processor: splits on operators, converts each text segment individually,
 * then reassembles with operator-spacing rules applied.
 */
export function makeFtsInputProcessor(
  converter: WylieConverter,
  useUnicode: boolean,
): InputProcessor {
  return (wylie: string) => {
    const converted = useUnicode
      ? ftsSegmentConvert(wylie, seg => converter.wylieToUni(seg, true))
      : wylie;
    return decorateFtsInput(converted);
  };
}

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Apply operator-spacing rules to raw input text.
 *
 * - `&`, `|`, `!` → ensure exactly one space on each side
 * - `*`           → remove any preceding whitespace, ensure one trailing space
 *
 * Does NOT add quotes — those are only added by ftsQueryBuilder before
 * calling the backend.
 */
export function decorateFtsInput(text: string): string {
  // Normalise operators: ensure spaces around & | !
  let result = text.replace(/\s*([&|!])\s*/g, ' $1 ');
  // Normalise asterisk: no space before, one space after (unless at end)
  result = result.replace(/\s*\*\s*/g, '* ');
  // Collapse multiple spaces into one
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
  const parts: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (FTS_OPS.test(ch)) {
      if (buf) parts.push(buf);
      parts.push(ch);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf) parts.push(buf);

  return parts
    .map(p => (FTS_OPS.test(p) ? p : convert(p)))
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
 * Strip FTS operators when switching from fulltext → term search.
 * Retains only the first segment (before the first & | ! operator).
 * The * wildcard is kept since it's valid for term search.
 */
export function stripFtsOperators(text: string): string {
  const match = text.match(/[&|!]/);
  const firstPart = match?.index != null ? text.substring(0, match.index) : text;
  return firstPart.trim();
}

/**
 * Check whether `text` contains any FTS operator characters (& | !).
 */
export function hasFtsOperators(text: string): boolean {
  return FTS_OPS.test(text);
}
