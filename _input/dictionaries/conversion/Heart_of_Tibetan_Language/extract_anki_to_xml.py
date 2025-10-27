#!/usr/bin/env python3
"""Extract selected Anki decks to XML and copy referenced audio files.

For each configured deck this script will:
- unzip the .apkg archive into a working directory
- read notes from the collection database (handling both .anki2 and .anki21)
- generate an XML file that lists every note and each of its fields
- rewrite every ``[sound:...]`` marker so it points to a newly named audio file
- copy the referenced audio into a dedicated folder using the naming scheme
    ``<deck>-<entry><letter><ext>`` (for example ``1-2a.mp3``)

Other field values remain untouched to avoid losing formatting.
"""
from __future__ import annotations

import json
import re
import shutil
import sqlite3
import zipfile
from pathlib import Path
from typing import Dict, List, Set, Tuple

import xml.etree.ElementTree as ET

# Base directory containing the decks relative to the repository root.
BASE_DIR = Path(__file__).resolve().parent
DECKS_DIR = BASE_DIR / "."
EXTRACT_ROOT = DECKS_DIR / "extracted"

DECKS = [
    "hotl1.apkg",
    "hotl2.apkg",
    "hotl3.apkg",
]

FIELD_SEP = "\x1f"
SOUND_PATTERN = re.compile(r"\[sound:([^\]]+)\]")


def unzip_deck(deck_path: Path, extract_path: Path) -> None:
    extract_path.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(deck_path) as zf:
        zf.extractall(extract_path)


def load_media_map(extract_path: Path) -> Dict[str, Path]:
    media_file = extract_path / "media"
    if not media_file.exists():
        return {}
    data = json.loads(media_file.read_text(encoding="utf-8"))
    # Convert to lookup by actual filename -> full path of the numbered file.
    return {
        filename: extract_path / key
        for key, filename in data.items()
        if filename and (extract_path / key).exists()
    }


def locate_collection_db(extract_path: Path) -> Path:
    for candidate in ("collection.anki21", "collection.anki2"):
        db_path = extract_path / candidate
        if db_path.exists():
            return db_path
    raise FileNotFoundError(f"No collection database found in {extract_path}")


def load_model_fields(conn: sqlite3.Connection) -> Dict[int, List[str]]:
    row = conn.execute("SELECT models FROM col").fetchone()
    models_json = row[0]
    models = json.loads(models_json)
    model_fields: Dict[int, List[str]] = {}
    for key, model in models.items():
        try:
            model_id = int(key)
        except ValueError:
            # Keys should always be integers, ignore if not.
            continue
        model_fields[model_id] = [field["name"] for field in model["flds"]]
    return model_fields


def parse_fields(row_fields: str, field_names: List[str]) -> List[Tuple[str, str]]:
    values = row_fields.split(FIELD_SEP)
    # Pad the values to align with the field list length.
    if len(values) < len(field_names):
        values.extend([""] * (len(field_names) - len(values)))
    return list(zip(field_names, values))


def index_to_letter_suffix(index: int) -> str:
    """Generate alphabetic suffixes a, b, ..., z, aa, ab, ..."""

    if index < 0:
        raise ValueError("index must be non-negative")

    letters: List[str] = []
    while True:
        letters.append(chr(ord("a") + (index % 26)))
        index //= 26
        if index == 0:
            break
        index -= 1
    return "".join(reversed(letters))


def rewrite_field_audio(
    value: str,
    deck_index: int,
    entry_index: int,
    media_lookup: Dict[str, Path],
    audio_dir: Path,
    letter_counter: List[int],
    recorded_names: Set[str],
) -> str:
    if not value:
        return value

    def replace(match: re.Match[str]) -> str:
        media_name = match.group(1)
        source_path = media_lookup.get(media_name)
        if not source_path:
            return match.group(0)

        suffix = index_to_letter_suffix(letter_counter[0])
        letter_counter[0] += 1

        ext = Path(media_name).suffix or source_path.suffix
        new_name = f"{deck_index}-{entry_index}{suffix}{ext}"

        dest_path = audio_dir / new_name
        if new_name not in recorded_names:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_path, dest_path)
            recorded_names.add(new_name)

        return f"[sound:{new_name}]"

    return SOUND_PATTERN.sub(replace, value)


def write_xml(entries: List[List[Tuple[str, str]]], output_path: Path) -> None:
    root = ET.Element("entries")
    for note_fields in entries:
        entry_elem = ET.SubElement(root, "entry")
        for field_name, value in note_fields:
            field_elem = ET.SubElement(entry_elem, "field", name=field_name)
            field_elem.text = value

    indent_xml(root)
    tree = ET.ElementTree(root)
    output_path.write_bytes(
        ET.tostring(
            root,
            encoding="utf-8",
            xml_declaration=True,
        )
    )


def indent_xml(elem: ET.Element, level: int = 0) -> None:
    indent = "\n" + level * "    "
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = indent + "    "
        for child in elem:
            indent_xml(child, level + 1)
            if not child.tail or not child.tail.strip():
                child.tail = indent + "    "
        if not elem[-1].tail or not elem[-1].tail.strip():
            elem[-1].tail = indent
    elif level and (not elem.tail or not elem.tail.strip()):
        elem.tail = indent


def process_deck(deck_filename: str, deck_index: int) -> None:
    deck_path = DECKS_DIR / deck_filename
    deck_base = deck_path.with_suffix("")
    extract_path = EXTRACT_ROOT / deck_base.name
    unzip_deck(deck_path, extract_path)

    media_lookup = load_media_map(extract_path)
    db_path = locate_collection_db(extract_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        model_fields = load_model_fields(conn)
        cursor = conn.execute("SELECT id, mid, flds FROM notes ORDER BY id")
        xml_entries: List[List[Tuple[str, str]]] = []
        audio_dir = deck_base
        if audio_dir.exists():
            shutil.rmtree(audio_dir)
        audio_dir.mkdir(parents=True, exist_ok=True)
        recorded_names: Set[str] = set()

        for entry_index, row in enumerate(cursor, start=1):
            field_names = model_fields.get(row["mid"])
            if not field_names:
                continue
            field_pairs = parse_fields(row["flds"], field_names)
            letter_counter = [0]
            for idx, (name, value) in enumerate(field_pairs):
                updated_value = rewrite_field_audio(
                    value,
                    deck_index,
                    entry_index,
                    media_lookup,
                    audio_dir,
                    letter_counter,
                    recorded_names,
                )
                if updated_value != value:
                    field_pairs[idx] = (name, updated_value)
            xml_entries.append(field_pairs)

        write_xml(xml_entries, deck_base.with_suffix(".xml"))
    finally:
        conn.close()


def main() -> None:
    for deck_index, deck_filename in enumerate(DECKS, start=1):
        process_deck(deck_filename, deck_index)


if __name__ == "__main__":
    main()
