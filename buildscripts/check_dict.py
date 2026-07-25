import os

def check_dict(file_path, sub_len_expected=32):
    if not os.path.exists(file_path):
        print("File not found")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Total content length: {len(content)}")
    
    # The dictionary is a concatenation of selected_substrings.
    # Since we don't know where each one ends, we can't easily split it 
    # UNLESS we assume they are all exactly sub_len_expected.
    # But they might not be if the last one was truncated or something.
    # However, in my script, they are all exactly sub_len.
    
    # Let's check if the content length is a multiple of 32.
    if len(content) % sub_len_expected == 0:
        print(f"Content length is a multiple of {sub_len_expected}")
    else:
        print(f"Content length {len(content)} is NOT a multiple of {sub_len_expected}")

    # Let's just print the first 10 substrings by assuming they are 32 chars each.
    print("First 5 substrings (assuming 32 chars each):")
    for i in range(5):
        start = i * sub_len_expected
        end = start + sub_len_expected
        print(f"[{start}:{end}] -> {repr(content[start:end])}")

if __name__ == "__main__":
    check_dict("buildscripts/deflate_dict.txt")
