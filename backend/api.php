<?php
// =============================================================================
// Tibetan Dictionary — REST API
// =============================================================================
//
// Routes (dispatched via PATH_INFO or REQUEST_URI):
//
//   GET  /api/term/{lang}/{term}      Look up definitions for a specific term.
//   GET  /api/terms/{lang}/{term}     Prefix-based term search (auto-complete).
//   POST /api/check-terms/{lang}      Check which Tibetan sections have dictionary entries.
//   GET  /api/fulltext/{lang}/{query} FTS5-based fulltext search.
//
// All responses are JSON. Request bodies (where applicable) are JSON.
// =============================================================================

require_once __DIR__ . '/snippet.php';
ini_set('display_errors', 1); ini_set('display_startup_errors', 1); error_reporting(E_ALL);

// --- Helpers -----------------------------------------------------------------

/** Send a JSON response and exit. */
function jsonResponse($data, int $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Expires: ' . gmdate('D, d M Y H:i:s', strtotime('+1 hours')) . ' GMT');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

/** Send a JSON error response and exit. */
function errorResponse(string $message, int $status = 400) {
    jsonResponse(['error' => $message], $status);
}

/** Parse and return the decoded JSON request body, or abort with 400. */
function jsonBody() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        errorResponse('Request body is empty');
    }
    try {
        return json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        errorResponse('Invalid JSON: ' . $e->getMessage());
    }
}

/**
 * Clamp and sanitise an number-string and convert it to an integer value.
 */
function clampIntParam(?string $value, int $min, int $max, int $default = 0): int {
    if ($value === null || $value === '') return $default;
    $int = intval('0' + preg_replace('/[^0-9]/', '', (string) $value));
    return max($min, min($max, $int));
}

/**
 * Validate and return the list of dictionary names from the 'dictionaries'
 * query parameter. Expects a comma-separated string of URL-encoded names.
 * Returns an empty array when none are supplied.
 *
 * @return string[]
 */
function parseDictionaries(): array {
    if (!isset($_GET['dictionaries']) || $_GET['dictionaries'] === '') {
        return [];
    }
    $raw = trim((string) $_GET['dictionaries']);
    if ($raw === '') {
        return [];
    }
    // Split by comma and URL-decode each name
    $dict_names = explode(',', $raw);
    
    // Filter out empty strings and reindex the array
    return array_values(array_filter(
        $dict_names,
        fn($s) => $s !== ''
    ));
}

/**
 * Build a SQL fragment that restricts results to the selected dictionaries.
 * Returns the string 'true' when no filter is active.
 *
 * Dictionary names cannot be bound as parameters (they appear as literal
 * values in a dynamically constructed OR list, not as a single :placeholder).
 * They are therefore escaped with escapeString() and embedded inside
 * double-quoted SQL string literals, which is the correct SQLite approach.
 */
function buildDictionaryFilter(SQLite3 $db, array $dictionaries): string {
    if (empty($dictionaries)) {
        return 'true';
    }
    $parts = [];
    foreach ($dictionaries as $dict) {
        $parts[] = '"' . $db->escapeString($dict) . '"';
    }
    // The + before DICTNAMES.name is a workaround against a bug in SQLITE 3.3s query planner.
    // With sqlite 3.5 or higher this + can be removed again
    return '+DICTNAMES.name IN (' . implode(', ', $parts) . ')';
}

/**
 * Allowed values are 'bo' (Tibetan), 'en' (English), 'sa' (Sanskrit).
 * The returned string is safe to bind as a SQL parameter value.
 */
function ensureLanguageValid($lang): string {
    $allowed = ['bo', 'en', 'sa'];
    return in_array($lang, $allowed, true) ? $lang : 'bo';
}

// --- Database connection -----------------------------------------------------
if (file_exists(__DIR__ . '/TibetanDictionary_private.db')) {
    $db = new SQLite3(__DIR__ . '/TibetanDictionary_private.db');
} else {
    $db = new SQLite3(__DIR__ . '/TibetanDictionary.db');
}


// --- Routing -----------------------------------------------------------------
//
// Supports two URL conventions:
//
//   /api.php/term/{lang}/{term}  – classic PHP path-info style; PATH_INFO is set
//                                  automatically by PHP-FPM, mod_php (Apache with
//                                  AcceptPathInfo On), and most other PHP servers.
//
//   /api/term/{lang}/{term} – clean REST URL; requires a server rewrite rule
//                             (see nginx.conf and .htaccess). PATH_INFO is not set 
//                             in this case, so the /api prefix is stripped from
//                             REQUEST_URI instead.
//
if (isset($_SERVER['PATH_INFO']) && $_SERVER['PATH_INFO'] !== '') {
    // Called as /api.php/<resource>/... — PHP-FPM sets PATH_INFO for us.
    $path = trim($_SERVER['PATH_INFO'], '/');
} else {
    // Called via the /api/ nginx location — strip the /api prefix from REQUEST_URI.
    $requestUri = $_SERVER['REQUEST_URI'] ?? '/';
    $uriPath    = parse_url($requestUri, PHP_URL_PATH) ?? '/';
    $path       = trim(preg_replace('#^(/backend)?/api#', '', $uriPath), '/');
}

$method = $_SERVER['REQUEST_METHOD'];

// Split path into segments, e.g. "term/lang/bde+ba" → ['term', 'lang', 'bde ba']
$segments = explode('/', $path, 3);
$resource = $segments[0] ?? '';
$lang    = isset($segments[1]) ? rawurldecode($segments[1]) : '';
$param   = isset($segments[2]) ? rawurldecode($segments[2]) : '';

// =============================================================================
// GET /api/term/{lang}/{term}
//
// Look up the full definition(s) for a specific term.
//
// Query params:
//   dictionaries  - comma separate list
//
// Response: { [dictionaryName: string]: string }
// =============================================================================

if ($resource === 'term' && $method === 'GET') {
    if ($param === '') {
        errorResponse('Missing term in path: /api/term/{lang}/{term}');
    }

    if ($lang === '') {
        errorResponse('Missing language in path: /api/term/{lang}/{term}');
    }

    $lang         = ensureLanguageValid($lang);
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);

     $statement = $db->prepare(
         'SELECT DICT.term AS term, '
         . 'DICT.definition AS definition, '
         . 'DICTNAMES.name AS dictionary '
         . 'FROM DICT '
         . 'INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND DICTNAMES.language = :lang '
         . 'WHERE DICT.term = :term '
         . 'AND (' . $dictQuery . ') '
         . 'ORDER BY DICTNAMES.name;'
     );

    $statement->bindValue(':lang', $lang, SQLITE3_TEXT);
    $statement->bindValue(':term', $param, SQLITE3_TEXT);
    $results = $statement->execute();
    if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

    $definitions  = [];
    $prevDict = '';
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
        if ($prevDict === $row['dictionary']) {
            $definitions[$prevDict] .= "\n-----\n" . $row['definition'];
        } else {
            $definitions[$row['dictionary']] = $row['definition'];
            $prevDict = $row['dictionary'];
        }
    }
    jsonResponse($definitions);
}


// =============================================================================
// GET /api/terms/{lang}/{term}
//
// Prefix-based term list (search-bar auto-complete).
//
// Query params:
//   offset        - pagination offset (default 0)
//   maxResults    - page size, 1–500 (default 50)
//   dictionaries  - comma separate list
//
// Response: Array<{ term: string }>
// =============================================================================

  if ($resource === 'terms' && $method === 'GET') {
    if ($param === '') {
        errorResponse('Missing term in path: /api/terms/{lang}/{term}');
    }

    if ($lang === '') {
        errorResponse('Missing language in path: /api/terms/{lang}/{term}');
    }

    $lang         = ensureLanguageValid($lang);
    $search       = trim($param);
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);
    $maxResults   = clampIntParam($_GET['maxResults'] ?? '', 1, 500, 50);
    $offset       = clampIntParam($_GET['offset'] ?? '', 0, PHP_INT_MAX);
    $termQuery = "DICT.term";

    error_log("searching for: " . $search);
    error_log($maxResults . " results, offset " . $offset);

    if (strpos($search, '*') !== false || strpos($search, '?') !== false) {
        $likePattern = str_replace(['*', '?'], ['%', '_'], $search);
        $likePattern2 = $likePattern;

        // check if string ends with % or _
        $endsWithPercent = strlen($likePattern) > 0 && $likePattern[strlen($likePattern) - 1] === '%';
        $endsWithUnderscore = strlen($likePattern) > 0 && $likePattern[strlen($likePattern) - 1] === '_';

        if (!($endsWithPercent)) {
            if ($lang === 'bo') {
                $likePattern2 = $likePattern . ' %';
            } else {
                $likePattern2 = $likePattern . '%';
            }
        }

        // No SQL LIMIT/OFFSET here — pagination is applied in PHP after
        // regex post-filtering so that discarded rows don't reduce the
        // result count below the requested page size.
         $statement = $db->prepare(
             'SELECT DISTINCT ' . $termQuery . ' FROM DICT '
             . 'INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND DICTNAMES.language = :lang '
              . 'WHERE (DICT.term LIKE :word OR DICT.term LIKE :word2) AND (' . $dictQuery . ') '
             . 'GROUP BY DICT.term ORDER BY lower(DICT.term), DICT.term;'
         );

        $statement->bindValue(':lang', $lang, SQLITE3_TEXT);
        $statement->bindValue(':word', $likePattern, SQLITE3_TEXT);
        $statement->bindValue(':word2', $likePattern2, SQLITE3_TEXT);

        // Build a regex to post-filter LIKE results
        $phQ = '__WILDCARD_SINGLE_CHAR__';
        $phS = '__WILDCARD_STAR__';
        $tmp = str_replace(['?', '*'], [$phQ, $phS], $search);
        $regexBody = preg_quote($tmp, '/');
        $regexBody = str_replace([$phQ, $phS], ['[^\\s].*', '.*'], $regexBody);
        $filterRegex = '/^' . $regexBody . '/iu';

        $results = $statement->execute();
        if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

        // Apply regex post-filter with manual pagination
        $rows = [];
        $skipped = 0;
        while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
            if (!preg_match($filterRegex, $row['term'])) continue;
            if ($skipped < $offset) { $skipped++; continue; }
            $rows[] = ['term' => $row['term']];
            if (count($rows) >= $maxResults) break;
        }
        jsonResponse($rows);
    } elseif ($lang === 'bo') {
         $statement = $db->prepare(
             'SELECT DISTINCT ' . $termQuery . ' FROM DICT '
             . 'INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND DICTNAMES.language = :lang '
              . 'WHERE (DICT.term = :word '
              .   'OR (DICT.term > :wordSearch1 AND DICT.term < :wordSearch2 || char(0xFFFF) ) ) '
              .   'AND (' . $dictQuery . ') '
             . 'GROUP BY DICT.term ORDER BY lower(DICT.term), DICT.term '
             . 'LIMIT ' . $maxResults . ' OFFSET ' . $offset . ';'
         );

        $statement->bindValue(':lang',        $lang,              SQLITE3_TEXT);
        $statement->bindValue(':word',        $search,            SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search . ' ',      SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . ' ', SQLITE3_TEXT);
         
        $results = $statement->execute();
        if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

        $rows = [];
        while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = ['term' => $row['term']];
        }
        jsonResponse($rows);
    } else {
         $statement = $db->prepare(
             'SELECT DISTINCT ' . $termQuery . ' FROM DICT '
             . 'INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND DICTNAMES.language = :lang '
              . 'WHERE (DICT.term = :word '
              .   'OR (DICT.term > :wordSearch1 AND DICT.term < :wordSearch2 || char(0xFFFF) ) ) '
              .   'AND (' . $dictQuery . ') '
             . 'GROUP BY DICT.term ORDER BY lower(DICT.term), DICT.term '
             . 'LIMIT ' . $maxResults . ' OFFSET ' . $offset . ';'
         );

        $statement->bindValue(':lang',        $lang,             SQLITE3_TEXT);
        $statement->bindValue(':word',        $search,           SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search,           SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search, SQLITE3_TEXT);

        $results = $statement->execute();
        if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

        $rows = [];
        while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
            $rows[] = ['term' => $row['term']];
        }
        jsonResponse($rows);
   }
}


// =============================================================================
// POST /api/check-terms/{lang}
//
// Verify which Tibetan inline sections have dictionary entries.
// Used to decide whether to render them as clickable links.
//
// Request body (JSON):
//   { [sectionId: string]: string }   — map of section ID → wylie term
//
// Response (JSON): string[]  — IDs of sections whose wylie term exists in the DB.
// =============================================================================

if ($resource === 'check-terms' && $method === 'POST') {
    $lang = ensureLanguageValid($lang);

    $sections = jsonBody();
    if (!is_array($sections)) {
        errorResponse('Request body must be a JSON object mapping section IDs to wylie strings');
    }

    $matchingIds = [];
    foreach ($sections as $sectionId => $wylie) {
        if (!is_string($wylie) || $wylie === '') continue;

         $statement = $db->prepare(
             'SELECT 1 FROM DICT '
             . 'INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id '
             . 'WHERE DICTNAMES.language = :lang AND DICT.term = :word LIMIT 1;'
         );

        $statement->bindValue(':lang', $lang, SQLITE3_TEXT);
        $statement->bindValue(':word', $wylie, SQLITE3_TEXT);
        $queryResult = $statement->execute();

        if ($queryResult !== false && $queryResult->fetchArray()) {
            $matchingIds[] = (string) $sectionId;
        }
    }
    jsonResponse($matchingIds);
}


// =============================================================================
// GET /api/fulltext/{lang}/{query}
//
// FTS5-based fulltext search across definitions.
//
// Query params:
//   offset        - pagination offset (default 0)
//   maxResults    - page size, 1–500 (default 50)
//   dictionaries  - repeated param
//
// Response: Array<{ term, dictionary, dictionaryId, snippet, definition }>
// =============================================================================

if ($resource === 'fulltext' && $method === 'GET') {
    if ($param === '') {
        errorResponse('Missing term in path: /api/fulltext/{lang}/{term}');
    }

    if ($lang === '') {
        errorResponse('Missing language in path: /api/fulltext/{lang}/{term}');
    }

    $lang         = ensureLanguageValid($lang);
    $search       = trim($param);
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);
    $maxResults   = clampIntParam($_GET['maxResults'] ?? '', 1, 500, 50);
    $offset       = clampIntParam($_GET['offset'] ?? '', 0, PHP_INT_MAX);
    $innerLimit = $maxResults + $offset;
    // The FTS query must:
    //  - restrict *term* matches to the requested language
    //  - search *definitions* across ALL languages
     $sql = "SELECT * FROM (
         -- Branch 1: Find matching *terms* that match the selected language)
         -- We join DICT here just to filter the rowids by language
         SELECT DICT.term, DICT.definition, DICTNAMES.name AS dictionary, DICTNAMES.id AS dictionaryId, DICTNAMES.language as lang, DICT_FTS.rank
         FROM DICT_FTS
         INNER JOIN DICT ON DICT.rowid = DICT_FTS.rowid
         INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND (" . $dictQuery . ") 
         WHERE DICT_FTS.term MATCH :query 
           AND DICTNAMES.language = :lang
 
         UNION ALL
 
         -- Branch 2: Find matching *Definitions*
         SELECT DICT.term, DICT.definition, DICTNAMES.name AS dictionary, DICTNAMES.id AS dictionaryId, DICTNAMES.language as lang, DICT_FTS.rank
         FROM DICT_FTS
         INNER JOIN DICT ON DICT.rowid = DICT_FTS.rowid
         INNER JOIN DICTNAMES ON DICT.dictionary = DICTNAMES.id AND (" . $dictQuery . ")
         WHERE DICT_FTS.definition MATCH :query
     )
     ORDER BY rank ASC
     LIMIT " . $maxResults . " OFFSET " . $offset . ";";


    $statement = $db->prepare($sql);
    $statement->bindValue(':query', $search, SQLITE3_TEXT);
    $statement->bindValue(':lang',  $lang,   SQLITE3_TEXT);

    $results = $statement->execute();
    if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

    jsonResponse(buildSnippetRows($results, $lang, fulltextQueryToRegex($search)));
}


// --- Fallback ----------------------------------------------------------------

errorResponse('Not found: ' . $method . ' /api/' . $path, 404);
