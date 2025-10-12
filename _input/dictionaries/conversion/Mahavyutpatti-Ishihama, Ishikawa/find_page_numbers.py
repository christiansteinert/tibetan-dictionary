#!/usr/bin/env python3
"""Generate page number mappings for the Mahavyutpatti dictionary."""

from __future__ import annotations

import argparse
import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Tuple
from xml.etree import ElementTree as ET

from PyPDF2 import PdfReader
from devatrans import DevaTrans

XML_NS = "http://www.tei-c.org/ns/1.0"
XML_LANG_NS = "http://www.w3.org/XML/1998/namespace"

START_PAGE = 43
END_PAGE = 485


@dataclass
class Entry:
    key: str
    term: str
    sanskrit: Optional[str]


@dataclass
class PageAssignment:
    key: str
    term: str
    sanskrit: Optional[str]
    page: Optional[int]
    interpolated: bool


def normalize_whitespace(value: str) -> str:
    """Collapse runs of whitespace into single spaces."""
    return " ".join(value.split())


def expand_parenthetical_variants(term: str) -> List[str]:
    """Create variants with and without parenthetical content."""
    if "(" not in term or ")" not in term:
        return [normalize_whitespace(term)]

    without_content = re.sub(r"\([^)]*\)", " ", term)
    without_content = normalize_whitespace(without_content)

    without_parentheses = re.sub(r"[()]", "", term)
    without_parentheses = normalize_whitespace(without_parentheses)

    variants: List[str] = []
    for candidate in [without_content, without_parentheses]:
        if candidate and candidate not in variants:
            variants.append(candidate)

    if not variants:
        variants.append(normalize_whitespace(term))

    return variants


def iter_entries(xml_path: Path) -> Iterator[Entry]:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    ns = {"tei": XML_NS, "xml": XML_LANG_NS}
    lang_attr = f"{{{XML_LANG_NS}}}lang"

    for entry in root.findall(".//tei:entry", ns):
        key = entry.get("key")
        if not key:
            continue

        sanskrit_node = entry.find("tei:form/tei:orth[@xml:lang='san-Latn']", ns)
        sanskrit = None
        if sanskrit_node is not None:
            sanskrit_text = normalize_whitespace("".join(sanskrit_node.itertext()))
            sanskrit = sanskrit_text or None

        translation = None
        for cit in entry.findall("tei:cit", ns):
            if cit.get("type") != "translation":
                continue
            if cit.get(lang_attr) != "bod-Latn":
                continue
            text = "".join(cit.itertext())
            text = normalize_whitespace(text)
            if text:
                translation = text
                break

        if translation:
            for raw_part in translation.split("/"):
                cleaned_part = normalize_whitespace(raw_part)
                if not cleaned_part:
                    continue
                variants = expand_parenthetical_variants(cleaned_part)
                for variant in variants:
                    yield Entry(key=key.strip(), term=variant, sanskrit=sanskrit)


def build_search_regex(pattern_template: str) -> re.Pattern[str]:
    placeholder = "<key>"
    if placeholder not in pattern_template:
        raise ValueError("Search pattern must contain '<key>' placeholder.")
    regex_pattern = pattern_template.replace(placeholder, r"(?P<key>\d+)")
    return re.compile(regex_pattern)


def parse_replacements(raw_pairs: Sequence[str]) -> List[Tuple[str, str]]:
    replacements: List[Tuple[str, str]] = []
    for raw in raw_pairs:
        if "|" not in raw:
            raise ValueError(f"Invalid --replace value '{raw}'. Use 'from|to' format.")
        source, target = raw.split("|", 1)
        replacements.append((source, target))
    return replacements


def apply_replacements(text: str, replacements: Sequence[Tuple[str, str]]) -> str:
    for source, target in replacements:
        if source:
            text = text.replace(source, target)
    return text


def index_pdf_keys(
    pdf_path: Path,
    start_page: int,
    end_page: int,
    pattern_template: str,
    replacements: Sequence[Tuple[str, str]],
) -> Dict[str, int]:
    reader = PdfReader(str(pdf_path))
    pattern = build_search_regex(pattern_template)
    print(f"Using search pattern: {pattern.pattern}")

    key_to_page: Dict[str, int] = {}

    total_pages = len(reader.pages)
    if start_page < 1 or end_page > total_pages:
        raise ValueError(
            f"Requested page range {start_page}-{end_page} outside of PDF bounds 1-{total_pages}."
        )

    for page_index in range(start_page - 1, end_page):
        page = reader.pages[page_index]
        raw_text = page.extract_text() or ""
        processed_text = apply_replacements(raw_text, replacements)

        matches = list(pattern.finditer(processed_text))
        if not matches:
            # handle common ocr mistake
            processed_text = processed_text.replace("1", "l")
            matches = list(pattern.finditer(processed_text))
        for match in matches:
            key = match.group("key")
            if key not in key_to_page:
                key_to_page[key] = page_index + 1

    return key_to_page


def assign_pages(
    entries: Iterable[Entry],
    key_to_page: Dict[str, int],
    skip_missing: bool = False,
) -> List[PageAssignment]:
    if skip_missing:
        results: List[PageAssignment] = []
        for entry in entries:
            page = key_to_page.get(entry.key)
            if page is None:
                continue
            results.append(PageAssignment(entry.key, entry.term, entry.sanskrit, page, False))
        return results

    assignments: List[PageAssignment] = []
    previous_page: Optional[int] = None
    pending: List[Entry] = []

    for entry in entries:
        page = key_to_page.get(entry.key)

        if page is None:
            if previous_page is not None:
                assignments.append(PageAssignment(entry.key, entry.term, entry.sanskrit, previous_page, True))
            else:
                pending.append(entry)
            continue

        if pending:
            for pending_entry in pending:
                assignments.append(
                    PageAssignment(pending_entry.key, pending_entry.term, pending_entry.sanskrit, page, True)
                )
            pending.clear()

        assignments.append(PageAssignment(entry.key, entry.term, entry.sanskrit, page, False))
        previous_page = page

    if pending:
        for pending_entry in pending:
            assignments.append(PageAssignment(pending_entry.key, pending_entry.term, pending_entry.sanskrit, None, True))

    return assignments


def write_assignments(output_path: Path, assignments: Iterable[PageAssignment]) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="|", lineterminator="\n")
        for entry in assignments:
            if entry.page is None:
                print(
                    f"Warning: No page found for key {entry.key} (term '{entry.term}'), skipping.",
                    file=sys.stderr,
                )
                continue
            suffix = "?" if entry.interpolated else ""
            writer.writerow([entry.term, f"{entry.page}{suffix}"])


def write_sanskrit_assignments(
    output_path: Path,
    assignments: Iterable[PageAssignment],
    transliterator: DevaTrans,
) -> None:
    seen: set[Tuple[str, int, bool]] = set()
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="|", lineterminator="\n")
        for entry in assignments:
            if not entry.sanskrit:
                continue
            if entry.page is None:
                print(
                    f"Warning: No page found for key {entry.key} (Skt '{entry.sanskrit}'), skipping.",
                    file=sys.stderr,
                )
                continue
            # Remove parenthetical content and alternatives after slashes
            cleaned_skt = re.sub(r"\([^)]*\)", " ", entry.sanskrit)
            cleaned_skt = cleaned_skt.split("/", 1)[0]
            cleaned_skt = normalize_whitespace(cleaned_skt)
            if not cleaned_skt:
                continue
            try:

                hk = transliterator.inter_transliterate(
                    input_type="sen",
                    from_convention="iast",
                    to_convention="hk",
                    sentence=cleaned_skt,
                )
                hk = hk.replace("z ", "z")  # remove additional space that is added by the transliterator
            except Exception as exc:
                print(
                    f"Warning: Failed to transliterate Sanskrit term '{entry.sanskrit}': {exc}",
                    file=sys.stderr,
                )
                continue
            hk = normalize_whitespace(hk)
            if not hk:
                continue
            key = (hk, entry.page, entry.interpolated)
            #if key in seen:
            #    continue
            seen.add(key)
            suffix = "?" if entry.interpolated else ""
            writer.writerow([hk, f"{entry.page}{suffix}"])


def parse_args() -> argparse.Namespace:
    default_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--xml",
        default=default_dir / "ddbc.mahavyutpatti.tei.p5.xml",
        type=Path,
        help="Path to the TEI XML file.",
    )
    parser.add_argument(
        "--pdf",
        default=default_dir / "Ishihama_1989_Bye rtogs chen mo-improved OCR.pdf",
        type=Path,
        help="Path to the PDF file.",
    )
    parser.add_argument(
        "--output",
        default=default_dir / "page_numbers_1989.csv",
        type=Path,
        help="Output CSV path.",
    )
    parser.add_argument(
        "--start-page",
        default=START_PAGE,
        type=int,
        help="First page to consider (1-based).",
    )
    parser.add_argument(
        "--end-page",
        default=END_PAGE,
        type=int,
        help="Last page to consider (1-based, inclusive).",
    )
    parser.add_argument(
        "--skip-missing",
        action="store_true",
        help="Skip entries that cannot be matched directly instead of interpolating.",
    )
    parser.add_argument(
        "--search-pattern",
        default=r"\(S\.\s*<key>\)",
        help="Regex pattern used to locate keys in the PDF; use '<key>' as placeholder.",
    )
    parser.add_argument(
        "--replace",
        action="append",
        default=[],
        metavar="FROM|TO",
        help="Replace text in extracted PDF content before matching; can be repeated.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.xml.is_file():
        print(f"XML file not found: {args.xml}", file=sys.stderr)
        return 1
    if not args.pdf.is_file():
        print(f"PDF file not found: {args.pdf}", file=sys.stderr)
        return 1

    entries = list(iter_entries(args.xml))
    if not entries:
        print("No valid entries found in XML.", file=sys.stderr)
        return 1

    try:
        replacements = parse_replacements(args.replace)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    try:
        key_to_page = index_pdf_keys(
            args.pdf,
            args.start_page,
            args.end_page,
            args.search_pattern,
            replacements,
        )
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    assignments = assign_pages(entries, key_to_page, skip_missing=args.skip_missing)
    write_assignments(args.output, assignments)

    transliterator = DevaTrans()
    skt_output = args.output.with_name(f"{args.output.stem}-skt.csv")
    write_sanskrit_assignments(skt_output, assignments, transliterator)

    print(f"Wrote {args.output} and {skt_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
