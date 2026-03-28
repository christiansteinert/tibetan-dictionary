<?php
// =============================================================================
// Snippet generation for search result excerpts
// =============================================================================
// Used by the fulltextSearch endpoint in api.php.
//
// Provides:
//   - generateSnippet()          Main entry point: extract & highlight a snippet
//   - fulltextQueryToRegex()     Convert an FTS5 query to a highlight regex
//   - buildSnippetRows()         Turn a DB result set into JSON-ready rows with snippets
// =============================================================================

// Maximum number of characters shown on each side of a match in a snippet
define('SNIPPET_CONTEXT_CHARS', 80);


// --- Public API --------------------------------------------------------------

/**
 * Convert an FTS5 fulltext query string into a regex that matches any of the
 * individual search words or quoted phrases.
 *
 * FTS5 operators (AND, OR, NOT, NEAR) and column filters (e.g. "term:") are
 * silently dropped.  Longer phrases are tried first so that a quoted phrase
 * takes priority over its individual words.
 */
function fulltextQueryToRegex($query) {
    $phrases = [];

    // Extract quoted phrases
    if (preg_match_all('/"([^"]+)"/', $query, $qm)) {
        foreach ($qm[1] as $phrase) {
            $phrases[] = preg_quote(trim($phrase), '/');
        }
    }

    // Remaining words (strip quotes, FTS5 operators, column filters)
    $remaining = preg_replace('/"[^"]*"/', '', $query);
    $remaining = preg_replace('/\b(AND|OR|NOT|NEAR)\b/i', '', $remaining);
    foreach (preg_split('/\s+/', trim($remaining), -1, PREG_SPLIT_NO_EMPTY) as $word) {
        if (preg_match('/^\w+:$/', $word)) continue;   // column filter
        $phrases[] = preg_quote($word, '/');
    }

    if (empty($phrases)) {
        return '/()/iu';  // fallback — will show text start
    }

    // Prefer longer matches
    usort($phrases, function ($a, $b) { return mb_strlen($b) - mb_strlen($a); });
    return '/(' . implode('|', $phrases) . ')/iu';
}

/**
 * Iterate over a SQLite result set and build an array of rows, each with a
 * generated snippet.  The result set must contain the columns: term,
 * definition, dictionary, dictionaryId.
 *
 * @param SQLite3Result $results       The executed query result.
 * @param string        $snippetRegex  Regex for highlighting (from fulltextQueryToRegex).
 * @return array  JSON-ready rows with keys: term, dictionary, dictionaryId, snippet.
 */
function buildSnippetRows($results, $snippetRegex) {
    $rows = [];
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
      # // "both" — prefer definition snippet when the definition matches
        if (preg_match($snippetRegex, $row['definition'])) {
            $snippet = generateSnippet($row['definition'], $snippetRegex);
        } else {
            $snippet = generateSnippet($row['term'], $snippetRegex);
        }

        $rows[] = [
            'term'            => $row['term'],
            'highlightedTerm' => highlightTerm($row['term'], $snippetRegex),
            'dictionary'      => $row['dictionary'],
            'dictionaryId'    => $row['dictionaryId'],
            'snippet'         => $snippet,
            'definition'      => $row['definition'], 
        ];
    }
    return $rows;
}

/**
 * Generate a short text snippet around the first match of $regexPattern inside
 * $haystack, with the matched portion wrapped in <em>…</em>.
 *
 * Guarantees:
 *  - The snippet never breaks in the middle of a word.
 *  - Tibetan text enclosed in {curly braces} is never left with unmatched
 *    braces (a leading/trailing brace is added when needed).
 */
function generateSnippet($haystack, $regexPattern) {
    if (!preg_match($regexPattern, $haystack, $matches, PREG_OFFSET_CAPTURE)) {
        return snippetFallback($haystack);
    }

    $haystack = preg_replace('/\[sound:[^\]]*\]/', "", $haystack);  // Remove embedded audio tags
    $haystack = preg_replace('/-----/', ' ', $haystack);            // Remove separator lines

    $matchText   = $matches[1][0];
    $matchOffset = $matches[1][1];

    // Convert byte offset → character offset
    $charOffset = mb_strlen(substr($haystack, 0, $matchOffset));

    $extracted = extractSnippetText($haystack, $charOffset, mb_strlen($matchText), SNIPPET_CONTEXT_CHARS);
    $excerpt   = $extracted['text'];
    $isAtStart = $extracted['isAtStart'];
    $isAtEnd   = $extracted['isAtEnd'];

    $excerpt = ensureBalancedBraces($excerpt, $isAtStart, $isAtEnd, $haystack);
    $excerpt = preg_replace_callback($regexPattern, function ($m) use ($excerpt) {
        // Determine whether this match is inside a {…} block
        $matchPos = mb_strpos($excerpt, $m[0]);
        $insideBraces = false;
        if ($matchPos !== false) {
            $depth = 0;
            for ($i = 0; $i < $matchPos; $i++) {
                $ch = mb_substr($excerpt, $i, 1);
                if ($ch === '{') $depth++;
                else if ($ch === '}') $depth--;
            }
            $insideBraces = ($depth > 0);
        }

        $result = $m[1];
        if ($insideBraces) {
          // Close the Tibetan block before <em>, reopen it inside, close inside, reopen after.
          // Then strip any empty {}-fragments left at the edges.
          //
          // Special case: if the match is at the very start of the excerpt (matchPos === 0
          // inside a brace block that opened before the excerpt), there is no leading text
          // to close before the <em>, so we omit the dangling '}'.
          if ($matchPos === 0) {
            return '<em>{' . $result . '}</em>' . '{';
          } else {
            return '}' . '<em>{' . $result . '}</em>' . '{';
          }
        } else {
          return '<em>' . $result . '</em>';
        }
    }, $excerpt, 1);


    $excerpt = preg_replace('/\{\s*\}/', '', $excerpt);   // remove empty {} pairs
    $excerpt = preg_replace('/^\s*\}/', '', $excerpt);    // remove leading stray }
    $excerpt = preg_replace('/\{\s*$/', '', $excerpt);    // remove trailing stray {
    $excerpt = preg_replace('/\\\\n/', ' ', $excerpt);   // remove newlines
    
    return ($isAtStart ? '' : '…') . $excerpt . ($isAtEnd ? '' : '…');
}


// --- Internal helpers --------------------------------------------------------

/**
 * Highlight matching words in a term by wrapping them in <em>…</em>.
 *
 * Unlike snippet generation this doesn't need brace handling — terms are
 * plain Wylie text.  All occurrences of the pattern are highlighted.
 *
 * @param string $term          The raw term text.
 * @param string $regexPattern  Highlight regex (from fulltextQueryToRegex).
 * @return string  The term with matched portions wrapped in <em>.
 */
function highlightTerm($term, $regexPattern) {
    return preg_replace($regexPattern, '<em>$1</em>', $term);
}

/**
 * Fallback when the regex doesn't match: return the beginning of the text,
 * word-aligned and brace-balanced.
 */
function snippetFallback($haystack) {
    $extracted = extractSnippetText($haystack, 0, 0, SNIPPET_CONTEXT_CHARS * 2);
    $isAtEnd   = $extracted['isAtEnd'];
    $preview   = ensureBalancedBraces($extracted['text'], true, $isAtEnd, $haystack);

    if (!$isAtEnd) {
        $preview .= '…';
    }
    return $preview;
}

/**
 * Extract a word-boundary-aligned snippet of $fullText centred on a match.
 *
 * @param string $fullText     The full source text.
 * @param int    $charOffset   Character offset of the match start.
 * @param int    $matchLength  Character length of the match.
 * @param int    $contextChars Number of context characters to include on each side.
 * @return array{text: string, isAtStart: bool, isAtEnd: bool}
 */
function extractSnippetText($fullText, $charOffset, $matchLength, $contextChars) {
    $totalChars = mb_strlen($fullText);
    $contextStart = max(0, $charOffset - $contextChars);
    $contextEnd   = min($totalChars, $charOffset + $matchLength + $contextChars);

    // --- start boundary: advance past a partial word ---
    if ($contextStart > 0
        && mb_substr($fullText, $contextStart - 1, 1) !== ' '
        && mb_substr($fullText, $contextStart, 1)     !== ' '
    ) {
        $spacePos = mb_strpos($fullText, ' ', $contextStart);
        if ($spacePos !== false && $spacePos < $contextEnd) {
            $contextStart = $spacePos + 1;
        }
    }

    // --- end boundary: extend to end of partial word ---
    if ($contextEnd < $totalChars && mb_substr($fullText, $contextEnd, 1) !== ' ') {
        $spacePos = mb_strpos($fullText, ' ', $contextEnd);
        $contextEnd = ($spacePos !== false) ? $spacePos : $totalChars;
    }

    return [
        'text'      => mb_substr($fullText, $contextStart, $contextEnd - $contextStart),
        'isAtStart' => ($contextStart === 0),
        'isAtEnd'   => ($contextEnd >= $totalChars),
    ];
}

/**
 * Ensure Tibetan {curly brace} blocks are not left with unmatched braces.
 *
 * Handles three cases:
 *  1. Snippet contains a stray closing }  → prepend {
 *  2. Snippet contains a stray opening {  → append }
 *  3. Snippet has no braces at all but sits inside a {…} block in
 *     $fullText                            → wrap with { … }
 */
function ensureBalancedBraces($snippet, $isAtTextStart, $isAtTextEnd, $fullText = null) {
    if ($isAtTextStart && $isAtTextEnd) {
        return $snippet;
    }

    // Scan for brace imbalance within the snippet
    $depth    = 0;
    $minDepth = 0;
    $len = mb_strlen($snippet);
    for ($i = 0; $i < $len; $i++) {
        $ch = mb_substr($snippet, $i, 1);
        if ($ch === '{') {
            $depth++;
        } else if ($ch === '}') {
            $depth--;
            if ($depth < $minDepth) $minDepth = $depth;
        }
    }

    // There is no imbalance inside the snippet — check whether the whole snippet
    // is located inside a larger brace block in the original full text.
    // If so, then we need to wrap the excerpt in braces to avoid showing raw Wylie
    if ($depth === 0 && $minDepth === 0 && $fullText !== null) {
        if (mb_strlen($snippet) > 0) {
            $pos = mb_strpos($fullText, $snippet);
            if ($pos !== false) {
                $braceDepth = 0;
                for ($i = 0; $i < $pos; $i++) {
                    $ch = mb_substr($fullText, $i, 1);
                    if ($ch === '{') $braceDepth++;
                    else if ($ch === '}') $braceDepth--;
                }
                if ($braceDepth > 0 && !$isAtTextStart) {
                    $depth    += $braceDepth;
                    $minDepth  = -$braceDepth;
                }
            }
        }
    }

    // Apply fixes
    if ($minDepth < 0 && !$isAtTextStart) {
        $snippet = '{' . $snippet;
        $depth++;
    }
    if ($depth > 0 && !$isAtTextEnd) {
        $snippet .= '}';
    }

    return $snippet;
}
