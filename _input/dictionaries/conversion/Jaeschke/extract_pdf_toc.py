#!/usr/bin/env python3
"""Extract Tibetan outline entries from a PDF and convert them to Wylie."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterable, Iterator, Tuple

from PyPDF2 import PdfReader
from PyPDF2.generic import Destination
from pyewts import pyewts

TIBETAN_BLOCK = re.compile(r"[\u0F00-\u0FFF]")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Path to the source PDF file")
    parser.add_argument(
        "output",
        type=Path,
        help="Destination file that will receive Wylie entries and page numbers",
    )
    return parser.parse_args()


def load_outline(reader: PdfReader) -> Iterable:
    try:
        return reader.outline  # type: ignore[attr-defined]
    except AttributeError:  # pragma: no cover - compatibility branch
        return reader.getOutlines()  # type: ignore[attr-defined]


def iter_outline_entries(outlines: Iterable) -> Iterator:
    for entry in outlines:
        if isinstance(entry, list):
            yield from iter_outline_entries(entry)
        else:
            yield entry


def extract_title(entry: object) -> str | None:
    if isinstance(entry, Destination):
        return str(entry.title)
    if hasattr(entry, "title"):
        title = getattr(entry, "title")
        if title is not None:
            return str(title)
    if isinstance(entry, dict) and "/Title" in entry:
        return str(entry.get("/Title"))
    if hasattr(entry, "get"):
        try:
            title = entry.get("/Title")  # type: ignore[call-arg]
        except Exception:  # pragma: no cover - defensive fallback
            title = None
        if title:
            return str(title)
    return None


def is_tibetan(text: str) -> bool:
    return bool(TIBETAN_BLOCK.search(text))


def entry_to_page(reader: PdfReader, entry: object) -> int | None:
    try:
        if isinstance(entry, Destination):
            destination = entry
        elif hasattr(entry, "destination"):
            destination = getattr(entry, "destination")
        else:
            destination = entry  # type: ignore[assignment]  # PyPDF2 outline items vary in shape
        page_index = reader.get_destination_page_number(destination)  # type: ignore[arg-type]
    except Exception:  # pragma: no cover - defensive fallback
        return None
    return page_index + 1  # convert from zero-based to one-based numbering

def convert_to_wylie(converter: pyewts, text: str) -> str | None:
    tibetan_only = "".join(char for char in text if ord(char) >= 0x0F00 and ord(char) <= 0x0FFF or char.isspace())
    if not tibetan_only.strip():
        return None
    try:
        result = converter.toWylie(tibetan_only.strip())
        result = re.sub(r"\s+$", "", result).strip()
        return result
    except Exception:  # pragma: no cover - conversion failures reported upstream
        return None


def collect_entries(reader: PdfReader) -> Iterator[Tuple[str, int]]:
    outlines = load_outline(reader)
    converter = pyewts()

    for raw_entry in iter_outline_entries(outlines):
        title = extract_title(raw_entry)
        if not title or not is_tibetan(title):
            continue

        page_number = entry_to_page(reader, raw_entry)
        if page_number is None:
            continue

        wylie = convert_to_wylie(converter, title)
        if not wylie:
            continue

        if page_number >= 27 and page_number <= 634:
            yield wylie, page_number


def write_output(entries: Iterator[Tuple[str, int]], destination: Path) -> None:
    with destination.open("w", encoding="utf-8", newline="") as handle:
        for wylie, page in entries:
            handle.write(f"{wylie}|{page}\n")


def main() -> None:
    args = parse_args()

    if not args.pdf.is_file():
        print(f"Input PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)

    reader = PdfReader(str(args.pdf))

    entries = list(collect_entries(reader))
    if not entries:
        print("No Tibetan outline entries detected.", file=sys.stderr)
        sys.exit(2)

    write_output(iter(entries), args.output)

    print(f"Wrote {len(entries)} entries to {args.output}")


if __name__ == "__main__":
    main()
