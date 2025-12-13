# Tibetan Language School Vocabulary Supplement

## Source
The vocabulary data is downloaded from:
https://tibetanlanguage.school/resources/vocabulary-supplement/

## Description
This is a vocabulary supplement created by the Tibetan Language School website to complement existing Tibetan dictionaries. It contains words that are:
- Not found in existing dictionaries
- Not fully explained in existing dictionaries
- Missing specific meanings or usages

The script:
1. Fetches the HTML page from the external website
2. Extracts the first two columns from the vocabulary table (Tibetan term and English definition)
3. Converts Tibetan script to Wylie transliteration
4. Outputs to `terms.csv` 

## Requirements
Install dependencies with:
```bash
pip install requests beautifulsoup4 pyewts
```
