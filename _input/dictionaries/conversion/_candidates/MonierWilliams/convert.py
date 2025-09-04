#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import sys
import xml.etree.ElementTree as ET
from typing import Optional

def strip_ns(tag: str) -> str:
    """Remove XML namespace from a tag name."""
    if '}' in tag:
        return tag.split('}', 1)[1]
    return tag

def render_body_text(node: ET.Element) -> str:
    """
    Build text from <body> according to the rules, WITHOUT mutating the tree.
    """
    tag = strip_ns(node.tag)

    if tag == 'hom':
        return node.tail or ''

    if tag == 'ab' or tag == 'lex':
        if 'n' in node.attrib:
            replacement = node.attrib['n']
        else:
            inner = node.text or ''
            for child in list(node):
                inner += render_body_text(child)
            replacement = f'[{inner}]'
        return replacement + (node.tail or '')

    out = node.text or ''
    for child in list(node):
        out += render_body_text(child)
    out += node.tail or ''
    return out

def process_body(body_elem: ET.Element, key2_text: Optional[str] = None) -> str:
    # Pre‑filter: remove first <s> if it matches key2 exactly
    children = list(body_elem)
    if children:
        first = children[0]

        if len(children) > 1 and strip_ns(first.tag) == 'hom':
           first = children[1]

        if strip_ns(first.tag) == 's':
            s_text = ''.join(first.itertext()).strip()
            if key2_text is not None and s_text == key2_text.strip():
                # Build a temporary body without that first child
                temp_elem = ET.Element(body_elem.tag)
                # Preserve any tail from that first <s>
                if first.tail:
                    temp_elem.text = (temp_elem.text or '') + first.tail
                for ch in children[1:]:
                    temp_elem.append(ch)
                # Carry over tail of <body> itself
                temp_elem.tail = body_elem.tail
                body_elem = temp_elem

    text = render_body_text(body_elem)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def xml_to_pipe_csv(xml_path: str, csv_path: str, merge_by_key1: bool = False) -> None:
    tree = ET.parse(xml_path)
    root = tree.getroot()

    if not merge_by_key1:
        with open(csv_path, 'w', encoding='utf-8') as out_f:
            for child in root:
                key1 = child.find('./h/key1')
                key2 = child.find('./h/key2')
                body = child.find('./body')
                if key1 is None or body is None:
                    continue
                k1 = (key1.text or '').strip()
                k2 = (key2.text or '').strip() if key2 is not None and key2.text else None
                b = process_body(body, key2_text=k2)
                out_f.write(f"{k1}|{b}\n")
    else:
        from collections import OrderedDict
        collected = OrderedDict()
        for child in root:
            key1 = child.find('./h/key1')
            key2 = child.find('./h/key2')
            body = child.find('./body')
            if key1 is None or body is None:
                continue
            k1 = (key1.text or '').strip()
            k2 = (key2.text or '').strip() if key2 is not None and key2.text else None
            b = process_body(body, key2_text=k2)
            collected.setdefault(k1, []).append(b)
        with open(csv_path, 'w', encoding='utf-8') as out_f:
            for k1, parts in collected.items():
                out_f.write(f"{k1}|{' '.join(parts)}\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py input.xml output.csv [--merge]")
        sys.exit(1)
    xml_in = sys.argv[1]
    csv_out = sys.argv[2]
    merge = len(sys.argv) > 3 and sys.argv[3] == "--merge"
    xml_to_pipe_csv(xml_in, csv_out, merge_by_key1=merge)
