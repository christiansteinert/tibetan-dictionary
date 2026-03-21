<?php
// =============================================================================
// Tibetan Dictionary — PHP Backend
// =============================================================================
// Uses the UNCOMPRESSED database (plain-text definitions + FTS5 virtual tables).
// The compressed database (*_compressed.db) is only used by the Cordova/mobile app.
// =============================================================================

require_once 'snippet.php';


// --- Database connection -----------------------------------------------------

if (file_exists('TibetanDictionary_private.db')) {
    $db = new SQLite3('TibetanDictionary_private.db');
} else {
    $db = new SQLite3('TibetanDictionary.db');
}


// --- Caching header ----------------------------------------------------------

header('Expires: ' . gmdate('D, d M Y H:i:s', strtotime('+1 hours')) . ' GMT');


// --- Shared helpers ----------------------------------------------------------

/**
 * Build a SQL fragment that restricts results to the selected dictionaries.
 * Returns the string 'true' when no dictionary filter is active.
 */
function buildDictionaryFilter($db) {
    if (isset($_POST['dictionaries']) && sizeof($_POST['dictionaries']) > 0) {
        $parts = [];
        foreach ($_POST['dictionaries'] as $dict) {
            $parts[] = 'DICTNAMES.name="' . $db->escapeString($dict) . '"';
        }
        return implode(' OR ', $parts);
    }
    return 'true';
}

/**
 * Determine the language, main content table, and FTS table from the 'lang'
 * POST parameter.
 */
function resolveLanguageAndTables() {
    $lang = isset($_POST['lang']) ? trim($_POST['lang']) : 'bo';
    if ($lang === 'en') {
        return ['lang' => 'en', 'table' => 'DICT_EN', 'ftsTable' => 'DICT_EN_FTS'];
    }
    return ['lang' => 'bo', 'table' => 'DICT', 'ftsTable' => 'DICT_FTS'];
}

/**
 * Clamp and sanitise an integer POST parameter.
 */
function sanitiseInt($paramName, $min, $max, $default = 0) {
    $value = isset($_POST[$paramName])
        ? intval(preg_replace('/[^0-9]/', '', $_POST[$paramName]))
        : $default;
    return max($min, min($max, $value));
}


// --- Resolve common request parameters --------------------------------------

$dictQuery = buildDictionaryFilter($db);
$langInfo  = resolveLanguageAndTables();
$lang      = $langInfo['lang'];
$table     = $langInfo['table'];
$ftsTable  = $langInfo['ftsTable'];


// =============================================================================
// ENDPOINT: term — look up the full definition(s) of a specific term
// =============================================================================

if (isset($_POST['term'])) {
    header('Content-type: application/json');

    $term = trim($_POST['term']);

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
    $statement->bindValue(':term', $term, SQLITE3_TEXT);
    $results = $statement->execute();

    if ($results === false) { die($db->lastErrorMsg()); }

    $prevTerm = '';
    $prevDict = '';
    $entriesFound = false;
    print('{');
    while ($row = $results->fetchArray()) {
        $definition = str_replace('"', '\\"', $row['definition']);
        if ($prevDict === $row['dictionary'] && $prevTerm === $row['term']) {
            print('\\n-----\\n' . $definition);
        } else {
            if ($prevDict !== '') { print('",'); }
            print('"' . $row['dictionary'] . '":"' . $definition);
        }
        $prevDict = $row['dictionary'];
        $prevTerm = $row['term'];
        $entriesFound = true;
    }
    if ($entriesFound) { print('"'); }
    print('}');


// =============================================================================
// ENDPOINT: search — prefix-based term list (search bar auto-complete)
// =============================================================================

} else if (isset($_POST['search'])) {
    header('Content-type: application/json');

    $search     = trim($_POST['search']);
    $maxResults = sanitiseInt('maxresults', 10, 500, 50);
    $offset     = sanitiseInt('offset', 0, PHP_INT_MAX);

    $baseSql = 'SELECT DISTINCT term FROM ' . $table . ' '
        . 'INNER JOIN DICTNAMES ON ' . $table . '.dictionary = DICTNAMES.id '
        .   'AND DICTNAMES.language = "' . $lang . '" '
        . 'WHERE (%s AND (' . $dictQuery . ')) '
        . 'GROUP BY term ORDER BY lower(term), term '
        . 'LIMIT ' . $maxResults . ' OFFSET ' . $offset . ';';

    if (strpos($search, '*') !== false || strpos($search, '?') !== false) {
        // Wildcard search on term names
        $statement = $db->prepare(sprintf($baseSql,
            $table . '.term LIKE :word'));
        $statement->bindValue(':word', str_replace(['*', '?'], ['%', '_'], $search . '%'), SQLITE3_TEXT);
    } else if ($lang === 'bo') {
        // Tibetan prefix range
        $statement = $db->prepare(sprintf($baseSql,
            '(' . $table . '.term = :word '
            . 'OR (' . $table . '.term > :wordSearch1 AND term < :wordSearch2))'));
        $statement->bindValue(':word',        $search,            SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search . ' ',      SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . ' zzzzz', SQLITE3_TEXT);

    } else {
        // English case-insensitive prefix
        $statement = $db->prepare(sprintf($baseSql,
            '(' . $table . '.term = :word COLLATE NOCASE '
            . 'OR (' . $table . '.term > :wordSearch1 COLLATE NOCASE '
            .     'AND term < :wordSearch2 COLLATE NOCASE))'));
        $statement->bindValue(':word',        $search,            SQLITE3_TEXT);
        $statement->bindValue(':wordSearch1', $search,            SQLITE3_TEXT);
        $statement->bindValue(':wordSearch2', $search . 'zzzzz',  SQLITE3_TEXT);
    }

    $results = $statement->execute();
    if ($results === false) { die($db->lastErrorMsg()); }

    $rows = [];
    while ($row = $results->fetchArray()) {
        $rows[] = ['term' => $row['term']];
    }
    print(json_encode($rows));


// =============================================================================
// ENDPOINT: checkTerms — verify existence of one or more terms
// =============================================================================

} else if (isset($_POST['checkTerms'])) {
    header('Content-type: application/json');

    $result = [];
    foreach ($_POST['checkTerms'] as $sectionId => $sectionInfo) {
        $statement = $db->prepare(
            'SELECT 1 FROM ' . $table . ' WHERE term = :word LIMIT 1;'
        );
        $statement->bindValue(':word', $sectionInfo['wylie'], SQLITE3_TEXT);
        $results = $statement->execute();

        if ($results !== false && $results->fetchArray()) {
            $result[$sectionId] = $sectionInfo;
        }
    }
    print(json_encode($result));


// =============================================================================
// ENDPOINT: fulltextSearch — FTS5-based fulltext search
// =============================================================================
// POST: fulltextSearch, lang, maxresults, offset, dictionaries[]
// Returns: JSON array of { term, dictionary, dictionaryId, snippet, definition }
// =============================================================================

} else if (isset($_POST['fulltextSearch'])) {
    header('Content-type: application/json');

    $search     = trim($_POST['fulltextSearch']);
    $maxResults = sanitiseInt('maxresults', 10, 500, 50);
    $offset     = sanitiseInt('offset', 0, PHP_INT_MAX);

    $matchExpression = ''; // match expression 

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
    if ($results === false) { die($db->lastErrorMsg()); }

    print(json_encode(buildSnippetRows($results, fulltextQueryToRegex($search))));
}


$db->close();
