#!/usr/bin/env python3
import xml.etree.ElementTree as ET
import sys
import re
import os
from glob import glob
from itertools import groupby

# 3rd party dependencies
from devatrans import DevaTrans #  -> run  pip install --user devatrans before using this script
import editdistance

ns = 'http://read.84000.co/ns/1.0'
dt = DevaTrans()

dictData = {
    'dictTibSynonyms': [],
    'dictTibEn': [],
    'dictTibEnDefinitions': [],
    'dictTibSkt': [],

    'dictSktTib': [],
    'dictEnTib': [],

    'wordlistTibSkt': [],
    'wordlistTibEn': [],
    'wordlistSktEn': []
}


def cleanupHeadword(value):
    value = cleanup(value, removeParens=True)
    value = value.replace('*','')
    value = re.sub(r'\s+', ' ', value)
    value = re.sub(r'^ ', '', value)
    value = re.sub(r' $', '', value)
    value = value.replace('“','')
    value = value.replace('"','')
    value = value.replace('”','')
    
    value = re.sub(r'.*—.*', '', value) # do not allow terms with dash as headwords
    value = re.sub(r'.*√.*', '', value) # do not allow terms with root symbol as headwords

    if value == '-':
      value = ''

    return value


def cleanup(value, removeParens=False):
    if(not value):
        return ''

    if removeParens:
        value = re.sub(r"\([^)]*\)", " ", value)  # remove parentheses
        value = re.sub(r"\[[^\]]*\]-?", " ", value)  # remove square brackets

    value = value.replace("|", " ")
    value = value.replace("\xad", "") # remove soft hyphen
    value = value.replace("\r\n", " ")
    value = value.replace("\r", " ")
    value = value.replace("\n", " ")
    value = value.replace("’", "'")
    value = value.replace("‘", "'")
    value = value.replace("­", "")  # delete zero-width non-joiner

    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"^\s+", "", value)
    value = re.sub(r"\s+$", "", value)

    if value == '-':
      value = ''


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

    value = cleanup(value, removeParens)
    return value


def logUnexpected(xmlNode):
    print("unexpected element in definition: <" +
          xmlNode.tag + ">   attributes: " + str(xmlNode.attrib))


def getDefinitionTxt(xmlNode):
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
                uri = f' https://read.84000.co/translation/{documentId}.html{anchor} '

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
    try:
        print("processing " + glossary_file)
        xmlDoc = ET.parse(glossary_file).getroot()
    except Exception as e:
        print(f'!!! file parsing error: {e}')
        return

    extractGlossaryEntries(xmlDoc, f"{{{ns}}}term")

    extractTextTitles(xmlDoc, f"{{{ns}}}term/{{{ns}}}ref")


def getEntryType(entryTypeInfo):
    if entryTypeInfo == 'eft:person':
        return 'person'
    if entryTypeInfo == 'eft:term':
        return 'term'
    if entryTypeInfo == 'eft:place':
        return 'place'
    if entryTypeInfo == 'eft:text':
        return 'text'
    
    print('unknown entry type ' + entryTypeInfo)
    return '';

def extractGlossaryEntries(xmlDoc, parentSelect):
    for parentEl in xmlDoc.findall(parentSelect):
        tibTerms = []
        sktTerms = []
        engTerms = []
        definitionTxt = ''
        entryType = ''
        definitions = []
        tibTermSynonyms = []

        entityId = parentEl.attrib['entity']
        href = parentEl.attrib['href']
        if href is not None and href != '':
            href = '(Original glossary entry: ' + href + ')'

        for wylie in parentEl.findall(f"{{{ns}}}wylie"):
            tibTerms.append(cleanupTib(wylie.text, removeParens=True))

        for sktTerm in parentEl.findall(f"{{{ns}}}sanskrit"):
            sktTerms.append(sktTerm.text)

        for entryTypeInfo in parentEl.findall(f"{{{ns}}}type"):
            entryType = getEntryType(entryTypeInfo.text)

        for engTerm in parentEl.findall(f"{{{ns}}}translation"):
            engTerms.append(cleanup(engTerm.text))

        # prefer definition on the term level (this is the preferred definition)
        for primaryDefinition in parentEl.findall(f"{{{ns}}}definition"):
            definitions = addEntryIfDissimilar(cleanup(primaryDefinition.text), definitions)

        # if no definition was present on the term level then look for definitions in the ref sections, which may be text-specific
        if len(definitions) == 0:
            for definition in parentEl.findall(f"{{{ns}}}ref/{{{ns}}}definition"):
                if len(definitions) < 10:
                    definitions = addEntryIfDissimilar(cleanup(definition.text), definitions)

        for synonym in xmlDoc.findall(f"{{{ns}}}term[@entity='{entityId}']/{{{ns}}}wylie"):
            if not synonym.text in tibTerms:
                tibTermSynonyms.append(cleanupTib(synonym.text, removeParens=True))

        if len(definitions) > 0:
            addEntries(tibTerms, tibTermSynonyms, engTerms, definitions, sktTerms, entryType, href)
        else:
            addEntries(tibTerms, tibTermSynonyms, engTerms, [], sktTerms, entryType, href)

        print(tibTerms[0])


def extractTextTitles(xmlDoc, parentSelect):
    for parentEl in xmlDoc.findall(parentSelect):
        tibTerms = []
        sktTerms = []
        engTerms = []
        engDefinitions = []

        definitionTxt = ''
        entryType = ''
        definitions = []
        tibTermSynonyms = []
        href = ""

        for childEl in parentEl.findall(f'{{{ns}}}title'):
            lang = getLang(childEl)
            titleText = cleanup(childEl.text)

            if lang == "bo-ltn" and titleText and not '་' in titleText:
                if not titleText in tibTerms:
                    tibTerms.append(cleanupTib(titleText, True))

            elif lang == "sa-ltn" and titleText:
                if not titleText in sktTerms:
                    sktTerms.append(titleText)

            elif lang == "en":
                engTerms.append(titleText)

        for tohReference in parentEl.findall(f'{{{ns}}}toh'):
            sourceReference = 'Toh.' + tohReference.text
            engDefinitions.append(sourceReference)

        for linkEl in parentEl.findall(f'{{{ns}}}link'):
            href = '(Read the text at:' + linkEl.attrib['href'] + ')'

        addEntries(tibTerms, [], engTerms, engDefinitions, sktTerms, "text", href)

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

def appendTerm(dictData, term, definition):
    for headword in term.split(','):
#        if re.match('.*[^a-zA-Z\' /]', headword):
#            print(f"skipping entry {headword}")
#            continue

        if len(term) <= 85:
            headword = cleanupHeadword(headword)
            if headword != '' and definition != '':
                dictData.append((headword, definition))

def sktToIast(term):
    term = cleanupHeadword(term)
    return dt.inter_transliterate(input_type = "sen", from_convention = "iast", to_convention = "hk", sentence = term)

def addEntries(tibTerms, tibTermSynonyms, engTerms, definitions, sktTerms, entryType, entryLink):
    definitionTxt = ''

    if entryType != '':
        entryType = f'<{entryType}> '

    for tibTerm in tibTerms:
        altTibTerms = []
        for altTibTerm in (tibTerms + tibTermSynonyms):
            if altTibTerm != tibTerm:
                altTibTerms.append(altTibTerm)

        for altTibTerm in altTibTerms:
            appendTerm(dictData['dictTibSynonyms'], tibTerm, f'{{{altTibTerm}}}')

        if len(engTerms) > 0:
            engTermsTxt = ', '.join(engTerms)
            appendTerm(dictData['dictTibEn'], tibTerm, f'{entryType}{engTermsTxt}')
            appendTerm(dictData['wordlistTibEn'], tibTerm, engTermsTxt)

            for sktTermsTxt in sktTerms:
                appendTerm(dictData['wordlistSktEn'], sktTermsTxt, engTermsTxt)

        if len(sktTerms) > 0:
            sktTermsTxt = ', '.join(sktTerms)
            appendTerm(dictData['dictTibSkt'], tibTerm, f'{entryType}{sktTermsTxt}')
            appendTerm(dictData['wordlistTibSkt'], tibTerm, sktTermsTxt)

        if len(engTerms) > 0:
            engTermsTxt = ', '.join(engTerms)
            appendTerm(dictData['dictEnTib'], engTermsTxt, f'{entryType}{{{tibTerm}}}')

        if len(definitions) > 0:
            definitionTxt = ''

            sktTermsTxt = ', '.join(sktTerms)
            engTermsTxt = ', '.join(engTerms)
            if len(sktTerms) > 0 and sktTermsTxt.lower() != engTermsTxt.lower:
                definitionTxt = f'{entryType}{engTermsTxt} (Skt: {sktTermsTxt}): '
            else:
                definitionTxt = f'{entryType}{engTermsTxt}: '
            
            if len(definitions) == 1: 
                definitionTxt += definitions[0]
                definitionTxt += ' ' + entryLink

            else: #len(definitions) > 1
                for idx, definition in enumerate(definitions):
                    idxOut = idx + 1
                    definitionTxt += f'\\n{idxOut}) {definition}'
                definitionTxt += '\\n\\n' + entryLink


            if len(altTibTerms) == 1:
                definitionTxt += '\\n\\nSynonym: ' + '{' + altTibTerms[0] + '}'
            if len(altTibTerms) > 1:
                definitionTxt += '\\n\\nSynonyms: ' + '{' + ('}, {'.join(altTibTerms)) + '}'

            appendTerm(dictData['dictTibEnDefinitions'], tibTerm, definitionTxt)


        if len(sktTerms) > 0:
            sktTermsTxt = ', '.join(sktTerms)
            appendTerm(dictData['dictSktTib'], sktToIast(sktTermsTxt), f'{entryType}{{{tibTerm}}}')


def addTextTitle(tibTitle, engTitle, sktTitle, sourceReference, textLink):
    tibEntry = f'<text title> "{{{tibTitle}}}"'
    if sktTitle != '':
        tibEntry += f', Sanskrit: "{sktTitle}"'
    if engTitle != '':
        tibEntry += f', English: "{engTitle}"'
    if sourceReference != '':
        tibEntry += f' ({sourceReference})'
    if textLink != '':
        tibEntry += f' {textLink}'

    if tibTitle != '' and engTitle != '':
        engEntry = f'<text title> "{engTitle}"'
        if sourceReference != '':
            engEntry += f' ({sourceReference})'
        if textLink != '':
            engEntry += f' {textLink}'
        appendTerm(dictData['dictEnTib'], engTitle, tibEntry)

    if tibTitle != '' and sktTitle != '':
        sktEntry = f'<text title> "{sktTitle}"'
        if sourceReference != '':
            sktEntry += f' ({sourceReference})'
        if textLink != '':
            sktEntry += f' {textLink}'
        appendTerm(dictData['dictSktTib'], sktToIast(sktTitle), tibEntry)
        appendTerm(dictData['wordlistTibSkt'], tibTitle, sktTitle)

    if sktTitle != '' and engTitle != '':
        appendTerm(dictData['wordlistSktEn'], sktTitle, engTitle)


def simplifyForCompare(txt):
    return re.sub(r'[\.,‟”“I,\'‘’]', '', txt).lower()

def writeDictData(dictEntries, fileName):
    dictFile = open(fileName, 'w')
    for entry in dictEntries:
        dictFile.write(f'{entry[0]}|{entry[1]}\n')

    dictFile.close()

def filterEntries(entries, suppress_similar_entries=False):
    filtered_entries = []
    prev_entry = ('', '')
    prev_entry_text = ''

    # Sort entries based on key, lowercase value, regular case value
    # This will group identical entries together but will also but capitalized entries before lowercase ones
    # so that capitalized writing is preferred
    for entry in sorted(entries, key=lambda entry: entry[0] + '|' + simplifyForCompare(entry[1]) + entry[1]):
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

    return filtered_entries


def isPluralVersionOfSameText(regular, possible_plural):
    return abs(len(possible_plural) - len(regular)) == 1 and (possible_plural.endswith('s') and not regular.endswith('s'))
        
def addEntryIfDissimilar(text, entries):
    if text.lower().startswith('see ') or text.lower().startswith('also translated here'):
        return entries

    for index, entry in enumerate(entries):
        length = max(len(text), len(entry))
        min_length = min(len(text), len(entry))
        max_distance = length / 3
        substring_distance = min_length / 3

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

    # write Tibetan -> * files
    writeDictData(filterEntries(dictData['dictTibEn']), 'out/Tib_EnSkt/43-84000Dict')

    writeDictData(
        remove_excessive_defs(
            filterEntries(dictData['dictTibEnDefinitions'], suppress_similar_entries=True),
        ),
        'out/Tib_EnSkt/44-84000Definitions')

    writeDictData(
        concat_def_lines(
            filterEntries(dictData['dictTibSynonyms']),
            prefix=['Synonym: ', 'Synonyms: '], 
            separator=', '), 
        'out/Tib_EnSkt/45-84000Synonyms')

    writeDictData(filterEntries(dictData['dictTibSkt']), 'out/Tib_EnSkt/46-84000Skt')

    # write En/Skt -> Tib files
    writeDictData(filterEntries(dictData['dictEnTib']), 'out/EnSkt_Tib/43-84000Dict')

    writeDictData(filterEntries(dictData['dictSktTib']), 'out/EnSkt_Tib/46-84000Skt')


    # Write wordlists
    writeDictData(filterEntries(dictData['wordlistTibSkt']), 'out/wordlists/84000_Tib_Skt')

    writeDictData(filterEntries(dictData['wordlistTibEn']), 'out/wordlists/84000_Tib_En')

    writeDictData(filterEntries(dictData['wordlistSktEn']), 'out/wordlists/84000_Skt_En')

os.chdir(os.path.dirname(os.path.abspath(__file__)))
main('glossary-download.xml')
