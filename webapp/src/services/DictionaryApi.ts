import { Language } from '@/types';
import { CordovaDictionaryApi } from './CordovaDictionaryApi';
import { PhpDictionaryApi } from './PhpDictionaryApi';

export interface ReadTermResult {
  term: string;
  definitions: Record<string, string>;
}

export interface InlineSection {
  id: string;
  wylie: string;
  content: string;
  title: string;
}

/** A single row returned by the term-list (prefix search) API. */
export interface TermListRow {
  term: string;
}

/** A single result row from fulltext search. */
export interface FtsSearchResult {
  term: string;
  highlightedTerm: string;
  dictionary: string;
  dictionaryId: number;
  snippet: string;
  definition: string;
  /** The language of the headword. */
  lang: Language;
  /** true when the snippet is only a portion of the full definition. */
  isSnippetAbbreviated: boolean;
}

// The backend is chosen dynamically depending on whether we are running inside
// Cordova (Android) or in a regular browser.
let isCordova = (window as any).cordova !== undefined;
console.log(`Creating backend: ${isCordova ? 'CordovaDictionaryApi' : 'PhpDictionaryApi'}`);
const backend = isCordova
  ? new CordovaDictionaryApi()
  : new PhpDictionaryApi();


/**
 * Read definitions for a specific term.
 * @param {string} term - The term to look up (Wylie for Tibetan)
 * @param {string} lang - Language code ('tib' or 'en')
 * @param {string[]} dictionaries - Dictionary IDs to search
 * @returns {Promise<ReadTermResult>}
 */
export async function readTerm(
  term: string,
  lang: Language,
  dictionaries: string[]
): Promise<ReadTermResult> {
  return backend.readTerm(term, lang, dictionaries);
}

/**
 * Search for terms matching the input text.
 * @param {string} search - The search string
 * @param {string} lang - Language code ('tib' or 'en')
 * @param {number} offset - Pagination offset
 * @param {number} maxResults - Maximum number of results
 * @param {string[]} dictionaries - Dictionary IDs to search
 * @returns {Promise<TermListRow[]>} Array of matching term objects
 */
export async function readTermList(
  search: string,
  lang: Language,
  offset: number,
  maxResults: number,
  dictionaries: string[],
  signal?: AbortSignal
): Promise<TermListRow[]> {
  return backend.readTermList(search, lang, offset, maxResults, dictionaries, signal);
}

/**
 * Initialize the selected backend.
 *
 * For Cordova this is used to validate that the SQLite database is accessible.
 * For the PHP backend this is a no-op.
 */
export async function initDB(): Promise<void> {
  if (typeof backend.initDB === 'function') {
    return backend.initDB();
  }
  return;
}

/**
 * Check which Tibetan sections (syllables within a definition) have
 * their own dictionary entries, so they can be rendered as clickable links.
 *
 * Sends only the wylie terms to the backend; the returned filtered map
 * is reconstructed client-side from the original sections.
 *
 * @param {Object} sections - Map of sectionId → InlineSection
 * @returns {Promise<Record<string, InlineSection>>} Map of sections that have entries
 */
export async function checkTibetanSectionsForLinks(
  sections: Record<string, InlineSection>
): Promise<Record<string, InlineSection>> {
  return backend.checkTibetanSectionsForLinks(sections) as Promise<
    Record<string, InlineSection>
  >;
}

/**
 * FTS5-based fulltext search across definitions and/or terms.
 * @param query    – space-separated keywords (AND-ed by FTS5)
 * @param lang     – 'tib' or 'en'
 * @param offset   – pagination offset
 * @param maxResults – page size
 * @param dictionaries – active dictionary IDs
 */
export async function fulltextSearch(
  query: string,
  lang: Language,
  offset: number,
  maxResults: number,
  dictionaries: string[],
  signal?: AbortSignal
): Promise<FtsSearchResult[]> {
  return backend.fulltextSearch(query, lang, offset, maxResults, dictionaries, signal);
}
