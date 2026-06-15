/**
 * Tibetan transliteration module.
 * Wraps the ewts-js library for Wylie/EWTS to Unicode conversion.
 */
import { EwtsConverter } from './ewts-js/src/EwtsConverter.mjs';
import { Tokenizer } from './tokenizer';

interface WylieConverterOptions {
  check?: boolean;
  check_strict?: boolean;
  fix_spacing?: boolean;
  sloppy?: boolean;
  leave_dubious?: boolean;
  pass_through?: boolean;
}

/**
 * Converter between Wylie/EWTS transliteration and Tibetan Unicode.
 */
export class WylieConverter {
  private converter: EwtsConverter;

  /**
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.check=true] - Generate warnings for illegal consonant sequences
   * @param {boolean} [options.check_strict=true] - Stricter checking
   * @param {boolean} [options.fix_spacing=true] - Fix common spacing issues
   * @param {boolean} [options.sloppy=true] - Silently fix common Wylie mistakes
   * @param {boolean} [options.leave_dubious=false] - Leave dubious syllables in [brackets]
   * @param {boolean} [options.pass_through=true] - Pass through non-Tibetan characters
   */
  constructor(options: WylieConverterOptions = {}) {
    this.converter = new EwtsConverter({
      check: options.check ?? true,
      check_strict: options.check_strict ?? true,
      fix_spacing: options.fix_spacing ?? true,
      sloppy: options.sloppy ?? true,
      leave_dubious: options.leave_dubious ?? false,
      pass_through: options.pass_through ?? true,
    });
  }

  /**
   * Convert Wylie/EWTS transliteration to Tibetan Unicode.
   * @param {string} wylie - Text in Wylie/EWTS transliteration
   * @returns {string} Text in Tibetan Unicode
   */
  wylieToUni(wylie: string, preserveWildcards: boolean = false): string {
    let result = '';
    if (wylie.indexOf('?') !== -1 || wylie.indexOf('*') !== -1) {
      // Preserve wildcard characters and convert the rest. This is used to handle interactive inputs that contain wildcards.
      // It is accomplished by:
      // - splitting the input into individual syllables and converting each syllable individually to Tibetan Unicode. 
      // - preserving any wildcards
      // - if splitting at a wildcard generates a fragment without vowel then unicode conversion is ignored because the converter
      //   would introduce an 'a' vowel that we do not want to have and it may even be an invalid syllable fragment that cannot be properly represented
      let previousSyllable = '';
      
      const tok = new Tokenizer(['*', '?', ' '], (syllable: string, isSeparator: boolean) => {
        if (syllable === '*' || syllable === '?') {
          if (!previousSyllable.endsWith(' ')) {
            // The Wylie converter introduces a tseg after every syllable.
            // If the previous syllable ended with a wildcard, then we remove that tseg again
            result = result.replace(/་$/, '');
          }

          result += syllable; // preserve wildcards and spaces
        } else if (syllable === ' ') {
          result += '་';
        } else if (/[aeiouAEIOU]/.test(syllable) || /[^a-zA-Z']/.test(syllable)) {
          result += this.doWylieToUni(syllable); // convert syllables and non-syllable fragments (e.g. punctuation)
        } else {
          result += syllable; // preserve syllable fragments (i.e. consonants without vowels) and do not convert them
        }        
        previousSyllable = syllable;
      });
  
      tok.parse(wylie);

      result = result.replace(/་+/g, '་');
      if (!result.endsWith('་')) {
        result += '་';
      }
    } else {
      result = this.doWylieToUni(wylie);
    }

    result = result.replace(/^་+/g, '');
    result = result.replace(/་་+/g, '་ ');
    result = result.replace(/([།༽\)\]\s])་/g, '$1 ');

    // workaround for a bug in the Wylie converter. Avoid doubled a-chung at end of syllables.
    result = result.replace(/འའ་/g, 'འ་');
    return result;

  }

  doWylieToUni(wylie: string): string {
    if (!wylie) return '';

    // Return original if it contains HTML-sensitive characters
    if (/[<>&]/.test(wylie)) return wylie;

    // Remove dashes connecting syllables but keep "-i" (reversed gigu)
    wylie = wylie.replace(/([^ ])-([^ i])/g, '$1 $2');

    // Add a space (tseg) at end if string ends with a syllable
    if (/[a-zA-Z]$/.test(wylie)) {
      wylie += ' ';
    }
    if (/'$/.test(wylie)) {
      wylie += "'a ";
    }

    let result = this.converter.to_unicode(wylie);
    result = result.replace(/ +/g, '་');
    result = result.replace(/([༡༢༣༤༥༦༧༨༩༠།).།])་/g, '$1 ');

    return result;
  }

  /**
   * Convert Tibetan Unicode to Wylie/EWTS transliteration.
   * @param {string} unicode - Text in Tibetan Unicode
   * @returns {string} Text in Wylie/EWTS transliteration
   */
  uniToWylie(unicode: string): string {
    let result = this.converter.to_ewts(unicode);
    result = result.replace(/[[\]]/g, '');
    return result;
  }

  /**
   * Normalize whitespace in Wylie text.
   * @param {string} wylie - Wylie text
   * @returns {string} Normalized Wylie
   */
  normalizeWylieWhitespace(wylie: string): string {
    if (!wylie) return '';
    if (wylie === ' ') return wylie;

    wylie = wylie.replace(/(['a-zA-Z])\/(['a-zA-Z])/g, '$1/ $2');
    wylie = wylie.replace(/[()]/g, ' ');
    wylie = wylie.replace(/\s\s+/g, ' ');
    wylie = wylie.replace(/^\s+|\s+$/g, '');
    wylie = wylie.replace(/[''`´]/g, "'");
    return wylie;
  }

  /**
   * Normalize Wylie text by fixing common mistakes.
   * @param {string} text - The Wylie text to normalize
   * @returns {string} The normalized text
   */
  normalizeWylie(text: string): string {

    text = this.normalizeWylieWhitespace(text);

    text = text.replace(/v/g, 'w');
    text = text.replace(/[\u0009\u000B\u000C\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\u180E\u200B\u200C\u200D\u2060\uFEFF\u00B7]+/g, ' ');
    text = text.replace(/\s*་\s*/g, '་');
    text = text.replace(/^ *[/]/mg, '_');
    text = text.replace(/^ +|[ _]+$/, '');

    text = text.replace(/ *(\.\.\.|…) */g, '_…_');
    text = text.replace(/ +([\.\/,;])/g, '$1');
    text = text.replace(/([\]\)}\/\.;,=]+) +/g, '$1_');
    text = text.replace(/ng\//g, 'ng /');
    text = text.replace(/[ _]+([\[\(\{])/g, '_$1');
    text = text.replace(/(\/+|[0-9]\.)[ _]*/g, '$1_');
    text = text.replace(/  +/g, ' _');
    text = text.replace(/([^a-zA-Z']) +([^\s])/g, '$1_$2');
    text = text.replace(/([a-zA-Z'])([,;])/g, '$1 $2');
    text = text.replace(/([^a-zA-Z'])[ _]+$/mg, '$1');
    text = text.replace(/([aeiou]')([bcdfghjklmnpqrstvwxyz])/ig, '$1a$2');
    text = text.replace(/\.( |\/)|\.$/g, '//$1');
    text = text.replace(/(\/)[ _]([\]\)}])/mg, '$1$2');

    return text;
  }

  /**
   * Convert Wylie to Unicode, preserving sections in curly braces.
   * @param {string} text - Text in Wylie/EWTS
   * @returns {string} Converted text with bracketed sections preserved
   */
  wylieToUniExceptBracketedSections(text: string): string {
    let result = '';
    let bracketActive = false;

    const tok = new Tokenizer(['{', '}'], (syllable: string, isSeparator: boolean) => {
      if (syllable === '{') {
        result += ' ';
        bracketActive = true;
      } else if (syllable === '}') {
        result += ' ';
        bracketActive = false;
      } else if (bracketActive) {
        result += this.#normalizeInlineEnglish(syllable);
      } else {
        result += this.wylieToUni(syllable);
      }
    });
    tok.parse(text);

    return result;
  }

  /**
   * Trim trailing spaces and separators from Wylie text.
   * @param {string} wylie - Wylie text
   * @returns {string} Trimmed text
   */
  trimWylie(wylie: string): string {
    wylie = wylie.replace(/^\s+|\s*\/?\s*$/g, '');
    wylie = wylie.replace(/_/g, ' ');
    wylie = wylie.replace(/\s+/g, ' ');
    wylie = wylie.replace(/[ /]+$/g, '');
    return wylie;
  }

  /**
   * Normalize inline English text by fixing spacing around punctuation.
   * @private
   */
  #normalizeInlineEnglish(text: string): string {
    text = text.replace(/([,\.]) */g, '$1 ');
    text = text.replace(/ *- */g, ' - ');
    return text;
  }
}
