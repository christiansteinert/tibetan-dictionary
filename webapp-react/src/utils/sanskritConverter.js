/**
 * Sanskrit transliteration module.
 * Converts Sanskrit transliteration to Unicode characters.
 */
import { Tokenizer } from './tokenizer.js';

export class SanskritConverter {
  constructor() {
    this.transliterate = {
      'Oṃ': ['oM', 'OM', 'AUM'],
      'ṛ': ['RRi', 'R^i', 'R'],
      'ḷ': ['LLi', 'L^i', 'lR'],
      'ch': ['Ch'],
      'ñ': ['J', '~n', 'JN'],
      'ṭh': ['Th'],
      'ḍh': ['Dh'],
      'ṭ': ['T'],
      'ḍ': ['D'],
      'ṇ': ['N'],
      'v': ['w'],
      'ṃ': ['M', '\\.n', '\\.m'],
      'ḥ': ['H', '\\.h'],
      'ṣ': ['Sh', 'shh', 'S'],
      'ś': ['z', 'sh'],
      'ṅ': ['G', '~N'],
      'ū': ['U', 'uu'],
      'ī': ['I', 'ii'],
      'ā': ['A', 'aa'],
      'â': ['\\^a'],
      'ô': ['\\^o'],
      'û': ['\\^u'],
      'ê': ['\\^e'],
      'î': ['\\^i'],
    };
  }

  /**
   * Convert a single chunk of Sanskrit transliteration to Unicode.
   * @private
   */
  #sktToUniChunk(skt) {
    if (skt.toUpperCase() === skt) return skt;

    for (const [uni, transliterations] of Object.entries(this.transliterate)) {
      for (const transliteration of transliterations) {
        skt = skt.replace(new RegExp(transliteration, 'g'), uni);
      }
    }
    return skt;
  }

  /**
   * Convert Sanskrit transliteration to Unicode, preserving bracketed sections.
   * @param {string} skt - Text in Sanskrit transliteration
   * @returns {string} Text with Unicode Sanskrit characters
   */
  sktToUni(skt) {
    let result = '';
    const separators = ['{', '}', '[', ']', ' ', '='];
    let bracketActive = false;

    const tok = new Tokenizer(separators, (chunk, isSeparator) => {
      if (isSeparator && (chunk === '{' || chunk === '[')) {
        bracketActive = true;
      }
      if (isSeparator && (chunk === '}' || chunk === ']')) {
        bracketActive = false;
      }

      if (bracketActive) {
        result += chunk;
      } else {
        result += this.#sktToUniChunk(chunk);
      }
    });
    tok.parse(skt);

    return result;
  }
}
