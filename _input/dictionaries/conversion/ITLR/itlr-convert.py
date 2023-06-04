#!/usr/bin/python3
import json
import sys
import re

# 3rd party dependencies
from devatrans import DevaTrans #  -> run  pip install --user devatrans before using this script

dt = DevaTrans()

def cleanString(txt): # clean any piece of Text
  txt = txt.replace('&amp;','&')
  return txt

def cleanTibDef(tib): # clean Tibetan definition
  tib = cleanTib(tib)
  tib = re.sub(r'\s/.*','', tib)
  return tib

def cleanTib(tib): # clean Tibetan 
  tib = cleanString(tib)
  tib = tib.strip()
  tib = tib.replace('’','\'')
  tib = tib.replace('°','')
  tib = tib.replace('?','')
  tib = tib.replace('~','')
  tib = tib.replace('ˇ','')
  tib = tib.replace('-','')
  tib = tib.replace('+\'a','A')
  tib = tib.replace('*','')
  tib = tib.replace('\n',' ')
  tib = re.sub(r'\s+',' ', tib)
  tib = re.sub(r'\s*\|','/', tib)
  
  return tib

# add a line break before numbers with a dot behind such as '1. foo 2.bar'
# However, this is only done outside of braces, so no break will be added in cases like such as: '(see 3.)'
def addDefLinebreaks(txt):
  txt = re.sub(r'^([^()]+(?:[(][^()]+[)][^()]*)*)( [0-9]\.)', r'\1\\n\2', txt) 
  return txt

def cleanDef(txt): # clean English definition
  txt = cleanString(txt)
  txt = txt.strip()
  txt = txt.replace('|','/')
  txt = re.sub('^“(.*)”$',r'\1', txt)
  txt = re.sub('^‘(.*)’$',r'\1', txt)
  txt = addDefLinebreaks(txt)
  
  return txt

def cleanEnTerm(txt): # clean English term
  txt = cleanString(txt)
  txt = txt.strip()
  txt = txt.replace('|','/')
  
  return txt


def cleanSkt(skt): # clean garbage from Sanskrit
  skt = cleanString(skt)
  if skt:
    skt = skt.strip()
    skt = skt.replace('\n','r\n')
    skt = skt.replace('|',r'\n')
    skt = skt.replace('।',r'\n')
    skt = skt.replace('ॐ','OM')
    skt = re.sub('\s+',' ', skt)

    skt = re.sub('^\\n','',skt) 
    skt = re.sub('^“(.*)”$', r'\1', skt)
    skt = re.sub('^‘(.*)’$', r'\1', skt)

    return skt
  else: 
    return ''

def cleanUrl(url): # fix URLs
  return url


def process_entry_skt(f, entry):
  entryType = entry.get('type')
  skt = cleanSkt(entry.get('skt',''))
  tibTerms = entry.get('bod')
  engTerms = entry.get('eng')
  keyinfos = entry.get('keyinfo')
  url = cleanUrl(entry.get('url',''))

  if not skt:
    return

  skt = cleanSkt(skt)
  sktTrans = dt.inter_transliterate(input_type = "sen", from_convention = "iast", to_convention = "hk", sentence = skt)

  f.write(sktTrans + '|')

  
  f.write('Sanskrit: ' + skt)
  if entryType:
    f.write(' <'+entryType+'>\\n')
  f.write('\\n\\n')

  if tibTerms:
    f.write('Tibetan renderings of ' + skt + ':')
    isFirst = True
    for tibTerm in tibTerms:
      if not isFirst:
        f.write(', ')  
      tibTerm = cleanTib(tibTerm)
      f.write('{'+tibTerm+'/}')
      isFirst = False
    f.write('\\n\\n')

  if engTerms:
    isFirst = True
    f.write('English: ')
    for engTerm in engTerms:
      engTerm = cleanEnTerm(engTerm)

      if not isFirst:
        f.write(',')
      f.write(engTerm)
      isFirst = False
    f.write('\\n')

  if keyinfos:
    for keyinfo in keyinfos:
      keyinfo = cleanDef(keyinfo)
      f.write(keyinfo+'\\n')
    f.write('\\n')

  if url:
    f.write("See the full entry at:" + url)

  f.write('\n')


def process_entry_en(f, entry):
  entryType = entry.get('type')
  skt = cleanSkt(entry.get('skt',''))
  tibTerms = entry.get('bod')
  engTerms = entry.get('eng')
  keyinfos = entry.get('keyinfo')
  url = cleanUrl(entry.get('url',''))

  if engTerms:
    for engTerm in engTerms:
      engTerm = cleanEnTerm(engTerm)

      f.write(engTerm + '|')

      f.write('Sanskrit: ' + skt)
      if entryType:
        f.write(' <'+entryType+'>\\n')
      f.write('\\n\\n')

      if tibTerms:
        f.write('Tibetan renderings of ' + skt + ':')
        isFirst = True
        for tibTerm in tibTerms:
          if not isFirst:
            f.write(', ')  
          tibTerm = cleanTib(tibTerm)
          f.write('{'+tibTerm+'/}')
          isFirst = False
        f.write('\\n\\n')

      if keyinfos:
        for keyinfo in keyinfos:
          keyinfo = cleanDef(keyinfo)
          f.write(keyinfo+'\\n')
        f.write('\\n')

      if url:
        f.write("See the full entry at:" + url)

      f.write('\n')


def process_entry_tib(f, entry):
  entryType = entry.get('type')
  skt = cleanSkt(entry.get('skt',''))
  tibTerms = entry.get('bod')
  engTerms = entry.get('eng')
  keyinfos = entry.get('keyinfo')
  url = cleanUrl(entry.get('url',''))

  if tibTerms:
    for tibTerm in tibTerms:
      tibTerm = cleanTibDef(tibTerm)
      f.write(tibTerm+'|')

      f.write('Sanskrit: ' + skt)
      if entryType:
        f.write(' <'+entryType+'>\\n')
      f.write('\\n\\n')

      if tibTerms:
        f.write('Tibetan renderings of ' + skt + ':')
        isFirst = True
        for tibTerm in tibTerms:
          if not isFirst:
            f.write(', ')  
          tibTerm = cleanTib(tibTerm)
          f.write('{'+tibTerm+'/}')
          isFirst = False
        f.write('\\n\\n')

      if engTerms:
        isFirst = True
        f.write('English: ')
        for engTerm in engTerms:
          engTerm = cleanEnTerm(engTerm)

          if not isFirst:
            f.write(',')
          f.write(engTerm)
          isFirst = False
        f.write('\\n')

      if keyinfos:
        for keyinfo in keyinfos:
          keyinfo = cleanDef(keyinfo)
          f.write(keyinfo+'\\n')
        f.write('\\n')

      if url:
        f.write("See the full entry at:" + url)

      f.write('\n')



def import_file(file_name):
  file = open(file_name)
  data = json.load(file)
  file.close()
    
  with open('52-ITLREnSkt', 'w') as f_en_skt:  
    for entry in data['entries']:
        process_entry_skt(f_en_skt, entry)

    for entry in data['entries']:
        process_entry_en(f_en_skt, entry)
    
  with open('52-ITLRTib', 'w') as f_tib:  
    for entry in data['entries']:
        process_entry_tib(f_tib, entry)
    

assert len(sys.argv) == 2, f'Usage: {sys.argv} <datafile.json>'

import_file(sys.argv[1])
  
