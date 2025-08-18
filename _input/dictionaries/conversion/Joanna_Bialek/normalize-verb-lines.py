import re

def normalize_verb_line(line):
    if '\t' not in line or not re.search(r'\bv[2-4]', line):
        return [line.strip()]

    part, translation = line.strip().split('\t', 1)
    tokens = part.split()

    v1 = tokens[0]
    forms = {'v1': v1, 'v2': v1, 'v3': v1, 'v4': v1}

    idx = 1
    while idx < len(tokens):
        token = tokens[idx]
        if token.startswith('v'):
            labels = token.split('/')
            form = tokens[idx + 1]
            for label in labels:
                if label in forms:
                    forms[label] = form
            idx += 2
        else:
            idx += 1

    normalized_line = f"{forms['v1']}\t{translation}\\nv1 {part}"
    output_lines = [normalized_line]

    for label in ['v2', 'v3', 'v4']:
        form = forms[label]
        if form != forms['v1']:
            output_lines.append(f"{form}\tsee {forms['v1']}")

    return output_lines


def expand_parentheses_line(line):
    part, translation = line.strip().split('\t', 1)
    parenthetical_pattern = r'\([^)]*\)'

    # Remove parentheses and their contents
    cleaned = re.sub(parenthetical_pattern, '', part).strip()
    without_parens = f"{cleaned}\t{translation}"

    # Keep contents of parentheses but remove the brackets
    contents_only = re.sub(r'\(([^)]*)\)', r'\1', part).strip()
    with_contents = f"{contents_only}\t{translation}"

    return [without_parens, with_contents]


def split_on_slash_before_tab(line):
    """Handles entries with '/' before the tab by duplicating the line into two variants."""
    if '\t' not in line:
        return [line.strip()]

    before_tab, after_tab = line.strip().split('\t', 1)
    if '/' not in before_tab:
        return [line.strip()]

    first_part, second_part = before_tab.split('/', 1)
    variant1 = f"{first_part.strip()}\t{after_tab.strip()}"
    variant2 = f"{second_part.strip()}\t{after_tab.strip()}"
    return [variant1, variant2]

def process_line(line):
    if '\t' not in line or not line.strip():
        return [line.strip()]
    pre_tab = line.split('\t', 1)[0]
    if '(' in pre_tab:
        return expand_parentheses_line(line)
    elif re.search(r'\bv[2-4]', pre_tab):
        return normalize_verb_line(line)
    else:
        return [line.strip()]


def process_file(filename):
    with open(filename, 'r', encoding='utf-8') as file:
        for line in file:
            for processed in process_line(line):
                for processed_and_split in split_on_slash_before_tab(processed):
                    print(processed_and_split)

process_file('JB_Glossary_input.txt')
