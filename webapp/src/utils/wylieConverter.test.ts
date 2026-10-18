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
  it('converts a "?" following an inherent "a" to a halanta', () => {
    const converter = new WylieConverter();
    expect(converter.wylieToUni('ka?')).toBe('ཀ྄');
    expect(converter.wylieToUni('bud+hI mAna?')).toBe('བུདྷཱི་མཱན྄');
  });

  it('keeps a "?" literal when it follows anything other than an inherent "a"', () => {
    const converter = new WylieConverter();
    expect(converter.wylieToUni('sogs?')).toBe('སོགས?');
    expect(converter.wylieToUni('ka ?')).toBe('ཀ་?');
    expect(converter.wylieToUni('hU?M')).toBe('ཧཱུ?མ་');
    expect(converter.wylieToUni('nges gros l?')).toBe('ངེས་གྲོས་ལ?');
  });

  it('keeps standalone question marks and runs of question marks literal', () => {
    const converter = new WylieConverter();
    expect(converter.wylieToUni('dard (?)')).toBe('དརད་༼?༽');
    expect(converter.wylieToUni('gos dang drebs sogs ?')).toBe('གོས་དང་དྲེབས་སོགས་?');
    expect(converter.wylieToUni('dngul ??a?? sogs')).toBe('དངུལ་??ཨ??་སོགས་');
  });

  it('keeps "?" as a wildcard when preserving wildcards', () => {
    const converter = new WylieConverter();
    expect(converter.wylieToUni('bla?', true)).toBe('བླ?་');
    expect(converter.wylieToUni('bla ma*')).toBe('བླ་མ*་');
  });
});
