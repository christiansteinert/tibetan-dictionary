import { describe, it, expect } from 'vitest';
import { buildFtsQuery } from './ftsQueryBuilder';

describe('buildFtsQuery', () => {
  it('wraps plain text in quotes', () => {
    expect(buildFtsQuery('buddha dharma')).toBe('"buddha dharma"');
  });

  it('translates & to AND', () => {
    expect(buildFtsQuery('buddha dharma & sangha')).toBe('"buddha dharma" AND "sangha"');
    expect(buildFtsQuery('buddha dharma&sangha')).toBe('"buddha dharma" AND "sangha"');
  });

  it('translates | to OR', () => {
    expect(buildFtsQuery('buddha|sangha')).toBe('"buddha" OR "sangha"');
  });

  it('translates ! to NOT', () => {
    expect(buildFtsQuery('buddha ! samsara')).toBe('"buddha" NOT "samsara"');
    expect(buildFtsQuery('buddha!samsara')).toBe('"buddha" NOT "samsara"');
  });

  it('joins words with + for suffix wildcard search', () => {
    expect(buildFtsQuery('buddha dharm~')).toBe('buddha+dharm*');
  });

  it('handles suffix wildcard combined with operator', () => {
    expect(buildFtsQuery('buddha dharm~|sangha')).toBe('buddha+dharm* OR "sangha"');
  });

  it('handles multiple operators', () => {
    expect(buildFtsQuery('buddha&dharma|sangha')).toBe('"buddha" AND "dharma" OR "sangha"');
  });

  it('returns empty string for empty input', () => {
    expect(buildFtsQuery('')).toBe('');
    expect(buildFtsQuery('   ')).toBe('');
  });

  it('handles lone operator gracefully', () => {
    expect(buildFtsQuery('buddha &')).toBe('"buddha"');
  });

  it('handles wildcard only', () => {
    expect(buildFtsQuery('dharm~')).toBe('dharm*');
  });

  it('handles NOT at start', () => {
    expect(buildFtsQuery('!samsara')).toBe('NOT "samsara"');
  });
});
