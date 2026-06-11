import { describe, it, expect } from 'vitest';
import { WylieConverter } from './wylieConverter';

describe('WylieConverter', () => {
  it('converts the Wylie string "dga\'" correctly to Tibetan Unicode "དགའ་"', () => {
    const converter = new WylieConverter();
    const result = converter.wylieToUni("dga'");
    expect(result).toBe('དགའ་');
  });
});
