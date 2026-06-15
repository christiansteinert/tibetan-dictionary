import { describe, it, expect } from 'vitest';
import { WylieConverter } from './wylieConverter';

describe('WylieConverter', () => {
  it('converts the Wylie string "dga\'" correctly to Tibetan Unicode "དགའ་"', () => {
    const converter = new WylieConverter();
    const result = converter.wylieToUni("dga'");
    expect(result).toBe('དགའ་');
  });

   it('correctly handles a shad even without surronding spaces', () => {
    const converter = new WylieConverter();
    const result = converter.wylieToUni(converter.normalizeWylieWhitespace("tshogs yod/bam po ni"));
    expect(result).toBe('ཚོགས་ཡོད། བམ་པོ་ནི་');
  });
});
