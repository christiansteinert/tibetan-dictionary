#!/usr/bin/env python3
"""Convert Tibetan XML dictionary entries to CSV exports.

This utility scans the current working directory (or an optional path
argument) for XML files that contain an ``<entries>`` element populated with
``<entry>`` children. Selected fields are extracted, Tibetan text is converted
from Unicode to Wylie using ``pyewts``, and two CSV files are generated for each
source XML file: ``*-tib.csv`` and ``*-en.csv``.

The resulting CSV rows follow the formatting rules requested by the project:
all ``\n`` tokens are emitted literally and Tibetan segments inside
mixed-language passages are wrapped in curly braces after conversion to Wylie.

"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional
import xml.etree.ElementTree as ET

from pyewts import pyewts

TIBETAN_BLOCK = re.compile(r"[\u0F00-\u0FFF]+")
TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"\s+")

FIELD_ALIASES = {
    "བོད་སྐད།": "Tibetan",
    "word, tibetan": "Tibetan",
    "English": "English",
    "word, english": "English",
    "བོད་སྐད་སྒྲ་འབེབས།": "TibetanAudio",
    "Audio, word": "TibetanAudio",
    "Synonymous": "TibetanSynonyms",
    "Example": "EnglishExample",
    "sentence, english": "EnglishExample",
    "Acceptions": "OtherMeanings",
    "དཔེར་བརྗོད།": "TibetanExample",
    "Sentence, tibetan": "TibetanExample",
    "དཔེར་བརྗོད་སྒྲ་འབེབས།": "TibetanExampleAudio",
    "Audio, sentence": "TibetanExampleAudio",
    "syllables": "SyllableExplanation",
    "Morphemes": "SyllableExplanation",
}

EntryData = Dict[str, str]


def clean_text(raw: Optional[str]) -> str:
    """Strip HTML artefacts, collapse whitespace, and unescape entities."""

    if raw is None:
        return ""
    text = html.unescape(raw)
    text = TAG_PATTERN.sub(" ", text)
    text = text.replace("\xa0", " ")
    text = WHITESPACE_PATTERN.sub(" ", text)
    return text.strip()


def contains_only_tibetan(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    for char in stripped:
        if char.isspace():
            continue
        codepoint = ord(char)
        if 0x0F00 <= codepoint <= 0x0FFF:
            continue
        return False
    return True


def convert_tibetan(value: str, converter: pyewts) -> str:
    """Convert Tibetan Unicode runs to Wylie according to the requirements."""

    if not value:
        return ""
    text = value.strip()
    if not TIBETAN_BLOCK.search(text):
        return text
    if contains_only_tibetan(text):
        converted = converter.toWylie(text)
        return WHITESPACE_PATTERN.sub(" ", converted).strip()

    def replace_segment(match: re.Match[str]) -> str:
        segment = match.group(0)
        converted = converter.toWylie(segment)
        converted = WHITESPACE_PATTERN.sub(" ", converted).strip()
        return "{" + converted + "}"

    result = TIBETAN_BLOCK.sub(replace_segment, text)
    return WHITESPACE_PATTERN.sub(" ", result).strip()


def extract_entries(root: ET.Element, converter: pyewts) -> List[EntryData]:
    entries: List[EntryData] = []

    for entry in root.findall("entry"):
        record: EntryData = {}
        for field in entry.findall("field"):
            name = field.get("name")
            if not name:
                continue
            key = FIELD_ALIASES.get(name.strip())
            if not key:
                continue
            if record.get(key):
                continue
            raw_value = "".join(part or "" for part in field.itertext())
            cleaned = clean_text(raw_value)
            converted = convert_tibetan(cleaned, converter)
            if converted:
                record[key] = converted
        if record:
            entries.append(record)

    return entries


def format_example_block(record: EntryData) -> str:
    tib_example_audio = record.get("TibetanExampleAudio", "")
    tib_example = record.get("TibetanExample", "")
    english_example = record.get("EnglishExample", "")

    if not (tib_example_audio or tib_example or english_example):
        return ""


    parts: List[str] = []
    parts.append("\\n-----\\nExample: ")

    if tib_example_audio:
        parts.append(tib_example_audio)
    parts.append("\\n")

    example_bits: List[str] = []
    if tib_example:
        example_bits.append("{" + tib_example + "} ")
    if english_example:
        example_bits.append(english_example)

    if example_bits:
        parts.append(" " + " ".join(example_bits))

    return "".join(parts)


def format_other_meanings(record: EntryData) -> str:
    other = record.get("OtherMeanings", "")
    if not other:
        return ""
    return " (Other meanings: " + other + ")"


def format_synonyms(record: EntryData) -> str:
    synonyms = record.get("TibetanSynonyms", "")
    if not synonyms:
        return ""
    return "\\nSynonyms: {" + synonyms + "}"


def format_syllables(record: EntryData) -> str:
    syllables = record.get("SyllableExplanation", "")
    if not syllables:
        return ""
    return "\\nSyllables: " + syllables


def build_tibetan_line(record: EntryData) -> Optional[str]:
    tibetan = record.get("Tibetan", "").replace("{", "").replace("/", "")
    tibetan_audio = record.get("TibetanAudio", "")
    english = record.get("English", "")

    if not (tibetan):
        return None


    pieces: List[str] = []
    
    pieces.append(tibetan)
    pieces.append("|")

    if tibetan_audio:
        pieces.append(tibetan_audio)
        pieces.append("\\n")

    pieces.append("{" + tibetan + "}")
    pieces.append(" ")

    if english:
        pieces.append(english)

    pieces.append(format_other_meanings(record))
    pieces.append(format_synonyms(record))
    pieces.append(format_syllables(record))
    pieces.append(format_example_block(record))

    line = "".join(part for part in pieces if part)
    return line if line else None


def build_english_lines(record: EntryData) -> List[str]:
    tibetan = record.get("Tibetan", "")
    tibetan_audio = record.get("TibetanAudio", "")
    english = record.get("English", "")

    if not (english or tibetan or record.get("EnglishExample")):
        return []

    # format definition
    definition_parts: List[str] = []
    
    if tibetan_audio:
        definition_parts.append(tibetan_audio)
        definition_parts.append("\\n")

    definition_parts.append("{" + tibetan + "}")
    definition_parts.append(" ")

    if english:
        definition_parts.append(english)

    definition_parts.append(format_other_meanings(record))
    definition_parts.append(format_synonyms(record))
    definition_parts.append(format_syllables(record))
    definition_parts.append(format_example_block(record))

    suffix = "".join(part for part in definition_parts if part)

    # format term and split into multiple if needed

    english = re.sub(r"[?!\.…]", "", english)
    english = re.sub(r"\[[^\]]*\]", "", english)
    english = re.sub(r"\{[^\}]*\}", "", english)
    english = re.sub(r"\([^\)]*\)", "", english)

    if "/" in english:
        variants = english.split("/") if "/" in english else ([english] if english else [])
    else:
        variants = english.split(",") if "," in english else ([english] if english else [])


    # build lines
    lines: List[str] = []
    for variant in variants:
        variant = re.sub(r"\s+", " ", variant).strip()
        variant = variant.lower()

        if not variant:
            continue
        if "," in variant:
            continue
        lines.append(variant + "|" + suffix)

    return lines


def write_csv(destination: Path, rows: Iterable[str]) -> None:
    with destination.open("w", encoding="utf-8", newline="") as handle:
        for row in rows:
            handle.write(row)
            handle.write("\n")


def process_file(path: Path, converter: pyewts) -> None:
    tree = ET.parse(str(path))
    root = tree.getroot()
    if root.tag != "entries":
        entries_node = root.find("entries")
        if entries_node is None:
            raise ValueError(f"No <entries> node found in {path}")
        root = entries_node

    records = extract_entries(root, converter)

    tib_lines = [line for record in records if (line := build_tibetan_line(record))]

    en_lines: List[str] = []
    for record in records:
        en_lines.extend(build_english_lines(record))

    tib_destination = path.with_name(f"{path.stem}-tib.csv")
    en_destination = path.with_name(f"{path.stem}-en.csv")

    write_csv(tib_destination, tib_lines)
    write_csv(en_destination, en_lines)

    print(
        f"Processed {path.name}: {len(records)} entries -> "
        f"{tib_destination.name}, {en_destination.name}"
    )


def iter_xml_files(base: Path) -> Iterable[Path]:
    return sorted(p for p in base.iterdir() if p.suffix.lower() == ".xml")


def main(argv: Optional[List[str]] = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    target = Path(args[0]) if args else Path.cwd()

    if target.is_file():
        xml_files = [target]
    else:
        xml_files = list(iter_xml_files(target))

    if not xml_files:
        print(f"No XML files found in {target}", file=sys.stderr)
        return 1

    converter = pyewts()

    for xml_file in xml_files:
        try:
            process_file(xml_file, converter)
        except Exception as exc:  # pragma: no cover - user feedback path
            print(f"Failed to process {xml_file}: {exc}", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
