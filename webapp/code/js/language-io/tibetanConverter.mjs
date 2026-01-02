/**
 * Tibetan transliteration module
 * Wraps the ewts-js library for Wylie/EWTS to Unicode conversion
 */

import { EwtsConverter } from '../ewts-js/src/EwtsConverter.mjs';

/**
 * Class for converting between Wylie/EWTS transliteration and Tibetan Unicode
 */
export class WylieConverter {
    /**
     * Create a new WylieConverter instance
     * @param {function} tokenizer - jQuery tokenizer constructor for parsing text
     * @param {Object} [options] - Optional configuration options for the Wylie converter
     * @param {boolean} [options.check=true] - Generate warnings for illegal consonant sequences
     * @param {boolean} [options.check_strict=true] - Stricter checking, examine the whole stack
     * @param {boolean} [options.fix_spacing=true] - Remove spaces after newlines, collapse multiple tseks, fix case
     * @param {boolean} [options.sloppy=true] - Silently fix common Wylie mistakes when converting to Unicode
     * @param {boolean} [options.leave_dubious=false] - Leave dubious syllables unprocessed between [brackets]
     * @param {boolean} [options.pass_through=true] - Pass through non-Tibetan characters instead of converting to [comments]
     */
    constructor(tokenizer, options = {}) {
        this.tokenizer = tokenizer;
        this.converter = new EwtsConverter({
            check: options.check ?? true,
            check_strict: options.check_strict ?? true,
            fix_spacing: options.fix_spacing ?? true,
            sloppy: options.sloppy ?? true,
            leave_dubious: options.leave_dubious ?? false,
            pass_through: options.pass_through ?? true
        });
    }

    /**
     * Convert Tibetan text from Wylie/EWTS transliteration to Tibetan Unicode
     * @param {string} wylie - Text in Wylie/EWTS transliteration
     * @returns {string} Text in Tibetan Unicode
     */
    wylieToUni(wylie) {
        if (!wylie) {
            return "";
        }
        
        // Return original string if it contains HTML-sensitive characters
        if (/[<>&]/.test(wylie)) {
            return wylie;
        }

        //remove dashes that connect syllables inside of wylie chunks but keep "-i" which stands  for a reversed gigu
        wylie = wylie.replace(/([^ ])-([^ i])/g, '$1 $2');

        // Add a space (tseg) at the end if the string ends with a syllable that is not followed by punctuation or space
        if (/[a-zA-Z]$/.test(wylie)) {
            wylie += ' ';
        }

        if (/'$/.test(wylie)) {
            wylie += "'a ";
        }

        var result = this.converter.to_unicode(wylie);

        result = result.replace(/ +/g, '་');
        result = result.replace(/([༡༢༣༤༥༦༧༨༩༠།).།])་/g, '$1 ');

        return result;
    }

    /**
     * Convert Tibetan text from Unicode to Wylie/EWTS transliteration
     * @param {string} unicode - Text in Tibetan Unicode
     * @returns {string} Text in Wylie/EWTS transliteration
     */
    uniToWylie(unicode) {
        var result = this.converter.to_ewts(unicode);
        result = result.replace(/[[\]]/g, '');
        return result;
    }

    normalizeWylieWhitespace(wylie) {
        if(wylie===' ') {
            return wylie;
        }
        wylie = wylie.replace('/',' ');
        wylie = wylie.replace(/[()]/g,' ');
        wylie = wylie.replace(/\s\s+/g,' ');
        wylie = wylie.replace(/^\s+|\s+$/g,'');
        wylie = wylie.replace(/[’‘`´]/g,"'");
        return wylie;
    }

    /**
     * normalize a piece of Wylie text by fixing common mistakes
     * @param {string} text - The Wylie text to normalize
     * @returns {string} The normalized text
     */
    normalizeWylie(text) {
        text = this.normalizeWylieWhitespace(text);

        text = text.replace(/v/g, 'w');
        text = text.replace(/[\u0009\u000B\u000C\u0020\u0085\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\u180E\u200B\u200C\u200D\u2060\uFEFF\u00B7]+/g, ' ');
        text = text.replace(/\s*་\s*/g, '་');
        text = text.replace(/^ *[/]/mg, '_');
        text = text.replace(/^ +|[ _]+$/, '');
        if (text != '' && !/.*(?: |\+|\/|་|།)$/.test(text))
            text += ' '; // add a tseg at the end if the text neither ends with a tseg nor a shad
        //text = text.replace(/\s*[-=]\s*/g,' '); //remove special characters
        text = text.replace(/ *(\.\.\.|…) */g, '_…_'); //add spaces before and after "..."
        text = text.replace(/ +([\.\/,;])/g, '$1'); //prevent space before . or shad or , or ;
        text = text.replace(/([]\)}\/\.;,\-=]+) +/g, '$1_'); //space rather than tseg after certain characters
        text = text.replace(/ng\//g, 'ng /'); // tseg between nga and shad
        text = text.replace(/[ _]+([-\[\(\{])/g, '_$1'); // add space before certain characters
        text = text.replace(/(\/+|[0-9]\.)[ _]*/g, '$1_'); // add space after shad and other characters
        text = text.replace(/  +/g, ' _'); //two spaces -> tseg space
        text = text.replace(/([^a-zA-Z']) +([^\s])/g, '$1_$2'); //space rather than tseg between a non-syllable and a syllable
        text = text.replace(/([a-zA-Z'])([,;])/g, '$1 $2'); //tseg between syllable and various punctuation marks
        text = text.replace(/([^a-zA-Z'])[ _]+$/mg, '$1'); //prevent tsegs after non-word charcters at the end of a line
        text = text.replace(/([aeiou]')([bcdfghjklmnpqrstvwxyz])/ig, '$1a$2'); //enforce a vowel after a-chung
        text = text.replace(/\.( |\/)|\.$/g, '//$1'); //a dot at the end of a syllable cannot be part of the syllable. Convert it to a double-shad


        //prevent spaces after certain character combinations (this is a cleanup rule that removes some spaces 
        // that may have been introduced by one of the previous rules but are not desired)
        text = text.replace(/(\/)[ _]([\]\)}])/mg, '$1$2');

        return text;
    }

    /**
     * Convert Wylie text to Tibetan Unicode, but preserve bracketed sections (in curly braces)
     * @param {string} text - Text in Wylie/EWTS transliteration
     * @returns {string} Text with Tibetan Unicode, bracketed sections preserved
     */
    wylieToUniExceptBracketedSections(text) {
        let result = '';
        let bracketActive = false;

        const tok = new this.tokenizer(['{', '}'], (syllable, isSeparator) => {
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
     * Normalize inline English text by fixing spacing around punctuation
     * @param {string} text the text to be normalized
     * @returns {string} The normalized text
     * @private
     */
    #normalizeInlineEnglish(text) {
        text = text.replace(/([,\.]) */g,'$1 ');
        text = text.replace(/ *- */g,' - ');
        return text;
    }
}
