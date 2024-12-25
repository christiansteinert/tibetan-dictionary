#!/bin/bash
# download the latest glossary
#mv glossary-download.xml glossary-download.xml.bak
#curl -O https://84000.co/glossary-download.xml


# Extract entries from 84000 glossary
rm -rf out
mkdir -p out
mkdir -p out/Tib_EnSkt
mkdir -p out/EnSkt_Tib
mkdir -p out/wordlists

./process84000.py

# copy output to dictionary folder
cp out/Tib_EnSkt/* ../../public
cp out/EnSkt_Tib/* ../../public_en

if [ -d ../../private ] 
then
  cp out/Tib_EnSkt/* ../../private
  cp out/EnSkt_Tib/* ../../private_en
fi
