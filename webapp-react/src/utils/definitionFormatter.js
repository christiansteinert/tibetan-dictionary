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
import { SanskritConverter } from './sanskritConverter.js';
import { WylieConverter } from './wylieConverter.js';

// Shared converter instances (initialized lazily)
let sanskritConverter = null;
let wylieConverter = null;
let sectionCounter = 0;

/**
 * Ensure shared converters are ready.
 * Called automatically by the public API; can also be called explicitly.
 */
export function initializeFormatters() {
  if (!sanskritConverter) sanskritConverter = new SanskritConverter();
  if (!wylieConverter) wylieConverter = new WylieConverter();
}

// ─── HTML escaping helpers ───────────────────────────────────────

function htmlEscape(text) {
  text = text.replace(/&/g, '&amp;');
  text = text.replace(/</g, '&lt;');
  text = text.replace(/>/g, '&gt;');
  text = text.replace(/"/g, '&quot;');
  return text;
}

function htmlEscapeTitle(title) {
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

function htmlEscapeScriptAttr(text) {
  text = htmlEscape(text);
  text = text.replace(/'/g, "\\'");
  return text;
}

function htmlEscapeDefinition(definition) {
  definition = htmlEscape(definition);
  definition = definition.replace(
    /(https?:\/\/)([-0-9a-zA-Z\/\.#%_:&;]+)/g,
    '<a target="_blank" rel="noopener noreferrer" href="$1$2">$2</a>'
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

function parseAbbreviations(abbreviationsData) {
  if (!abbreviationsData) return [];

  const searchPattern = typeof abbreviationsData.match === 'string'
    ? [abbreviationsData.match]
    : abbreviationsData.match;

  const searchList = {};

  for (const pattern of searchPattern) {
    for (const abbr in abbreviationsData.items) {
      const abbrEscaped = abbr.replace(/([\[\]\.\*\+\{\}])/g, '\\$1');
      const termSearch = pattern.replace('TERM', abbrEscaped);

      if (!searchList[abbr]) searchList[abbr] = [];

      searchList[abbr].push({
        search: new RegExp(termSearch, 'mg'),
        explanation: abbreviationsData.items[abbr],
      });

      // Also match version without spaces
      if (termSearch.indexOf(' ') > -1) {
        const abbrCondensed = abbrEscaped.replace(/ /g, '');
        const termSearch2 = pattern.replace('TERM', abbrCondensed);
        const abbrNoSpace = abbr.replace(/ /g, '');

        if (!searchList[abbrNoSpace]) searchList[abbrNoSpace] = [];

        searchList[abbrNoSpace].push({
          search: new RegExp(termSearch2, 'mg'),
          explanation: abbreviationsData.items[abbr],
        });
      }
    }
  }

  return searchList;
}

function processAbbreviations(text, abbreviationsData) {
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
          if (i++ > 10) break;
        }
      }
    }
    changed = t !== text;
  }
  return text;
}

// ─── Inline Tibetan section conversion ───────────────────────────

function convertInlineTibetanSections(definition, useUnicodeTibetan) {
  const inlineSections = {};
  const chunks = definition.match(/[{][^{}]+[}]/g);

  if (!chunks) return { definition, inlineSections };

  const sectionBase = sectionCounter++;

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

    if (
      !useUnicodeTibetan ||
      (/.*[a-z].*/.test(chunkContents) && !/^.*[a-zA-Z0-9].*$/.test(out))
    ) {
      const sectionId = 'tibSection' + sectionBase + '_' + i;
      const title = chunk.replace(/\n/g, ' ');

      out = out.replace(/\n/g, '<br />');
      out = out.replace(/\\n/g, '<br />');
      out = out.replace(/([()]|&gt;|&lt;)/g, '<span class="paren">$1</span>');

      definition = definition.replace(
        chunk,
        `<span id="${sectionId}" class="tib inlineTib" title="${htmlEscapeTitle(title)}">${out}</span>`
      );

      inlineSections[sectionId] = { wylie: lookup };
    }
  }

  return { definition, inlineSections };
}

// ─── Other definition helpers ────────────────────────────────────

function breakDefinitionIntoSections(definition) {
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

function addAudioLinks(definition, currentDict) {
  if (currentDict.audioId) {
    let replacement = '';
    if (!window.cordova) {
      const audioPath = 'audio/' + currentDict.audioId + '/';
      replacement = `<audio controls preload="none"><source src="${audioPath}$1" type="audio/mpeg"></audio>`;
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
  definition,
  term,
  useUnicodeTibetan,
  currentDict,
  abbreviationsData,
  onOpenScan
) {
  initializeFormatters();

  let defStart = '';
  let defEnd = '';
  let inlineSections = {};

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
      definition = definition.replace('-----', '}\n-----\n{');
      definition = '{' + definition + '}';
      const result = convertInlineTibetanSections(
        sanskritConverter.sktToUni(htmlEscapeDefinition(definition)),
        useUnicodeTibetan
      );
      definition = result.definition;
      inlineSections = result.inlineSections;
    } else {
      const tibetanOutput = useUnicodeTibetan
        ? wylieConverter.wylieToUniExceptBracketedSections(definition)
        : definition;
      definition = htmlEscapeDefinition(tibetanOutput);
    }
    defEnd = '</div>';
  } else if (currentDict.containsOnlySkt) {
    defStart = `<div class="skt" title="${htmlEscapeTitle(definition)}">`;
    const result = convertInlineTibetanSections(
      sanskritConverter.sktToUni(htmlEscapeDefinition(definition)),
      useUnicodeTibetan
    );
    definition = result.definition;
    inlineSections = result.inlineSections;
    defEnd = '</div>';
  } else if (currentDict.scanId) {
    const definitionParts = definition.split('-----');
    definition = '';
    for (let i = 0; i < definitionParts.length; i++) {
      const pageNr = Number(definitionParts[i].replace(/[^0-9]/g, ''));
      const offset = currentDict?.scanInfo?.offset || 0;
      const pageInfo = { term_page: pageNr + offset, ...currentDict.scanInfo };

      if (definition !== '') {
        definition += '<div class="separator"></div>';
      }

      let pageTxt = '';
      if (definitionParts.length > 1) {
        const adjust = currentDict?.scanInfo?.display_pageadjust || 0;
        pageTxt = ' (p. ' + (pageNr + adjust) + ')';
      }

      // Use data attributes so React can attach click handlers
      definition += `<div><a href="#" class="scan-link" data-scan-id="${htmlEscapeScriptAttr(currentDict.scanId)}" data-term="${htmlEscapeScriptAttr(term)}" data-page-info='${htmlEscapeScriptAttr(JSON.stringify(pageInfo))}'>${currentDict.linkText}${pageTxt}</a></div>`;
    }
  } else {
    const result = convertInlineTibetanSections(
      htmlEscapeDefinition(definition),
      useUnicodeTibetan
    );
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
  dictionaries,
  dictEntries,
  term,
  lang,
  useUnicodeTibetan,
  ABBREVIATIONS,
  onOpenScan
) {
  initializeFormatters();

  const allInlineSections = {};

  // Render heading
  let termDisplay;
  if (lang === 'en') {
    termDisplay = term;
  } else {
    termDisplay = useUnicodeTibetan ? wylieConverter.wylieToUni(term) : term;
  }

  let tableHtml =
    `<h1 class="definitionHead definitionHead${lang}" title="${htmlEscapeTitle(term)}">${termDisplay}</h1>` +
    '<table id="definitionList">';

  for (const dictName in dictionaries) {
    if (dictEntries.hasOwnProperty(dictName)) {
      const definition = dictEntries[dictName];
      const currentDict = dictionaries[dictName];
      const abbreviationsData = currentDict.abbreviations
        ? ABBREVIATIONS[currentDict.abbreviations]
        : null;

      const result = formatDefinition(
        definition,
        term,
        useUnicodeTibetan,
        currentDict,
        abbreviationsData,
        onOpenScan
      );

      tableHtml += result.html;
      Object.assign(allInlineSections, result.inlineSections);
    }
  }

  tableHtml += '</table>';
  return { tableHtml, allInlineSections };
}
