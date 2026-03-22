/**
 * ExtendedResultItem – a single row in the extended search result table.
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
import styles from './ExtendedSearch.module.css';
import { Language } from '@/types';
import { formatDefinition } from '@/utils/definitionFormatter';

const wylieConverter = new WylieConverter();

interface Props {
  result: FTSSearchResult;
  lang: Language;
  useUnicodeTibetan: boolean;
  onTermClick: (term: string, lang: Language) => void;
}

/**
 * Convert {wylie} sections inside an HTML snippet to Unicode Tibetan.
 * Preserves existing HTML tags (e.g. <b> highlights from the backend).
 *
 * Strategy: process the plain-text portions only (not inside HTML tags).
 * Within those plain-text portions, find {…} blocks and convert them.
 */
function convertSnippetCurlyBraces(snippetHtml: string): string {
  // Split on HTML tags to avoid touching content inside tags
  const parts = snippetHtml.split(/(<[^>]*>)/);
  for (let i = 0; i < parts.length; i++) {
    // Only process non-tag parts
    if (!parts[i].startsWith('<')) {
      parts[i] = parts[i].replace(/\{([^{}]+)\}/g, (_match, wylie: string) => {
        const unicode = wylieConverter.wylieToUni(wylie.trim());
        return unicode;
      });
    }
  }
  return parts.join('');
}

const ExtendedResultItem = memo(function ExtendedResultItem({
  result,
  lang,
  useUnicodeTibetan,
  onTermClick,
}: Props) {
  const dictCellRef = useRef<HTMLTableCellElement>(null);

  // Display term: convert Wylie → Unicode if applicable
  const displayTerm =
    lang === 'tib' && useUnicodeTibetan
      ? wylieConverter.wylieToUni(result.term)
      : result.term;

  // Dictionary label and about info for tooltip
  const dictEntry = DICTLIST[result.dictionary];
  const dictLabel = dictEntry?.label || result.dictionary;
  const dictAbout = dictEntry?.about || '';

  formatDefinition(
    result.snippet,
    "",
    useUnicodeTibetan,
    dictEntry,
    null,
    () => {}
  );

  // Process snippet: convert {curly brace} sections if in Unicode mode
  const snippetHtml =
    useUnicodeTibetan
      ? convertSnippetCurlyBraces(result.snippet)
      : result.snippet;

  // Bind tooltip system to the dictionary name cell
  useEffect(() => {
    const el = dictCellRef.current;
    if (!el) return;
    return bindTooltips(el);
  }, [dictLabel]);

  const isTib = lang === 'tib' && useUnicodeTibetan;

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
        >
          {displayTerm}
        </a>
      </td>
      <td className={styles.colDict} ref={dictCellRef}>
        <span
          className={`tooltip ${styles.dictNameTooltip}`}
          title={dictAbout}
        >
          {dictLabel}
        </span>
      </td>
      <td
        className={[
          styles.colSnippet,
          isTib ? styles.tibSnippet : '',
        ].join(' ')}
        dangerouslySetInnerHTML={{ __html: snippetHtml }}
      />
    </tr>
  );
});

export default ExtendedResultItem;
