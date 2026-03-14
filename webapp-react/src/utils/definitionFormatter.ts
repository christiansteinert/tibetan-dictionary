/**
 * Definition formatting utilities for the Tibetan Dictionary.
 *
 * Handles:
 * - HTML escaping
 * - Abbreviation processing (wrapping in tooltip spans)
 * - Inline Tibetan section conversion (curly-brace Wylie → Unicode)
 * - Audio links, scanned dictionary links
 * - Numbered section breaking
 *
 * Returns structured data (HTML strings + inline section maps) so that
 * React components can render and post-process them.
 */
import { WylieConverter } from './wylieConverter';
import { SanskritConverter } from './sanskritConverter';

// Shared converter instances (initialized lazily)
let sanskritConverter: SanskritConverter | null = null;
let wylieConverter: WylieConverter | null = null;
let sectionCounter = 0;

// ─── Type definitions ────────────────────────────────────────

interface InlineSection {
  id: string;
  wylie: string;
  content: string;
  title: string;
}

interface DictionaryConfig {
  label: string;
  audioId?: string;
  mergeLines?: boolean;
  preformattedLinebreaks?: boolean;
  containsOnlyTibetan?: boolean;
  containsOnlySkt?: boolean;
  highlight?: string;
  about?: string;
}

interface AbbreviationData {
  match: string | string[];
  items: Record<string, string>;
}

interface FormattedDefinition {
  html: string;
  inlineSections: Record<string, InlineSection>;
}

interface FormattedDefinitionList {
  tableHtml: string;
  allInlineSections: Record<string, InlineSection>;
}

interface SearchItem {
  search: RegExp;
  explanation: string;
}

type OnOpenScanCallback = (scanId: string, term: string, pageInfo: string) => void;

/**
 * Ensure shared converters are ready.
 * Called automatically by the public API; can also be called explicitly.
 */
export function initializeFormatters(): void {
  if (!sanskritConverter) sanskritConverter = new SanskritConverter();
  if (!wylieConverter) wylieConverter = new WylieConverter();
}

// ─── HTML escaping helpers ───────────────────────────────────────

function htmlEscape(text: string): string {
  text = text.replace(/&/g, '&amp;');
  text = text.replace(/</g, '&lt;');
  text = text.replace(/>/g, '&gt;');
  text = text.replace(/"/g, '&quot;');
  return text;
}

function htmlEscapeTitle(title: string): string {
  title = htmlEscape(title);
  title = title.replace(/{/g, '&#123;');
  title = title.replace(/}/g, '&#125;');
  title = title.replace(/\n/g, ' ');
  title = title.replace(/<[^>]*>/g, ' ');
  title = title.replace(/  +/g, ' ');
  title = title.replace(/"/g, '&quot;');
  title = title.replace(/'/g, '&#39;');
  return title;
}

function htmlEscapeScriptAttr(text: string): string {
  text = htmlEscape(text);
  text = text.replace(/'/g, "\\'");
  return text;
}

function htmlEscapeDefinition(definition: string): string {
  definition = htmlEscape(definition);
  definition = definition.replace(
    /(https?:\/\/)([-0-9a-zA-Z\/\.#%_:&;]+)/g,
    '<a target="_blank" rel="noopener noreferrer" class="link" href="$1$2">$2</a>'
  );
  definition = definition.replace(/\\+n/g, '\n');
  definition = definition.replace(/\\/g, '');
  definition = definition.replace(/([a-zA-Z0-9\.]){/g, '$1 {');
  definition = definition.replace(/}([a-zA-Z0-9])/g, '} $1');
  definition = definition.replace(/:([^\/0-9])/g, ': $1');
  definition = definition.replace(/ - /g, ' &ndash; ');
  return '<p>' + definition + '</p>';
}

// ─── Abbreviation processing ─────────────────────────────────────

function parseAbbreviations(abbreviationsData: AbbreviationData | null): Record<string, SearchItem[]> {
  if (!abbreviationsData) return {};

  const searchPattern = typeof abbreviationsData.match === 'string'
    ? [abbreviationsData.match]
    : abbreviationsData.match;

  const searchList: Record<string, SearchItem[]> = {};

  for (const pattern of searchPattern) {
    for (const abbr in abbreviationsData.items) {
      const abbrEscaped = abbr.replace(/([\[\]\.\*\+\{\}])/g, '\\$1');
      const termSearch = pattern.replace('TERM', abbrEscaped);

      if (!searchList[abbr]) {
        searchList[abbr] = [];
      }

      searchList[abbr].push({
        search: new RegExp(termSearch, 'mg'),
        explanation: abbreviationsData.items[abbr],
      });

      // Also match version without spaces
      if (termSearch.indexOf(' ') > -1) {
        const termSearchNoSpace = termSearch.replace(/ /g, '\\ ');
        searchList[abbr].push({
          search: new RegExp(termSearchNoSpace, 'mg'),
          explanation: abbreviationsData.items[abbr],
        });
      }
    }
  }

  return searchList;
}

function processAbbreviations(text: string, abbreviationsData: AbbreviationData | null): string {
  const abbrevs = parseAbbreviations(abbreviationsData);
  let changed = true;

  while (changed) {
    const t = text;
    for (const abbr in abbrevs) {
      const items = abbrevs[abbr];
      for (const item of items) {
        let oldText = '';
        let i = 0;
        while (text !== oldText) {
          oldText = text;
          text = text.replace(
            item.search,
            `$1<span class="tooltip" title="${htmlEscape(abbr + ': ' + item.explanation)}">$2</span>$3`
          );
          if (i++ > 10) {
            break;
          }
        }
      }
    }
    changed = t !== text;
  }
  return text;
}

// ─── Inline Tibetan section conversion ───────────────────────────

function convertInlineTibetanSections(
  definition: string,
  useUnicodeTibetan: boolean
): { definition: string; inlineSections: Record<string, InlineSection> } {
  if (!wylieConverter) {
    return { definition, inlineSections: {} };
  }

  const inlineSections: Record<string, InlineSection> = {};
  const chunks = definition.match(/[{][^{}]+[}]/g);

  if (!chunks) return { definition, inlineSections };

  const sectionBase = sectionCounter++;
  let modifiedDefinition = definition; // Track modified copy

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkContents = wylieConverter
      .normalizeWylie(chunk)
      .replace(/[{}]/g, '')
      .replace(/^\s+|\s+$/g, '');

    let out = useUnicodeTibetan
      ? wylieConverter.wylieToUni(chunkContents)
      : chunkContents;

    const lookup = wylieConverter.normalizeWylieWhitespace(chunkContents);

    const sectionId = 'tibSection' + sectionBase + '_' + i;
    const title = chunk.replace(/\n/g, ' ');

    out = out.replace(/\n/g, '<br />');
    out = out.replace(/\\n/g, '<br />');
    out = out.replace(/([()]|&gt;|&lt;)/g, '<span class="paren">$1</span>');

    // Always register the section so the backend can check if it's a real entry.
    // Keyed by sectionId (what PHP iterates over) with wylie as a sub-field.
    inlineSections[sectionId] = {
      id: sectionId,
      wylie: lookup,
      content: out,
      title: htmlEscapeTitle(title),
    };

    // Emit a plain span — DefinitionView will add .link + data-wylie after
    // the backend confirms this Wylie term has a dictionary entry
    modifiedDefinition = modifiedDefinition.replace(
      chunk,
      `<span id="${sectionId}" class="tib">${out}</span>`
    );
  }

  return { definition: modifiedDefinition, inlineSections };
}

// ─── Other definition helpers ────────────────────────────────────

function breakDefinitionIntoSections(definition: string): string {
  if (
    definition.match(/([^0-9]|^)1[\.)]/) &&
    definition.match(/([^0-9]|^)2[\.)]/
  )) {
    definition = definition.replace(
      /([^-0-9(])([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg,
      '$1\n$2 $3'
    );
    definition = definition.replace(
      /^([(]?[1-9][0-9]?[\.)] ?)([^0-9])/mg,
      '$1 $2'
    );
  }
  return definition;
}

function addAudioLinks(definition: string, currentDict: DictionaryConfig): string {
  if (currentDict.audioId) {
    let replacement = '';
    if (!(window as any).cordova) {
      const audioPath = 'audio/' + currentDict.audioId + '/';
      replacement = '<audio controls preload="none"><source src="' + audioPath + '$1" type="audio/mpeg"></audio>';
    }
    definition = definition.replace(/\[sound:([^\]]+)\]/g, replacement);
  }
  return definition;
}

// ─── Single definition formatting ────────────────────────────────

/**
 * Format a single dictionary definition entry.
 *
 * @param {string} definition - Raw definition text
 * @param {string} term - The term being looked up
 * @param {boolean} useUnicodeTibetan - Whether to render Tibetan Unicode
 * @param {Object} currentDict - Dictionary configuration object
 * @param {Object|null} abbreviationsData - Abbreviations for this dictionary
 * @param {function} [onOpenScan] - Callback signature: (scanId, term, pageInfo) => void
 * @returns {{ html: string, inlineSections: Object }}
 */
export function formatDefinition(
  definition: string,
  term: string,
  useUnicodeTibetan: boolean,
  currentDict: DictionaryConfig,
  abbreviationsData: AbbreviationData | null,
  onOpenScan?: OnOpenScanCallback
): FormattedDefinition {
  initializeFormatters();

  let defStart = '';
  let defEnd = '';
  let inlineSections: Record<string, InlineSection> = {};

  if (currentDict.mergeLines) {
    definition = definition.replace(/\n/gm, '; ');
    definition = definition.replace(/\\n/gm, '; ');
  }
  if (!currentDict.preformattedLinebreaks) {
    definition = breakDefinitionIntoSections(definition);
  }

  if (currentDict.containsOnlyTibetan) {
    defStart = `<div class="tib" title="${htmlEscapeTitle(definition)}">`;
    if (definition.indexOf('-----') !== -1) {
      definition = definition.replace(/\n-----\n/g, '</p>\n<p class="separator"></p>\n<p>');
      definition = '<p>' + definition + '</p>';
    } else {
      definition = definition.replace(/\n/g, '</p>\n<p>');
      definition = '<p>' + definition + '</p>';
    }
    defEnd = '</div>';
  } else if (currentDict.containsOnlySkt) {
    if (!sanskritConverter) sanskritConverter = new SanskritConverter();
    definition = sanskritConverter.sktToUni(definition);
    definition = htmlEscapeDefinition(definition);
    defStart = '<div class="skt">';
    defEnd = '</div>';
  } else {
    definition = htmlEscapeDefinition(definition);

    // Convert inline Tibetan sections after escaping of other HTML code
    const converted = convertInlineTibetanSections(definition, useUnicodeTibetan);
    definition = converted.definition;
    inlineSections = converted.inlineSections;

  }

  definition = addAudioLinks(definition, currentDict);

  definition = definition.replace(/\n/g, '</p>\n<p>');
  definition = definition.replace(/\\n/g, '</p>\n<p>');
  definition = definition.replace(/<p>-----<\/p>/g, '<p class="separator"></p>');
  definition = definition.replace(/; -----;/g, '</p><p class="separator"></p><p>');

  if (currentDict.highlight) {
    definition = definition.replace(new RegExp(currentDict.highlight, 'g'), '<b>$1</b>');
  }

  if (abbreviationsData) {
    definition = processAbbreviations(definition, abbreviationsData);
  }

  definition = defStart + definition + defEnd;

  // Build tooltip for dict name
  let tooltipStart = '';
  let tooltipEnd = '';
  if (currentDict.about) {
    tooltipStart = `<span class="tooltip" data-tooltip-html="${htmlEscape(currentDict.about)}">`;
    tooltipEnd = '</span>';
  }

  const html =
    '<tr><td class="dictName">' +
    tooltipStart +
    currentDict.label +
    tooltipEnd +
    '</td><td class="definition">' +
    definition +
    '</td></tr>';

  return { html, inlineSections };
}

// ─── Full definition list formatting ─────────────────────────────

/**
 * Format all definitions for a term into an HTML table.
 *
 * @param {Object} dictionaries - Map of dictId → dictionary config (in display order)
 * @param {Object} dictEntries - Map of dictName → raw definition text
 * @param {string} term - The term being looked up
 * @param {string} lang - Language ('tib' or 'en')
 * @param {boolean} useUnicodeTibetan - Whether Unicode output is active
 * @param {Object} ABBREVIATIONS - Global abbreviations data
 * @param {function} [onOpenScan] - Callback for scan links
 * @returns {{ tableHtml: string, allInlineSections: Object }}
 */
export function formatDefinitionList(
  dictionaries: Record<string, DictionaryConfig>,
  dictEntries: Record<string, string>,
  term: string,
  lang: string,
  useUnicodeTibetan: boolean,
  ABBREVIATIONS: Record<string, AbbreviationData | null>,
  onOpenScan?: OnOpenScanCallback
): FormattedDefinitionList {
  initializeFormatters();

  const allInlineSections: Record<string, InlineSection> = {};

  // Render heading
  let termDisplay: string;
  if (lang === 'en') {
    termDisplay = term;
  } else {
    termDisplay = useUnicodeTibetan && wylieConverter ? wylieConverter.wylieToUni(term) : term;
  }

  let tableHtml =
    `<h1 class="definitionHead definitionHead${lang}" title="${htmlEscapeTitle(term)}">${termDisplay}</h1>` +
    '<table id="definitionList">';

  for (const dictName in dictionaries) {
    if (dictEntries.hasOwnProperty(dictName)) {
      const currentDict = dictionaries[dictName];
      const definition = dictEntries[dictName];
      const abbreviationsData = ABBREVIATIONS[dictName] || null;

      const result = formatDefinition(
        definition,
        term,
        useUnicodeTibetan,
        currentDict,
        abbreviationsData,
        onOpenScan
      );

      tableHtml += result.html;

      // Merge inline sections
      Object.assign(allInlineSections, result.inlineSections);
    }
  }

  tableHtml += '</table>';
  return { tableHtml, allInlineSections };
}
