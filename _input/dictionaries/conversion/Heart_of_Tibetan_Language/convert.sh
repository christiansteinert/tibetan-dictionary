#!/bin/bash
#python3 ./extract_anki_to_xml.py
python3 ./convert_xml_to_csv.py
cp hotl1-tib.csv ../../public/67-hotl1
cp hotl2-tib.csv ../../public/67-hotl2
cp hotl3-tib.csv ../../public/67-hotl3

cp hotl1-en.csv ../../public_en/67-hotl1
cp hotl2-en.csv ../../public_en/67-hotl2
cp hotl3-en.csv ../../public_en/67-hotl3
