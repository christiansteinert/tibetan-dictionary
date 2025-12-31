/**
 * Sanskrit transliteration module
 * Converts Sanskrit transliteration to Unicode characters
 */
export class SanskritConverter {
    /**
     * Create a new SanskritConverter instance
     * @param {function} tokenizer - jQuery tokenizer constructor
     */
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
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
     * Convert a chunk of Sanskrit transliteration to Unicode
     * @param {string} skt - A piece of text in Sanskrit transliteration
     * @returns {string} The same text with Unicode characters
     */
    _sktToUniChunk(skt) {
        if (skt.toUpperCase() === skt) {
            return skt; // don't adjust text that is only comprised of upper case characters
        }

        for (const [uni, transliterations] of Object.entries(this.transliterate)) {
            for (const transliteration of transliterations) {
                const replacer = new RegExp(transliteration, 'g');
                skt = skt.replace(replacer, uni);
            }
        }
        return skt;
    }

    /**
     * Convert Sanskrit transliteration to Unicode, preserving bracketed sections
     * @param {string} skt - Text in Sanskrit transliteration
     * @returns {string} Text with Unicode Sanskrit characters
     */
    sktToUni(skt) {
        let result = '';
        const separators = ['{', '}', '[', ']', ' ', '='];
        let bracketActive = false;

        const tok = new this.tokenizer(separators, (chunk, isSeparator) => {
            if (isSeparator && (chunk === '{' || chunk === '[')) {
                bracketActive = true;
            }
            if (isSeparator && (chunk === '}' || chunk === ']')) {
                bracketActive = false;
            }

            if (bracketActive) {
                result += chunk;
            } else {
                result += this._sktToUniChunk(chunk);
            }
        });
        tok.parse(skt);

        return result;
    }
}
