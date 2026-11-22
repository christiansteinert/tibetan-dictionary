#!/bin/bash
# Download "A Visual Dictionary of Tibetan Verb Valency: Data" (Zenodo 10.5281/zenodo.5596064)
# and convert it to the dictionary input format.  Options are passed on to lim-convert.py
# (e.g. --with-translations).
set -e
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
  .venv/bin/pip install --quiet pyewts
fi

.venv/bin/python lim-convert.py "$@"

# To publish (after adding "LIM-Valency" to webapp/src/config/dictlist.ts, see README.md):
#   cp 69-LIM-Valency ../../public/69-LIM-Valency
#   [ -d ../../private ] && cp 69-LIM-Valency ../../private/69-LIM-Valency
