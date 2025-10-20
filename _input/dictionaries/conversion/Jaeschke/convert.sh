#!/bin/bash

# extract table of contents from Jaeschke PDF into toc.txt
python3 ./extract_pdf_toc.py *pdf toc.txt 

# in between sort toc.txt accourding to Tibetan sorting rules into toc-sorted.txt
# this step is not contained in this script

# find words with matching prefix and output to jaeschke_page_numbers.csv
python3 ./find_words_with_matching_prefix.py > jaeschke_page_numbers.csv