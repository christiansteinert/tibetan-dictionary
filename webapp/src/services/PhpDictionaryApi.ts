import type { InlineSection } from '@/store/searchSlice';
import { FtsSearchResult } from './DictionaryApi';

/**
 * PHP REST backend for the Tibetan Dictionary app.
 *
 * All requests go to /api/<resource> with JSON bodies where applicable.
 *
 * The base path can be overridden by changing `API_BASE`, e.g. to `api.php`
 * for servers that do not have the clean /api/ rewrite rule configured.
 */

/**
 * Base path for all API requests.
 * - `'api'`     → clean URL style:  /api/term/bde+ba   (requires nginx rewrite)
 * - `'api.php'` → script path style: /api.php/term/bde+ba (works on any PHP server)
 */
export let API_BASE = 'backend/api';

/** Build a query string from a params object. Dictionary arrays are joined as comma-separated encoded strings. */
function buildQuery(params: Record<string, string | number | string[]>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      // Join array values with commas (each value is already URL-encoded)
      const encoded = value.map(v => encodeURIComponent(v)).join(',');
      if (encoded) {
        parts.push(`${encodeURIComponent(key)}=${encoded}`);
      }
    } else if (value !== '' && value !== 0) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}

async function getJson<T>(path: string, params: Record<string, string | number | string[]> = {}, signal?: AbortSignal): Promise<T> {
  const url = `${API_BASE}/${path}${buildQuery(params)}`;
  const response = await fetch(url, { method: 'GET', signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export class PhpDictionaryApi {
  async readTerm(term: string, lang: string, dictionaries: string[]) {
    const data = await getJson<Record<string, string>>(
      `term/${encodeURIComponent(term)}`,
      { lang, dictionaries },
    );
    return { term, definitions: data };
  }

  async readTermList(
    search: string,
    lang: string,
    offset: number,
    maxResults: number,
    dictionaries: string[],
    signal?: AbortSignal
  ) {
    return getJson<{ term: string }[]>('terms', {
      search,
      lang,
      offset,
      maxResults,
      dictionaries,
    }, signal);
  }

  async checkTibetanSectionsForLinks(
    sections: Record<string, InlineSection>
  ): Promise<Record<string, InlineSection>> {
    const request: Record<string, string> = Object.fromEntries(
      Object.entries(sections).map(([id, s]) => [id, s.wylie])
    );
    const matchingIds = await postJson<string[]>('check-terms', request);
    return Object.fromEntries(matchingIds.map(id => [id, sections[id]]));
  }

  async fulltextSearch(
    query: string,
    lang: string,
    offset: number,
    maxResults: number,
    dictionaries: string[],
    signal?: AbortSignal
  ) {
    return getJson<FtsSearchResult[]>('fulltext', {
      q: query,
      lang,
      offset,
      maxResults,
      dictionaries,
    }, signal);
  }

  /** Initialize the backend (no-op for PHP). */
  async initDB(): Promise<void> {
    return;
  }
}
