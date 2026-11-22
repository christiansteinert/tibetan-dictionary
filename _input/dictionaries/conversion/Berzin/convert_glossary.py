#!/usr/bin/env python3
"""Convert download/glossary.json into the four
dictionary files used by the app, in the same format as the existing
public/03-Berzin, public/04-Berzin-Def, public_en/03-Berzin, public_en/04-Berzin-Def:

  public/03-Berzin         tibetan|English term
  public/04-Berzin-Def     tibetan|definition            (or  tibetan|See: target)
  public_en/03-Berzin      English key|{tibetan}: English term   (key without punctuation/parentheses)
  public_en/04-Berzin-Def  English term|definition       (or  English term|See: target)

Included: technical terms (incl. English-only terms, whose "definition" is made
from Sanskrit/Pali, alternative English terms and the translations into other
languages), proper names and text titles.

Tibetan is converted from Berzin's hyphenated Wylie ("'bras-bu", "dGa'-gdong")
to the lowercase, space-separated Wylie used by the dictionary ("'bras bu", "dga' gdong").

Overrides: if overrides/public/04-Berzin-Def or overrides/public_en/04-Berzin-Def
exist (created by extract_overrides.py, may be edited by hand), each of their
lines replaces the generated line with the same key that is most similar to it
(or is added if the key has no generated line). This keeps the longer offline
definitions that were shortened online.

Output goes to ./public and ./public_en next to this script (NOT to the real
dictionary folders) unless --out is given.

Usage: python3 convert_glossary.py [--types technical_term,proper_name,text_title]
                                    [--no-overrides] [--input download/glossary.json] [--out DIR]
"""
import argparse
import difflib
import json
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ALL_TYPES = "technical_term,proper_name,text_title"
OVERRIDE_FILES = ["public/04-Berzin-Def", "public_en/04-Berzin-Def"]

# language labels as they appear on the site -> label used in the definition text
TRANSLATION_LABELS = {"Jeffrey Hopkins En, Ti...": "Hopkins"}


def clean(s):
    """Single-line text without pipes (the field separator)."""
    s = (s or "").replace("\xa0", " ")
    s = re.sub(r"\s*\n\s*", " ", s)
    s = re.sub(r"[ \t]+", " ", s).strip()
    return s.replace("|", "/")


def wylie(s):
    """Berzin hyphenated Wylie -> lowercase space-separated Wylie."""
    s = clean(s)
    s = s.replace("’", "'").replace("‘", "'").replace("ʼ", "'")
    s = re.sub(r"\(\d+\)", " ", s)              # enumeration markers "(1)"
    s = s.strip(" .,;)(")
    # Berzin capitalizes the root letter of names (dGa'-gdong); in EWTS capitals
    # denote Sanskrit retroflexes etc., so lowercase everything
    s = s.lower()
    s = s.translate(str.maketrans({"ā": "A", "ī": "I", "ū": "U"}))  # EWTS long vowels
    s = re.sub(r"([aeiou]):", r"\1H", s)        # "Ka:-thog" = visarga
    s = s.replace("-", " ")
    return re.sub(r"\s+", " ", s).strip()


def plain_key(s):
    """Key style of the old public_en/03-Berzin: parentheticals removed,
    hyphens -> space, apostrophes/quotes and other punctuation dropped."""
    s = re.sub(r"\([^)]*\)", " ", s)
    s = s.replace("'", "").replace("’", "")
    s = re.sub(r"[^\w]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def tibetan_forms(field):
    """All Tibetan forms of a Tibetan field: main form, 'Alternative:',
    'Full:'/'Short:' (text titles), '[FULL: ...]' (names); variants separated
    by ',', ';' or ' / '."""
    forms = []
    text = (field or "").replace("，", ",")
    text = re.sub(r"\[\s*full\s*:\s*([^\]]*)\]", r"\n\1", text, flags=re.I)
    for line in text.split("\n"):
        line = re.sub(r"(?i)^\s*(alternative|full|short)\s*:", "", line).strip()
        for part in re.split(r"\s*[;,]\s*|\s+/\s+", line):
            w = wylie(part)
            if w and w not in forms:
                forms.append(w)
    return forms


def author_text(field):
    """'Gyeltsab Jey\\nTranslit.: rGyal-tshab rJe' -> 'Gyeltsab Jey (rgyal tshab rje)'"""
    name, translit = [], []
    for l in (field or "").split("\n"):
        l = l.strip()
        if not l:
            continue
        m = re.match(r"(?i)translit\.?\s*:\s*(.*)", l)
        if m:
            translit.append(wylie(m.group(1)))
        else:
            name.append(clean(l))
    s = "; ".join(name)
    if translit:
        s = f"{s} ({'; '.join(translit)})" if s else "; ".join(translit)
    return s


def sentence(s):
    s = s.strip()
    return s if not s or s[-1] in ".!?" or s.endswith(('."', '?"', '!"')) else s + "."


def definition_of(t):
    """Definition text of a record ('' if there is nothing to say)."""
    f = t.get("fields", {})
    typ = t.get("type")
    see = [clean(s["term"]) for s in t.get("see", []) if s.get("term")]
    see_text = "See: " + "; ".join(see) if see else ""
    skt, pali = clean(f.get("Sanskrit", "")), clean(f.get("Pali", ""))
    langs = " ".join(sentence(x) for x in (f"Skt: {skt}" if skt else "", f"Pali: {pali}" if pali else "") if x)

    if typ == "technical_term":
        definition = clean(f.get("Definition", ""))
        if definition or see_text or f.get("Tibetan", "").strip():
            return " ".join(x for x in (definition, see_text) if x)
        # English-only term: describe it by what the glossary has
        parts = [langs]
        alts = [clean(r["term"]) for r in t.get("referenced_by", []) if r.get("relation") == "alternative term"]
        if alts:
            parts.append(sentence("Alternative terms: " + "; ".join(alts)))
        tr = [f"{TRANSLATION_LABELS.get(k, k)}: {clean(v)}" for k, v in t.get("translations", {}).items() if clean(v)]
        if tr:
            parts.append("Translations – " + "; ".join(tr))
        return " ".join(p for p in parts if p).strip()

    if typ == "proper_name":
        meta = ", ".join(x for x in (clean(f.get("Type", "")), clean(f.get("Dates", ""))) if x)
        parts = [f"({meta})" if meta else "", sentence(clean(f.get("Explanation", ""))), langs, see_text]
        return " ".join(p for p in parts if p).strip()

    if typ == "text_title":
        author = author_text(f.get("Author", ""))
        parts = ["(Text)", sentence(f"Author: {author}") if author else "",
                 sentence(clean(f.get("Explanation", ""))), langs, see_text]
        return " ".join(p for p in parts if p).strip()
    return ""


def sort_key(line):
    # sort by key ignoring a leading apostrophe (Tibetan), case-insensitive
    return (line.split("|", 1)[0].lstrip("'").lower(), line)


def build(terms):
    tib_eng, tib_def, eng_tib, eng_def = [], [], [], []
    for t in terms:
        head = clean(t["headword"])
        if not head:
            continue
        tibs = tibetan_forms(t.get("fields", {}).get("Tibetan", ""))
        text = definition_of(t)
        for tib in tibs:
            tib_eng.append(f"{tib}|{head}")
            eng_tib.append(f"{plain_key(head)}|{{{tib}}}: {head}")
            if text:
                tib_def.append(f"{tib}|{text}")
        if text:
            eng_def.append(f"{head}|{text}")
    return {
        "public/03-Berzin": tib_eng,
        "public/04-Berzin-Def": tib_def,
        "public_en/03-Berzin": eng_tib,
        "public_en/04-Berzin-Def": eng_def,
    }


def read_override(path):
    out = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip() and not line.startswith("#") and "|" in line:
                out.append(tuple(line.split("|", 1)))
    return out


def apply_overrides(lines, overrides):
    """Per override line, replace the most similar generated line with the same key
    (each generated line is replaced at most once); add it if there is none."""
    lines = list(lines)
    by_key = defaultdict(list)
    for i, l in enumerate(lines):
        by_key[l.split("|", 1)[0]].append(i)
    done = set()
    replaced = added = 0
    for key, text in overrides:
        cands = [i for i in by_key.get(key, []) if i not in done]
        if cands:
            best = max(cands, key=lambda i: difflib.SequenceMatcher(None, text, lines[i].split("|", 1)[1]).ratio())
            lines[best] = f"{key}|{text}"
            done.add(best)
            replaced += 1
        else:
            lines.append(f"{key}|{text}")
            done.add(len(lines) - 1)
            added += 1
    return lines, replaced, added


def convert(glossary, types=ALL_TYPES, use_overrides=True, override_dir=HERE / "overrides"):
    types = set(types.split(","))
    terms = [t for t in glossary["terms"] if t.get("type") in types]
    files = {rel: list(dict.fromkeys(lines)) for rel, lines in build(terms).items()}
    stats = {}
    if use_overrides:
        for rel in OVERRIDE_FILES:
            ov = read_override(Path(override_dir) / rel)
            if ov:
                files[rel], r, a = apply_overrides(files[rel], ov)
                stats[rel] = (len(ov), r, a)
    return {rel: sorted(dict.fromkeys(lines), key=sort_key) for rel, lines in files.items()}, stats


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", default=str(HERE / "download" / "glossary.json"))
    ap.add_argument("--out", default=str(HERE), help="base directory for public/ and public_en/")
    ap.add_argument("--types", default=ALL_TYPES,
                    help=f"comma separated glossary types to include (default: {ALL_TYPES})")
    ap.add_argument("--no-overrides", action="store_true", help="do not apply overrides/")
    args = ap.parse_args()

    glossary = json.loads(Path(args.input).read_text(encoding="utf-8"))
    files, stats = convert(glossary, args.types, not args.no_overrides)
    for rel, (n, r, a) in stats.items():
        print(f"overrides/{rel}: {n} entries, {r} replaced, {a} added")
    for rel, lines in files.items():
        p = Path(args.out) / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{p}: {len(lines)} lines")


if __name__ == "__main__":
    main()
