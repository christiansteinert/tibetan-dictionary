#!/bin/bash

# download the latest glossary if the downloaded file is older than one day
yesterday=$(date -d 'now - 1 days' +%s)
file_time=$(date -r "84000-glossary.xml" +%s)

#if (( file_time <= yesterday )); then
#    curl  https://84000.co/glossary-embedded/glossary-download.xml > glossary-download.zip && mv 84000-glossary.xml 84000-glossary.xml.bak && unzip glossary-download.zip && rm glossary-download.zip
#fi

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
