#!/usr/bin/env python3
"""Extract allowed words that match dictionary headwords under specific rules."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from pyewts import pyewts
from tibetan_sort.tibetan_sort import TibetanSort

tibConverter = pyewts()
tibSort = TibetanSort()


def is_less_than(tibTerm1: str, tibTerm2: str) -> bool:
    """Compare two Tibetan terms using Tibetan sorting rules."""
    tibUni1 = tibConverter.toUnicode(tibTerm1)
    tibUni2 = tibConverter.toUnicode(tibTerm2)
    return tibSort.compare(tibUni1, tibUni2) < 0


def read_toc(path: Path) -> list[tuple[str, str]]:
    items: list[tuple[str, str]] = []
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            head_part, number_part = (line.split("|", 1) + [""])[:2]
            head = head_part.strip()
            if not head:
                continue
            number = number_part.strip()
            items.append((head, number))
    return items


def read_allowed(path: Path) -> list[str]:
    items: list[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if line:
                items.append(line)
    return items


def format_output(entry: str, number: str, question: bool = False) -> str:
    suffix = number
    if question:
        suffix = f"{number}?" if number else "?"
    if suffix:
        return f"{entry}|{suffix}"
    return entry


def collect_matches(
    toc_heads: list[tuple[str, str]], allowed_words: list[str]
) -> list[str]:
    alreadyAddedTocEntries: set[str] = set()
    matches: list[str] = []
    i = 0
    j = 0
    while i < len(toc_heads) and j < len(allowed_words):
        current_head, current_number = toc_heads[i]
        next_head = toc_heads[i + 1] if i + 1 < len(toc_heads) else None
        current_allowed = allowed_words[j]

        if current_allowed == current_head:
            matches.append(format_output(current_head, current_number, question=False))
            alreadyAddedTocEntries.add(current_head)
            j += 1
            continue

        if next_head is not None:
            if next_head[0] == current_allowed:
                if(not current_head in alreadyAddedTocEntries):
                    # even if the current toc entry is not in the list of known words from other dictionaries, 
                    # still add it to the output
                    matches.append(format_output(current_head, current_number, question=False))
                    alreadyAddedTocEntries.add(current_head)

                i += 1 # re-sync toc index to next entry in list of known words
                continue

            if next_head[0] == current_head:
                i += 1 # duplicate entry in TOC. Skip it.
                continue


        if current_allowed.lower().startswith(current_head.lower() + ' '):
            matches.append(format_output(current_allowed, current_number, question=True))
            j += 1
            continue

        if next_head is not None:
            if is_less_than(next_head[0], current_allowed):
                if(not current_head in alreadyAddedTocEntries):
                    # even if the current toc entry is not in the list of known words from other dictionaries, 
                    # still add it to the output
                    matches.append(format_output(current_head, current_number, question=False))
                    alreadyAddedTocEntries.add(current_head)
                
                i += 1
                continue

        # term from word list does not match current headword - skip it
        j += 1

    return matches


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find allowed words that match toc headwords with the specified rules.",
    )
    parser.add_argument("toc", nargs="?", default="toc-sorted.txt", help="Path to toc.txt")
    parser.add_argument(
        "allowed",
        nargs="?",
        default="allowed_words.txt",
        help="Path to allowed_words.txt",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    toc_path = Path(args.toc)
    allowed_path = Path(args.allowed)

    if not toc_path.is_file():
        print(f"error: toc file not found: {toc_path}", file=sys.stderr)
        return 1
    if not allowed_path.is_file():
        print(f"error: allowed words file not found: {allowed_path}", file=sys.stderr)
        return 1

    toc_heads = read_toc(toc_path)
    allowed_words = read_allowed(allowed_path)

    matches = collect_matches(toc_heads, allowed_words)

    for entry in matches:
        print(entry)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
