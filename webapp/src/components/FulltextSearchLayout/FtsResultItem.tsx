/**
 * FtsResultItem – a single row in the full-text search result table.
 *
 * Displays: term (clickable link → normal search), dictionary name (with
 * tooltip showing dictionary about info), and snippet with highlights.
 *
 * Handles Wylie→Unicode conversion for:
 * - The term column (if Tibetan + Unicode mode)
 * - Curly-brace sections {…} inside snippets
 */
import { memo, useEffect, useRef } from 'react';
import { WylieConverter } from '@/utils/wylieConverter';
import { DICTLIST } from '@/config/dictlist';
import { bindTooltips } from '@/utils/tooltip';
import type { FTSSearchResult } from '@/store/searchSlice';
import styles from './FulltextSearch.module.css';
import { Language } from '@/types';
import { formatDefinition } from '@/utils/definitionFormatter';
import * as Collapsible from '@radix-ui/react-collapsible';

const wylieConverter = new WylieConverter();

interface Props {
  result: FTSSearchResult;
  lang: Language;
  useUnicodeTibetan: boolean;
  isExpanded: boolean;
  onTermClick: (term: string, lang: Language) => void;
}

/**
 * Convert {wylie} sections inside an HTML snippet to Unicode Tibetan.
 * Preserves existing HTML tags (e.g. <b> highlights from the backend).
 *
 * Strategy: process the plain-text portions only (not inside HTML tags).
 * Within those plain-text portions, find {…} blocks and convert them.
 */
function convertCurlyBraceSections(snippetHtml: string): string {
  // Split on HTML tags to avoid touching content inside tags
  const parts = snippetHtml.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i++) {
    // Only process non-tag parts
    if (!parts[i].startsWith('<')) {
      parts[i] = parts[i].replace(/\{([^{}]+)\}/g, (_match, wylie: string) => {
        const unicode = "<span class='tib inlineTib'>" + wylieConverter.wylieToUni(wylie.trim()) + "</span>";
        return unicode;
      });
    }
  }
  return parts.join('');
}


function handleHighlightedSectionsForTibOnly(definition: string): string {
  // For Tibetan-only dictionaries we need to wrap Tibetan sections ourselves in curly braces and interrupt this 
  // for the <em> / </em> tags used for highlighting because the backend does understand that such dictionaries contain wylie
  let adjustedDef = '{' + definition.replace(/<em>/g, "}<em>{").replace(/<\/em>/g, "}</em>{") + '}';
  adjustedDef = adjustedDef.replace(/\{\}/g, '');
  return adjustedDef;
}

const FtsResultItem = memo(function FtsResultItem({
  result,
  lang,
  useUnicodeTibetan,
  isExpanded,
  onTermClick,
}: Props) {
  const dictCellRef = useRef<HTMLTableCellElement>(null);

  // Display term: handle <em>/</em> highlights inside Tibetan correctly
  let highlightedTerm = result.highlightedTerm;
  if (lang === 'tib' && useUnicodeTibetan) {
    highlightedTerm = handleHighlightedSectionsForTibOnly(highlightedTerm);
    highlightedTerm = convertCurlyBraceSections(highlightedTerm);
  } else {
    highlightedTerm = result.term
  }

  // Dictionary label and about info for tooltip
  const dictEntry = DICTLIST[result.dictionary];
  const dictLabel = dictEntry?.label || result.dictionary;
  const dictAbout = dictEntry?.about || '';


  // Process snippet: convert {curly brace} sections if in Unicode mode
  let snippet = result.snippet;
  if (dictEntry.containsOnlyTibetan && lang === 'tib' && useUnicodeTibetan) {
    snippet = handleHighlightedSectionsForTibOnly(result.snippet)
  }


  const snippetHtml =
    useUnicodeTibetan
      ? convertCurlyBraceSections(snippet)
      : snippet;

  // Bind tooltip system to the dictionary name cell
  useEffect(() => {
    const el = dictCellRef.current;
    if (!el) return;
    return bindTooltips(el);
  }, [dictLabel]);

  const isTib = lang === 'tib' && useUnicodeTibetan;

  let definition = result.definition || '';

  let formattedDefinition = '';
  if (dictEntry.scanId) {
    // scanned dictionaries have no definition text, skiup showing definition here
    formattedDefinition = '';
  } else {
    formattedDefinition = formatDefinition(
      definition,
      "",
      useUnicodeTibetan,
      dictEntry,
      null,
      () => { }
    )?.html || '';
  }

  return (
    <tr>
      <td className={styles.colTerm}>
        <a
          href="#"
          className={isTib ? styles.tibTerm : ''}
          onClick={(e) => {
            e.preventDefault();
            onTermClick(result.term, lang);
          }}
          dangerouslySetInnerHTML={{ __html: highlightedTerm }} 
        />
      </td>
      <td className={styles.colDict} ref={dictCellRef}>
        <span
          className={`tooltip ${styles.dictNameTooltip}`}
          title={dictAbout}
          dangerouslySetInnerHTML={{ __html: dictLabel}}
        />
      </td>
      <td
        className={[
          styles.colSnippet,
          isTib ? styles.tibSnippet : '',
        ].join(' ')}
      >

        <Collapsible.Root className={styles.collapsible}>
          <Collapsible.Trigger className={styles.collapsibleTrigger}>
            <span className={styles.collapsibleArrow} aria-hidden="true" />
            <div dangerouslySetInnerHTML={{ __html: snippetHtml }} />
          </Collapsible.Trigger>

          <Collapsible.Content className={styles.collapsibleContent}>
            <div className={styles.colDefinition} dangerouslySetInnerHTML={{ __html: formattedDefinition }} />
          </Collapsible.Content>
        </Collapsible.Root>

      </td>
    </tr>
  );
});

export default FtsResultItem;
