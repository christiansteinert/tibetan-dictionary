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
import type { DictListType, DictEntry } from '@/config/dictlist';
import type { AbbreviationsType, AbbreviationSet } from '@/config/abbreviations';

// Shared converter instances (initialized lazily)
let sanskritConverter: SanskritConverter | null = null;
let wylieConverter: WylieConverter | null = null;
let sectionCounter = 0;

// ─── Type definitions ────────────────────────────────────────
interface InlineTibetanSection {
  id: string;
  wylie: string;
  content: string;
  title: string;
}

interface FormattedDefinition {
  html: string;
  inlineSections: Record<string, InlineTibetanSection>;
}

interface FormattedDefinitionList {
  tableHtml: string;
  allInlineSections: Record<string, InlineTibetanSection>;
}

interface SearchItem {
  search: RegExp;
  explanation: string;
}

type OnOpenScanCallback = (scanId: string, term: string, pageInfo: string) => void;


// ─── Converters ───────────────────────────────────────
function getSanskritConverter(): SanskritConverter {
  if (!sanskritConverter) sanskritConverter = new SanskritConverter();
  return sanskritConverter;
}

function getWylieConverter(): WylieConverter {
  if (!wylieConverter) wylieConverter = new WylieConverter();
  return wylieConverter;
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

// Escape a string so it can be safely inserted into a RegExp pattern.
function escapeRegexLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

//  ─── Abbreviation processing ─────────────────────────────────────

/**
 * Build a lookup table of search/replace rules for a single abbreviation set.
 * We use this to find occurrences of abbreviations in a definition string and wrap them in tooltip spans
 * (see processAbbreviations()).
 *
 * @param abbreviationsData - a single dictionary's abbreviation config (match + items)
 * @returns a map from abbreviation key → list of SearchItem objects containing
 *          the RegExp to match and the explanatory tooltip text.
 */
function parseAbbreviations(abbreviationsData: AbbreviationSet | null): Record<string, SearchItem[]> {
  if (!abbreviationsData) return {};

  const searchPattern = typeof abbreviationsData.match === 'string'
    ? [abbreviationsData.match]
    : abbreviationsData.match;

  const searchList: Record<string, SearchItem[]> = {};
  for (const pattern of searchPattern) {
    for (const abbr in abbreviationsData.items) {
      // Use a robust regex-escape for the abbreviation text
      const abbrEscaped = escapeRegexLiteral(abbr);

      // Base pattern: insert the literal escaped abbreviation into the pattern template
      const termSearch = pattern.replace('TERM', abbrEscaped);

      if (!searchList[abbr]) {
        searchList[abbr] = [];
      }

      // Primary (exact) variant
      searchList[abbr].push({
        search: new RegExp(termSearch, 'mg'),
        explanation: abbreviationsData.items[abbr] || ''
      });

      // If the abbreviation contains whitespace, also add variants to match
      // condensed forms (no spaces) and flexible whitespace (\s*) between parts.
      if (/\s/.test(abbr)) {
        // condensed: remove spaces from the raw abbreviation and escape
        const abbrCondensedRaw = abbr.replace(/\s+/g, '');
        const abbrCondensedEscaped = escapeRegexLiteral(abbrCondensedRaw);
        const termSearchCondensed = pattern.replace('TERM', abbrCondensedEscaped);
        searchList[abbr].push({
          search: new RegExp(termSearchCondensed, 'mg'),
          explanation: abbreviationsData.items[abbr],
        });

        // flexible: allow arbitrary (including none) whitespace between parts
        // we replace runs of whitespace in the escaped abbreviation with a '\\s*' fragment
        const flexibleFragment = escapeRegexLiteral(abbr).replace(/\s+/g, '\\\\s*');
        const termSearchFlexible = pattern.replace('TERM', flexibleFragment);
        searchList[abbr].push({
          search: new RegExp(termSearchFlexible, 'mg'),
          explanation: abbreviationsData.items[abbr],
        });
      }
    }
  }

  return searchList;
}

function processAbbreviations(text: string, abbreviationsData: AbbreviationSet | null): string {
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
): { definition: string; inlineSections: Record<string, InlineTibetanSection> } {
  if (!wylieConverter) {
    return { definition, inlineSections: {} };
  }

  const inlineSections: Record<string, InlineTibetanSection> = {};
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
      ? getWylieConverter().wylieToUni(chunkContents)
      : chunkContents;

    const lookup = getWylieConverter().normalizeWylieWhitespace(chunkContents);

    const sectionId = 'tibSection' + sectionBase + '_' + i;
    const title = chunk.replace(/\n/g, ' ');

    out = out.replace(/\n/g, '<br />');
    out = out.replace(/\\n/g, '<br />');
    out = out.replace(/([()]|&gt;|&lt;)/g, '<span class="paren">$1</span>');

    const escapedTitle = htmlEscapeTitle(title);

    // Always register the section so the backend can check if it's a real entry.
    // Keyed by sectionId (what PHP iterates over) with wylie as a sub-field.
    inlineSections[sectionId] = {
      id: sectionId,
      wylie: lookup,
      content: out,
      title: escapedTitle,
    };

    // Emit a plain span — DefinitionView will add .link + data-wylie after
    // the backend confirms this Wylie term has a dictionary entry
    modifiedDefinition = modifiedDefinition.replace(
      chunk,
      `<span id="${sectionId}" class="tib inlineTib" title="${escapedTitle}">${out}</span>`
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

function addAudioLinks(definition: string, currentDict: DictEntry): string {
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
 * @param definition - Raw definition text
 * @param term - The term being looked up
 * @param useUnicodeTibetan - Whether to render Tibetan Unicode
 * @param currentDict - Dictionary configuration object
 * @param abbreviationsData - Abbreviations for this dictionary
 * @param onOpenScan - Callback signature: (scanId, term, pageInfo) => void
 * @returns formatted HTML for this definition and any inline Tibetan sections found for potential linking
 */
export function formatDefinition(
  definition: string,
  term: string,
  useUnicodeTibetan: boolean,
  currentDict: DictEntry,
  abbreviationsData: AbbreviationSet | null,
  onOpenScan?: OnOpenScanCallback
): FormattedDefinition {
  let defStart = "";
  let defEnd = "";
  let inlineSections = {};

  if (currentDict.mergeLines) {
    definition = definition.replace(/\n/gm, '; ');
    definition = definition.replace(/\\n/gm, '; ');
  }
  if (!currentDict.preformattedLinebreaks) {
    definition = breakDefinitionIntoSections(definition);
  }
  if (currentDict.containsOnlyTibetan) {
    // FIXME: split at various characters such as before and after: / whitespace * ( ) .   

    defStart = '<div class="tib" title="' + htmlEscapeTitle(definition) + '">';
    if (definition.indexOf("-----") !== -1) {
      // ensure that separator lines are working also in Tibetan-only dictionaries
      definition = definition.replace("-----", "}\n-----\n{");
      definition = "{" + definition + "}";
      let skt = getSanskritConverter().sktToUni(htmlEscapeDefinition(definition));
      var result = convertInlineTibetanSections(skt, useUnicodeTibetan);
      definition = result.definition;
      inlineSections = result.inlineSections;
    } else {
      var tibetanOutput = useUnicodeTibetan
        ? wylieConverter?.wylieToUniExceptBracketedSections(definition) || ''
        : definition;
      definition = htmlEscapeDefinition(tibetanOutput);
    }
    defEnd = '</div>';
  } else if (currentDict.containsOnlySkt) {
    defStart = '<div class="skt" title="' + htmlEscapeTitle(definition) + '">';
    var result = convertInlineTibetanSections(getSanskritConverter().sktToUni(htmlEscapeDefinition(definition)), useUnicodeTibetan);
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

      if (definition !== '') {
        definition += '<div class="separator"></div>';
      }

      if (definitionParts.length > 1) {
        var adjust = currentDict?.scanInfo?.display_pageadjust || 0;
        var adjustedPage = pageNr + adjust;
        pageTxt = ' (p. ' + adjustedPage + ')';
      }

      // Emit an anchor with data attributes. The caller (DefinitionView)
      // should attach a click handler that calls the provided `onOpenScan`
      // callback with (scanId, term, pageInfo).
      definition += '<div><a'
        + ' class="scan-link link"'
        + ' href="#"'
        + ' data-scan-dict="' + htmlEscapeScriptAttr(currentDict.scanId) + '"'
        + ' data-scan-term="' + htmlEscapeScriptAttr(term) + '"'
        + ' data-scan-pages=\'' + htmlEscapeScriptAttr(JSON.stringify(pageInfo)) + '\''
        + '>' + currentDict.linkText + pageTxt + '</a></div>';
    }

  } else {
    var result = convertInlineTibetanSections(htmlEscapeDefinition(definition), useUnicodeTibetan);
    definition = result.definition;
    inlineSections = result.inlineSections;
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

  var tooltipStart = "", tooltipEnd = "";
  if (currentDict.about) {
    tooltipStart = '<span class="tooltip" title="' + currentDict.about + '">';
    tooltipEnd = '</span>';
  }

  var formattedDefinition = '<tr><td class="dictName">' + tooltipStart + currentDict.label + tooltipEnd + '</td><td class="definition">' + definition + '</td></tr>';
  return { html: formattedDefinition, inlineSections };

}

// ─── Full definition list formatting ─────────────────────────────

/**
 * Format all definitions for a term into an HTML table.
 *
 * @param dictionaries - Map of dictId → dictionary config (in display order)
 * @param dictEntries - Map of dictName → raw definition text
 * @param term - The term being looked up
 * @param lang - Language ('tib' or 'en')
 * @param useUnicodeTibetan - Whether Unicode output is active
 * @param abbreviations - Global abbreviations data
 * @param onOpenScan - Callback when a scanned page link is clicked
 * @returns the generated html code and a map of inline Tibetan sections for potential linking
 */
export function formatDefinitionList(
  dictionaries: DictListType,
  dictEntries: Record<string, string>,
  term: string,
  lang: string,
  useUnicodeTibetan: boolean,
  abbreviations: AbbreviationsType,
  onOpenScan?: OnOpenScanCallback
): FormattedDefinitionList {
  const allInlineSections: Record<string, InlineTibetanSection> = {};

  // Render heading
  let termDisplay: string;
  if (lang === 'en') {
    termDisplay = term;
  } else {
    termDisplay = useUnicodeTibetan ? getWylieConverter().wylieToUni(term) : term;
  }

  let tableHtml =
    `<h1 class="definitionHead definitionHead${lang}" title="${htmlEscapeTitle(term)}">${termDisplay}</h1>` +
    '<table id="definitionList">';

  for (const dictName in dictionaries) {
    if (dictEntries.hasOwnProperty(dictName)) {
      const currentDict = dictionaries[dictName];
      const definition = dictEntries[dictName];

      const abbreviationsData = currentDict.abbreviations ? abbreviations[currentDict.abbreviations] || null : null;

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
