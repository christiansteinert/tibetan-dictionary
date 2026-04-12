#!/usr/bin/env python3

import sqlite3, sys, re, os, zlib

# --- Output paths ---
# Each base name produces TWO databases:
#   <base>.db             - uncompressed (text definitions, FTS5 indexes) for web/PHP
#   <base>_compressed.db  - compressed (blob definitions, no FTS5) for Cordova/mobile
DB_BASE = "backend/TibetanDictionary"
DB_PRIVATE_BASE = "backend/TibetanDictionary_private"

CSV_INPUT = "_input/dictionaries/public"
CSV_INPUT_EN = "_input/dictionaries/public_en"
CSV_INPUT_SKT = "_input/dictionaries/public_skt"
CSV_INPUT_PRIVATE = "_input/dictionaries/private"
CSV_INPUT_PRIVATE_EN = "_input/dictionaries/private_en"
CSV_INPUT_PRIVATE_SKT = "_input/dictionaries/private_skt"

# 32KB "dictionary" with frequent words to optimize deflate compression
# (used only for the compressed/mobile database)
script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'deflate_dict.txt'), 'r') as f:
    DEFLATE_DICT = f.read().replace('\n', '')

DEFLATE_DICT_BYTES = DEFLATE_DICT.encode("utf-8")


# ---------------------------------------------------------------------------
# Compression (for mobile/Cordova database only)
# ---------------------------------------------------------------------------
def deflate(text):
    textBytes = text.encode("utf-8")
    co = zlib.compressobj(9, zlib.DEFLATED, -15, 9, zlib.Z_DEFAULT_STRATEGY, DEFLATE_DICT_BYTES)
    data = co.compress(textBytes)
    data = data + co.flush()
    return data


# ---------------------------------------------------------------------------
# Database creation
# ---------------------------------------------------------------------------
def createDatabasePair(basePath):
    """Create both an uncompressed and a compressed database, returning (uncompressedDb, compressedDb)."""
    uncompressedPath = basePath + ".db"
    compressedPath = basePath + "_compressed.db"

    for path in [uncompressedPath, compressedPath]:
        if os.path.exists(path):
            os.remove(path)

    uncompressedDb = sqlite3.connect(uncompressedPath)
    compressedDb = sqlite3.connect(compressedPath)

    # --- Compressed database: single DICT table with lang column (blob definitions) ---
    compressedDb.execute("CREATE TABLE DICTNAMES(id int, language text, name text)")
    compressedDb.execute("CREATE TABLE DICT(term text, lang text, dictionary int, definition blob)")
    compressedDb.execute('CREATE TABLE "android_metadata" ("locale" TEXT DEFAULT \'en_US\')')

    # --- Uncompressed database: single DICT table with lang column, plus FTS5 virtual table ---
    uncompressedDb.execute("CREATE TABLE DICTNAMES(id int, language text, name text)")
    uncompressedDb.execute("CREATE TABLE DICT(term text, lang text, dictionary int, definition text)")

    return uncompressedDb, compressedDb


# ---------------------------------------------------------------------------
# Text cleanup helpers (unchanged from original)
# ---------------------------------------------------------------------------
def cleanupTerm(value, lang):
    value = re.sub(r"\(.*?\)", "", value)
    value = re.sub(r"\[.*?\]", "", value)
    value = re.sub(r"\{.*?\}", "", value)

    value = value.replace("\"", " ")

    value = re.sub(r"^\s+", "", value)
    value = re.sub(r"\s+$", "", value)
    value = value.replace("\\n", " ")
    value = re.sub(r"\s+", " ", value)
    value = value.replace("\u00AD", "")  # delete soft hyphen

    if lang == "bo":
        value = value.replace("v", "w")
        value = re.sub(r"[,]", "", value)
    else:
        value = re.sub(r"[-,\.]$", "", value)
        value = value.lower()

    return value


def cleanupDefinition(value):
    value = value.replace("\"", "\\\"")
    value = re.sub(r"^\s+", "", value)
    value = re.sub(r"\s+$", "", value)
    value = re.sub('"', '\\"', value)
    value = value.rstrip("\r\n")
    value = value.rstrip("\r")
    value = value.rstrip("\n")
    return value


def getDictNameFromFile(dictFile):
    return re.sub("^.*[0-9][0-9]-", "", dictFile)


# ---------------------------------------------------------------------------
# CSV processing — inserts into BOTH databases simultaneously
# ---------------------------------------------------------------------------
def processFile(dictFile, uncompressedDb, compressedDb, dictNr, lang):
    isTibetan = (lang == "bo")

    dictName = getDictNameFromFile(dictFile)
    uncompressedDb.execute("INSERT INTO DICTNAMES VALUES(?,?,?)", (dictNr, lang, dictName))
    compressedDb.execute("INSERT INTO DICTNAMES VALUES(?,?,?)", (dictNr, lang, dictName))

    existingTerms = {}
    with open(dictFile, 'r') as inp:
        for line in inp:
            if (not line.startswith("#")) and ("|" in line):
                term, definition = line.split("|")

                term = cleanupTerm(term, lang)
                definition = cleanupDefinition(definition)

                lineContents = term + "|" + definition
                if (term != "") and (definition != "") and (lineContents not in existingTerms):
                    # Uncompressed DB: plain text definition
                    uncompressedDb.execute(
                        "INSERT INTO DICT VALUES(?,?,?,?)",
                        (term, lang, dictNr, definition)
                    )

                    # Compressed DB: zlib-compressed blob definition
                    definitionBlob = deflate(definition)
                    compressedDb.execute(
                        "INSERT INTO DICT VALUES(?,?,?,?)",
                        (term, lang, dictNr, definitionBlob)
                    )

                    existingTerms[lineContents] = 1


def processFolder(uncompressedDb, compressedDb, srcFolder, lang):
    if not os.path.exists(srcFolder):
        return
    dictNr = 1
    for dictFile in sorted(os.listdir(srcFolder)):
        dictFileWithPath = os.path.join(srcFolder, dictFile)
        if not os.path.isdir(dictFileWithPath):
            print(dictFileWithPath)
            processFile(dictFileWithPath, uncompressedDb, compressedDb, dictNr, lang)
            uncompressedDb.commit()
            compressedDb.commit()
            dictNr += 1

    uncompressedDb.commit()
    compressedDb.commit()


# ---------------------------------------------------------------------------
# FTS5 virtual table creation (uncompressed database only)
# ---------------------------------------------------------------------------
def createFts5Tables(db):
    """Create a single FTS5 external-content virtual table for fulltext search.

    The FTS5 table references the DICT table via content= so that the
    definition text is not duplicated on disk.  The lang column is included
    so that queries can restrict the search to a specific language.
    Porter stemming is enabled; it is a no-op for non-English tokens.
    """
    db.execute("""
        CREATE VIRTUAL TABLE DICT_FTS USING fts5(
            term,
            lang,
            definition,
            tokenize='porter unicode61 remove_diacritics 1',
            content='DICT',
            content_rowid='rowid'
        )
    """)

    # Populate the FTS index from the content table
    db.execute("INSERT INTO DICT_FTS(DICT_FTS) VALUES('rebuild')")
    db.execute("INSERT INTO DICT_FTS(DICT_FTS) VALUES('optimize')")

    db.commit()


# ---------------------------------------------------------------------------
# Finalization: indexes, FTS5, close
# ---------------------------------------------------------------------------
def closeDatabasePair(uncompressedDb, compressedDb):
    """Create indexes, build FTS5 tables (uncompressed only), and close both databases."""

    # B-tree indexes on both databases
    for db in [uncompressedDb, compressedDb]:
        db.execute("CREATE INDEX i1 ON DICT(lang, term, dictionary);")
        db.execute("CREATE INDEX i3 ON DICTNAMES(language, name, id);")
        db.commit()

    # FTS5 virtual tables — uncompressed database only
    print("- Building FTS5 fulltext indexes")
    createFts5Tables(uncompressedDb)

    optimizeDb(uncompressedDb)
    optimizeDb(compressedDb)

    uncompressedDb.close()
    compressedDb.close()

def optimizeDb(db):
    """ Optimize the database for storage consumption, performance, and read-only use."""
    db.execute("PRAGMA page_size = 8192;")
    db.execute("PRAGMA journal_mode = OFF;")
    db.execute("PRAGMA synchronous = OFF;")
    db.execute("ANALYZE;") 
    db.execute("VACUUM;")
    db.execute("PRAGMA optimize;")
    db.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=== PUBLIC DICTIONARIES ===")

    uncompressedDb, compressedDb = createDatabasePair(DB_BASE)

    print("- Processing Tibetan (bo) Dictionaries")
    processFolder(uncompressedDb, compressedDb, CSV_INPUT, "bo")

    print("- Processing English (en) Dictionaries")
    processFolder(uncompressedDb, compressedDb, CSV_INPUT_EN, "en")

    print("- Processing Sanskrit (sa) Dictionaries")
    processFolder(uncompressedDb, compressedDb, CSV_INPUT_SKT, "sa")

    closeDatabasePair(uncompressedDb, compressedDb)


    if os.path.exists(CSV_INPUT_PRIVATE):
        print("=== PRIVATE DICTIONARIES ===")

        uncompressedDb, compressedDb = createDatabasePair(DB_PRIVATE_BASE)

        print("- Processing Tibetan (bo) Dictionaries")
        processFolder(uncompressedDb, compressedDb, CSV_INPUT_PRIVATE, "bo")

        print("- Processing English (en) Dictionaries")
        processFolder(uncompressedDb, compressedDb, CSV_INPUT_PRIVATE_EN, "en")

        print("- Processing Sanskrit (sa) Dictionaries")
        processFolder(uncompressedDb, compressedDb, CSV_INPUT_PRIVATE_SKT, "sa")

        closeDatabasePair(uncompressedDb, compressedDb)


main()
