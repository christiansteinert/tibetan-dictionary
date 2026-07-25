import os
from collections import Counter
import difflib

# This script generates a deflate dictionary for zlib compression from the text files of the dictionary.
# The generated dictionary is written to a .txt file and to a Java interface.
# Use of the dictionary makes the gzip compression of the dictionary definitions more efficient, which is important for the Android version of the application.

DIRS = [
    "_input/dictionaries/public",
    "_input/dictionaries/public_en",
    "_input/dictionaries/public_skt"
]

def write_java_interface(output_file, content):
    """Generates a Java interface with the content as a constant string."""
    # Escape characters for Java string literal
    # We want the bytes of the string in Java to be the same as the bytes in the .txt file.
    # \ -> \\
    # " -> \"
    # newline -> \n
    # carriage return -> \r
    escaped = content.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
    
    # To make it look nice, we'll split it into chunks.
    chunk_size = 80
    chunks = []
    i = 0
    chunks = []
    while i < len(escaped):
        chunk_end_pos = i + chunk_size
        if chunk_end_pos > len(escaped):
            chunk_end_pos = len(escaped)
        chunk = escaped[i:chunk_end_pos]

        # ensure that the line does not end with a backslash, which would escape the closing quote in Java      
        while chunk.endswith('\\') and chunk_end_pos < len(escaped):
            chunk += escaped[chunk_end_pos]
            chunk_end_pos += 1
        
        chunks.append(f'"{chunk}"')
        i = chunk_end_pos
    
    if not chunks:
        joined_chunks = '""'
    else:
        joined_chunks = ' +\n        '.join(chunks)
    
    java_template = f"""package io.sqlc.custom;
public interface DeflateDictionary {{
    String ZLIB_DICT = {joined_chunks};
}}
"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(java_template)
    print(f"Java interface written to {output_file}")

def generate_dict(output_txt, java_interface_path=None, target_size=32768, sub_len=32, step=8, max_lines_per_file=10000, threshold=0.5):
    substrings = Counter()
    
    print(f"Reading files and counting substrings (step={step}, sub_len={sub_len})...")
    for d in DIRS:
        if not os.path.exists(d):
            print(f"Skipping {d} (not found)")
            continue
        
        print(f"Processing directory: {d}")
        for file in os.listdir(d):
            file_path = os.path.join(d, file)
            if os.path.isdir(file_path):
                continue
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for count, line in enumerate(f):
                        if count >= max_lines_per_file:
                            break
                        if "|" in line:
                            parts = line.split("|", 1)
                            if len(parts) == 2:
                                definition = parts[1].strip()
                                if len(definition) >= sub_len:
                                    for i in range(0, len(definition) - sub_len + 1, step):
                                        substrings[definition[i:i+sub_len]] += 1
            except:
                pass

    if not substrings:
        print("No substrings found.")
        return

    print(f"Found {len(substrings)} unique substrings. Sorting...")
    
    sorted_items = sorted(substrings.items(), key=lambda x: (x[1], len(x[0])), reverse=True)
    
    selected_substrings = []
    current_size = 0
    
    print(f"Selecting non-redundant substrings (similarity threshold={threshold})...")
    for sub, count in sorted_items:
        if current_size + len(sub) > target_size:
            break
        
        is_redundant = False
        for existing in selected_substrings:
            if sub in existing or existing in sub:
                is_redundant = True
                break
            if difflib.SequenceMatcher(None, sub, existing).ratio() > threshold:
                is_redundant = True
                break
        
        if not is_redundant:
            selected_substrings.append(sub)
            current_size += len(sub)

    dict_content = "".join(selected_substrings)

    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write(dict_content)
    print(f"Dictionary written to {output_txt}, size: {len(dict_content)} bytes")
    
    if java_interface_path:
        # Ensure the directory exists
        os.makedirs(os.path.dirname(java_interface_path), exist_ok=True)
        write_java_interface(java_interface_path, dict_content)

    print(f"Selected {len(selected_substrings)} substrings.")

if __name__ == "__main__":
    # For manual execution, we'll default to just the txt file unless we pass args.
    # But for our current task, we'll specify both.
    generate_dict(
        "buildscripts/deflate_dict.txt", 
        java_interface_path="_build/mobile/tibetandict/plugins/cordova-sqlite-storage-custom/src/android/io/sqlc/custom/DeflateDictionary.java"
    )

