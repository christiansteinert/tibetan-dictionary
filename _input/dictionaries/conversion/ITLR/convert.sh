#!/bin/bash
./itlr-convert.py *.json

cp *Tib ../../public/52-ITLR
cp *EnSkt ../../public_en/52-ITLR

if [ -d ../../private ]
then
  cp *Tib ../../private/52-ITLR
  cp *EnSkt ../../private_en/52-ITLR
fi