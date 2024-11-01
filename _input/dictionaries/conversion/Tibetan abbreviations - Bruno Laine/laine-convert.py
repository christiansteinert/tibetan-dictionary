#!/usr/bin/python3

#  -> run  
#       pip install --user devatrans 
#     before using this script

import xml.etree.ElementTree as ET
import re



def cleanTib(tib): # clean garbage from Tibetan 
  tib = tib.strip()
  tib = tib.replace('°','')
  tib = tib.replace('?','')
  tib = tib.replace('~','')
  tib = tib.replace('ˇ','')
  tib = tib.replace('-','')
  tib = tib.replace('+\'a','A')
  tib = tib.replace('*','')
  tib = tib.replace('\n',' ')
  tib = re.sub(r'\s+',' ', tib)
  tib = tib.replace('ba[󲀱]da','bak+dod')
  tib = tib.replace('phra[􀴙]d','phrod')

  return tib


f = open("51-LaineAbbreviations", "w")
root = ET.parse('abb.xml').getroot()

sources = {}
for item in root.findall('source'):
  nr = int( item.find('no').text )
  #url = item.find('url').text
  name = item.find('name').text
  
  sources[ nr ] = name



for item in root.findall('item'):
  tib = item.find('tibw').text
  abbr = item.find('abbw').text
  src = item.find('source').text
  
  src = src.replace(',', ', ')
  for srcNr in sources:
      src = src.replace(str(srcNr), sources[srcNr])

  f.write("%s|Abbreviation for {%s}. (Source: %s)\n" % ( cleanTib(abbr), cleanTib(tib), src ) )    
  f.write("%s|Also abbreviated as {%s}. (Source: %s)\n" % ( cleanTib(tib), cleanTib(abbr), src ) )    

f.close()
