#!/usr/bin/python3

#  -> run  
#       pip install --user devatrans 
#     before using this script

import xml.etree.ElementTree as ET
import re
from devatrans import DevaTrans 

def prepareLinebreaks(skt):
    skt = re.sub(r'(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi)\.','\n\\1.',skt) 
    skt = re.sub(r'•','\\n\\n•',skt) 
    return skt

def fixRomanNumerals(skt):
    skt = re.sub(r'\{(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi)\}\.','\\1.',skt) 
    return skt

def hideUnwantedTib(tib): # suppress Tibetan entries with characters that we cannot properly handle
  if tib:
    tib = re.sub(r'.*[…\.,/•|].*','',tib) 
    tib = re.sub(r'^[^()]*\([^()]*','',tib)  # Remove words with brackets that only open 
    tib = re.sub(r'^[^()]*\)[^()]*','',tib)  # Remove words with brackets that only close
    return tib
  else:
    return ''

def cleanTib(tib): # clean garbage from Tibetan 
  tib = tib.strip()
  tib = tib.replace(r'°','')
  tib = tib.replace(r'?','')
  tib = tib.replace(r'~','')
  tib = tib.replace(r'ˇ','')
  tib = tib.replace(r'-','')
  tib = tib.replace('+\'a','A')
  tib = tib.replace(r'*','')
  tib = tib.replace('\n',' ')
  tib = re.sub(r'\s+',' ', tib)
  
  return tib

def cleanDef(skt): # clean garbage from Sanskrit
  skt = skt.strip()
  skt = skt.replace('+\'a','A')
  
  return skt

def wrapWylie(skt): #wrap wylie-transliterated Tibetan text
  skt = re.sub(r"([+a-zA-Z']+[+a-zA-Z' ]*[+a-zA-Z'/]+)",'{\\1}',skt)
  return skt

def cleanSkt(skt): # clean garbage from Sanskrit
  if skt:
    skt = skt.strip()
    skt = skt.replace('\n','\\n')
    skt = skt.replace(r'|','\\n')
    skt = skt.replace(r'।','\\n')
    skt = skt.replace(r'ॐ','OM')
    skt = re.sub(r'\s+',' ', skt)

    skt = re.sub('^\\n','',skt) 
    skt = re.sub('^\\n','',skt) 

    # Fix specific mistakes
    skt = skt.replace('vajraghapraṭāpādaḥ','vajraghaṇṭāpādaḥ')

    return skt
  else: 
    return ''


f = open("50-NegiSkt", "w")
root = ET.parse('negi.xml').getroot()

dt = DevaTrans()


for item in root.findall('item'):
  tib = item.find('tib').text
  skt = item.find('tib').tail
  skt = cleanDef(skt);
  skt = prepareLinebreaks( skt )
  skt = wrapWylie( skt )
  skt = fixRomanNumerals( skt )

  # sktTrans = cleanSkt( dt.transliterate(input_type = "sen", to_convention = "hk", sentence = skt) )
  sktTrans = cleanSkt( dt.transliterate(input_type = "sen", to_convention = "iast", sentence = skt) )
   
  tib = hideUnwantedTib( tib )
  
  if tib and sktTrans:
    for tib2 in tib.split('='):
      for tib3 in tib2.split(','):
        if '(' in tib3:
          tibWithoutBracketContent = re.sub(r'\([^)]+\)','',tib3)
          f.write("%s|%s\n" % ( tibWithoutBracketContent.strip(), sktTrans ) )
#          tibWithoutBrackets = re.sub('[()]','',tib3)
#          f.write("%s|%s\n" % ( cleanTib(tibWithoutBrackets), sktTrans ) )
        else:
          f.write("%s|%s\n" % ( cleanTib(tib3), sktTrans ) )
    

f.close()
