#!/bin/dash
# Change to the project root (one level up from this script's directory)
cd "$(dirname "$0")/.."

# Requirements for the build process (all programs must be in the PATH):
# - node JS and npm
# - the following unix command line tools:
#   * bash, grep, sed, cat, paste, sort, uniq, etc.
#   * sqlite 3
#   * python 3
# - java and a current version of the Android SDK

export CSV_INPUT=`pwd`/_input/dictionaries/public
export CSV_INPUT_PRIVATE=`pwd`/_input/dictionaries/private

DIR=`pwd`


# If private folder exists, copy stuff from public to private
if [ -d $CSV_INPUT_PRIVATE ]
then
  cd _input/dictionaries/public
  cp * ../private 2>/dev/null

  cd "$DIR"
  cd _input/dictionaries/public_en
  cp * ../private_en 2>/dev/null

  cd "$DIR"
  cd _input/dictionaries/public_skt
  cp * ../private_skt 2>/dev/null


# 28? 29? 33? 39? 41?
  export CSV_INPUT=$CSV_INPUT_PRIVATE
  cd "$DIR"
fi

python3 buildscripts/_buildDict.py
