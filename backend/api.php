<?php
// =============================================================================
// Tibetan Dictionary — REST API
// =============================================================================
//
// Routes (dispatched via PATH_INFO or REQUEST_URI):
//
//   GET  /api/term/{term}     Look up definitions for a specific term.
//   GET  /api/terms           Prefix-based term search (auto-complete).
//   POST /api/check-terms     Check which Tibetan sections have dictionary entries.
//   GET  /api/fulltext        FTS5-based fulltext search.
//
// All responses are JSON. Request bodies (where applicable) are JSON.
// =============================================================================

require_once __DIR__ . '/snippet.php';


// --- Helpers -----------------------------------------------------------------

/** Send a JSON response and exit. */
function jsonResponse(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Expires: ' . gmdate('D, d M Y H:i:s', strtotime('+1 hours')) . ' GMT');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

/** Send a JSON error response and exit. */
function errorResponse(string $message, int $status = 400): never {
    jsonResponse(['error' => $message], $status);
}

/** Parse and return the decoded JSON request body, or abort with 400. */
function jsonBody(): mixed {
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
 * Clamp and sanitise an integer value.
 */
function clampInt(mixed $value, int $min, int $max, int $default = 0): int {
    if ($value === null || $value === '') return $default;
    $int = intval(preg_replace('/[^0-9]/', '', (string) $value));
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
    $dict_names = array_map('urldecode', explode(',', $raw));
    
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
        $parts[] = 'DICTNAMES.name="' . $db->escapeString($dict) . '"';
    }
    return implode(' OR ', $parts);
}

/**
 * Determine the language, main content table, and FTS table from the 'lang'
 * query parameter. Defaults to Tibetan ('bo').
 *
 * The returned table names are chosen exclusively from a hard-coded allowlist
 * so they are safe to interpolate directly into SQL statements.
 *
 * @return array{lang: string, table: string, ftsTable: string}
 */
function resolveLanguageAndTables(): array {
    $allowed = [
        'bo' => ['lang' => 'bo', 'table' => 'DICT',    'ftsTable' => 'DICT_FTS'],
        'en' => ['lang' => 'en', 'table' => 'DICT_EN', 'ftsTable' => 'DICT_EN_FTS'],
    ];
    $lang = isset($_GET['lang']) ? trim($_GET['lang']) : 'bo';
    return $allowed[$lang] ?? $allowed['bo'];
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
//   /api.php/term/{term}   – classic PHP path-info style; PATH_INFO is set
//                            automatically by PHP-FPM, mod_php (Apache with
//                            AcceptPathInfo On), and most other PHP servers.
//
//   /api/term/{term}       – clean REST URL; requires a server rewrite rule
//                            (see nginx.conf). PATH_INFO is not set in this
//                            case, so the /api prefix is stripped from
//                            REQUEST_URI instead.
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

// Split path into segments, e.g. "term/bde+ba" → ['term', 'bde ba']
$segments = explode('/', $path, 2);
$resource = $segments[0] ?? '';
$param    = isset($segments[1]) ? urldecode($segments[1]) : '';


// =============================================================================
// GET /api/term/{term}
//
// Look up the full definition(s) for a specific term.
//
// Query params:
//   lang          - 'bo' (default) or 'en'
//   dictionaries  - repeated param, e.g. dictionaries[]=Rangjung+Yeshe
//
// Response: { [dictionaryName: string]: string }
// =============================================================================

if ($resource === 'term' && $method === 'GET') {
    if ($param === '') {
        errorResponse('Missing term in path: /api/term/{term}');
    }

    $langInfo     = resolveLanguageAndTables();
    $lang         = $langInfo['lang'];
    $table        = $langInfo['table'];
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);

    $statement = $db->prepare(
        'SELECT ' . $table . '.term AS term, '
        . $table . '.definition AS definition, '
        . 'DICTNAMES.name AS dictionary '
        . 'FROM ' . $table . ' '
        . 'INNER JOIN DICTNAMES ON ' . $table . '.dictionary = DICTNAMES.id '
        .   'AND DICTNAMES.language = "' . $lang . '" '
        . 'WHERE ' . $table . '.term = :term '
        .   'AND (' . $dictQuery . ') '
        . 'ORDER BY DICTNAMES.name;'
    );
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
// GET /api/terms
//
// Prefix-based term list (search-bar auto-complete).
//
// Query params:
//   search        - the search string (required)
//   lang          - 'bo' (default) or 'en'
//   offset        - pagination offset (default 0)
//   maxResults    - page size, 10–500 (default 50)
//   dictionaries  - repeated param
//
// Response: Array<{ term: string }>
// =============================================================================

if ($resource === 'terms' && $method === 'GET') {
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    if ($search === '') {
        errorResponse('Missing required query parameter: search');
    }

    $langInfo     = resolveLanguageAndTables();
    $lang         = $langInfo['lang'];
    $table        = $langInfo['table'];
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);
    $maxResults   = clampInt($_GET['maxResults'] ?? null, 10, 500, 50);
    $offset       = clampInt($_GET['offset'] ?? null, 0, PHP_INT_MAX);

    $baseSql = 'SELECT DISTINCT term FROM ' . $table . ' '
        . 'INNER JOIN DICTNAMES ON ' . $table . '.dictionary = DICTNAMES.id '
        .   'AND DICTNAMES.language = "' . $lang . '" '
        . 'WHERE (%s AND (' . $dictQuery . ')) '
        . 'GROUP BY term ORDER BY lower(term), term '
        . 'LIMIT ' . $maxResults . ' OFFSET ' . $offset . ';';

    if (strpos($search, '*') !== false || strpos($search, '?') !== false) {
        $likePattern = str_replace(['*', '?'], ['%', '_'], $search);
        $statement = $db->prepare(sprintf($baseSql, $table . '.term LIKE :word'));
        $statement->bindValue(':word', $likePattern, SQLITE3_TEXT);

        // Build a regex to post-filter LIKE results: '?' must not match a space,
        // '*' may match anything including spaces.
        $placeholder = "\x00";
        $regexBody = preg_quote(str_replace('?', $placeholder, $search), '/');
        $regexBody = str_replace([preg_quote($placeholder, '/'), '\\*'], ['[^ ]', '.*'], $regexBody);
        $filterRegex = '/^' . $regexBody . '/iu';
    } elseif ($lang === 'bo') {
        $statement = $db->prepare(sprintf($baseSql,
            '(' . $table . '.term = :word '
            . 'OR (' . $table . '.term > :wordSearch1 AND term < :wordSearch2))'));
        $statement->bindValue(':word',        $search,            SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search . ' ',      SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . ' zzzzz', SQLITE3_TEXT);
    } else {
        $statement = $db->prepare(sprintf($baseSql,
            '(' . $table . '.term = :word COLLATE NOCASE '
            . 'OR (' . $table . '.term > :wordSearch1 COLLATE NOCASE '
            .     'AND term < :wordSearch2 COLLATE NOCASE))'));
        $statement->bindValue(':word',        $search,           SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search,           SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . 'zzzzz', SQLITE3_TEXT);
    }

    $results = $statement->execute();
    if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

    $rows = [];
    while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
        if (isset($filterRegex) && !preg_match($filterRegex, $row['term'])) continue;
        $rows[] = ['term' => $row['term']];
    }
    jsonResponse($rows);
}


// =============================================================================
// POST /api/check-terms
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
    $langInfo = resolveLanguageAndTables();
    $table    = $langInfo['table'];

    $sections = jsonBody();
    if (!is_array($sections)) {
        errorResponse('Request body must be a JSON object mapping section IDs to wylie strings');
    }

    $matchingIds = [];
    foreach ($sections as $sectionId => $wylie) {
        if (!is_string($wylie) || $wylie === '') continue;

        $statement = $db->prepare(
            'SELECT 1 FROM ' . $table . ' WHERE term = :word LIMIT 1;'
        );
        $statement->bindValue(':word', $wylie, SQLITE3_TEXT);
        $queryResult = $statement->execute();

        if ($queryResult !== false && $queryResult->fetchArray()) {
            $matchingIds[] = (string) $sectionId;
        }
    }
    jsonResponse($matchingIds);
}


// =============================================================================
// GET /api/fulltext
//
// FTS5-based fulltext search across definitions.
//
// Query params:
//   q             - search query (required)
//   lang          - 'bo' (default) or 'en'
//   offset        - pagination offset (default 0)
//   maxResults    - page size, 10–500 (default 50)
//   dictionaries  - repeated param
//
// Response: Array<{ term, dictionary, dictionaryId, snippet, definition }>
// =============================================================================

if ($resource === 'fulltext' && $method === 'GET') {
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    if ($search === '') {
        errorResponse('Missing required query parameter: q');
    }

    $langInfo     = resolveLanguageAndTables();
    $lang         = $langInfo['lang'];
    $table        = $langInfo['table'];
    $ftsTable     = $langInfo['ftsTable'];
    $dictionaries = parseDictionaries();
    $dictQuery    = buildDictionaryFilter($db, $dictionaries);
    $maxResults   = clampInt($_GET['maxResults'] ?? null, 10, 500, 50);
    $offset       = clampInt($_GET['offset'] ?? null, 0, PHP_INT_MAX);

    $sql = 'SELECT '
        . $table . '.term AS term, '
        . $table . '.definition AS definition, '
        . 'DICTNAMES.name AS dictionary, '
        . 'DICTNAMES.id AS dictionaryId '
        . 'FROM ' . $ftsTable . ' '
        . 'INNER JOIN ' . $table . ' ON ' . $table . '.rowid = ' . $ftsTable . '.rowid '
        . 'INNER JOIN DICTNAMES ON ' . $table . '.dictionary = DICTNAMES.id '
        .   'AND DICTNAMES.language = "' . $lang . '" '
        . 'WHERE ' . $ftsTable . ' MATCH :query '
        .   'AND (' . $dictQuery . ') '
        . 'ORDER BY rank '
        . 'LIMIT ' . $maxResults . ' OFFSET ' . $offset . ';';

    $statement = $db->prepare($sql);
    $statement->bindValue(':query', $search, SQLITE3_TEXT);
    $results = $statement->execute();
    if ($results === false) { errorResponse($db->lastErrorMsg(), 500); }

    jsonResponse(buildSnippetRows($results, fulltextQueryToRegex($search)));
}


// --- Fallback ----------------------------------------------------------------

errorResponse('Not found: ' . $method . ' /api/' . $path, 404);
