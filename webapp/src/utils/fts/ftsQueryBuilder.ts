/**
 * ftsQueryBuilder – translates user-facing FTS queries into SQLite FTS5 syntax.
 *
 * User operators:
 *   &   → AND
 *   |   → OR
 *   !   → NOT
 *   *   → suffix/prefix search (trailing wildcard)
 *
 * Plain text segments are wrapped in "quotes".
 * Words preceding a trailing * are joined with + (FTS5 phrase proximity)
 * so that  `buddha dharm*`  becomes  `buddha+dharm*`.
 */

/** Operator tokens recognised in user input. */
const OPERATOR_RE = /[&|!]/;

/** Split input into alternating text-segments and operator tokens. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  for (const ch of input) {
    if (OPERATOR_RE.test(ch)) {
      if (buf) tokens.push(buf);
      tokens.push(ch);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

const OP_MAP: Record<string, string> = { '&': 'AND', '|': 'OR', '!': 'NOT' };

/** Wrap a plain text segment for FTS5: quoted or joined with + when it contains *. */
function wrapSegment(seg: string): string {
  const trimmed = seg.trim();
  if (!trimmed) return '';

  if (trimmed.includes('*')) {
    // Join all words with + so FTS5 treats them as an adjacent phrase with a trailing wildcard
    return trimmed.split(/\s+/).filter(Boolean).join('+');
  }
  return `"${trimmed}"`;
}

/**
 * Convert a user-facing query string into FTS5 MATCH syntax.
 *
 * @example
 * buildFtsQuery('buddha dharma & sangha')   // → '"buddha dharma" AND "sangha"'
 * buildFtsQuery('buddha dharm* | sangha')   // → 'buddha+dharm* OR "sangha"'
 * buildFtsQuery('! samsara')                // → 'NOT "samsara"'
 */
export function buildFtsQuery(input: string): string {
  const tokens = tokenize(input);
  const parts: string[] = [];

  for (const tok of tokens) {
    if (OP_MAP[tok]) {
      parts.push(OP_MAP[tok]);
    } else {
      const wrapped = wrapSegment(tok);
      if (wrapped) parts.push(wrapped);
    }
  }
  let query = parts.join(' ');
  
  // Final cleanup: remove redundant operators 
  // (e.g. from input like "buddha & | sangha" or "buddha ! ! samsara" or "buddha & ")
  query = query.replace(/\b(AND|OR|NOT)(\s+(AND|OR|NOT))+\b/g, '$1');
  query = query.replace(/\s*\b(AND|OR|NOT)\b\s*$/g, '');

  return query;
}
