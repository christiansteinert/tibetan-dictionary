#!/usr/bin/env python3

import xml.etree.ElementTree as ET
import sys
import re
import os
from glob import glob
from itertools import groupby

# 3rd party libs
import editdistance

ns = 'http://read.84000.co/ns/1.0'

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

def process_file(glossary_file):
    try:
        xmlDoc = ET.parse(glossary_file).getroot()
    except Exception as e:
        print(f'!!! file parsing error: {e}')
        return

    # extract text titles
    extractTextTitles(xmlDoc,
                           f".//{{{ns}}}ref",
                           f".//{{{ns}}}title")


    # extract actual glossary entries
    extractGlossaryEntries(xmlDoc,
                           f".//{{{ns}}}term")

def cleanupEntryType(text):
    return text.replace('eft:','')
    
def extractGlossaryEntries(xmlDoc, entrySelect):
#    1. how to deal with multiple stuff that has the same entity ID -> consider as synonyms?! Probably synonyms are better
#e.g. entity-29044"
#
#    => translation can be multiple
#84000 Glossary vs Glossary Definitions => combine the two?! Otherwise, no way to group definitions and content!


    #<term entity="http://purl.84000.co/resource/core/entity-44294" href="https://read.84000.co/glossary/entity-44294.html" sort-key="la ba can">
    #    <tibetan>ལ་བ་ཅན།</tibetan>
    #    <wylie>la ba can</wylie>
    #    <type>eft:person</type>
    #    <translation>Kambala</translation>
    #    <sanskrit>kambala</sanskrit>
    for parentEl in xmlDoc.findall(entrySelect):
        tibTerms = []
        tibTermSynonyms = []
        sktTerms = []
        engTerms = []
        entryTypes = []
        definitions = []

        entityId = parentEl.attrib['entity']

        for wylie in parentEl.findall(f"{{{ns}}}wylie"):
            tibTerms.append(cleanupTib(wylie.text, removeParens=True))

        for sktTerm in parentEl.findall(f"{{{ns}}}sanskrit"):
            sktTerms.append(sktTerm.text)

        for engTerm in parentEl.findall(f"{{{ns}}}translation"):
            engTerms.append(cleanup(engTerm.text))

        for entryType in parentEl.findall(f"{{{ns}}}type"):
            entryTypes.append(entryType.text)

        # prefer definition on the term level (this is the preferred definition)
        for primaryDefinition in parentEl.findall(f"{{{ns}}}definition"):
            definitions = addEntryIfDissimilar(cleanup(primaryDefinition.text), definitions)

        # if no definition was present on the term level then look for definitions in the ref sections, which may be text-specific
        if len(definitions) == 0: 
            for definition in parentEl.findall(f"{{{ns}}}ref/{{{ns}}}definition"):
                definitions = addEntryIfDissimilar(cleanup(definition.text), definitions)
        
        for synonym in xmlDoc.findall(f"{{{ns}}}term[@entity='{entityId}']/{{{ns}}}wylie"):
            if not synonym.text in tibTerms:
                tibTermSynonyms.append(cleanupTib(synonym.text, removeParens=True))

        # fixme:
        # 1) combine similar definitions for same lemma 
        # 2) use entry type
        # 3) combine definitions and entries and add seperate entries for each variant of a term
        if len(definitions) > 0:
            for definitionTxt in definitions:
                addEntries(tibTerms, tibTermSynonyms, engTerms, definitionTxt, sktTerms)
        else:
            addEntries(tibTerms, tibTermSynonyms, engTerms, '', sktTerms)



def extractTextTitles(xmlDoc, parentSelect, childSelect):
    for parentEl in xmlDoc.findall(parentSelect):
        tibTerms = []
        sktTerms = []
        engTerms = []
        tibTermSynonyms = []
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
                if 'type' in childEl.attrib and childEl.attrib[f'type'] == "definition":
                    if definitionTxt != "":
                        definitionTxt += "\\n"
                    definitionTxt = definitionTxt + \
                        cleanup(childEl.text)

                elif titleText and (not titleText in engTerms):
                    engTerms.append(titleText)

        addEntries(tibTerms, tibTermSynonyms, engTerms, definitionTxt, sktTerms)


def getLang(xmlElem):
    """
    Get the language from the xml:lang attribute of an xml element
    """
    if '{http://www.w3.org/XML/1998/namespace}lang' in xmlElem.attrib:
        lang = cleanup(
            xmlElem.attrib["{http://www.w3.org/XML/1998/namespace}lang"]).lower()
    else:
        lang = 'en'

    return lang

def appendTerm(dictData, tibTerm, definition):
    if re.match('.*[^a-zA-Z\' /]', tibTerm):
        return

    for headword in tibTerm.split(','):
        if len(tibTerm) <= 85:
            dictData.append((cleanupHeadword(headword), definition))

def addEntries(tibTerms, tibTermSynonyms, engTerms, definitionTxt, sktTerms):
    for tibTerm in tibTerms:
        for altTibTerm in tibTerms:
            if altTibTerm != tibTerm:
                appendTerm(dictData['dictTibSynonyms'], tibTerm, f'{{{altTibTerm}}}')
        for altTibTerm in tibTermSynonyms:
            if altTibTerm != tibTerm:
                appendTerm(dictData['dictTibSynonyms'], tibTerm, f'{{{altTibTerm}}}')

        for engTermsTxt in engTerms:
            appendTerm(dictData['dictEn'], tibTerm, engTermsTxt)

        if definitionTxt:
            appendTerm(dictData['dictEnDefinitions'], tibTerm, definitionTxt)

        for sktTermsTxt in sktTerms:
            appendTerm(dictData['dictSkt'], tibTerm, sktTermsTxt)

def simplifyForCompare(txt):
    return re.sub(r'[\.,‟”“I,\'‘’]', '', txt).lower()

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
    for entry in sorted(entries, key=lambda entry: entry[0] + '|' + simplifyForCompare(entry[1]) + entry[1]):
        print('.', end='')

        entry_text = entry[1]
        length = max(len(entry_text), len(prev_entry_text))
        min_length = min(len(entry_text), len(prev_entry_text))

        if entry_text.lower().startswith('see ') or entry_text.lower().startswith('also translated here'):
            continue

        if simplifyForCompare(entry_text) != simplifyForCompare(prev_entry_text):

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


def isPluralVersionOfSameText(regular, possible_plural):
    return abs(len(possible_plural) - len(regular)) == 1 and (possible_plural.endswith('s') and not regular.endswith('s'))
        
def addEntryIfDissimilar(text, entries):
    if text.lower().startswith('see ') or text.lower().startswith('also translated here'):
        return entries

    for index, entry in enumerate(entries):
        length = max(len(text), len(entry))
        min_length = min(len(text), len(entry))
        max_distance = length / 5
        substring_distance = min_length / 5

        if simplifyForCompare(text) == simplifyForCompare(entry):
            return entries  # an identical entry already exist - nothing do do

        if isPluralVersionOfSameText(entry, text):
            return entries # in the case of singular vs plural prefer the singular form of the term

        if ((editdistance.eval(text.lower(), entry.lower()) <= max_distance) or (editdistance.eval(text[:min_length].lower(), entry[:min_length].lower()) <= substring_distance)):
                if len(text) > len(entry): # if two entries are similar then keep the longer one
                    entries[index] = text
                    return entries
    
    entries.append(text)

    return entries    


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

def remove_excessive_defs(dictData, max_definitions=6):
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
main('./*.xml')
