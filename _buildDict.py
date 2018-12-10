#!/usr/bin/env python3

import sqlite3, sys, re, os

#WORDLIST="data/wordlist.js"
#DICTLIST="data/dictionaries.js"
#SYLLABLELIST="data/syllablelist.js"
DB="webapp/TibetanDictionary.db"
DB_PRIVATE="webapp/TibetanDictionary_private.db"
CSV_INPUT="_input/dictionaries/public"
CSV_INPUT_EN="_input/dictionaries/public_en"
CSV_INPUT_PRIVATE="_input/dictionaries/private"
CSV_INPUT_PRIVATE_EN="_input/dictionaries/private_en"
     

def createDb(path):

    if os.path.exists(path):
        os.remove(path)    
    
    db = sqlite3.connect(path)
    db.execute("create table DICTNAMES(id int, language text, name text)")
    db.execute("create table DICT(term text, dictionary int, definition text)")
    db.execute("create table DICT_EN(term text, dictionary int, definition text)")
    db.execute("create table \"android_metadata\" (\"locale\" TEXT DEFAULT 'en_US')")
    
    return db


def cleanupTerm(value, isTibetan):
    value = value.replace("\""," ")
    value = value.replace("-"," ")
    value = re.sub(r"^\s+","",value)
    value = re.sub(r"\s+$","",value)
    value = value.replace("\\n"," ")
    value = re.sub(r"\s+"," ",value)
    value = value.replace("­","") # delete zero-width non-joiner

    if isTibetan:
        value = value.replace("v", "w")

    return value



def cleanupDef(value):
    value = value.replace("\"","\"\"")
    value = re.sub(r"^\s+","",value)
    value = re.sub(r"\s+$","",value)
    value = value.rstrip("\r\n")
    value = value.rstrip("\r")
    value = value.rstrip("\n")
    
    return value
    
    
    '''
    value = cleanupValueMinimal(value)
    value = re.sub(r"[:]","",value)
    value = re.sub(r"\{.*?\}","",value)
    value = re.sub(r"\[.*?\]","",value)
    value = re.sub(r"\(.*?\)","",value)
    value = re.sub(r"\"","",value)
    value = re.sub(r"″","",value)
    value = re.sub(r"^\s*as verb\s*:\s*","",value)
    value = re.sub(r"^\s*verb\s*:\s*","",value)
    value = re.sub(r"^\s*as noun\s*:\s*","",value)
    value = re.sub(r"^\s*noun\s*:\s*","",value)
    value = re.sub(r"^\s*as adjective\s*:\s*","",value)
    value = re.sub(r"^\s*adjective\s*:\s*","",value)
    value = re.sub(r"^\s*adj\.\s*:\s*","",value)
    value = re.sub(r"\.\.\.","",value)
    value = value.replace("?","")
    value = value.replace("*","")
    value = value.replace("—"," ")
    value = value.replace("'","")
    value = re.sub(r"^\s+","",value)
    value = re.sub(r"\s+$","",value)

    value = value.replace("ä","a")
    value = value.replace("ö","o")
    value = value.replace("ü","u")
    value = value.replace("Ä","A")
    value = value.replace("Ö","O")
    value = value.replace("Ü","U")
    value = value.replace("ā","A")
    value = value.replace("Ā","A")
    value = value.replace("ī","I")
    value = value.replace("Ī","I")
    value = value.replace("ū","U")
    value = value.replace("Ū","U")
    value = value.replace("ē","e")
    value = value.replace("ō","o")

    value = value.replace("ṛ","R")
    value = value.replace("ṛ","R")
    value = value.replace("ṝ","RR")
    value = value.replace("Ṛ","R")
    value = value.replace("Ṝ","RR")
    value = value.replace("ḷ","lR")
    value = value.replace("ḹ","lRR")
    value = value.replace("Ḷ","lR")
    value = value.replace("Ḹ","lRR")
    value = value.replace("ṃ","M")
    value = value.replace("ḥ","H")
    value = value.replace("ṅ","N")
    value = value.replace("Ṅ","N")
    value = value.replace("ṇ","N")
    value = value.replace("Ṇ","N")
    value = value.replace("ñ","N")
    value = value.replace("Ñ","N")
    value = value.replace("ṭ","T")
    value = value.replace("Ṭ","T")
    value = value.replace("ḍ","D")
    value = value.replace("Ḍ","D")
    value = value.replace("ś","S")
    value = value.replace("Ś","S")
    value = value.replace("ṣ","S")
    value = value.replace("Ṣ","S")

    ''' 



    return value

def getDictNameFromFile(dictFile):
    return re.sub("^.*[0-9][0-9]-","",dictFile)



def processFile(dictFile, db, dictNr, isTibetan):
    if isTibetan:
        language = "bo"
    else:
        language = "en"
        
    
    sqlQuery = 'insert into DICTNAMES values({0},"{1}","{2}");'.format(dictNr, language, getDictNameFromFile(dictFile))
    db.execute(sqlQuery)

    if isTibetan:
        tableName = "DICT"
    else:
        tableName = "DICT_EN"
        
    
    existingTerms = {}
    with open(dictFile, 'r') as inp:
        
        for line in inp:
            if ( not line.startswith("#") ) and ( "|" in line ):
                term, definition = line.split("|");
                
                term = cleanupTerm(term, isTibetan)
                definition = cleanupDef(definition)
                
                
                lineContents = term + "|" + definition
                if (term != "") and (definition != "") and (lineContents not in existingTerms):
                    # todo Check, if same entry was already seen before!
                    sqlQuery = 'insert into {0} values("{1}",{2},"{3}");'.format(tableName, term, dictNr, definition)
                    db.execute(sqlQuery)
                    existingTerms[lineContents] = 1
                
                #tibetan = cleanupValueMinimal(tibetanOriginal)
                #englishTerms = cleanupValue(englishOriginal)
            

def processFolder(db, srcFolder, isTibetan):
    dictNr = 1
    for dictFile in os.listdir(srcFolder):
        dictFileWithPath = os.path.join(srcFolder, dictFile)
        if not os.path.isdir(dictFileWithPath):
            print(dictFileWithPath)
            
            
            processFile(dictFileWithPath, db, dictNr, isTibetan)
            db.commit()
            dictNr+=1
            

    db.commit()

def closeDb(db):
    db.execute("create index i1 on DICT(term, dictionary);")
    db.execute("create index i2 on DICT_EN(term, dictionary);")
    db.execute("create index i3 on DICTNAMES(language, name, id);")
    
    db.commit()
    db.close()
    


def main():
    print("=== PUBLIC DICTIONARIES ===")

    db = createDb(DB)
    
    print("- Processing Tibetan-English Dictionaries")
    processFolder(db, CSV_INPUT, True)
    
    print("- Processing English-Tibetan Dictionaries")
    processFolder(db, CSV_INPUT_EN, False)
    
    closeDb(db)


    if os.path.exists(CSV_INPUT_PRIVATE):
        print("=== PRIVATE DICTIONARIES ===")
        db = createDb(DB_PRIVATE)
    
        print("- Processing Tibetan-English Dictionaries")
        processFolder(db, CSV_INPUT_PRIVATE, True)
    
        print("- Processing English-Tibetan Dictionaries")
        processFolder(db, CSV_INPUT_PRIVATE_EN, False)
    
        closeDb(db)

    
    '''
    with open(sys.argv[1], 'r') as inp:        
        print(sys.argv[1])
        with open(sys.argv[2], 'w') as out:
            for line in inp:
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
