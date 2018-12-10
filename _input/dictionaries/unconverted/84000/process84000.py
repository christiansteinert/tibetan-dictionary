#!/usr/bin/env python3

import xml.etree.ElementTree as ET
import sys
import re

def cleanup(value):
    if(not value):
        value = ""
    
    value = value.replace("|"," ")
    value = value.replace("\r\n"," ")
    value = value.replace("\r"," ")
    value = value.replace("\n"," ")
    

    value = re.sub(r"\s+"," ",value)
    value = re.sub(r"^\s+","",value)
    value = re.sub(r"\s+$","",value)

    return value


def cleanupTib(value, removeParens):
    if(not value):
        value = ""
    
    value = value.replace("|","/")
    value = value.replace("ī","I")
    value = value.replace("ā","A")
    value = value.replace("ū","U")
    value = value.replace("ṇ","n")
    value = value.replace("-",".")
    value = value.replace("’","'")
    value = value.replace("‘","'")
    value = value.replace("­","") # delete zero-width non-joiner
    
    if removeParens:
        value = re.sub(r"\([^)]*\)"," ",value) # remove parentheses

    value = cleanup(value)
    return value
    

def logUnexpected(xmlNode):
    print("unexpected element in definition: <" + xmlNode.tag + ">   attributes: " + str(xmlNode.attrib))
    

def getDefinitionTxt(rootItem, xmlNode):
    text = ""
    if xmlNode.text:
        text = xmlNode.text

    for child in xmlNode:
        if child.tag == '{http://read.84000.co/ns/1.0}foreign' or child.tag == '{http://read.84000.co/ns/1.0}term' or child.tag == '{http://www.tei-c.org/ns/1.0}foreign':
            lang = ''
            if '{http://www.w3.org/XML/1998/namespace}lang' in child.attrib:
                lang = cleanup( child.attrib["{http://www.w3.org/XML/1998/namespace}lang"] ).lower()
            
            if lang == 'bo-ltn':
                text += "{" + cleanupTib(getDefinitionTxt(rootItem, child), False) + "}"
                
            else:
                text += getDefinitionTxt(rootItem, child)
        
        elif child.tag == '{http://read.84000.co/ns/1.0}title' or child.tag == '{http://www.tei-c.org/ns/1.0}emph' or child.tag == '{http://www.tei-c.org/ns/1.0}term':
            text += getDefinitionTxt(rootItem, child)            
                        
        elif child.tag == '{http://www.tei-c.org/ns/1.0}ptr' or child.tag == '{http://www.tei-c.org/ns/1.0}ref' :
            if 'uri' in rootItem.attrib and 'target' in child.attrib and ( child.attrib['target'].startswith('#UT') or child.attrib['target'].startswith('#chapter')):
                uri = rootItem.attrib['uri']
                uri = re.sub("#.*", "", uri)                
                uri = uri + child.attrib['target']
                
                text += uri

            elif 'target' in child.attrib and child.attrib['target'].startswith('http'):
                text += child.attrib['target']

            else:
                logUnexpected(child)

        else:
            logUnexpected(child)
            text += getDefinitionTxt(rootItem, child)
            
        if child.tail:
            text += child.tail

    return text
#    for childNode in xmlNode.get_elements():
#        if childNode._name
        
    

def main():
    glossary = ET.parse("cumulative-glossary.xml").getroot()
    dictEn = open("out/43-84000Dict", 'w') 
    dictEnDefinitions = open("out/44-84000Definitions", 'w') 
    dictTibSynonyms = open("out/45-84000Synonyms", 'w') 
    dictSkt = open("out/46-84000Skt", 'w') 
    for termGroup in glossary.findall("{http://read.84000.co/ns/1.0}term"):
        for itemsGroup in termGroup.findall("{http://read.84000.co/ns/1.0}items"):
            for item in itemsGroup.findall("{http://read.84000.co/ns/1.0}item"):
                definitionTxt = ""
                tibTerms = []
                sktTerms = []
                engTerms = []
                
                for term in item.findall("{http://read.84000.co/ns/1.0}term"):                
                    lang = cleanup( term.attrib["{http://www.w3.org/XML/1998/namespace}lang"] ).lower()
                    term = cleanup( term.text )
                    
                    if lang == "bo-ltn" and term: 
                        if not term in tibTerms:
                            tibTerms.append(cleanupTib(term, True))
                    
                    if lang == "sa-ltn" and term:
                        if not term in sktTerms:
                            sktTerms.append(term)   
                        
                    if lang == "en" and term:                        
                        if not term in engTerms:
                            engTerms.append(term)
            
                for definitions in item.findall("{http://read.84000.co/ns/1.0}definitions"):      
                    for definition in definitions.findall("{http://read.84000.co/ns/1.0}definition"):                
                        if definitionTxt != "":
                            definitionTxt += "\\n"
                                
                        definitionTxt = definitionTxt + cleanup( getDefinitionTxt(item,definition) )

                for alternatives in item.findall("{http://read.84000.co/ns/1.0}alternatives"):                
                    for alternative in alternatives.findall("{http://read.84000.co/ns/1.0}alternative"):                
                        if definitionTxt != "":
                            definitionTxt += "\\n"
                            
                        definitionTxt = definitionTxt + cleanup( getDefinitionTxt(item,alternative) )
                
                
                sktTermsTxt = "; ".join(sktTerms)
                engTermsTxt = "; ".join(engTerms)

                for tibTerm in tibTerms:
                    synonymsTxt = "";

                    for altTibTerm in tibTerms:
                        if altTibTerm != tibTerm:
                            if synonymsTxt :
                                synonymsTxt += "; "
                            synonymsTxt += "{" + altTibTerm + "}"
                    
                    if synonymsTxt:
                        dictTibSynonyms.write("{0}|{1}\n".format(tibTerm, synonymsTxt))
                    
                    if engTermsTxt:
                        dictEn.write("{0}|{1}\n".format(tibTerm, engTermsTxt))
                        #print("{0}|{1}".format(tibTerm, engTermsTxt));
                        
                    if definitionTxt:
                        dictEnDefinitions.write("{0}|{1}\n".format(tibTerm, definitionTxt))

                    if sktTermsTxt:
                        dictSkt.write("{0}|{1}\n".format(tibTerm, sktTermsTxt))
                
    dictEn.close()
    dictEnDefinitions.close()
    dictTibSynonyms.close()
    dictSkt.close()
                
    '''
    #line = cleanupValue(line)
    if ( not line.startswith("#") ) and ( "|" in line ):
        tibetanOriginal, englishOriginal = line.split("|");
        tibetan = cleanupValueMinimal(tibetanOriginal)
        englishTerms = cleanupValue(englishOriginal)
        englishTermList = englishTerms.split(";")
        for english in englishTermList:
            english = cleanupValue(english)
            if english != "" and tibetan != "" and ( "/" not in english ) and ("." not in english) and ("," not in english) and (")" not in english) and ("=" not in english):
                #print(r"{0}|{{{1}}}: {2}".format(english,tibetan,englishOriginal))
                out.write(r"{0}|{{{1}}}: {2}".format(english,tibetan,englishOriginal))
                english2 = getAlternativeValue(english)
                if english != english2:
                    out.write(r"{0}|{{{1}}}: {2}".format(english2,tibetan,englishOriginal))

    '''

main()
