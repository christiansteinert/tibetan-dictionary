/**
 * Dictionary API service
 * 
 * Handles all communication with the dict.php backend via fetch().
 * For Cordova (Android), a separate CordovaApi implementation
 * would use the SQLite plugin directly.
 */

/**
 * Serialize an object to URL-encoded form data (for POST body).
 * Handles nested objects and arrays.
 * @param {Object} obj - The object to serialize
 * @param {string} [prefix] - Prefix for nested keys
 * @returns {string} URL-encoded string
 */
function serialize(obj, prefix = '') {
  const params = [];
  for (const [key, value] of Object.entries(obj)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      for (const item of value) {
        params.push(
          encodeURIComponent(paramKey + '[]') + '=' + encodeURIComponent(item)
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      params.push(serialize(value, paramKey));
    } else {
      params.push(
        encodeURIComponent(paramKey) + '=' + encodeURIComponent(value)
      );
    }
  }
  return params.join('&');
}

/**
 * Send a POST request to the dict.php backend.
 * @param {Object} data - The data to send
 * @returns {Promise<any>} Parsed JSON response
 */
async function post(data) {
  const body = serialize(data);
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

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Read definitions for a specific term.
 * @param {string} term - The term to look up (Wylie for Tibetan)
 * @param {string} lang - Language code ('tib' or 'en')
 * @param {string[]} dictionaries - Dictionary IDs to search
 * @returns {Promise<{term: string, definitions: Object}>}
 */
export async function readTerm(term, lang, dictionaries) {
  const data = await post({ term, lang, dictionaries });
  return { term, definitions: data };
}

/**
 * Search for terms matching the input text.
 * @param {string} search - The search string
 * @param {string} lang - Language code ('tib' or 'en')
 * @param {number} offset - Pagination offset
 * @param {number} maxResults - Maximum number of results
 * @param {string[]} dictionaries - Dictionary IDs to search
 * @returns {Promise<Array>} Array of matching terms (each item is [termString])
 */
export async function readTermList(search, lang, offset, maxResults, dictionaries) {
  return post({
    search,
    lang,
    offset,
    maxresults: maxResults,
    dictionaries,
  });
}

/**
 * Check which Tibetan sections (syllables within a definition) have
 * their own dictionary entries, so they can be rendered as clickable links.
 * @param {Object} sections - Map of sectionId → { wylie, ... }
 * @returns {Promise<Object>} Map of sections that have entries
 */
export async function checkTibetanSectionsForLinks(sections) {
  return post({ checkTerms: sections });
}
