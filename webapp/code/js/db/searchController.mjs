/**
 * SearchController - handles search operations for the Tibetan Dictionary
 * 
 * This controller is responsible only for fetching data:
 * - Term list (search results)
 * - Term definitions
 * 
 * It returns Promises so that the caller retains control over formatting and UI updates.
 */
import { WylieConverter } from '../language-io/wylieConverter.mjs';

export class SearchController {
    /**
     * Create a SearchController instance
     * @param {Object} dataAccess - The data access layer (PhpDataAccess or CordovaDataAccess)
     * @param {Object} tokenizer - jQuery tokenizer for WylieConverter
     */
    constructor(dataAccess, tokenizer) {
        this.dataAccess = dataAccess;
        this.wylieConverter = new WylieConverter(tokenizer);
    }

    /**
     * Normalize input text for search
     * @param {string} inputText - Raw input text
     * @param {string} lang - Input language ('tib' or 'en')
     * @param {boolean} useUnicodeTibetan - Whether Unicode Tibetan input is enabled
     * @returns {string} Normalized search term in Wylie (for Tibetan) or as-is (for English)
     */
    normalizeSearchTerm(inputText, lang, useUnicodeTibetan) {
        if (lang === 'tib') {
            if (useUnicodeTibetan) {
                inputText = this.wylieConverter.uniToWylie(inputText);
            }
            inputText = this.wylieConverter.trimWylie(inputText);
        }
        return inputText;
    }

    /**
     * Search for terms matching the input
     * @param {Object} searchParams - Search parameters
     * @param {string} searchParams.inputText - The search input (raw, before normalization)
     * @param {string} searchParams.lang - Input language ('tib' or 'en')
     * @param {number} searchParams.offset - Pagination offset
     * @param {number} searchParams.maxResults - Maximum number of results to fetch
     * @param {string[]} searchParams.activeDictionaries - List of dictionary IDs to search
     * @returns {Promise<Object>} Promise resolving to { searchTerm, results, offset, isEmpty }
     */
    searchTermList(searchParams) {
        const { searchTerm, lang, offset, maxResults, activeDictionaries } = searchParams;
        
        const normalizedOffset = Math.max(0, offset || 0);

        if (!searchTerm) {
            return Promise.resolve({ 
                searchTerm: '', 
                results: [], 
                offset: normalizedOffset,
                isEmpty: true 
            });
        }

        return this.dataAccess.readTermList(searchTerm, lang, normalizedOffset, maxResults, activeDictionaries)
            .then(results => ({
                searchTerm,
                results,
                offset: normalizedOffset,
                isEmpty: false
            }))
            .catch(error => {
                console.error('Error when searching for term ' + searchTerm + ':', error);
                throw error;
            });
    }

    /**
     * Read definitions for a specific term
     * @param {Object} readParams - Read parameters
     * @param {string} readParams.term - The term to look up (in Wylie for Tibetan)
     * @param {string} readParams.lang - Language ('tib' or 'en')
     * @param {string[]} readParams.activeDictionaries - List of dictionary IDs to search
     * @returns {Promise<Object>} Promise resolving to { term, definitions }
     */
    readTerm(readParams) {
        const { term, lang, activeDictionaries } = readParams;

        if (!term) {
            return Promise.resolve({ term: '', definitions: {} });
        }

        const normalizedTerm = this.wylieConverter.normalizeWylieWhitespace(term);
        const decodedTerm = decodeURIComponent(normalizedTerm).replace(/^\s+|\s+$/g, '');

        return this.dataAccess.readTerm(decodedTerm, lang, activeDictionaries);
    }
}
