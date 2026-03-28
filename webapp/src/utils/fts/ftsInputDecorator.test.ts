import { describe, it, expect } from 'vitest';
import {
  decorateFtsInput,
  stripFtsOperators,
  ftsSegmentConvert,
  makeDefaultInputProcessor,
  makeFtsInputProcessor,
} from './ftsInputDecorator';
import { WylieConverter } from './wylieConverter';

const converter = new WylieConverter();

describe('decorateFtsInput', () => {
  it('surrounds & with spaces', () => {
    expect(decorateFtsInput('buddha&sangha')).toBe('buddha & sangha');
  });

  it('surrounds | with spaces', () => {
    expect(decorateFtsInput('buddha|sangha')).toBe('buddha | sangha');
  });

  it('surrounds ! with spaces', () => {
    expect(decorateFtsInput('buddha!samsara')).toBe('buddha ! samsara');
  });

  it('normalises existing extra spaces around operators', () => {
    expect(decorateFtsInput('buddha  &   sangha')).toBe('buddha & sangha');
  });

  it('removes space before * and adds one after', () => {
    expect(decorateFtsInput('dharm *')).toBe('dharm* ');
  });

  it('ensures one space after * when followed by text', () => {
    expect(decorateFtsInput('dharm*sangha')).toBe('dharm* sangha');
  });

  it('collapses multiple spaces', () => {
    expect(decorateFtsInput('a  b   c')).toBe('a b c');
  });

  it('handles combined operators and wildcard', () => {
    expect(decorateFtsInput('buddha dharm*|sangha')).toBe('buddha dharm* | sangha');
  });

  it('passes through plain text unchanged (except space collapse)', () => {
    expect(decorateFtsInput('buddha dharma')).toBe('buddha dharma');
  });

  it('handles empty string', () => {
    expect(decorateFtsInput('')).toBe('');
  });
});

describe('stripFtsOperators', () => {
  it('keeps text before first operator', () => {
    expect(stripFtsOperators('buddha dharma & sangha')).toBe('buddha dharma');
  });

  it('keeps text with wildcard', () => {
    expect(stripFtsOperators('dharm*')).toBe('dharm*');
  });

  it('strips everything from first | onward', () => {
    expect(stripFtsOperators('buddha | dharma | sangha')).toBe('buddha');
  });

  it('strips everything from first ! onward', () => {
    expect(stripFtsOperators('buddha ! samsara')).toBe('buddha');
  });

  it('returns whole string when no operators', () => {
    expect(stripFtsOperators('buddha dharma')).toBe('buddha dharma');
  });

  it('returns empty for leading operator', () => {
    expect(stripFtsOperators('& sangha')).toBe('');
  });

  it('handles empty string', () => {
    expect(stripFtsOperators('')).toBe('');
  });
});

describe('ftsSegmentConvert', () => {
  it('applies converter to each text segment', () => {
    const upper = (s: string) => s.toUpperCase();
    expect(ftsSegmentConvert('hello & world', upper)).toBe('HELLO & WORLD');
  });

  it('preserves operators untouched', () => {
    const identity = (s: string) => s;
    expect(ftsSegmentConvert('a|b&c!d', identity)).toBe('a|b&c!d');
  });

  it('handles text with no operators', () => {
    const upper = (s: string) => s.toUpperCase();
    expect(ftsSegmentConvert('plain text', upper)).toBe('PLAIN TEXT');
  });

  it('handles empty string', () => {
    const upper = (s: string) => s.toUpperCase();
    expect(ftsSegmentConvert('', upper)).toBe('');
  });
});

describe('makeDefaultInputProcessor', () => {
  it('converts Wylie to Unicode when unicode is on', () => {
    const proc = makeDefaultInputProcessor(converter, true);
    const result = proc('chos');
    // wylieToUni appends a trailing tsheg (་)
    expect(result).toBe('ཆོས་');
  });

  it('returns Wylie as-is when unicode is off', () => {
    const proc = makeDefaultInputProcessor(converter, false);
    expect(proc('chos')).toBe('chos');
  });
});

describe('makeFtsInputProcessor', () => {
  it('converts Wylie segments to Unicode while preserving operators', () => {
    const proc = makeFtsInputProcessor(converter, true);
    const result = proc('chos ! yar');
    // Should convert each segment but keep ! as an operator with spacing
    expect(result).toContain('!');
    expect(result).not.toContain('༈');  // ! must NOT become ku ru kha
  });

  it('applies operator spacing', () => {
    const proc = makeFtsInputProcessor(converter, true);
    const result = proc('chos!yar');
    // Should have spaces around !
    expect(result).toMatch(/\S\s+!\s+\S/);
  });

  it('handles wildcard correctly', () => {
    const proc = makeFtsInputProcessor(converter, false);
    expect(proc('dharm*')).toBe('dharm* ');
  });

  it('returns Wylie with operator spacing when unicode is off', () => {
    const proc = makeFtsInputProcessor(converter, false);
    expect(proc('chos&yar')).toBe('chos & yar');
  });
});
