#!/usr/bin/env python3
"""
Script to determine PDF page numbers for Tibetan dictionary headwords.
"""

import re
import sys
import multiprocessing as mp
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from difflib import SequenceMatcher
from concurrent.futures import ProcessPoolExecutor, as_completed

try:
    import PyPDF2
except ImportError:
    print("Error: PyPDF2 is required. Install with: pip install PyPDF2")
    sys.exit(1)


def expand_angle_bracket_variants(text: str) -> List[str]:
    """
    Expand angle bracket variants in headword text.
    
    Two formats exist:
    1. With slash: <'dar / bdar N> or <gdul DC / 'dul PN>
    2. Without slash: <gdul DCLI 'dul PN> (sources separate variants)
    
    Strategy:
    - If contains '/', split by '/' and take first token from each part
    - Otherwise, split by uppercase letter sequences (sources) to find variants
    """
    variants = [text]
    
    # Find angle bracket patterns
    pattern = r'<([^>]+)>'
    matches = list(re.finditer(pattern, text))
    
    # Process matches in reverse order to handle nested cases correctly
    for match in reversed(matches):
        bracket_content = match.group(1)
        
        # Check if it contains a slash (explicit variant separator)
        if '/' in bracket_content:
            # Format 1: <variant1 SOURCE / variant2 SOURCE>
            parts = bracket_content.split('/')
            
            cleaned_parts = []
            for part in parts:
                part = part.strip()
                
                # Take the first word/token as the variant
                tokens = part.split()
                if tokens:
                    variant = tokens[0]
                    # Skip reconstructed forms (starting with *)
                    if not variant.startswith('*'):
                        cleaned_parts.append(variant)
            
            # If we have at least 2 variants, expand
            if len(cleaned_parts) >= 2:
                new_variants = []
                for variant_text in variants:
                    for cleaned_part in cleaned_parts:
                        new_variant = variant_text.replace(match.group(0), cleaned_part, 1)
                        new_variants.append(new_variant)
                variants = new_variants
        
        else:
            # Format 2: <variant1 SOURCES variant2 SOURCES>
            # Split by sequences of uppercase letters to find variants
            # Example: "gdul DCLI 'dul PN" -> ["gdul", "'dul"]
            
            # Use regex to split by uppercase letter sequences (2+ uppercase letters)
            parts = re.split(r'\s+[A-Z]{2,}\s*', bracket_content)
            
            cleaned_parts = []
            for part in parts:
                part = part.strip()
                if part and not part.isupper() and not part.startswith('*'):
                    cleaned_parts.append(part)
            
            # If we have at least 2 variants, expand
            if len(cleaned_parts) >= 2:
                new_variants = []
                for variant_text in variants:
                    for cleaned_part in cleaned_parts:
                        new_variant = variant_text.replace(match.group(0), cleaned_part, 1)
                        new_variants.append(new_variant)
                variants = new_variants
    
    return variants


def clean_headword(text: str) -> str:
    """Clean a headword by removing annotations and normalizing."""
    # Remove content in curly braces
    text = re.sub(r'\{[^}]*\}', '', text)
    
    # Remove common annotations
    text = re.sub(r'\(READ[^)]*\)', '', text)
    text = re.sub(r'\(TEXT:[^)]*\)', '', text)
    text = re.sub(r'\(\?[^)]*\)', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Remove trailing 'la' which often appears in section headers
    if text.endswith(' la'):
        text = text[:-3].strip()
    
    return text


def process_page_range(args):
    """
    Process a range of PDF pages and extract headwords with variants.
    This function is designed to run in a separate process.
    
    Returns: List of (cleaned_headword, page_num, original_headword)
    """
    pdf_file, start_page, end_page, process_id = args
    
    headwords = []
    
    try:
        # Open PDF file in this process
        with open(pdf_file, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            
            for page_num in range(start_page, end_page):
                try:
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    
                    # Find all [T] entries on this page
                    lines = text.split('\n')
                    
                    i = 0
                    while i < len(lines):
                        line = lines[i].strip()
                        
                        # Check for [T] marking a Tibetan headword
                        if line.startswith('[T]') or '[T]' in line:
                            # Extract just the part after [T]
                            if '[T]' in line:
                                headword_text = line.split('[T]', 1)[1].strip()
                            else:
                                headword_text = line[3:].strip()
                            
                            # Continue reading lines until we hit another tag
                            j = i + 1
                            while j < len(lines):
                                next_line = lines[j].strip()
                                # Stop if we hit another tag
                                if '[ML]' in next_line or '[MT]' in next_line or \
                                   '[T]' in next_line or next_line == '':
                                    break
                                # Continue the headword
                                headword_text += ' ' + next_line
                                j += 1
                            
                            # Expand angle bracket variants first
                            variants = expand_angle_bracket_variants(headword_text)
                            
                            # Clean each variant and add to headwords
                            for variant in variants:
                                cleaned = clean_headword(variant)
                                
                                if cleaned:
                                    # PDF pages are 0-indexed, convert to 1-indexed
                                    actual_page = page_num + 1
                                    headwords.append((cleaned, actual_page, variant))
                            
                            i = j
                            continue
                        
                        i += 1
                
                except Exception as e:
                    # Silently skip problematic pages
                    continue
    
    except Exception as e:
        print(f"  [Process {process_id}] Error reading PDF: {e}")
    
    return headwords


def normalize_word(word: str) -> str:
    """Normalize a word for comparison."""
    # Normalize whitespace
    word = re.sub(r'\s+', ' ', word).strip()
    # Normalize apostrophes
    word = word.replace("'", "'").replace("'", "'")
    # Remove trailing 'la' for comparison
    if word.endswith(' la'):
        word = word[:-3].strip()
    return word.lower()


def normalize_word_with_ocr_fixes(word: str) -> str:
    """Normalize a word with OCR error corrections."""
    word = normalize_word(word)
    # Common OCR errors in Tibetan transliteration:
    # - 'e' often misread as 'c' or vice versa  (bcom ↔ beam)
    # - 'I' (capital i) often misread as 'l' (lowercase L)  (Idan ↔ ldan)
    # - 'o' sometimes misread as 'a'
    word = word.replace('beam', 'bcom')  # Normalize beam → bcom
    word = word.replace('idan', 'ldan')  # Normalize Idan → ldan (after lowercase)
    return word


def fuzzy_match_score(word1: str, word2: str) -> float:
    """Calculate fuzzy match score between two words."""
    return SequenceMatcher(None, word1, word2).ratio()


def find_best_match(word: str, headword_pages: Dict[str, Tuple[int, str]], 
                    threshold: float = 0.80, min_page: Optional[int] = None, max_page: Optional[int] = None) -> Optional[Tuple[str, int, float]]:
    """
    Find the best match for a word in the extracted headwords.
    
    Args:
        word: The word to match
        headword_pages: Dictionary of {headword: (page, original)}
        threshold: Minimum match score
        min_page: Minimum allowed page number (for sequential constraint)
        max_page: Maximum allowed page number (for sequential constraint)
    """
    norm_word = normalize_word(word)
    norm_word_ocr = normalize_word_with_ocr_fixes(word)
    
    best_match = None
    best_score = 0.0
    
    for headword in headword_pages:
        page_num = headword_pages[headword][0]
        
        # Skip if page is outside allowed range
        if min_page is not None and page_num < min_page:
            continue
        if max_page is not None and page_num > max_page:
            continue
        
        norm_headword = normalize_word(headword)
        norm_headword_ocr = normalize_word_with_ocr_fixes(headword)
        
        # Try exact match first (with OCR corrections)
        if norm_word_ocr == norm_headword_ocr:
            return (headword, page_num, 1.0)
        
        # Try exact match without OCR corrections
        if norm_word == norm_headword:
            return (headword, page_num, 1.0)
        
        # Substring match with OCR corrections
        # Avoid matching tiny fragments: require the substring to be at least 6 characters
        if norm_word_ocr in norm_headword_ocr or norm_headword_ocr in norm_word_ocr:
            min_len = min(len(norm_word_ocr), len(norm_headword_ocr))
            if min_len >= 6:  # Avoid tiny fragments like "ldan" matching "bcom ldan 'das"
                score = 0.95
                if score > best_score:
                    best_score = score
                    best_match = headword
        
        # Try fuzzy match with OCR corrections
        score_ocr = fuzzy_match_score(norm_word_ocr, norm_headword_ocr)
        
        if score_ocr > best_score:
            best_score = score_ocr
            best_match = headword
        
        # Also try fuzzy match without OCR corrections (as fallback)
        score = fuzzy_match_score(norm_word, norm_headword)
        
        if score > best_score:
            best_score = score
            best_match = headword
    
    if best_score >= threshold and best_match is not None:
        return (best_match, headword_pages[best_match][0], best_score)
    
    return None


class TibetanPageNumberFinder:
    """Find page numbers for Tibetan dictionary headwords."""
    
    def __init__(self, pdf_file: str, wordlist_file: str, output_file: str):
        self.pdf_file = Path(pdf_file)
        self.wordlist_file = Path(wordlist_file)
        self.output_file = Path(output_file)
        
        # Will store: {cleaned_headword: (page_num, original_headword)}
        self.headword_pages: Dict[str, Tuple[int, str]] = {}
        
        # Original wordlist in original order
        self.wordlist: List[str] = []
        
        # Page range for dictionary content
        self.MIN_PAGE = 43
        self.MAX_PAGE = 485
        
    def extract_headwords_from_pdf_parallel(self):
        """Extract headwords from PDF using parallel processing."""
        print("Extracting headwords from PDF (parallel processing)...")
        print(f"Searching pages {self.MIN_PAGE}-{self.MAX_PAGE} only")
        
        try:
            # First, determine total pages quickly
            with open(self.pdf_file, 'rb') as f:
                pdf_reader = PyPDF2.PdfReader(f)
                total_pages = len(pdf_reader.pages)
                print(f"PDF has {total_pages} pages")
            
            # Adjust page range to MIN_PAGE-MAX_PAGE (0-indexed)
            start_page_idx = self.MIN_PAGE - 1  # 42 (0-indexed)
            end_page_idx = min(self.MAX_PAGE, total_pages)  # 485 or less
            
            pages_to_process = end_page_idx - start_page_idx
            print(f"Processing {pages_to_process} pages ({self.MIN_PAGE}-{end_page_idx})")
            
            # Determine number of processes (use all available cores)
            num_processes = mp.cpu_count()
            print(f"Using {num_processes} parallel processes")
            
            # Divide pages among processes
            pages_per_process = pages_to_process // num_processes
            page_ranges = []
            
            for i in range(num_processes):
                start = start_page_idx + (i * pages_per_process)
                if i == num_processes - 1:
                    # Last process gets remaining pages
                    end = end_page_idx
                else:
                    end = start_page_idx + ((i + 1) * pages_per_process)
                
                page_ranges.append((str(self.pdf_file), start, end, i + 1))
            
            print(f"Starting parallel extraction...")
            
            # Process pages in parallel with optimized settings
            all_headwords = []
            completed_count = 0
            
            with ProcessPoolExecutor(max_workers=num_processes) as executor:
                # Submit all tasks
                futures = {executor.submit(process_page_range, args): args[3] 
                          for args in page_ranges}
                
                # Collect results as they complete
                for future in as_completed(futures):
                    process_id = futures[future]
                    try:
                        headwords = future.result()
                        all_headwords.extend(headwords)
                        completed_count += 1
                        print(f"  Process {process_id} completed ({completed_count}/{num_processes}): "
                              f"found {len(headwords)} headword variants")
                    except Exception as e:
                        print(f"  Process {process_id} failed: {e}")
            
            print(f"\nCombining results...")
            
            # Sort by page number, then by headword length (prefer shorter = more specific)
            all_headwords.sort(key=lambda x: (x[1], len(x[0])))  # Sort by page_num, then length
            
            # Store results (keep first occurrence = lowest page + shortest headword)
            headwords_found = 0
            for cleaned, page_num, original in all_headwords:
                if cleaned not in self.headword_pages:
                    self.headword_pages[cleaned] = (page_num, original)
                    headwords_found += 1
            
            print(f"Found {len(self.headword_pages)} unique headwords")
            if self.headword_pages:
                pages = [p for p, _ in self.headword_pages.values()]
                print(f"Page range: {min(pages)} - {max(pages)}")
            
            return True
        
        except Exception as e:
            print(f"Error in parallel PDF extraction: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def interpolate_page_number(self, word_index: int, found_pages: Dict[int, int]) -> int:
        """
        Interpolate a page number based on surrounding found pages.
        Uses original wordlist order for interpolation.
        """
        # Find the nearest found pages before and after
        before_idx = None
        after_idx = None
        
        for idx in sorted(found_pages.keys()):
            if idx < word_index:
                before_idx = idx
            elif idx > word_index:
                after_idx = idx
                break
        
        # Interpolate
        if before_idx is not None and after_idx is not None:
            # Linear interpolation
            page_before = found_pages[before_idx]
            page_after = found_pages[after_idx]
            ratio = (word_index - before_idx) / (after_idx - before_idx)
            interpolated = int(page_before + ratio * (page_after - page_before))
            return interpolated
        elif before_idx is not None:
            # Use the page before
            return found_pages[before_idx]
        elif after_idx is not None:
            # Use the page after
            return found_pages[after_idx]
        else:
            # No reference points - use middle of range
            return (self.MIN_PAGE + self.MAX_PAGE) // 2
    
    def process_wordlist(self):
        """Process wordlist and find page numbers (sequential with page constraint)."""
        print("\nProcessing wordlist...")
        
        # Read wordlist
        try:
            with open(self.wordlist_file, 'r', encoding='utf-8') as f:
                self.wordlist = [line.strip() for line in f if line.strip()]
        except FileNotFoundError:
            print(f"Error: Wordlist file not found: {self.wordlist_file}")
            return False
        
        print(f"Wordlist contains {len(self.wordlist)} words (in original order)")
        
        # IMPORTANT: Sequential constraint requires single-threaded processing
        # Each word's max page depends on the previous word's matched page
        print("Matching words to headwords (sequential processing with page constraint)...")
        
        results = []
        last_page = self.MIN_PAGE
        
        for word_index, word in enumerate(self.wordlist):
            # Page must be in range [last_page, last_page + 3]
            # This ensures sequential progression without going backwards
            min_allowed_page = last_page - 1
            max_allowed_page = last_page + 2
            
            match = find_best_match(word, self.headword_pages, threshold=0.80, 
                                  min_page=min_allowed_page, max_page=max_allowed_page)
            
            if match:
                matched_headword, page_num, score = match
                results.append((word_index, word, page_num, score, False))
                last_page = page_num  # Update for next word
            else:
                results.append((word_index, word, None, 0.0, True))
            
            # Progress updates
            if (word_index + 1) % 1000 == 0:
                matched = sum(1 for r in results if not r[4])
                print(f"  Processed {word_index + 1}/{len(self.wordlist)} words, "
                      f"{matched} matches so far, last page: {last_page}")
        
        matched_count = sum(1 for r in results if not r[4])
        print(f"\nDirect/fuzzy matches: {matched_count} out of {len(self.wordlist)}")
        print(f"Words needing interpolation: {len(self.wordlist) - matched_count}")
        
        # Interpolate missing page numbers
        print("\nInterpolating missing page numbers (based on original wordlist order)...")
        
        # Build map of found pages
        found_pages = {}
        for word_idx, word, page, score, needs_interp in results:
            if not needs_interp:
                found_pages[word_idx] = page
        
        # Interpolate
        final_results = []
        for word_idx, word, page, score, needs_interp in results:
            if needs_interp:
                interpolated_page = self.interpolate_page_number(word_idx, found_pages)
                final_results.append((word, interpolated_page, True))
            else:
                final_results.append((word, page, False))
        
        return final_results
    
    def write_results(self, results: List[Tuple[str, int, bool]]):
        """Write results to CSV file in original order."""
        print(f"\nWriting results to {self.output_file}...")
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for word, page, is_interpolated in results:
                marker = '?' if is_interpolated else ''
                f.write(f"{word}|{page}{marker}\n")
        
        print(f"Done! Wrote {len(results)} entries (in original order)")
        
        # Print statistics
        interpolated_count = sum(1 for _, _, interp in results if interp)
        direct_count = len(results) - interpolated_count
        
        print("\nStatistics:")
        print(f"  Direct matches: {direct_count}")
        print(f"  Interpolated: {interpolated_count}")
        print(f"  Total: {len(results)}")
    
    def run(self):
        """Run the complete workflow."""
        print("=" * 60)
        print("Tibetan Dictionary Page Number Finder v5")
        print("(Sequential constraint + Angle bracket expansion)")
        print("(PDF extraction: parallel, Word matching: sequential)")
        print("=" * 60)
        
        # Extract headwords from PDF
        if not self.extract_headwords_from_pdf_parallel():
            return False
        
        # Process wordlist and find matches
        results = self.process_wordlist()
        if not results:
            return False
        
        # Write results
        self.write_results(results)
        
        print("\n" + "=" * 60)
        print("Processing complete!")
        print("=" * 60)


def main():
    """Main entry point."""
    base_dir = Path(__file__).parent
    pdf_file = base_dir / "Ishihama_1989_OCR_Bye rtogs chen mo_NEW.pdf"
    wordlist_file = base_dir / "wordlist"
    output_file = base_dir / "page_numbers_1989.csv"
    
    if not pdf_file.exists():
        print(f"Error: PDF file not found: {pdf_file}")
        sys.exit(1)
    
    if not wordlist_file.exists():
        print(f"Error: Wordlist file not found: {wordlist_file}")
        sys.exit(1)
    
    finder = TibetanPageNumberFinder(str(pdf_file), str(wordlist_file), str(output_file))
    finder.run()


if __name__ == "__main__":
    main()
