/**
 * Formatting module for the Tibetan Dictionary
 * Handles definition formatting, HTML escaping, and abbreviation processing
 */

import { SanskritConverter } from '../language-io/sanskritConverter.mjs';
import { WylieConverter } from '../language-io/wylieConverter.mjs';

/**
 * Class for formatting dictionary definitions.
 * Each instance is created for a specific dictionary entry.
 */
export class DefinitionFormatter {
    /** @type {number} Static counter for generating unique section IDs across all definitions on the page */
    static #sectionCounter = 0;

    /** @type {SanskritConverter} Shared Sanskrit converter instance */
    static #sanskritConverter = null;

    /** @type {WylieConverter} Shared Wylie converter instance */
    static #wylieConverter = null;

    /**
     * Initialize static converters (must be called once before creating instances)
     */
    static initialize() {
        DefinitionFormatter.#sanskritConverter = new SanskritConverter();
        DefinitionFormatter.#wylieConverter = new WylieConverter();
    }

    /**
     * Create a new DefinitionFormatter instance for a specific dictionary
     * @param {Object} currentDict - Dictionary configuration object
     * @param {Object} [abbreviationsData] - Optional abbreviations data for this dictionary (may be null/undefined)
     */
    constructor(currentDict, abbreviationsData) {
        this.currentDict = currentDict;
        this.abbreviationsData = abbreviationsData || null;
    }

    /**
     * Get parsed abbreviations for this dictionary
     * @returns {Array} Parsed abbreviation patterns
     * @private
     */
    #getAbbreviations() {
        if (!this.abbreviationsData) {
            return [];
        }

        var abbrev = this.abbreviationsData;
        var searchPattern = abbrev.match;
        var searchList = [];

        if ((typeof searchPattern) === "string") {
            searchPattern = [searchPattern];
        }

        for (var i in searchPattern) {
            var search = searchPattern[i];

            for (var abbr in abbrev.items) {
                var abbrEscaped = abbr.replace(/([\[\]\.\*\+\{\}])/g, '\\$1');
                var termSearch = search.replace("TERM", abbrEscaped);

                if (!searchList[abbr])
                    searchList[abbr] = [];

                searchList[abbr].push({
                    search: new RegExp(termSearch, "mg"),
                    explanation: abbrev.items[abbr]
                });

                if (termSearch.indexOf(' ') > -1) {
                    var abbrCondensed = abbrEscaped.replace(/ /g, '');
                    var termSearch2 = search.replace("TERM", abbrCondensed);

                    var abbrNoSpace = abbr.replace(/ /g, '')
                    if (!searchList[abbrNoSpace])
                        searchList[abbrNoSpace] = [];

                    searchList[abbrNoSpace].push({
                        search: new RegExp(termSearch2, "mg"),
                        explanation: abbrev.items[abbr]
                    });
                }
            }
        }

        return searchList;
    }

    /**
     * Process abbreviations in text, wrapping them with tooltips
     * @param {string} text - The text to process
     * @returns {string} Text with abbreviations wrapped in tooltip spans
     * @private
     */
    #processAbbreviations(text) {
        var abbrevs = this.#getAbbreviations();
        var changed = true;
        while (changed) {
            var t = text;
            for (var abbr in abbrevs) {
                var items = abbrevs[abbr];

                for (var itemIds in items) {
                    var item = items[itemIds];
                    var oldText = "";
                    var i = 0;
                    while (text != oldText) {
                        oldText = text;
                        text = text.replace(item.search, '$1<span class="tooltip" title="' + abbr + ': ' + item.explanation + '">$2</span>$3');
                        if (i++ > 10) {
                            console.log("trouble with replacing " + abbr + " in: " + text);
                            break;
                        }
                    }
                }
            }
            if (t === text) {
                changed = false;
            }
        }
        return text;
    }

    /**
     * Escape text for safe HTML display
     * @param {string} text - The text to escape
     * @returns {string} HTML-escaped text
     * @private
     */
    static #htmlEscape(text) {
        text = text.replace(/&/g, '&amp;');
        text = text.replace(/</g, '&lt;');
        text = text.replace(/>/g, '&gt;');
        text = text.replace(/"/g, '&quot;');

        return text;
    }

    /**
     * Escape and format a definition for HTML display
     * @param {string} definition - The definition text
     * @returns {string} HTML-formatted definition
     * @private
     */
    #htmlEscapeDefinition(definition) {
        definition = DefinitionFormatter.#htmlEscape(definition);

        definition = definition.replace(/(https?:\/\/)([-0-9a-zA-Z\/\.#%_:&;]+)/g, '<a target="_blank" href="$1$2">$2</a>');
        definition = definition.replace(/\\+n/g, '\n');
        definition = definition.replace(/\\/g, '');
        definition = definition.replace(/([a-zA-Z0-9\.]){/g, '$1 {');
        definition = definition.replace(/}([a-zA-Z0-9])/g, '} $1');
        definition = definition.replace(/:([^\/0-9])/g, ': $1');
        definition = definition.replace(/ - /g, ' &ndash; ');

        return '<p>' + definition + '</p>';
    }

    /**
     * Escape text for use in HTML title attribute
     * @param {string} title - The title text
     * @returns {string} Escaped title text
     * @private
     */
    static #htmlEscapeTitle(title) {
        title = DefinitionFormatter.#htmlEscape(title);
        title = title.replace(/{/g, '&#123;');
        title = title.replace(/}/g, '&#125;');
        title = title.replace(/\n/g, ' ');
        title = title.replace(/<[^>]*>/g, ' ');
        title = title.replace(/  +/g, ' ');
        title = title.replace(/"/g, "&quot;");
        title = title.replace(/'/g, "&#39;");

        return title;
    }

    /**
     * Escape text for use in JavaScript string within HTML attribute
     * @param {string} text - The text to escape
     * @returns {string} Escaped text safe for script attributes
     * @private
     */
    static #htmlEscapeScriptAttr(text) {
        text = DefinitionFormatter.#htmlEscape(text);
        text = text.replace(/'/g, "\\'");

        return text;
    }

    /**
     * Convert inline Tibetan sections (text in curly braces) to formatted spans
     * @param {string} definition - The definition text with {wylie} sections
     * @param {boolean} useUnicodeTibetan - Whether Unicode Tibetan output is enabled
     * @returns {{definition: string, inlineSections: Object}} Object with converted definition and inline sections for link checking
     * @private
     */
    #convertInlineTibetanSections(definition, useUnicodeTibetan) {
        var inlineSections = {};
        var chunks = definition.match(/[{][^{}]+[}]/g);

        if (!chunks)
            return { definition, inlineSections };

        var sectionBase = DefinitionFormatter.#sectionCounter++;
        var wylieConverter = DefinitionFormatter.#wylieConverter;

        for (var i = 0; i < chunks.length; i++) {
            var chunk = chunks[i];
            chunk.replace(/\\/g, "\\\\");
            var chunkContents = wylieConverter.normalizeWylie(chunk).replace(/[{}]/g, '').replace(/^\s+|\s+$/g, '');
            var out = useUnicodeTibetan ? wylieConverter.wylieToUni(chunkContents) : chunkContents;
            var lookup = wylieConverter.normalizeWylieWhitespace(chunkContents);

            if ((!useUnicodeTibetan) || (/.*[a-z].*/.test(chunkContents) && !/^.*[a-zA-Z0-9].*$/.test(out))) {
                var sectionId = 'tibSection' + sectionBase + '_' + i;
                var title = chunk.replace(/\n/g, ' ');

                out = out.replace(/\n/g, '<br />');
                out = out.replace(/\\n/g, '<br />');
                out = out.replace(/([()]|&gt;|&lt;)/g, '<span class="paren">$1</span>');

                definition = definition.replace(chunk, '<span id="' + sectionId + '" class="tib inlineTib" title="' + DefinitionFormatter.#htmlEscapeTitle(title) + '">' + out + '</span>');

                inlineSections[sectionId] = {
                    wylie: lookup
                };
            }
        }

        return { definition, inlineSections };
    }

    /**
     * Break definition into numbered sections
     * @param {string} definition - The definition text
     * @returns {string} Definition with line breaks before numbered items
     * @private
     */
    #breakDefinitionIntoSections(definition) {
        if (definition.match(/([^0-9]|^)1[\.)]/) && definition.match(/([^0-9]|^)2[\.)]/)) {
            // break before numbers like "1." or "1)"
            definition = definition.replace(/([^-0-9(])([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg, '$1\n$2 $3');
            definition = definition.replace(/^([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg, '$1 $2');
        }
        return definition;
    }

    /**
     * Add audio player links to definition
     * @param {string} definition - The definition text
     * @returns {string} Definition with audio tags
     * @private
     */
    #addAudioLinks(definition) {
        var currentDict = this.currentDict;
        if (currentDict.audioId) {
            var replacement = '';

            if (!window.cordova) {
                // in browser (rather than on mobile): insert audio tag
                var audioPath = "audio/" + currentDict.audioId + "/";
                replacement = '<audio controls preload="none"><source src="' + audioPath + '$1" type="audio/mpeg"></audio>';
            }
            definition = definition.replace(/\[sound:([^\]]+)\]/g, replacement);
        }
        return definition;
    }

    /**
     * Format a dictionary definition for display
     * @param {string} definition - The raw definition text
     * @param {string} term - The term being looked up
     * @param {boolean} useUnicodeTibetan - Whether Unicode Tibetan output is enabled
     * @returns {{formattedDefinition: string, inlineSections: Object}} Object with formatted HTML and inline sections for link checking
     */
    formatDefinition(definition, term, useUnicodeTibetan) {
        var defStart = "", defEnd = "";
        var inlineSections = {};
        var currentDict = this.currentDict;
        var sanskritConverter = DefinitionFormatter.#sanskritConverter;
        var wylieConverter = DefinitionFormatter.#wylieConverter;

        if (currentDict.mergeLines) {
            definition = definition.replace(/\n/gm, '; ');
            definition = definition.replace(/\\n/gm, '; ');
        }
        if (!currentDict.preformattedLinebreaks) {
            definition = this.#breakDefinitionIntoSections(definition);
        }
        if (currentDict.containsOnlyTibetan) {
            // FIXME: split at various characters such as before and after: / whitespace * ( ) .   

            defStart = '<div class="tib" title="' + DefinitionFormatter.#htmlEscapeTitle(definition) + '">';
            if (definition.indexOf("-----")) {
                // ensure that separator lines are working also in Tibetan-only dictionaries
                definition = definition.replace("-----", "}\n-----\n{");
                definition = "{" + definition + "}";
                var result = this.#convertInlineTibetanSections(sanskritConverter.sktToUni(this.#htmlEscapeDefinition(definition)), useUnicodeTibetan);
                definition = result.definition;
                inlineSections = result.inlineSections;
            } else {
                var tibetanOutput = useUnicodeTibetan 
                    ? wylieConverter.wylieToUniExceptBracketedSections(definition) 
                    : definition;
                definition = this.#htmlEscapeDefinition(tibetanOutput);
            }
            defEnd = '</div>';
        } else if (currentDict.containsOnlySkt) {
            defStart = '<div class="skt" title="' + DefinitionFormatter.#htmlEscapeTitle(definition) + '">';
            var result = this.#convertInlineTibetanSections(sanskritConverter.sktToUni(this.#htmlEscapeDefinition(definition)), useUnicodeTibetan);
            definition = result.definition;
            inlineSections = result.inlineSections;
            defEnd = '</div>';
        } else if (currentDict.scanId) {
            //scanned dictionary. If we have an exact page number, we link to it
            var definitionParts = definition.split('-----');
            definition = '';
            for (var i = 0; i < definitionParts.length; i++) {
                var pageNr = Number(definitionParts[i].replace(/[^0-9]/g, ''));
                var pageTxt = "";
                var offset = currentDict?.scanInfo?.offset || 0;

                var pageInfo = {
                    term_page: pageNr + offset,
                    ...currentDict.scanInfo
                }

                if (definition != '') {
                    definition += '<div class="separator"></div>';
                }

                if (definitionParts.length > 1) {
                    var adjust = currentDict?.scanInfo?.display_pageadjust || 0;
                    var adjustedPage = pageNr + adjust;
                    pageTxt = ' (p. ' + adjustedPage + ')';
                }

                definition += '<div><a href="javascript:DICT.openScannedPage('
                    + '\'' + DefinitionFormatter.#htmlEscapeScriptAttr(currentDict.scanId) + '\',' 
                    + '\'' + DefinitionFormatter.#htmlEscapeScriptAttr(term) + '\','
                    + DefinitionFormatter.#htmlEscapeScriptAttr(JSON.stringify(pageInfo))
                    + ')">' + currentDict.linkText + pageTxt + '</a></div>';
            }
        
        } else {
            var result = this.#convertInlineTibetanSections(this.#htmlEscapeDefinition(definition), useUnicodeTibetan);
            definition = result.definition;
            inlineSections = result.inlineSections;
        }

        definition = this.#addAudioLinks(definition);

        definition = definition.replace(/\n/g, '</p>\n<p>');
        definition = definition.replace(/\\n/g, '</p>\n<p>');
        definition = definition.replace(/<p>-----<\/p>/g, '<p class="separator"></p>');
        definition = definition.replace(/; -----;/g, '</p><p class="separator"></p><p>');

        if (currentDict.highlight) {
            definition = definition.replace(new RegExp(currentDict.highlight, 'g'), '<b>$1</b>');
        }

        if (this.abbreviationsData) {
            definition = this.#processAbbreviations(definition);
        }

        definition = defStart + definition + defEnd;

        var tooltipStart = "", tooltipEnd = "";
        if (currentDict.about) {
            tooltipStart = '<span class="tooltip" title="' + currentDict.about + '">';
            tooltipEnd = '</span>';
        }

        var formattedDefinition = '<tr><td class="dictName">' + tooltipStart + currentDict.label + tooltipEnd + '</td><td class="definition">' + definition + '</td></tr>';
        return { formattedDefinition, inlineSections };
    }

    /**
     * Format a list of dictionary definitions into an HTML table
     * @param {Object} dictionaries - Dictionaries for which results were found: Map of dictionary id to dictionary configuration
     * @param {Object} dictEntries - Found dictionary entries: Map of dictionary name to definition text
     * @param {string} term - The term being looked up
     * @param {string} lang - Language of the current term ('en' or 'tib')
     * @param {boolean} useUnicodeTibetan - Whether Unicode Tibetan output is enabled
     * @param {Object} ABBREVIATIONS - Abbreviations data
     * @returns {{definitionTableHtml: string, allInlineSections: Object}} Object with formatted HTML table and all inline sections
     */
    static formatDefinitionList(dictionaries, dictEntries, term, lang, useUnicodeTibetan, ABBREVIATIONS) {
        var allInlineSections = {};
        var wylieConverter = DefinitionFormatter.#wylieConverter;

        // Generate term display (Unicode Tibetan or Wylie)
        var termUni;
        if (lang === 'en') {
            termUni = term;
        } else {
            termUni = useUnicodeTibetan ? wylieConverter.wylieToUni(term) : term;
        }

        // Build definition table with header
        var definitionTableHtml = '<h1 class="definitionHead definitionHead' + lang + '" title="' + DefinitionFormatter.#htmlEscapeTitle(term) + '">' + termUni + '</h1><table id="definitionList">';

        for (var dictName in dictionaries) {
            if (dictEntries.hasOwnProperty(dictName)) {
                var definition = dictEntries[dictName];
                var currentDict = dictionaries[dictName];
                
                var abbreviationsData = currentDict.abbreviations ? ABBREVIATIONS[currentDict.abbreviations] : null;
                var formatter = new DefinitionFormatter(currentDict, abbreviationsData);
                var result = formatter.formatDefinition(definition, term, useUnicodeTibetan);
                definitionTableHtml += result.formattedDefinition;
                
                // Collect inline sections for link checking
                Object.assign(allInlineSections, result.inlineSections);
            }
        }

        definitionTableHtml += '</table>';
        return { definitionTableHtml, allInlineSections };
    }
}
