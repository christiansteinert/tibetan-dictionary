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
echo "private dir $CSV_INPUT_PRIVATE"
if [ -d $CSV_INPUT_PRIVATE ]
then
  echo "Copying public dictionaries to private folder..."

  cd "$DIR"
  cd _input/dictionaries/public
  echo $PWD
  cp * ../private

  cd "$DIR"
  cd _input/dictionaries/public_en
  echo $PWD
  cp * ../private_en

  cd "$DIR"
  cd _input/dictionaries/public_skt
  echo $PWD
  cp * ../private_skt


  #export CSV_INPUT=$CSV_INPUT_PRIVATE
fi

cd "$DIR"
python3 buildscripts/_buildDict.py
