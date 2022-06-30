#!/bin/bash
# Extract entries from 84000 glossary
./process84000.py

cp out/* ../../public

if [ -d ../../private ]
then
  cp out/* ../../private
fi

# Convert Tib->Skt to Skt->Tib and Tib->En to En->Tib
../generate_english_dicts/convert.sh