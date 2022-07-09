#!/usr/bin/env python3

import xml.etree.ElementTree as ET
import sys
import re
import os
from glob import glob
from itertools import groupby

# 3rd party libs
import editdistance

dictData = {
    'dictTibSynonyms': [],
    'dictEn': [],
    'dictEnDefinitions': [],
    'dictSkt': [],
}


def cleanupHeadword(value):
    value = cleanupTib(value, removeParens=True)
    value = value.replace("/", " ")
    value = re.sub(r'\s+', ' ', value)
    value = re.sub(r'^ ', '', value)
    value = re.sub(r' $', '', value)
    return value


def cleanup(value):
    if(not value):
        value = ""

    value = value.replace("|", " ")
    value = value.replace("\xad", " ")
    value = value.replace("\r\n", " ")
    value = value.replace("\r", " ")
    value = value.replace("\n", " ")

    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^\s+", "", value)
    value = re.sub(r"\s+$", "", value)

    return value


def cleanupTib(value, removeParens):
    if(not value):
        value = ""

    value = value.replace("|", "/")
    value = value.replace("ī", "I")
    value = value.replace("ā", "A")
    value = value.replace("ū", "U")
    value = value.replace("ṇ", "n")
    value = value.replace("-", ".")
    value = value.replace("’", "'")
    value = value.replace("‘", "'")
    value = value.replace("­", "")  # delete zero-width non-joiner

    if removeParens:
        value = re.sub(r"\([^)]*\)", " ", value)  # remove parentheses

    value = cleanup(value)
    return value


def logUnexpected(xmlNode):
    print("unexpected element in definition: <" +
          xmlNode.tag + ">   attributes: " + str(xmlNode.attrib))


def getDefinitionTxt(xmlNode):
    ns = 'http://www.tei-c.org/ns/1.0'

    text = ""
    if xmlNode.text:
        text = xmlNode.text

    for child in xmlNode:
        if child.tag == f'{{{ns}}}foreign' \
                or child.tag == f'{{{ns}}}term' \
                or child.tag == f'{{{ns}}}mantra':
            lang = ''
            if '{http://www.w3.org/XML/1998/namespace}lang' in child.attrib:
                lang = cleanup(
                    child.attrib["{http://www.w3.org/XML/1998/namespace}lang"]).lower()

            if lang == 'bo-ltn':
                text += "{" + cleanupTib(getDefinitionTxt(child), False) + "}"

            else:
                text += getDefinitionTxt(child)

        elif child.tag == f'{{{ns}}}title' \
                or child.tag == f'{{{ns}}}emph' \
                or child.tag == f'{{{ns}}}distinct' \
                or child.tag == f'{{{ns}}}hi' \
                or child.tag == f'{{{ns}}}term':
            text += getDefinitionTxt(child)

        elif child.tag == f'{{{ns}}}ptr' or child.tag == f'{{{ns}}}ref':
            if 'target' in child.attrib and (child.attrib['target'].startswith('#UT')):
                anchor = child.attrib['target']
                documentId = re.sub(r'#(UT.*)-[0-9]+$', r'\1', anchor)
                uri = f'https://read.84000.co/translation/{documentId}.html{anchor}'

                text += uri

            elif 'target' in child.attrib and child.attrib['target'].startswith('http'):
                text += child.attrib['target']

            else:
                logUnexpected(child)

        else:
            logUnexpected(child)
            text += getDefinitionTxt(child)

        if child.tail:
            text += child.tail

    return text


def process_file(glossary_file):
    ns = 'http://www.tei-c.org/ns/1.0'
    try:
        xmlDoc = ET.parse(glossary_file).getroot()
    except Exception as e:
        print(f'!!! file parsing error: {e}')
        return

    extractGlossaryEntries(xmlDoc,
                           f".//{{{ns}}}titleStmt",
                           f".//{{{ns}}}title")

    extractGlossaryEntries(xmlDoc,
                           f".//{{{ns}}}list[@type='glossary']//{{{ns}}}item",
                           f"./{{{ns}}}gloss/{{{ns}}}term")


def extractGlossaryEntries(xmlDoc, parentSelect, childSelect):
    for parentEl in xmlDoc.findall(parentSelect):
        tibTerms = []
        sktTerms = []
        engTerms = []
        definitionTxt = ''

        for childEl in parentEl.findall(childSelect):
            lang = getLang(childEl)
            titleText = cleanup(childEl.text)

            if lang == "bo-ltn" and titleText and not '་' in titleText:
                if not titleText in tibTerms:
                    tibTerms.append(cleanupTib(titleText, True))

            elif lang == "sa-ltn" and titleText:
                if not titleText in sktTerms:
                    sktTerms.append(titleText)

            elif lang == "en":
                if f'type' in childEl.attrib and childEl.attrib[f'type'] == "definition":
                    if definitionTxt != "":
                        definitionTxt += "\\n"
                    definitionTxt = definitionTxt + \
                        cleanup(getDefinitionTxt(childEl))

                elif titleText and (not titleText in engTerms):
                    engTerms.append(titleText)

        addEntries(tibTerms, engTerms, definitionTxt, sktTerms)


def getLang(xmlElem):
    """
    Get the language from the lang attribute of an xml element
    """
    if '{http://www.w3.org/XML/1998/namespace}lang' in xmlElem.attrib:
        lang = cleanup(
            xmlElem.attrib["{http://www.w3.org/XML/1998/namespace}lang"]).lower()
        if lang == 'la':
            lang = 'en'
    else:
        lang = 'en'

    return lang

def appendTerm(dictData, tibTerm, definition):
    if re.match('.*[^a-zA-Z\' /]', tibTerm):
        return

    for headword in tibTerm.split(','):
        dictData.append((cleanupHeadword(headword), definition))

def addEntries(tibTerms, engTerms, definitionTxt, sktTerms):
    for tibTerm in tibTerms:
        for altTibTerm in tibTerms:
            if altTibTerm != tibTerm:
                appendTerm(dictData['dictTibSynonyms'], tibTerm, f'{{{altTibTerm}}}')

        for engTermsTxt in engTerms:
            appendTerm(dictData['dictEn'], tibTerm, engTermsTxt)

        if definitionTxt:
            appendTerm(dictData['dictEnDefinitions'], tibTerm, definitionTxt)

        for sktTermsTxt in sktTerms:
            appendTerm(dictData['dictSkt'], tibTerm, sktTermsTxt)


def writeDictData(dictEntries, fileName):
    dictFile = open(fileName, 'w')
    for entry in dictEntries:
        dictFile.write(f'{entry[0]}|{entry[1]}\n')

    dictFile.close()

def filterEntries(entries, suppress_similar_entries=False):
    print('removing duplicate entries', end='')

    filtered_entries = []
    prev_entry = ('', '')
    prev_entry_text = ''

    # Sort entries based on key, lowercase value, regular case value
    # This will group identical entries together but will also but capitalized entries before lowercase ones
    # so that capitalized writing is preferred
    for entry in sorted(entries, key=lambda entry: entry[0] + '|' + entry[1].lower() + entry[1]):
        print('.', end='')

        entry_text = entry[1].lower()
        length = max(len(entry_text), len(prev_entry_text))
        min_length = min(len(entry_text), len(prev_entry_text))

        if entry_text.lower().startswith('see ') or entry_text.lower().startswith('also translated here'):
            continue

        if entry_text.lower() != prev_entry_text.lower():

            # If one entry is just a pluralized version of the other then suppress the non-pluralized one
            s_added = abs(len(entry_text) - len(prev_entry_text)) == 1 \
                and (entry_text.endswith('s') and not prev_entry_text.endswith('s')) \

            # keep entries only if the definitions differ,
            # and if the edit distance is relatively small
            if suppress_similar_entries:
                max_distance = length / 3
                substring_distance = min_length / 3

            if s_added or \
                (suppress_similar_entries
                 and entry[0] == prev_entry[0]
                 and ((editdistance.eval(entry_text.lower(), prev_entry_text.lower()) <= max_distance)
                      or editdistance.eval(entry_text[:min_length].lower(), prev_entry_text[:min_length].lower()) <= substring_distance)):

                # if two entries are similar then keep the longer one
                if len(entry_text) > len(prev_entry_text):
                    filtered_entries[-1] = entry
                else:
                    entry = prev_entry
            else:
                filtered_entries.append(entry)

        prev_entry = entry
        prev_entry_text = entry[1]

    print('')
    return filtered_entries

def concat_def_lines(dictData, prefix=None, separator='; '):
    """
    group all entries with the same headword into a single entry
    """
    result = []

    for key, values in groupby(dictData, lambda item: item[0]):
        definitions = list(map(lambda item: item[1], values))
        definitionsText = separator.join(sorted(definitions))

        if prefix and len(definitions) == 1: #add prefix if there are multiple entries
            definitionsText = prefix[0] + definitionsText
        elif prefix: #add prefix if there are multiple entry
            definitionsText = prefix[1] + definitionsText

        result.append((key, definitionsText))
    return result

def remove_excessive_defs(dictData, max_definitions=8):
    """
    if more entries exist for a term than desired then keep the N longest ones
    """
    result = []

    for key, values in groupby(dictData, lambda item: item[0]):
        definitions = list(map(lambda item: item[1], values))

        if len(definitions) > max_definitions:
            definitions = sorted(definitions, key = lambda d: -len(d))
            definitions = definitions[:max_definitions]
            definitions = reversed(definitions)
        else:
            definitions = sorted(definitions, key = lambda d: len(d))

        for definition in definitions:
            result.append((key, definition))
    return result


def main(path_name):
    # process input files
    for file_name in glob(path_name, recursive=True):
        print(file_name)
        process_file(file_name)

    writeDictData(concat_def_lines(
        filterEntries(dictData['dictEn'])), 'out/43-84000Dict')

    writeDictData(
        remove_excessive_defs(
            filterEntries(dictData['dictEnDefinitions'], suppress_similar_entries=True), 
        ),
        'out/44-84000Definitions')

    writeDictData(
        concat_def_lines(
            filterEntries(dictData['dictTibSynonyms']),
            prefix=['Synonym: ', 'Synonyms: '], 
            separator=', '), 
        'out/45-84000Synonyms')

    writeDictData(
        concat_def_lines(
            filterEntries(dictData['dictSkt'])), 
        'out/46-84000Skt')

os.chdir(os.path.dirname(os.path.abspath(__file__)))
main('git/data-tei/translations/**/*.xml')
