#!/bin/bash

### THIS SCRIPT IS OUTDATED AND NOT USED ANYMORE. INSTEAD A PYTHON SCRIPT OF THE SAME NAME IS DOING THIS JOB ###


# Requirements for the build process (all programs must be in the PATH):
# - node JS and npm and the following node.js modules:
#   * ...
# - the following unix command line tools:
#   * bash, grep, sed, cat, paste, sort, uniq, etc.
#   * sqlite 3
#   * perl 5
# - java and a current version of the Android SDK

#WORDLIST=data/wordlist.js
#DICTLIST=data/dictionaries.js
#SYLLABLELIST=data/syllablelist.js
#DB=TibetanDictionary.db
#CSV_INPUT=../_input/dictionaries
#CSV_INPUT_EN=../_input/dictionaries-en

#./_adjustTransliteration.sh

#./_getTibetanSyllablesFromText.sh

#cd webapp

#rm data/* 2>/dev/null
#mkdir data 2>/dev/null
#mkdir data/dict 2>/dev/null



#echo bulding syllable list
#echo 'SYLLABLELIST={' > $SYLLABLELIST
#cat ../_input/tibetan-punctuation ../_input/tibetan-syllables |grep "\|" | sed "s/\(.*\)[\|]\(.*\)/\"\1\":\"\2\",/g" >> $SYLLABLELIST

#echo '};' >> $SYLLABLELIST

#echo building word list
#cat ../_input/dictionaries/* |grep "|" | sed "s/[\|].*//g" |grep . |sort| uniq  >> $WORDLIST.tmp~

#echo 'WORDLIST=[' > $WORDLIST
#cat $WORDLIST.tmp~|sed "s/\(.*\)/\"\1\",/g" >> $WORDLIST
#echo '];' >> $WORDLIST

#echo "begin;create table WORDLIST(word text);" >$WORDLIST.dbcmd~
#while read -r line; do
#  echo "insert into WORDLIST values(\"${line}\");" >>$WORDLIST.dbcmd~
#done <$WORDLIST.tmp~
#echo "end;create index i1 on WORDLIST(word);" >> $WORDLIST.dbcmd~
#cat $WORDLIST.dbcmd~ |sqlite3 $DB



#echo 'DICTLIST=[' > $DICTLIST
#ls -1 _input/tibetan-syllables |sed 's/^[^-]*-//g' |sed "s/\(.*\)/\"\1\",/g" >> $DICTLIST
#echo '];' >> $DICTLIST

rm data/DICT.dbcmd~;



echo "- Processing English-Tibetan Dictionaries"


for f in $CSV_INPUT_EN/*
do
  dictName=`echo $f|sed 's/^[^-]*-//g'`
  lastTerm=""

  echo en: $dictName

  cat "$f" |grep -v "^#" |sort |uniq >/tmp/dict-sorted.txt
  while read -r line; do
    IFS='|' read -ra line_parts <<< "$line"

    term="${line_parts[0]}"
    fileName=`echo "$term"|sed "s/\([A-Z]\)/\1_/g"`
    definition="${line_parts[1]//\"/\\\"}"
    definition=`echo "$definition"|echo "\n"|sed "s/[\\]n/\\\\\\\\n/g"`

    IFS=' ' read -a term_parts <<< "$term"
    termLc="${term,,}"

    if(( ${#term} == 0 ))
    then
      definition=""
    fi

    if(( ${#definition} > 0 ))
    then
      echo "insert into DICT_EN values(\"${term//\"/\"\"}\",\"${dictName//\"/\"\"}\",\"${line_parts[1]//\"/\"\"}\");" >> data/DICT.dbcmd~
#      echo "insert or replace into WORDLIST(term) values(\"${term//\"/\"\"}\"\");" >> data/DICT.dbcmd~
    fi
    lastTerm="$term"
  done </tmp/dict-sorted.txt
done





echo "- Processing Tibetan-English Dictionaries"

echo "INSERT INTO \"android_metadata\" VALUES ('en_US');"  >>  data/DICT.dbcmd~


for f in $CSV_INPUT/*
do
  dictName=`echo $f|sed 's/^[^-]*-//g'`
  lastTerm=""

  echo $dictName

  cat "$f" |grep -v "^#" |sort |uniq >/tmp/dict-sorted.txt
  while read -r line; do
    IFS='|' read -ra line_parts <<< "$line"

    term="${line_parts[0]//v/w}"
    fileName=`echo "$term"|sed "s/\([A-Z]\)/\1_/g"`
    definition="${line_parts[1]//\"/\\\"}"
    definition=`echo "$definition"|echo "\n"|sed "s/[\\]n/\\\\\\\\n/g"`

    IFS=' ' read -a term_parts <<< "$term"
    firstSyllable="${term_parts[0]}"
    firstSyllableLc="${firstSyllable,,}"

    if(( ${#term} == 0 ))
    then
      definition=""
    fi

    if(( ${#definition} > 0 ))
    then
      termFile="data/dict/${firstSyllableLc//\'/_}/${fileName//\'/_}.js";
      if(( ${#term} < 0 )) #only allow terms up to 90 characters in length for individual JS files (obsolete)
      then
        if [ -f "$termFile" ]
        then
          if [ "$term" == "$lastTerm" ]; then
            echo -n " + \"\\\\n$definition\"" >> "$termFile"
          else
            echo "," >> "$termFile"
            echo -n "\"$dictName\":\"$definition\"" >> "$termFile"
          fi
        else
          mkdir "data/dict/${firstSyllableLc//\'/_}" 2>/dev/null
          echo "DICT.loadTerm(\"$term\",{" > "$termFile"
          echo -n "\"$dictName\":\"$definition\"" >> "$termFile"
        fi

#      else
#        echo "- Term too long. Skipping $term"
      fi
      echo "insert into DICT values(\"${term//\"/\"\"}\",\"${dictName//\"/\"\"}\",\"${line_parts[1]//\"/\"\"}\");" >> data/DICT.dbcmd~
#      echo "insert or replace into WORDLIST(term) values(\"${term//\"/\"\"}\"\");" >> data/DICT.dbcmd~
    fi
    lastTerm="$term"
  done </tmp/dict-sorted.txt
done







rm $DB
#echo "create table WORDLIST(term text);" |sqlite3 $DB
echo "create table DICT(term text, dictionary text, definition text);" |sqlite3 $DB
echo "create table DICT_EN(term text, dictionary text, definition text);" |sqlite3 $DB
echo "create table \"android_metadata\" (\"locale\" TEXT DEFAULT 'en_US');" |sqlite3 $DB

echo "begin;" > data/DICT.dbcmd~~
cat data/DICT.dbcmd~ |sort -s -k2,2 -k4,4  --field-separator='"' >>  data/DICT.dbcmd~~
#echo "end;create index i1 on WORDLIST(term); " >> data/DICT.dbcmd~~
echo "end;create index i2 on DICT(term); " >> data/DICT.dbcmd~~
echo "create index i3 on DICT_EN(term); " >> data/DICT.dbcmd~~

cat data/DICT.dbcmd~~ |sqlite3 $DB
echo 'analyze;' |sqlite3 $DB
rm /tmp/dict-sorted.txt





rm data/*~

cd ..
