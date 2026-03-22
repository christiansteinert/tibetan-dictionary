import { encodeQueryParam } from '@/utils/escape';

/**
 * Legacy URL redirect utility.
 *
 * The old app used URL hashes like:
 *   #{"activeTerm":"chos","lang":"tib","inputLang":"tib","currentListTerm":"chos","forceLeftSideVisible":false,"offset":0}
 *
 * This function detects those hashes and converts them to the new
 * React-Router-compatible format:
 *   #/search/tib/chos?offset=0&sidebar=false&selected=TERM
 *
 * Call once at app startup before the router mounts.
 */
interface LegacyState {
  searchMode?: string;
  activeTerm?: string;
  currentListTerm?: string;
  lang?: string;
  inputLang?: string;
  forceLeftSideVisible?: boolean;
  definitionOnly?: boolean;
  offset?: number;
}

export function redirectLegacyHash(): void {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  const raw = hash.substring(1); // remove leading '#'

  // Handle special cases first
  if (raw === 'settings') return; // already a valid route
  if (raw === 'home' || raw === '') {
    window.location.replace('#/');
    return;
  }

  // Detect legacy JSON hashes
  let state: LegacyState;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('{')) {
      state = JSON.parse(decoded);
    } else {
      // Not a JSON hash — nothing to redirect
      return;
    }
  } catch(e) {
    console.error('Failed to parse legacy URL hash:', e);
    // Parsing failed — not a legacy hash
    return;
  }

  // Extract the search term:
  // - currentListTerm is the actual search,
  // - activeTerm is the currently-viewed definition (may be empty)
  const searchTerm = state.currentListTerm || state.activeTerm || '';

  if (!searchTerm || searchTerm.trim() === '') {
    // No term to search for — go to home
    window.location.replace('#/');
    return;
  }

  // Determine the language: use inputLang if available (what user is typing in),
  // otherwise fall back to lang (what the result is in)
  const lang = state.inputLang || state.lang || 'tib';

  // Determine sidebar visibility: forceLeftSideVisible from old state
  // true = sidebar visible (soft search), false = sidebar hidden (definition view)
  const sidebar = state.forceLeftSideVisible ?? false;

  // Offset for pagination
  const offset = state.offset || 0;

  // Build query parameters
  const params = new URLSearchParams({
    offset: String(offset),
    sidebar: String(sidebar),
  });

  // If both activeTerm and currentListTerm are set AND different, it means a specific
  // result was selected and is currently being viewed (while a different search was active)
  // — preserve that in the URL so the definition loads immediately on redirect
  if (
    state.activeTerm &&
    state.activeTerm.trim() &&
    state.currentListTerm &&
    state.currentListTerm.trim() &&
    state.activeTerm !== state.currentListTerm
  ) {
    params.set('selected', state.activeTerm);
  }

  if (state.definitionOnly) {
    params.set('definitionOnly', 'true');
  }

  window.location.replace(
    `#/search/${lang}/${encodeQueryParam(searchTerm)}?${params}`
  );
}
