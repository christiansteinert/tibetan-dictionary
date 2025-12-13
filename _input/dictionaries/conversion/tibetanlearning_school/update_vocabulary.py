#!/usr/bin/env python3
"""
Script to scrape vocabulary from tibetanlanguage.school and convert to CSV format.
"""

import re
import requests
from bs4 import BeautifulSoup
import pyewts

# URL to scrape
URL = "https://tibetanlanguage.school/resources/vocabulary-supplement/"

# Output file
OUTPUT_FILE = "terms.csv"

# Initialize Wylie converter
converter = pyewts.pyewts()

# Regex pattern for Tibetan character sequences
TIBETAN_RANGE = re.compile(r'[\u0F00-\u0FFF]+')


def convert_tibetan_to_wylie(text):
    """Convert Tibetan text to Wylie transliteration."""
    if not text:
        return text
    return converter.toWylie(text).strip()


def convert_mixed_text_with_braces(text):
    """
    Convert mixed Tibetan/non-Tibetan text.
    Tibetan portions are converted to Wylie and enclosed in curly braces.
    Non-Tibetan portions are kept as-is.
    """
    if not text:
        return text
    
    # Find all Tibetan character sequences and replace them with {wylie}
    def replace_tibetan(match):
        wylie = convert_tibetan_to_wylie(match.group(0))
        return '{' + wylie + '}'
    
    return TIBETAN_RANGE.sub(replace_tibetan, text)


def process_cell_html(cell):
    """
    Process an HTML cell, converting <br> and </p><p> to \\n (literal backslash-n),
    and stripping all other HTML while preserving text content.
    """
    if cell is None:
        return ""
    
    # Convert the cell to string to manipulate HTML
    cell_html = str(cell)
    
    # Replace <br>, <br/>, <br /> with a unique placeholder
    placeholder = "__LINEBREAK__"
    cell_html = re.sub(r'<br\s*/?>', placeholder, cell_html, flags=re.IGNORECASE)
    
    # Replace </p><p> patterns with placeholder (handling whitespace between)
    cell_html = re.sub(r'</p>\s*<p[^>]*>', placeholder, cell_html, flags=re.IGNORECASE)
    
    # Parse the modified HTML
    soup = BeautifulSoup(cell_html, 'html.parser')
    
    # Get text content
    text = soup.get_text()
    
    # Clean up whitespace but preserve our placeholders
    # First, normalize spaces (but not our placeholders)
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Trim leading/trailing whitespace
    text = text.strip()
    
    # Replace linebreak placeholders with backslash-n
    text = text.replace(placeholder, '\\n')
    
    return text


def fetch_and_parse_page(url):
    """Fetch the webpage and return BeautifulSoup object."""
    response = requests.get(url)
    response.raise_for_status()
    return BeautifulSoup(response.text, 'html.parser')


def extract_table_data(soup):
    """Extract data from the HTML table, returning list of (col1, col2) tuples."""
    rows = []
    
    # Find the table - it should be in the main content
    table = soup.find('table')
    if not table:
        raise ValueError("No table found on the page")
    
    # Find all rows, skip the header row
    for tr in table.find_all('tr')[1:]:  # Skip header row
        cells = tr.find_all(['td', 'th'])
        if len(cells) >= 2:
            col1 = process_cell_html(cells[0])
            col2 = process_cell_html(cells[1])
            # Skip empty rows
            if col1 or col2:
                rows.append((col1, col2))
    
    return rows


def convert_row(col1, col2):
    """
    Convert a row's data:
    - col1: full Tibetan to Wylie conversion
    - col2: definition text with Tibetan portions in curly braces
    """
    # Column 1: Convert entirely from Tibetan to Wylie
    term_col = convert_tibetan_to_wylie(col1)
    
    # Column 2: Convert Tibetan portions to Wylie in curly braces
    definition_col = convert_mixed_text_with_braces(col2)
    
    # Replace repeated whitespace with single space in both columns
    term_col = re.sub(r'[ \t]+', ' ', term_col)
    definition_col = re.sub(r'[ \t]+', ' ', definition_col)
    
    return term_col, definition_col


def main():
    print(f"Fetching {URL}...")
    soup = fetch_and_parse_page(URL)
    
    print("Extracting table data...")
    rows = extract_table_data(soup)
    print(f"Found {len(rows)} rows")
    
    print("Converting to Wylie and writing output...")
    count = 0
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for col1, col2 in rows:
            term_col, definition_col = convert_row(col1, col2)
            f.write(f"{term_col}|{definition_col}\n")
            count += 1
    
    print(f"Done! Output written to {OUTPUT_FILE}. Processed {count} rows.")


if __name__ == "__main__":
    main()
