#!/usr/bin/env python3
"""
Convert Tibetan-only dictionary CSV files by wrapping the second column in curly braces.

Purpose:
  Adjusts pipe-separated CSV files (format: Column1|Column2) so that the second
  column is wrapped in curly braces { ... }. Any existing curly braces within the
  second column are reversed: "{" becomes "}" and "}" becomes "{".

  The original files are moved to an "old/" subfolder (relative to each input file),
  and the converted output is written to the original file location.

Usage:
  python convert-tibetan-only-dictionries.py <file1> [<file2> ...]

Example:
  python convert-tibetan-only-dictionries.py ../public/my_dict.csv
"""

import os
import sys
import shutil


def convert_line(line: str) -> str:
    """Convert a single line by wrapping the second column in curly braces."""
    # Preserve lines that don't contain a pipe (e.g. empty lines, comments)
    if "|" not in line:
        return line

    first, rest = line.split("|", 1)

    # Reverse existing curly braces in the second column
    swapped = rest.translate(str.maketrans("{}", "}{"))

    # Wrap the second column in curly braces
    return f"{first}|{{{swapped}}}"


def process_file(filepath: str) -> None:
    """Process a single file: move original to old/, write converted file."""
    filepath = os.path.abspath(filepath)

    if not os.path.isfile(filepath):
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    dirpath = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    old_dir = os.path.join(dirpath, "old")

    # Create old/ subfolder if it doesn't exist
    os.makedirs(old_dir, exist_ok=True)

    # Read original content
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Move original to old/
    dest = os.path.join(old_dir, filename)
    shutil.move(filepath, dest)
    print(f"  Moved original to {dest}")

    # Write converted file to the original location
    with open(filepath, "w", encoding="utf-8") as f:
        for line in lines:
            # Strip the line ending, convert, then re-add newline
            stripped = line.rstrip("\n\r")
            converted = convert_line(stripped)
            f.write(converted + "\n")

    print(f"  Wrote converted file to {filepath}")


def main() -> None:
    if len(sys.argv) < 2:
        print((__doc__ or "").strip())
        sys.exit(1)

    for filepath in sys.argv[1:]:
        print(f"Processing: {filepath}")
        process_file(filepath)

    print("Done.")


if __name__ == "__main__":
    main()
