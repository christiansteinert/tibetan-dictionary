#!/bin/bash

# Requirements for the build process (all programs must be in the PATH):
# - node JS and npm and the following node.js modules:
#   * ...
# - the following unix command line tools:
#   * bash, grep, sed, cat, paste, sort, uniq, etc.
#   * sqlite 3
#   * perl 5
# - java and a current version of the Android SDK

function adjustWylieFromTonyDuff {
  text="$1"
  text="${text//I/-i}"
  text="${text//a?a\'I/-I}"

  text=`echo $text|sed "s#\([^aeiouAEIOU |]\)'a#\1A#g"`
  text=`echo $text|sed "s#\([^aeiouAEIOU |]\)'e#\1Ae#g"`
  text=`echo $text|sed "s#\([^aeiouAEIOU |]\)'i#\1I#g"`
  text=`echo $text|sed "s#\([^aeiouAEIOU |]\)'o#\1Ao#g"`
  text=`echo $text|sed "s#\([^aeiouAEIOU |]\)'u#\1U#g"`

  text="${text//aa\'a/A}"
  text="${text//aa\'e/Ae}"
  text="${text//aa\'i/I}"
  text="${text//aa\'o/Ao}"
  text="${text//aa\'u/U}"

  # sanskrit stuff
  text="${text//kSha/k+Sh}"
  text="${text//tp/t+p}"

  #convert ai ->i aai -> ai aau -> au
  text=`echo $text|sed 's#a\([aeio]\)#\1#g'`

  result=$text;
}

echo "- Converting Transliteration"
ifs="$IFS"
for f in _input/dictionaries/alternativeTransliteration/*
do
  dictName=`echo $f | sed "s/^[^-]*-//g"`
  echo $dictName
  fname=`basename "$f"`
  rm _input/dictionaries/"$fname"
  while read -r line; do
    IFS='|' read -ra line_parts <<< "$line"
    term="${line_parts[0]}"
    definition="${line_parts[1]}"

    adjustWylieFromTonyDuff "$term"
    term="$result"
    if [[ "$dictName" == "GesheChodrak-Tib_x" || $dictName == "tshig-mdzod-chen-mo-Tib" ]]; then
      adjustWylieFromTonyDuff "$definition"
      definition="$result"
      echo "$term|$definition" >> _input/dictionaries/"$fname"
    else
      echo -n "$term|" >> _input/dictionaries/"$fname"
      definitionPieces="${definition//\{/|\{|}"
      definitionPieces="${definitionPieces//\}/|\}|}"
      bracket="0"

      IFS='|' read -ra definitionPiecesArray <<< "$definitionPieces"
      for definitionPiece in "${definitionPiecesArray[@]}"
      do
        if [[ $definitionPiece == "}" ]];then
          bracket="0"
        fi

        if [[ "$bracket" == "1" ]]; then
          adjustWylieFromTonyDuff "$definitionPiece"
          echo -n "$result" >> _input/dictionaries/"$fname"
        else 
          echo -n "$definitionPiece" >> _input/dictionaries/"$fname"
        fi

        if [[ $definitionPiece == "{" ]]; then
          bracket="1"
        fi 
      done
      echo "" >> _input/dictionaries/"$fname"
    fi
    IFS="$ifs"
  done <$f
done

