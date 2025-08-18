#!/usr/bin/env python3
import xml.etree.ElementTree as ET
import sys
import re
import os
import time
from glob import glob
from itertools import groupby
from collections import defaultdict

#from langchain_community.llms import OllamaLLM
from langchain_ollama import OllamaLLM

# 3rd party dependencies
from devatrans import DevaTrans #  -> run  pip install --user devatrans before using this script
import editdistance


# language model for fixing whitespace errors in the definitions
llm = OllamaLLM(
    base_url="http://localhost:11434",
    #model="gemma3:12b",
    model="qwen3:8b",

    #model="qwen2.5-coder:7b",
    #model="qwen2.5:7b",
)

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

def cleanupDef(definition):
    definition = cleanup(definition)
    definition = fixSpacesInDefinition(definition)
    return definition


def cleanup(value, removeParens=False):
    if(not value):
        return ''

    if removeParens:
        value = re.sub(r"\([^)]*\)", "", value)  # remove parentheses
        value = re.sub(r"\[[^\]]*\]-?", "", value)  # remove square brackets

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

def cleanupSkt(value):
    if(not value):
        value = ""

    value = value.replace("|", "")
    value = value.replace("’", "'")
    value = value.replace("‘", "'")
    value = value.replace("­", "")  # delete zero-width non-joiner
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
    elements = xmlDoc.findall(parentSelect)
    i = 0
    started = time.time_ns()
    elementCount = len(elements)
    for parentEl in elements:
        i += 1
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
            sktTerms.append(cleanupSkt(sktTerm.text))

        for entryTypeInfo in parentEl.findall(f"{{{ns}}}type"):
            entryType = getEntryType(entryTypeInfo.text)

        for engTerm in parentEl.findall(f"{{{ns}}}translation"):
            engTerms.append(cleanup(engTerm.text))

        # prefer definition on the term level (this is the preferred definition)
        for primaryDefinition in parentEl.findall(f"{{{ns}}}definition"):
            definitions = addEntryIfDissimilar(cleanupDef(primaryDefinition.text), definitions)

        # if no definition was present on the term level then look for definitions in the ref sections, which may be text-specific
        if len(definitions) == 0:
            for definition in parentEl.findall(f"{{{ns}}}ref/{{{ns}}}definition"):
                if len(definitions) < 10:
                    definitions = addEntryIfDissimilar(cleanupDef(definition.text), definitions)

        for synonym in xmlDoc.findall(f"{{{ns}}}term[@entity='{entityId}']/{{{ns}}}wylie"):
            if not synonym.text in tibTerms:
                tibTermSynonyms.append(cleanupTib(synonym.text, removeParens=True))

        if len(definitions) > 0:
            addEntries(tibTerms, tibTermSynonyms, engTerms, definitions, sktTerms, entryType, href)
        else:
            addEntries(tibTerms, tibTermSynonyms, engTerms, [], sktTerms, entryType, href)

        now = time.time_ns()
        progress = getProgress(started, now, i, elementCount)
        print(f'{progress}: {tibTerms[0]}')

def getProgress(started, now, alreadyDone, totalItems):
    secondsElapsed = int((now - started) / 1000000000)
    if secondsElapsed == 0:
        secondsElapsed = 1
    remainingItems = totalItems - alreadyDone
    secondsRemaining = int(secondsElapsed * remainingItems / alreadyDone)

    return f'{alreadyDone}/{totalItems} {formatDuration(secondsElapsed)}/{formatDuration(secondsRemaining)}'

def formatDuration(seconds):

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60

    return f"{hours:02}:{minutes:02}:{seconds:02}"


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

def appendTermWithCategory(dictData, term, category, definition):
    for headword in term.split(','):
#        if re.match('.*[^a-zA-Z\' /]', headword):
#            print(f"skipping entry {headword}")
#            continue

        if len(term) <= 85:
            headword = cleanupHeadword(headword)
            if headword != '' and definition != '':
                newEntry = (headword, category, definition)
                if not any(newEntry == existingEntry for existingEntry in dictData):
                    dictData.append(newEntry)


def sktToIast(term):
    term = cleanupHeadword(term)
    skt = dt.inter_transliterate(input_type = "sen", from_convention = "iast", to_convention = "hk", sentence = term)
    skt = skt.replace("z ", "z");
    skt = skt.replace("Z ", "Z");
    return skt;

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
            appendTermWithCategory(dictData['dictTibEn'], tibTerm, entryType, engTermsTxt)
            appendTerm(dictData['wordlistTibEn'], tibTerm, engTermsTxt)

            for sktTermsTxt in sktTerms:
                appendTerm(dictData['wordlistSktEn'], sktTermsTxt, engTermsTxt)

        if len(sktTerms) > 0:
            sktTermsTxt = ', '.join(sktTerms)
            appendTermWithCategory(dictData['dictTibSkt'], tibTerm, entryType, sktTermsTxt)
            appendTerm(dictData['wordlistTibSkt'], tibTerm, sktTermsTxt)

        if len(engTerms) > 0:
            engTermsTxt = ', '.join(engTerms)
            appendTermWithCategory(dictData['dictEnTib'], engTermsTxt, entryType, f'{{{tibTerm}}}')

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
            appendTermWithCategory(dictData['dictSktTib'], sktToIast(sktTermsTxt), entryType, f'{{{tibTerm}}}')


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

def filterEntriesWithCategory(entries, suppress_similar_entries=False):

    # Group terms with equal term and equal entryType  
    grouped_terms = defaultdict(list)
    for sourceTerm, entryType, translatedTerm in entries:
        grouped_terms[(sourceTerm, entryType)].append(translatedTerm)

    # create an output list
    grouped_output = [(sourceTerm,f"{entryType}{', '.join(translatedTerms)}")
            for (sourceTerm, entryType), translatedTerms in grouped_terms.items()]

    return filterEntries(grouped_output, suppress_similar_entries)

def isPluralVersionOfSameText(regular, possible_plural):
    return abs(len(possible_plural) - len(regular)) == 1 and (possible_plural.endswith('s') and not regular.endswith('s'))
        
def addEntryIfDissimilar(text, entries):
    text = text.replace('|', '/')

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


def fixSpacesInDefinition(definition):
    print(f"Definition: {definition}\n")


    basePrompt="/no_think You are a missing spaces corrector for text that inserts missing spaces between words and changes nothing else.\nFollow these instructions precisely: Echo the input text EXACTLY as it was entered without adding or removing anything and without modifying the spelling.\n If you encounter two words that are missing a space between them then you must insert a space between them. Otherwise your output must EXACTLY MATCH THE INPUT.\n LEAVE UNCHANGED all capitalization, spelling, special characters, quotation marks and punctuation as you encounter it!!! Do not print any messages about your work - you can only print a copy of the input data into which possibly missing spaces have been inserted. The input that you should process follows after the line of dashes:\n-----------------------------------\n'"

    original = definition
    fixed = llm.invoke(basePrompt + definition)

    fixed = fixed.replace('<think>\n\n</think>\n', '')
    fixed = fixed.replace('-----------------------------------\n','')
    fixed = fixed.strip()

    if fixed.endswith('\n.'):
        fixed = fixed.replace('\n.', '');

    fixed = re.sub(r"""^'(.*)'\.?$""", r'\1', fixed)
    fixed = re.sub(r"""^"(.*)"\.?$""", r'\1', fixed)
    fixed = re.sub(r"""^[-']""", '', fixed)

    if original.endswith(".") and not fixed.endswith("."):
        fixed = fixed + "."

    originalWithoutSpaces = re.sub(' +', '', original)
    fixedWithoutSpaces = re.sub(' +', '', fixed)

    if fixed != original:
        if fixedWithoutSpaces == originalWithoutSpaces and len(fixed) > len(original):
            # some whitespace difference was introduced
            print(f"FixedDef.:  {fixed}\n\n")
            return fixed
        else:
            print(f"BORKED:  >>>{fixed}<<<\n\n")
            return original #the language model messed up. better return the original definition!
    else:
        # no change was introduced. Return the original text
        return original


def main(path_name):
    # process input files
    for file_name in glob(path_name, recursive=True):
        print(file_name)
        process_file(file_name)

    # write Tibetan -> * files
    writeDictData(filterEntriesWithCategory(dictData['dictTibEn']), 'out/Tib_EnSkt/43-84000Dict')

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

    writeDictData(filterEntriesWithCategory(dictData['dictTibSkt']), 'out/Tib_EnSkt/46-84000Skt')

    # write En/Skt -> Tib files
    writeDictData(filterEntriesWithCategory(dictData['dictEnTib']), 'out/EnSkt_Tib/43-84000Dict')

    writeDictData(filterEntriesWithCategory(dictData['dictSktTib']), 'out/EnSkt_Tib/46-84000Skt')


    # Write wordlists
    writeDictData(filterEntries(dictData['wordlistTibSkt']), 'out/wordlists/84000_Tib_Skt')

    writeDictData(filterEntries(dictData['wordlistTibEn']), 'out/wordlists/84000_Tib_En')

    writeDictData(filterEntries(dictData['wordlistSktEn']), 'out/wordlists/84000_Skt_En')

os.chdir(os.path.dirname(os.path.abspath(__file__)))
main('84000-glossary.xml')
