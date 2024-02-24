#!/bin/bash

# get the latest master glossary file
# this can also be downloaded manually from https://read.84000.co/glossary/downloads.html
wget https://read.84000.co/glossary-download.xml

# Extract entries from 84000 glossary
rm -rf out
mkdir -p out
mkdir -p out/Tib_EnSkt
mkdir -p out/EnSkt_Tib
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