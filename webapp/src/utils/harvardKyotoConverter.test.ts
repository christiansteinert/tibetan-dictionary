/**
 * Tests for harvardKyotoConverter – Harvard-Kyoto ↔ IAST conversion.
 *
 * Two main scenarios:
 *  1. **Paste** – a complete HK or IAST string is passed in one call.
 *  2. **Incremental typing** – each keystroke feeds the *current display text*
 *     (which is already partially converted) back into hkToIast().
 */
import { describe, it, expect } from 'vitest';
import { hkToIast, iastToHk, isIast } from './harvardKyotoConverter';

// ─── Helper: simulate incremental typing ─────────────────────────────────────

/**
 * Simulate typing a string character-by-character.
 * After each character, the *entire current display text* is fed through
 * hkToIast() — just like the real input hook does.
 */
function simulateTyping(chars: string): string {
  let display = '';
  for (const ch of chars) {
    display += ch;
    display = hkToIast(display);
  }
  return display;
}

// ─── hkToIast: Paste (complete strings) ──────────────────────────────────────

describe('hkToIast – paste (complete HK strings)', () => {
  it('converts single-char HK vowels', () => {
    expect(hkToIast('A')).toBe('ā');
    expect(hkToIast('I')).toBe('ī');
    expect(hkToIast('U')).toBe('ū');
  });

  it('converts double-char vowel alternatives', () => {
    expect(hkToIast('aa')).toBe('ā');
    expect(hkToIast('ii')).toBe('ī');
    expect(hkToIast('uu')).toBe('ū');
  });

  it('converts vocalic R', () => {
    expect(hkToIast('R')).toBe('ṛ');
  });

  it('converts vocalic R long (RR)', () => {
    expect(hkToIast('RR')).toBe('ṝ');
  });

  it('converts vocalic L (lR)', () => {
    expect(hkToIast('lR')).toBe('ḷ');
  });

  it('converts vocalic L long (lRR)', () => {
    expect(hkToIast('lRR')).toBe('ḹ');
  });

  it('converts retroflex consonants', () => {
    expect(hkToIast('T')).toBe('ṭ');
    expect(hkToIast('D')).toBe('ḍ');
    expect(hkToIast('N')).toBe('ṇ');
  });

  it('converts aspirated retroflex consonants', () => {
    expect(hkToIast('Th')).toBe('ṭh');
    expect(hkToIast('Dh')).toBe('ḍh');
  });

  it('converts nasals and sibilants', () => {
    expect(hkToIast('G')).toBe('ṅ');
    expect(hkToIast('J')).toBe('ñ');
    expect(hkToIast('z')).toBe('ś');
    expect(hkToIast('S')).toBe('ṣ');
  });

  it('converts anusvara and visarga', () => {
    expect(hkToIast('M')).toBe('ṃ');
    expect(hkToIast('H')).toBe('ḥ');
  });

  it('converts anusvara alternatives (.m, .n)', () => {
    expect(hkToIast('.m')).toBe('ṃ');
    expect(hkToIast('.n')).toBe('ṃ');
  });

  it('converts alternative nasal notations', () => {
    expect(hkToIast('~N')).toBe('ṅ');
    expect(hkToIast('N^')).toBe('ṅ');
    expect(hkToIast('~n')).toBe('ñ');
    expect(hkToIast('JN')).toBe('ñ');
  });

  it('normalizes w → v', () => {
    expect(hkToIast('w')).toBe('v');
  });

  it('passes through lowercase ASCII that has no HK mapping', () => {
    expect(hkToIast('a')).toBe('a');
    expect(hkToIast('k')).toBe('k');
    expect(hkToIast('p')).toBe('p');
  });

  it('converts a complete word: dharma → dharma (no change)', () => {
    expect(hkToIast('dharma')).toBe('dharma');
  });

  it('converts a complete word: dharMA → dharṃā', () => {
    expect(hkToIast('dharMA')).toBe('dharṃā');
  });

  it('converts a complete word: zAstra → śāstra', () => {
    expect(hkToIast('zAstra')).toBe('śāstra');
  });

  it('converts a complete word: saMskRta → saṃskṛta', () => {
    expect(hkToIast('saMskRta')).toBe('saṃskṛta');
  });

  it('converts a complete word: ThakkurA → ṭhakkurā', () => {
    expect(hkToIast('ThakkurA')).toBe('ṭhakkurā');
  });

  it('converts a complete word: viSNu → viṣṇu', () => {
    expect(hkToIast('viSNu')).toBe('viṣṇu');
  });

  it('converts a complete word: prajJA → prajñā', () => {
    expect(hkToIast('prajJA')).toBe('prajñā');
  });

  it('passes through pure IAST unchanged', () => {
    expect(hkToIast('dharṃā')).toBe('dharṃā');
    expect(hkToIast('ṛ')).toBe('ṛ');
    expect(hkToIast('ṝ')).toBe('ṝ');
    expect(hkToIast('ḷ')).toBe('ḷ');
    expect(hkToIast('ḹ')).toBe('ḹ');
    expect(hkToIast('śāstra')).toBe('śāstra');
  });
});

// ─── hkToIast: Incremental typing ────────────────────────────────────────────

describe('hkToIast – incremental typing', () => {
  it('R → ṛ (single keystroke)', () => {
    expect(simulateTyping('R')).toBe('ṛ');
  });

  it('R, R → ṝ (two keystrokes)', () => {
    expect(simulateTyping('RR')).toBe('ṝ');
  });

  it('l, R → ḷ (two keystrokes)', () => {
    expect(simulateTyping('lR')).toBe('ḷ');
  });

  it('l, R, R → ḹ (three keystrokes)', () => {
    expect(simulateTyping('lRR')).toBe('ḹ');
  });

  it('T, h → ṭh (two keystrokes)', () => {
    expect(simulateTyping('Th')).toBe('ṭh');
  });

  it('D, h → ḍh (two keystrokes)', () => {
    expect(simulateTyping('Dh')).toBe('ḍh');
  });

  it('typing dharMA character by character → dharṃā', () => {
    expect(simulateTyping('dharMA')).toBe('dharṃā');
  });

  it('typing zAstra character by character → śāstra', () => {
    expect(simulateTyping('zAstra')).toBe('śāstra');
  });

  it('typing saMskRta character by character → saṃskṛta', () => {
    expect(simulateTyping('saMskRta')).toBe('saṃskṛta');
  });

  it('typing viSNu character by character → viṣṇu', () => {
    expect(simulateTyping('viSNu')).toBe('viṣṇu');
  });

  it('typing prajJA character by character → prajñā', () => {
    expect(simulateTyping('prajJA')).toBe('prajñā');
  });

  it('typing ThakkurA character by character → ṭhakkurā', () => {
    expect(simulateTyping('ThakkurA')).toBe('ṭhakkurā');
  });

  it('mixed: already-converted IAST + new HK characters', () => {
    // Simulate a scenario where part is already IAST and user types more
    expect(hkToIast('śāstraM')).toBe('śāstraṃ');
    expect(hkToIast('dharṃāH')).toBe('dharṃāḥ');
  });
});

// ─── iastToHk: Reverse conversion ────────────────────────────────────────────

describe('iastToHk – reverse conversion', () => {
  it('converts single IAST characters back to HK', () => {
    expect(iastToHk('ā')).toBe('A');
    expect(iastToHk('ī')).toBe('I');
    expect(iastToHk('ū')).toBe('U');
    expect(iastToHk('ṛ')).toBe('R');
    expect(iastToHk('ṃ')).toBe('M');
    expect(iastToHk('ḥ')).toBe('H');
    expect(iastToHk('ṭ')).toBe('T');
    expect(iastToHk('ḍ')).toBe('D');
    expect(iastToHk('ṇ')).toBe('N');
    expect(iastToHk('ṅ')).toBe('G');
    expect(iastToHk('ñ')).toBe('J');
    expect(iastToHk('ś')).toBe('z');
    expect(iastToHk('ṣ')).toBe('S');
  });

  it('converts multi-char IAST sequences', () => {
    expect(iastToHk('ṝ')).toBe('RR');
    expect(iastToHk('ḹ')).toBe('lRR');
    expect(iastToHk('ṭh')).toBe('Th');
    expect(iastToHk('ḍh')).toBe('Dh');
    expect(iastToHk('ḷ')).toBe('lR');
  });

  it('converts complete IAST words', () => {
    expect(iastToHk('dharṃā')).toBe('dharMA');
    expect(iastToHk('śāstra')).toBe('zAstra');
    expect(iastToHk('saṃskṛta')).toBe('saMskRta');
    expect(iastToHk('viṣṇu')).toBe('viSNu');
    expect(iastToHk('prajñā')).toBe('prajJA');
  });

  it('passes through plain ASCII unchanged', () => {
    expect(iastToHk('dharma')).toBe('dharma');
    expect(iastToHk('hello')).toBe('hello');
  });
});

// ─── Round-trip: hkToIast → iastToHk ─────────────────────────────────────────

describe('round-trip: hkToIast → iastToHk', () => {
  const roundTrips = [
    'dharMA',
    'zAstra',
    'saMskRta',
    'viSNu',
    'prajJA',
    'ThakkurA',
    'RR',
    'lR',
    'lRR',
  ];

  for (const hk of roundTrips) {
    it(`round-trips "${hk}"`, () => {
      const iast = hkToIast(hk);
      const backToHk = iastToHk(iast);
      // Convert back to IAST again and compare with the first conversion
      // (the HK input may use alternative forms like 'aa' that normalise to 'A' on round-trip)
      expect(hkToIast(backToHk)).toBe(iast);
    });
  }
});

// ─── isIast helper ───────────────────────────────────────────────────────────

describe('isIast', () => {
  it('returns true for strings containing IAST diacritics', () => {
    expect(isIast('ā')).toBe(true);
    expect(isIast('dharṃā')).toBe(true);
    expect(isIast('ṛ')).toBe(true);
    expect(isIast('ṝ')).toBe(true);
    expect(isIast('ḷ')).toBe(true);
    expect(isIast('ḹ')).toBe(true);
    expect(isIast('hello ś world')).toBe(true);
  });

  it('returns false for pure ASCII / HK strings', () => {
    expect(isIast('dharma')).toBe(false);
    expect(isIast('RR')).toBe(false);
    expect(isIast('hello world')).toBe(false);
    expect(isIast('')).toBe(false);
  });
});
