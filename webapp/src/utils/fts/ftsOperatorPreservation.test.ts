import { describe, it, expect } from 'vitest';
import { WylieConverter } from '../wylieConverter';
import { ftsSegmentConvert, hasFtsOperators, ftsUniToWylie } from './ftsInputDecorator';
import useInputProcessor from '@/hooks/useInputProcessor';

const c = new WylieConverter();

describe('FTS operator preservation', () => {
  it('ftsSegmentConvert preserves ! between Wylie segments', () => {
    const result = ftsSegmentConvert('chob chob ! yar ', seg => c.wylieToUni(seg));
    expect(result).not.toContain('༈');
    expect(result).toContain('!');
    expect(result).toContain('ཆོབ');
    expect(result).toContain('ཡར');
  });

  it('ftsSegmentConvert preserves | between Wylie segments', () => {
    const result = ftsSegmentConvert('chob | yar ', seg => c.wylieToUni(seg));
    expect(result).not.toContain('༑');
    expect(result).not.toContain('།');
    expect(result).toContain('|');
  });

  it('ftsSegmentConvert preserves & between Wylie segments', () => {
    const result = ftsSegmentConvert('chob & yar ', seg => c.wylieToUni(seg));
    expect(result).toContain('&');
  });

  it('makeFtsInputProcessor preserves ! in output', () => {
    const { inputProcessor } = useInputProcessor('tib', true, true)
    const result = inputProcessor!('chob chob ! yar ');
    expect(result).not.toContain('༈');
    expect(result).toContain('!');
    expect(result).toContain('ཆོབ');
  });

  it('makeFtsInputProcessor preserves | in output', () => {
    const { inputProcessor } = useInputProcessor('tib', true, true)
    const result = inputProcessor!('chob | yar ');
    expect(result).not.toContain('༑');
    expect(result).not.toContain('།');
    expect(result).toContain('|');
  });

  it('ftsUniToWylie preserves ! in reverse conversion', () => {
    const result = ftsUniToWylie('ཆོབ་ཆོབ་!ཡར་', c);
    expect(result).toContain('!');
    expect(result).not.toContain('༈');
  });

  it('ftsUniToWylie preserves | in reverse conversion', () => {
    const result = ftsUniToWylie('ཆོབ་|ཡར་', c);
    expect(result).toContain('|');
  });

  it('segment-aware normalizeWylie preserves !', () => {
    const result = ftsSegmentConvert('chob chob ! yar', seg => c.normalizeWylie(seg));
    expect(result).toContain('!');
    expect(result).not.toContain('༈');
  });

  it('hasFtsOperators detects ! and |', () => {
    expect(hasFtsOperators('chob !')).toBe(true);
    expect(hasFtsOperators('chob |')).toBe(true);
    expect(hasFtsOperators('chob &')).toBe(true);
    expect(hasFtsOperators('chob')).toBe(false);
  });

  describe('simulated middle-syllable conversion (the bug path)', () => {
    it('direct wylieToUni("!") returns ༈ (confirms raw conversion is dangerous)', () => {
      expect(c.wylieToUni('!')).toBe('༈');
    });

    it('direct wylieToUni("|") returns a Tibetan character (confirms raw conversion is dangerous)', () => {
      // | maps to a Tibetan punctuation mark in EWTS
      const result = c.wylieToUni('|');
      expect(result).not.toBe('|');
    });

    it('segment-aware conversion of "!" preserves the operator', () => {
      const result = ftsSegmentConvert('!', seg =>
        c.wylieToUni(c.normalizeWylie(seg))
      );
      expect(result).toBe('!');
    });

    it('segment-aware conversion of "|" preserves the operator', () => {
      const result = ftsSegmentConvert('|', seg =>
        c.wylieToUni(c.normalizeWylie(seg))
      );
      expect(result).toBe('|');
    });

    it('segment-aware conversion of "!yar" preserves operator and converts text', () => {
      const result = ftsSegmentConvert('!yar ', seg =>
        c.wylieToUni(c.normalizeWylie(seg))
      );
      expect(result).toContain('!');
      expect(result).toContain('ཡར');
      expect(result).not.toContain('༈');
    });
  });
});
