#!/bin/bash
./laine-convert.py
cp 51* ../../public

if [ -d $CSV_INPUT_PRIVATE ]
then
  cp 51* ../../private
fi