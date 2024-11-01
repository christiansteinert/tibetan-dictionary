#!/usr/bin/python3
import xml.etree.ElementTree as ET
import re

# 3rd party dependencies
from devatrans import DevaTrans #  -> run  pip install --user devatrans before using this script


def hideUnwantedTib(tib): # suppress Tibetan entries with characters that we cannot properly handle
  if tib:
    tib = re.sub(r'.*[\.,/|].*','',tib) 
    tib = re.sub(r'^[^()]*\([^()]*','',tib)  # Remove words with brackets that only open 
    tib = re.sub(r'^[^()]*\)[^()]*','',tib)  # Remove words with brackets that only close
    return tib
  else:
    return ''

def cleanTib(tib): # clean garbage from Tibetan 
  tib = tib.strip()
  tib = tib.replace('°','')
  tib = tib.replace('.','')
  tib = tib.replace('[','')
  tib = tib.replace(']','')
  tib = tib.replace('~','')
  tib = tib.replace('*','')
  tib = tib.replace(':','')
  tib = tib.replace('?','')
  tib = tib.replace('ß','')
  tib = tib.replace('-','')
  tib = tib.replace('\\n',' ')
  tib = tib.replace('\n',' ')
  tib = re.sub(r'[,;=/].*',' ', tib)
  tib = re.sub(r'\s+',' ', tib)
  tib = tib.strip()
  return tib


def cleanSkt(skt): # clean garbage from Sanskrit
  skt = skt.strip()
  skt = skt.replace('\n','\\n')
  skt = skt.replace('|','\\n')
  skt = skt.replace('।','\\n')
  skt = skt.replace('ॐ','OM')
  skt = re.sub(r'\s+',' ', skt)
  skt = skt.strip()
  return skt


f = open("49-LokeshChandraSkt", "w")
f2 = open("49-LokeshChandraTib", "w")
root = ET.parse('LokeshChandra.xml').getroot()
dt = DevaTrans()


for item in root.findall('item'):
  tib = item.find('tib').text
  skt = item.find('skt').text
  sktTrans = cleanSkt( dt.transliterate(input_type = "sen", to_convention = "hk", sentence = skt) )
  sktTransIast = cleanSkt( dt.transliterate(input_type = "sen", to_convention = "iast", sentence = skt) )
  
  tib = hideUnwantedTib( tib )
  
  if tib and sktTrans:
    for tib2 in tib.split('='):
      for tib3 in tib2.split(','):
        if '(' in tib3:
          tibWithoutBracketContent = cleanTib( re.sub(r'\([^)]+\)','',tib3) )
          f.write("%s|%s\n" % ( tibWithoutBracketContent.strip(), sktTransIast ) )
          if not '(' in sktTrans:
            f2.write("%s|%s\n" % ( cleanTib(sktTrans), tib3 ) )
        else:
          f.write("%s|%s\n" % ( cleanTib(tib3), sktTransIast ) )
          if not ')' in sktTrans:
            f2.write("%s|%s\n" % ( cleanTib(sktTrans), tib3 ) )
    

f.close()
f2.close()
