#!/bin/dash

# Requirements for the build process (all programs must be in the PATH):
# - node JS and npm and the following node.js modules:
#   * ...
# - the following unix command line tools:
#   * bash, grep, sed, cat, paste, sort, uniq, etc.
#   * sqlite 3
#   * perl 5
#   * python 3
# - java and a current version of the Android SDK




# Publically available dictionaries
#export WORDLIST=data/wordlist.js
#export DICTLIST=data/dictionaries.js
export SYLLABLELIST=data/syllablelist.js
#export DB=TibetanDictionary.db
export CSV_INPUT=`pwd`/_input/dictionaries/public
#export CSV_INPUT_EN=`pwd`/_input/dictionaries/public_en
export CSV_INPUT_PRIVATE=`pwd`/_input/dictionaries/private
#export CSV_INPUT_PRIVATE_EN=`pwd`/_input/dictionaries/private_en


if [ -d $CSV_INPUT_PRIVATE ]
then
rm _input/dictionaries/public/*
DIR=`pwd`

cp _input/dictionaries/unconverted/84000/out/*  _input/dictionaries/private

cd _input/dictionaries/private
cp 01* 02* 03* 04* 05* 06* 07* 08* 09* 10* 11* 12* 13* 14* 15* 16* 17* 18* 19* 20* 21* 22* 23* 25* 26* 33* 34* 35* 36* 37* 38* 40* 42* 43* 44* 45* 46* 47* 48* 49* 50* 51* ../public

cd "$DIR"
cd _input/dictionaries/private_en
cp 01* 02* 03* 04* 05* 06* 07* 08* 09* 10* 11* 12* 13* 14* 15* 16* 17* 18* 19* 20* 21* 22* 23* 25* 26* 33* 34* 35* 36* 37* 38* 40* 42* 43* 44* 45* 46* 47* 48* 49* 50* 51* ../public_en

# 28? 29? 33? 39? 41?

export CSV_INPUT=$CSV_INPUT_PRIVATE
fi

cd "$DIR"

./_getTibetanSyllablesFromText.sh
cd webapp
rm data/* 2>/dev/null
mkdir data 2>/dev/null

echo bulding syllable list
echo 'SYLLABLELIST={' > $SYLLABLELIST
cat ../_input/tibetan-punctuation ../_input/tibetan-syllables |grep "\|" | sed "s/\(.*\)[\|]\(.*\)/\"\1\":\"\2\",/g" >> $SYLLABLELIST

echo '};' >> $SYLLABLELIST


cd "$DIR"

./_create_english_dicts.sh
./_buildDict.py

#echo ===== Public Dictionaries =====
#./_buildDict.sh





# Private Dictionaries - (Not all of these can be made available on github. Sorry.)
#export WORDLIST=data/wordlist.js
#export DICTLIST=data/dictionaries.js
#export SYLLABLELIST=data/syllablelist.js
#export DB=TibetanDictionary_private.db
#export CSV_INPUT=$CSV_INPUT_PRIVATE
#export CSV_INPUT_EN=$CSV_INPUT_PRIVATE_EN


#if [ -d $CSV_INPUT ]
#then
#  echo ===== PRIVATE Dictionaries  =====
#
#  ./_buildDict.sh
#fi

