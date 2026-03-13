/**
 * Legacy URL redirect utility.
 *
 * The old app used URL hashes like:
 *   #{"activeTerm":"chos","lang":"tib","inputLang":"tib",...}
 *
 * This function detects those hashes and converts them to the new
 * React-Router-compatible format:
 *   #/search/tib/chos?offset=0&sidebar=false
 *
 * Call once at app startup before the router mounts.
 */
export function redirectLegacyHash() {
  const hash = window.location.hash;
  if (!hash || hash.length < 2) return;

  const raw = hash.substring(1); // remove leading '#'

  // Detect legacy JSON hashes
  let state;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith('{')) {
      state = JSON.parse(decoded);
    }
  } catch {
    // Not a JSON hash — nothing to redirect
    return;
  }

  if (!state) return;

  // Handle "settings" or "home" special cases
  if (raw === 'settings') return; // already a valid route
  if (raw === 'home' || raw === '') {
    window.location.replace('#/');
    return;
  }

  // Build new-style URL from legacy state
  const term = state.activeTerm || state.currentListTerm || '';
  const lang = state.inputLang || state.lang || 'tib';
  const offset = state.offset || 0;
  const sidebar =
    state.forceLeftSideVisible !== undefined
      ? state.forceLeftSideVisible
      : false;

  if (!term) {
    window.location.replace('#/');
    return;
  }

  const params = new URLSearchParams({
    offset: String(offset),
    sidebar: String(sidebar),
  });

  window.location.replace(`#/search/${lang}/${encodeURIComponent(term)}?${params}`);
}
