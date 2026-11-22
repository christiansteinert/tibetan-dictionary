# LIM – Visual Dictionary of Tibetan Verb Valency

Conversion of **"A Visual Dictionary of Tibetan Verb Valency: Data"** (version 1.0, 2021) into the
dictionary input format (`WylieTerm|Definition`).

## Original source

- **Data (original repository):** Zenodo record <https://zenodo.org/records/5596064>,
  DOI [10.5281/zenodo.5596064](https://doi.org/10.5281/zenodo.5596064) — files
  `LIM_TibetanVerbValencyDictionary_data.json` and `LIM_TibetanVerbValencyDictionary_documentation.md`
- **Underlying corpora and tools:** <https://github.com/tibetan-nlp> (e.g.
  [classical-tibetan-corpus](https://github.com/tibetan-nlp/classical-tibetan-corpus),
  [lexicon-of-tibetan-verb-stems](https://github.com/tibetan-nlp/lexicon-of-tibetan-verb-stems))
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Project:** *Lexicography in Motion: A History of the Tibetan Verb*, SOAS University of London,
  2017–2021, funded by the AHRC / UKRI (AH/P004644/1)
- **Authors (Zenodo):** Ligeia Lugli, Edward Garrett, Christian Faggionato, Samyo Rode,
  Nikolai Solmsdorf, Ulrich Pagel. Further team members according to the documentation:
  Tashi Dhondup, Jamyang Dakpa (Contemporary Tibetan annotation), Sonam Wangyal (sentence
  alignment), Yeshi Jigme (semantic annotation).

The data was derived from a corpus of Old, Classical and Contemporary Tibetan texts in which every
verb is linked to its arguments. For each verb it lists the attested argument patterns with their
frequencies per period, example sentences per pattern (with a "good example" score), verb senses
(from Nathan Hill's *A Lexicon of Tibetan Verb Stems*, 2010; manually assigned to corpus sentences
for the 139 most frequent verbs) and semantically related verbs. Homographs follow Hill's numbering
(`ལྟ་√1`, `ལྟ་√2`).

## Files

| file | |
|---|---|
| `convert.sh` | creates a local virtualenv (`.venv`, installs `pyewts`), downloads the source if needed and runs the conversion; options are passed on (`./convert.sh --with-translations`) |
| `lim-convert.py` | the converter (downloads into `download/`, writes `69-LIM-Valency`) |
| `69-LIM-Valency` | the generated dictionary file: 1 412 entries, 1 275 headwords |
| `download/` | the downloaded original files (not versioned, see `.gitignore`) |

## Entry format

One entry per verb (homographs: several entries for the same headword, starting with
"Homograph N of …"). Line breaks are written as `\n`, Tibetan text in `{Wylie}`:

```
Senses: look; take a look at; espy; …
Corpus frequency: 200 (Old 15, Classical 103, Contemporary 82)
Argument patterns:
• obl solo: 40 (Old 2, Classical 8, Contemporary 30)
• arg2 solo: 27 (Old 3, Classical 18, Contemporary 6)
…
Examples:
• [obl solo] {lus srog la ma bltas dam chos btsal} — verb form {bltas}; obl {lus srog} (Marpa, Classical)
…
Related verbs: look — {dmyug} [1], {myul} [2], {'tshol}, …
```

- **Argument labels** (LIM annotation scheme): `arg1` = the most agent-like argument (unmarked or
  in the agentive case), `arg2` = second argument, `arg3` = third argument, `argcl` = clausal
  argument, `obl` = oblique (other case markers), `obl:arg` = oblique argument required by the
  verb, `obl:adv` = adverbial oblique, `aux` = auxiliary, `cop` = copula, `:lvc` = light-verb
  construction, `:hon` = honorific; `solo` = the only argument expressed.
- **Examples:** one per frequent pattern (max. 8 patterns, 5 examples per verb), preferring short
  citations (≤ 70 Tibetan characters) and Classical over Old over Contemporary Tibetan, then the
  corpus' good-example score. After the citation: the verb form used, and the words filling the
  arguments (as lemmas, e.g. `obl {ston}` for བསྟན་པ). Citations with lacunae or editorial
  brackets (`[---]`, Old Tibetan) are skipped. The corpus tokenises citations with spaces
  (`ང འི་`); these are joined to normal orthography (`ངའི་`).
- **Translations:** The data contains English translations for 4 274 of 33 559 examples. They are
  taken from published translations (e.g. Quintman, *The Life of Milarepa*, Penguin 2010;
  Trungpa, *The Life of Marpa the Translator*, 1982; Frye, *The Sutra of the Wise and the
  Foolish*, LTWA 1981; Dotson, *The Old Tibetan Annals*, 2009; Dickie, *Old Demons, New Deities*,
  2017 – full list in the documentation). LIM publishes them as part of its CC BY data, but
  because of their origin they are **not included by default**; `--with-translations` adds them
  (543 example translations appear in the output then).

## Publishing

```bash
./convert.sh
cp 69-LIM-Valency ../../public/69-LIM-Valency
[ -d ../../private ] && cp 69-LIM-Valency ../../private/69-LIM-Valency
```

and add an entry to `webapp/src/config/dictlist.ts`, e.g.:

```ts
  "LIM-Valency": {
    label: 'LIM Verb Valency',
    highlight: '(Senses:|Corpus frequency:|Argument patterns:|Examples:|Related verbs:|Homograph [0-9]+ of)',
    about: 'A Visual Dictionary of Tibetan Verb Valency (2021), Lexicography in Motion, SOAS University of London (AHRC AH/P004644/1): argument patterns of Tibetan verbs with their frequency in Old, Classical and Contemporary Tibetan, example sentences and senses.|Authors: Ligeia Lugli, Edward Garrett, Christian Faggionato, Samyo Rode, Nikolai Solmsdorf, Ulrich Pagel.|Data: https://doi.org/10.5281/zenodo.5596064 (CC BY 4.0).|Argument labels: arg1 = agent-like argument, arg2 = second argument, argcl = clausal argument, obl = oblique, obl:arg = required oblique, aux = auxiliary, cop = copula, lvc = light-verb construction, solo = only this argument.',
    public: true,
    preformattedLinebreaks: true,
    listCredits: true,
    language: ["tib", "<->", "en"]
  },
```
