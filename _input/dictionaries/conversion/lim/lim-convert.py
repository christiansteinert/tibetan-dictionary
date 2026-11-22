#!/usr/bin/env python3
"""Convert "A Visual Dictionary of Tibetan Verb Valency: Data" (Lexicography in Motion, SOAS,
Zenodo 10.5281/zenodo.5596064, CC BY 4.0) into the dictionary input format  WylieTerm|Definition.

    ./lim-convert.py [--with-translations] [--out 69-LIM-Valency]

Downloads the JSON data and its documentation into download/ (once), then writes one entry per
verb: senses, corpus frequency per period, the most frequent argument patterns, one corpus
example per frequent pattern (Tibetan in {Wylie}, with the words filling the arguments), and
semantically related verbs.  Homographs (Hill's numbering, ལྟ་√1 / ལྟ་√2) become separate entries
of the same headword, marked "Homograph 1".

English translations of the examples come from published translations (see README.md); they
are only included with --with-translations.

Dependency: pyewts (Unicode Tibetan -> Wylie):  pip install pyewts
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

import pyewts

HERE = Path(__file__).resolve().parent
ZENODO = "https://zenodo.org/api/records/5596064/files/"
FILES = {
    "data": "LIM_TibetanVerbValencyDictionary_data.json",
    "doc": "LIM_TibetanVerbValencyDictionary_documentation.md",
}
PERIODS = ("Old", "Classical", "Contemporary")
MAX_PATTERNS = 8          # argument patterns listed per verb
MAX_EXAMPLES = 5          # examples per verb (one per frequent pattern)
MAX_SENSES = 12
MAX_RELATED = 8
MAX_CITATION = 70         # Tibetan characters (≈ 160 Wylie characters)
ARG_KEYS = ("arg1", "arg2", "arg2:hon", "arg2:lvc", "arg3", "argcl", "obl", "obl:arg", "obl:adv",
            "aux", "aux:lvc", "cop")

converter = pyewts.pyewts()


def download(dest: Path) -> dict[str, Path]:
    dest.mkdir(exist_ok=True)
    paths = {}
    for key, name in FILES.items():
        p = dest / name
        if not p.exists():
            print(f"downloading {name} ...", file=sys.stderr)
            with urllib.request.urlopen(f"{ZENODO}{name}/content", timeout=300) as r:
                p.write_bytes(r.read())
        paths[key] = p
    return paths


# affix particles the corpus writes as separate tokens (ང འི་ = ངའི་, ལྷ་མོ ས་ = ལྷ་མོས་)
AFFIXES = {"འི", "ས", "ར", "འོ", "འམ", "འང", "འུ", "འིས"}


def join_tokens(tib: str) -> str:
    """Corpus citations are tokenised with spaces; Tibetan is written without them.  Affix
    particles attach to the previous token, otherwise a missing tsheg is inserted."""
    out = ""
    for tok in tib.split():
        if not out or out.endswith(("་", "།")) or tok.rstrip("་") in AFFIXES:
            out += tok
        else:
            out += "་" + tok
    return out


def wylie(tib: str) -> str:
    """Unicode Tibetan -> Wylie (for use inside {...} in a definition)."""
    tib = re.sub(r"</?b>", "", tib)
    tib = re.sub(r"√[^\s་]*", "", tib)             # lemma marks of argument words: ཁྱོད་√p
    w = converter.toWylie(join_tokens(tib))
    w = re.sub(r"\s*\[[^\]]*\]\s*", " / ", w)    # pyewts: [,] for non-Tibetan punctuation
    w = re.sub(r"\s+", " ", w.replace("*", " ")).strip().strip("/").strip()
    return w.replace("{", "(").replace("}", ")").replace("|", "/")


def headword(lemma_id: str) -> tuple[str, str]:
    """'ལྟ་√1' -> ('lta', '1');  'བདེ་བ་' -> ('bde ba', '')"""
    tib, _, hom = lemma_id.partition("√")
    return wylie(tib), (hom if hom.isdigit() else "")


def by_period(item: dict) -> str:
    parts = [f"{p} {item[p]}" for p in PERIODS if item.get(p)]
    return f" ({', '.join(parts)})" if parts else ""


def clean_text(s: str) -> str:
    return re.sub(r"\s+", " ", s).replace("|", "/").strip()


def pick_example(examples: list[dict], with_translations: bool) -> dict | None:
    """Prefer short citations (whole paragraphs are hard to read in a dictionary), then Classical,
    Old, Contemporary Tibetan; translated ones if translations are wanted; then the corpus' "good
    example" score (Gdex)."""
    order = {"Classical": 0, "Old": 1, "Contemporary": 2}

    def key(e):
        translated = e.get("Translation", "not available") != "not available"
        cit = e.get("Citation", "")
        too_long = len(re.sub(r"\s+", "", cit)) > MAX_CITATION
        gaps = "[" in cit                         # lacunae / editorial brackets ([---], [ཁོག])
        return (too_long or gaps, order.get(e.get("Period"), 9), not (with_translations and translated),
                -float(e.get("Gdex") or 0))
    examples = [e for e in examples if "[" not in e.get("Citation", "")]   # would garble in {Wylie}
    return min(examples, key=key) if examples else None


def entry(lemma_id: str, v: dict, hom: str, with_translations: bool) -> str:
    lines = []
    hw, _ = headword(lemma_id)
    if hom:
        lines.append(f"Homograph {hom} of {{{hw}}}")
    senses = [clean_text(s) for s in v.get("Senses") or [] if s and "not available" not in s]
    if senses:
        lines.append("Senses: " + "; ".join(dict.fromkeys(senses[:MAX_SENSES])))
    freq = (v.get("VerbFrequency") or [{}])[0]
    if freq.get("TotalFreq"):
        lines.append(f"LIM Corpus frequency: {freq['TotalFreq']}{by_period(freq)}")
    pats = sorted(v.get("ArgumentPatterns") or [], key=lambda p: -p.get("TotalFreq", 0))
    if pats:
        lines.append("Argument patterns:")
        lines += [f"• {p['Pattern']}: {p['TotalFreq']}{by_period(p)}" for p in pats[:MAX_PATTERNS]]
    examples = []
    for p in pats:
        e = pick_example((v.get("Examples") or {}).get(p["Pattern"]) or [], with_translations)
        if e:
            examples.append((p["Pattern"], e))
        if len(examples) >= MAX_EXAMPLES:
            break
    if examples:
        lines.append("Examples:")
        for pat, e in examples:
            args = [f"{k} {{{wylie(e[k])}}}" for k in ARG_KEYS if e.get(k)]
            meta = ", ".join(x for x in (e.get("Source", ""), e.get("Period", "")) if x)
            line = f"• [{pat}] {{{wylie(e['Citation'])}}}"
            if e.get("WordForms"):
                line += f" — verb form {{{wylie(e['WordForms'])}}}"
            if args:
                line += f"; {', '.join(args)}"
            if meta:
                line += f" ({meta})"
            lines.append(line)
            tr = e.get("Translation")
            if with_translations and tr and tr != "not available":
                lines.append(f"  “{clean_text(tr)}”")
    related: dict[str, list[str]] = {}          # shared sense -> related verbs
    for r in (v.get("SemanticallyRelatedVerbs") or [])[:MAX_RELATED]:
        if isinstance(r, dict) and r.get("RelatedVerb"):
            rw, rh = headword(r["RelatedVerb"])
            verbs = related.setdefault(clean_text(r.get("SharedSense", "")) or "?", [])
            label = f"{{{rw}}}{f' [{rh}]' if rh else ''}"
            if label not in verbs:
                verbs.append(label)
    if related:
        lines.append("Related verbs: " + "; ".join(f"{s} — {', '.join(vs)}" for s, vs in related.items()))
    return "\\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=HERE / "69-LIM-Valency")
    ap.add_argument("--with-translations", action="store_true",
                    help="include the English translations of the examples (published translations)")
    args = ap.parse_args()
    data = json.loads(download(HERE / "download")["data"].read_text(encoding="utf-8"))
    rows = []
    for lemma_id, v in data.items():
        hw, hom = headword(lemma_id)
        if not re.search(r"[a-zA-Z]", hw):      # annotation noise: a numeral (༥༠) tagged as verb
            continue
        text = entry(lemma_id, v, hom, args.with_translations)
        if text:
            rows.append((hw, hom, text))
    rows.sort(key=lambda r: (r[0], r[1]))
    with args.out.open("w", encoding="utf-8") as f:
        for hw, _, text in rows:
            f.write(f"{hw}|{text}\n")
    print(f"{len(rows)} entries ({len({r[0] for r in rows})} headwords) -> {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
