#!/usr/bin/env python3
from __future__ import annotations

import sys
from functools import cmp_to_key
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

from pyewts import pyewts
from tibetan_sort.tibetan_sort import TibetanSort

# Type aliases for readability
WylieTerm = str
UnicodeTerm = str
HeadwordEntry = Tuple[int, UnicodeTerm]
WordEntry = Tuple[UnicodeTerm, WylieTerm]
Assignment = Tuple[int, bool]


def normalize_tibetan(term: UnicodeTerm) -> UnicodeTerm:
    """Strip trailing tshegs/spaces that can vary between sources."""

    return term.rstrip(" \u0f0b")


def load_allowed_words(path: Path) -> set[WylieTerm]:
    allowed: set[WylieTerm] = set()
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            allowed.add(line)
    return allowed


def load_wordlist(path: Path, allowed: set[WylieTerm]) -> List[WylieTerm]:
    words: List[WylieTerm] = []
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            # Skip comment markers that occasionally appear in intermediary exports
            if line.startswith("/*") or line.endswith("*/"):
                continue
            if line in allowed:
                words.append(line)
    return words


def load_wordlists(paths: Sequence[Path], allowed: set[WylieTerm]) -> List[WylieTerm]:
    filtered: set[WylieTerm] = set()
    for path in paths:
        filtered.update(load_wordlist(path, allowed))
    return list(filtered)


def parse_headword_pages(path: Path) -> List[HeadwordEntry]:
    entries: List[HeadwordEntry] = []
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            if not stripped[0].isdigit():
                continue
            number_part, _, remainder = stripped.partition(".")
            try:
                page_number = int(number_part)
            except ValueError:
                continue
            tibetan = remainder.strip()
            if not tibetan:
                continue
            if "(" in tibetan:
                tibetan = tibetan.split("(", 1)[0].strip()
            if not tibetan:
                continue
            entries.append((page_number, normalize_tibetan(tibetan)))
    if not entries:
        raise ValueError(f"No headword entries loaded from {path}")
    return entries


def convert_wylie_terms(terms: Iterable[WylieTerm], converter: Any) -> List[WordEntry]:
    converted: List[WordEntry] = []
    for term in terms:
        try:
            unicode_term = normalize_tibetan(converter.toUnicode(term))
        except Exception as exc:  # pragma: no cover - defensive logging only
            print(f"Skipping term due to conversion error for '{term}': {exc}", file=sys.stderr)
            continue
        if not unicode_term:
            continue
        converted.append((unicode_term, term))
    return converted


def sort_word_entries(entries: Sequence[WordEntry], sorter: TibetanSort) -> List[WordEntry]:
    def tibetan_cmp(left: WordEntry, right: WordEntry) -> int:
        return sorter.compare(left[0], right[0])

    return sorted(entries, key=cmp_to_key(tibetan_cmp))


def sort_headwords(entries: Sequence[HeadwordEntry], sorter: TibetanSort) -> List[HeadwordEntry]:
    def tibetan_cmp(left: HeadwordEntry, right: HeadwordEntry) -> int:
        return sorter.compare(left[1], right[1])

    return sorted(entries, key=cmp_to_key(tibetan_cmp))


def assign_pages(
    words: Sequence[WordEntry], headwords: Sequence[HeadwordEntry], sorter: TibetanSort
) -> Dict[WylieTerm, Assignment]:
    if not headwords:
        raise ValueError("Headword reference list is empty.")

    assignments: Dict[WylieTerm, Assignment] = {}
    head_index = 0
    for unicode_term, wylie_term in words:
        # Advance through headwords while the next headword is lexically <= the current term
        while head_index + 1 < len(headwords) and sorter.compare(headwords[head_index + 1][1], unicode_term) <= 0:
            head_index += 1
        current_headword = headwords[head_index]
        # If the current headword is lexically greater than the term, fall back to the earliest page
        comparison = sorter.compare(current_headword[1], unicode_term)
        if comparison > 0:
            assigned_page = headwords[0][0]
            is_interpolated = True
        else:
            assigned_page = current_headword[0]
            is_interpolated = comparison != 0
        assignments[wylie_term] = (assigned_page, is_interpolated)
    return assignments


def write_output(
    words: Sequence[WordEntry], assignments: Dict[WylieTerm, Assignment], output_path: Path
) -> None:
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        for unicode_term, wylie_term in words:
            page_number, is_interpolated = assignments[wylie_term]
            suffix = "?" if is_interpolated else ""
            handle.write(f"{wylie_term}|{page_number}{suffix}\n")


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    wordlist_paths = [
        base_dir / "wordlist1.txt",
        base_dir / "wordlist2.txt",
        base_dir / "wordlist3.txt",
    ]
    allowed_path = base_dir / "allowed_words.txt"
    headword_pages_path = base_dir / "headword_pages.txt"
    output_path = base_dir / "das_page_numbers.csv"

    converter = pyewts()
    sorter = TibetanSort()

    allowed_words = load_allowed_words(allowed_path)
    filtered_wylie_terms = load_wordlists(wordlist_paths, allowed_words)
    word_entries = convert_wylie_terms(filtered_wylie_terms, converter)
    sorted_word_entries = sort_word_entries(word_entries, sorter)
    headword_entries = parse_headword_pages(headword_pages_path)
    sorted_headwords = sort_headwords(headword_entries, sorter)
    assignments = assign_pages(sorted_word_entries, sorted_headwords, sorter)
    write_output(sorted_word_entries, assignments, output_path)

    print(
        "Generated",
        output_path.name,
        f"with {len(assignments)} assigned terms using {len(sorted_headwords)} headword anchors.",
    )


if __name__ == "__main__":
    main()
