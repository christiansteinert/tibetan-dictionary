#!/bin/bash
./negi-convert.py

cp 50* ../../public

if [ -d ../../private ]
then
  cp 50* ../../private
fi