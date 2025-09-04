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

export SYLLABLELIST=data/syllablelist.js
export CSV_INPUT=`pwd`/_input/dictionaries/public
export CSV_INPUT_PRIVATE=`pwd`/_input/dictionaries/private

DIR=`pwd`


# If private folder exists, copy stuff from private to public
if [ -d $CSV_INPUT_PRIVATE ]
then
  cd _input/dictionaries/public
  cp 01* 02* 03* 04* 05* 06* 07* 08* 09* 10* 11* 12* 13* 14* 15* 16* 17* 18* 19* 20* 21* 22* 23* 25* 26* 33* 34* 35* 36* 37* 38* 40* 42* 43* 44* 45* 46* 47* 48* 49* 50* 51* 52* 53* 54* 55* 56* 57* 58* 59* 60* 61* 62* ../private 2>/dev/null

  cd "$DIR"
  cd _input/dictionaries/public_en
  cp 01* 02* 03* 04* 05* 06* 07* 08* 09* 10* 11* 12* 13* 14* 15* 16* 17* 18* 19* 20* 21* 22* 23* 25* 26* 33* 34* 35* 36* 37* 38* 40* 42* 43* 44* 45* 46* 47* 48* 49* 50* 51* 52* 53* 54* 55* 56* 57* 58* 59* 60* 61* 62* ../private_en 2>/dev/null

# 28? 29? 33? 39? 41?
  export CSV_INPUT=$CSV_INPUT_PRIVATE
  cd "$DIR"
fi


./_getTibetanSyllablesFromText.sh
cd webapp
rm $SYLLABLELIST 2>/dev/null
mkdir data 2>/dev/null

echo bulding syllable list
echo 'SYLLABLELIST={' > $SYLLABLELIST
cat ../_input/tibetan-punctuation ../_input/tibetan-syllables |grep "\|" | sed "s/\(.*\)[\|]\(.*\)/\"\1\":\"\2\",/g" >> $SYLLABLELIST

echo '};' >> $SYLLABLELIST


cd "$DIR"

./_buildDict.py

