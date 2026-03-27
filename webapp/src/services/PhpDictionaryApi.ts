import type { InlineSection } from '@/store/searchSlice';
import { FtsSearchResult } from './DictionaryApi';

/**
 * PHP backend for the Tibetan Dictionary app.
 *
 * Uses the `dict.php` endpoint and POST form-encoded requests.
 */

function serialize(
  obj: Record<string, unknown>,
  prefix = ''
): string {
  const params: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.push(
          encodeURIComponent(paramKey + '[]') + '=' + encodeURIComponent(String(item))
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      params.push(serialize(value as Record<string, unknown>, paramKey));
    } else {
      params.push(
        encodeURIComponent(paramKey) + '=' + encodeURIComponent(String(value ?? ''))
      );
    }
  }
  return params.join('&');
}

async function post<T>(
  data: Record<string, unknown>
): Promise<T> {
  const body = serialize(data as Record<string, unknown>);
  const response = await fetch('dict.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export class PhpDictionaryApi {
  async readTerm(term: string, lang: string, dictionaries: string[]) {
    const data = await post<Record<string, string>>({ term, lang, dictionaries });
    return { term, definitions: data };
  }

  async readTermList(
    search: string,
    lang: string,
    offset: number,
    maxResults: number,
    dictionaries: string[]
  ) {
    return post<{ term: string }[]>({
      search,
      lang,
      offset,
      maxresults: maxResults,
      dictionaries,
    });
  }

  async checkTibetanSectionsForLinks(sections: Record<string, InlineSection>): Promise<Record<string, InlineSection>> {
    const termsToCheck = Object.fromEntries(
      Object.entries(sections).map(([id, { wylie }]) => [id, { id, wylie }])
    );

    return post({ checkTerms: termsToCheck });
  }

  async fulltextSearch(
    query: string,
    lang: string,
    offset: number,
    maxResults: number,
    dictionaries: string[]
  ) {
    return post<FtsSearchResult[]>({
      fulltextSearch: query,
      lang,
      offset,
      maxresults: maxResults,
      dictionaries,
    });
  }

  /**
   * Initialize the backend (no-op for PHP).
   */
  async initDB(): Promise<void> {
    return;
  }
}
