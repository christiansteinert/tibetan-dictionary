
import csv
import sys
import re

# Basic IAST → Harvard Kyoto mapping table
IAST_TO_HK = {
    "ā": "A", "ī": "I", "ū": "U",
    "ṛ": "R", "ṝ": "RR", "ḷ": "L", "ḹ": "LL",
    "ṅ": "G", "ñ": "J", "ṭ": "T", "ḍ": "D",
    "ṇ": "N", "ś": "z", "ṣ": "S",
    "ḥ": "H", "ṃ": "M",
    "Ā": "A", "Ī": "I", "Ū": "U",
    "Ṛ": "R", "Ṝ": "RR", "Ḷ": "L", "Ḹ": "LL",
    "Ṅ": "G", "Ñ": "J", "Ṭ": "T", "Ḍ": "D",
    "Ṇ": "N", "Ś": "z", "Ṣ": "S",
    "Ḥ": "H", "Ṃ": "M"
}

# Regex to detect if text contains any IAST diacriticals
IAST_DIACRITICS_PATTERN = re.compile(r"[āīūṛṝḷḹṅñṭḍṇśṣḥṃĀĪŪṚṜḶḸṄÑṬḌṆŚṢḤṂ]")

def iast_to_hk(text):
    return "".join(IAST_TO_HK.get(ch, ch) for ch in text)

def main():
    reader = csv.reader(sys.stdin, delimiter='\t')
    writer = csv.writer(sys.stdout, delimiter='|', lineterminator='\n')

    for row in reader:
        if len(row) < 2:
            continue  # skip malformed lines
        first, second = row[0], row[1]
        if IAST_DIACRITICS_PATTERN.search(first):
            first = first.lower()
            first = iast_to_hk(first)
        writer.writerow([first, second])

if __name__ == "__main__":
    main()
