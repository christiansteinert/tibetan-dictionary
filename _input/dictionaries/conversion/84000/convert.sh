#!/bin/bash
# checkout the latest 84000 translations from github
if [ -d git/data-tei ] 
then
  cd git/data-tei
  git pull
  cd ../..
else
  mkdir -p git
  git clone https://github.com/84000/data-tei.git git/data-tei
fi

# Extract entries from 84000 glossary
rm -rf out
mkdir -p out
./process84000.py

# copy output to dictionary folder
cp out/* ../../public
if [ -d ../../private ] 
then
  cp out/* ../../private
fi

# Convert Tib->Skt to Skt->Tib and Tib->En to En->Tib
cd ../generate_english_dicts
./convert.sh