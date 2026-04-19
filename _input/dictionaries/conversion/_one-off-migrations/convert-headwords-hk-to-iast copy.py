#!/usr/bin/env python3
"""
Convert Harvard-Kyoto (HK) transliteration to IAST in CSV headwords.

This script reads pipe-separated CSV files (two columns: headword|definition),
converts the first column (headword) from Harvard-Kyoto transliteration to IAST
using the devatrans library, and writes the result back to the original file
location. The original files are moved to an old/ subfolder for backup.

Usage:
    python convert-headwords-hk-to-iast.py <file1.csv> [file2.csv ...]

Example:
    python convert-headwords-hk-to-iast.py mydict.csv
    python convert-headwords-hk-to-iast.py *.csv
"""

import os
import sys
import shutil
from devatrans import DevaTrans


def convert_file(filepath):
    """Convert HK headwords to IAST in a single pipe-separated CSV file."""
    filepath = os.path.abspath(filepath)
    if not os.path.isfile(filepath):
        print(f"Error: '{filepath}' is not a file or does not exist.", file=sys.stderr)
        return False

    directory = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    old_dir = os.path.join(directory, "old")

    # Read original content
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Convert headwords
    converter = DevaTrans()
    converted_lines = []
    for line_num, line in enumerate(lines, start=1):
        stripped = line.rstrip("\n").rstrip("\r")
        if "|" in stripped:
            headword, rest = stripped.split("|", 1)
            iast_headword = converter.inter_transliterate("sen", "hk", "iast", sentence=headword)
            converted_lines.append(f"{iast_headword}|{rest}\n")
        else:
            # Keep lines without a pipe separator as-is
            converted_lines.append(line)

    # Move original to old/ subfolder
    os.makedirs(old_dir, exist_ok=True)
    backup_path = os.path.join(old_dir, filename)
    shutil.move(filepath, backup_path)
    print(f"  Backup: {backup_path}")

    # Write converted file to original location
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(converted_lines)
    print(f"  Written: {filepath}")

    return True


def main():
    if len(sys.argv) < 2:
        print((__doc__ or "").strip())
        sys.exit(1)

    success = True
    for filepath in sys.argv[1:]:
        print(f"Converting: {filepath}")
        if not convert_file(filepath):
            success = False

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
