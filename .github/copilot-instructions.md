# Tibetan-English Dictionary - AI Agent Instructions

## Project Overview
This is a hybrid Tibetan-English dictionary application with two deployment modes:
- **Web app**: JavaScript frontend + PHP backend (`dict.php`) for SQLite queries
- **Android app**: Cordova-packaged JavaScript with custom Java SQLite plugin

Both share the same JavaScript codebase (`webapp/`) and use an SQLite database generated from CSV dictionaries.

## Architecture & Data Flow

### Build Pipeline (Critical)
1. **Dictionary Build** (`buildDictionaries.sh` → `_buildDict.py`):
   - Reads CSV files from `_input/dictionaries/public/` (and `private/` if present)
   - Generates `webapp/TibetanDictionary.db` (SQLite database)
   - Extracts Tibetan syllables → generates `webapp/data/syllablelist.js` lookup table
   - Uses Perl library (`_build/util/Lingua-BO-Wylie`) for Wylie→Unicode conversion
   - Applies zlib compression with custom dictionary (`DEFLATE_DICT`) for space efficiency

2. **Android Build** (`buildAndroid.sh`):
   - Copies webapp files into Cordova project (`_build/mobile/tibetandict/`)
   - Injects database size constant into Java (`Constants.java`)
   - Builds separate PUBLIC and FULL (private) APKs with different Android app IDs

### Key Wylie Transliteration Pattern
The app does **NOT** perform runtime Wylie conversion. Instead:
- All Wylie→Unicode conversion uses pre-generated lookup table in `data/syllablelist.js`
- Lookup is syllable-by-syllable, not algorithmic
- Generated during build from actual dictionary terms via `_getTibetanSyllablesFromText.sh`

### Dual Data Access Strategy
JavaScript uses polymorphic `dataAccess` object (set at runtime):
- **PhpDataAccess**: AJAX calls to `dict.php` (web deployment)
- **CordovaDataAccess**: Direct SQLite via `window.sqlitePlugin` (Android)

See `webapp/code/js/dict/dataAccess.js` for implementation.

## Development Workflows

### Building Dictionaries
```bash
./buildDictionaries.sh  # Requires: python3, perl, sqlite3, bash tools
# Generates: webapp/TibetanDictionary.db + webapp/data/syllablelist.js
```

### Building Android APK
```bash
./buildAndroid.sh  # Requires: ANDROID_HOME, JAVA_HOME, Cordova CLI
# Produces: TibetanDictionary-PUBLIC.apk
```
Must run `buildDictionaries.sh` first.

### Testing Web Version
Serve `webapp/` directory with PHP support. Requires `TibetanDictionary.db` to exist.

## Code Conventions

### Dictionary Data Format
CSV files in `_input/dictionaries/public/`:
- Format: `WylieTerm|DefinitionText`
- Multiple entries per term allowed
- Dictionary metadata in `webapp/settings/dictlist.js` (references abbreviation sets)

### Abbreviation System
- Abbreviations defined in `webapp/settings/abbreviations.js`
- Applied via `DICT.processAbbreviations()` during rendering
- Uses regex patterns with `TERM` placeholder (see `main.js` line ~30-90)

### JavaScript Structure
Main app namespace: `DICT` object in `webapp/code/js/dict/main.js`
- Entry point: `index.html` loads all dependencies in order
- No module bundler - plain script tags
- jQuery-based (legacy pattern)

### Public vs Private Versions
Some dictionaries are proprietary. Build system handles both:
- Check for `_input/dictionaries/private/` existence
- `settings/globalsettings.js` generated with `publicOnly` flag
- Android uses different app IDs: `de.christian_steinert.tibetandict` vs `.full`

## Critical Files

- `_buildDict.py`: Core build logic - CSV parsing, database generation, compression
- `webapp/index.html`: Single-page app, all UI structure
- `webapp/code/js/dict/main.js`: Main application logic (1500+ lines)
- `webapp/settings/dictlist.js`: Dictionary metadata registry
- `buildDictionaries.sh`, `buildAndroid.sh`: Top-level build orchestration

## Environment Requirements

Build dependencies (must be in PATH):
- **Python 3**: Dictionary build script
- **Perl 5**: Wylie conversion library
- **SQLite 3 CLI**: Database operations
- **Bash/dash**: Build scripts
- **Node.js/npm + Cordova CLI**: Android builds only
- **Android SDK + JDK**: Set `ANDROID_HOME`, `JAVA_HOME`

## Common Pitfalls

1. **Syllable list must be regenerated** when dictionaries change
2. **Build scripts assume Linux/Unix** - not Windows-compatible
3. **Custom Cordova SQLite plugin** - not stock plugin, has extraction logic for bundled DB
4. **Compression dictionary constant** (`DEFLATE_DICT`) synced between Python and PHP
5. **No runtime Wylie converter** - lookup table only covers dictionary terms

## When Modifying

- **Add dictionary**: Place CSV in `_input/dictionaries/public/`, add entry to `dictlist.js`
- **Change UI**: Edit `webapp/index.html` or `webapp/code/js/dict/main.js`
- **Fix data access**: Check both `PhpDataAccess` and `CordovaDataAccess` implementations
- **Update build**: Modify shell scripts, regenerate with full build (`buildDictionaries.sh` then `buildAndroid.sh`)


- **Add dictionary**: Place CSV in `_input/dictionaries/public/`, add entry to `dictlist.js`
- **Change UI**: Edit `webapp/index.html` or `webapp/code/js/dict/main.js`
- **Fix data access**: Check both `PhpDataAccess` and `CordovaDataAccess` implementations
- **Update build**: Modify shell scripts, regenerate with full build (`buildDictionaries.sh` then `buildAndroid.sh`)
