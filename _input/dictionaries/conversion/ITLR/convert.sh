#!/bin/bash
./itlr-convert.py *.json

cp *Tib ../../public/52-ITLR
cp *En ../../public_en/52-ITLR
cp *Skt ../../public_skt/52-ITLR

if [ -d ../../private ]
then
  cp *Tib ../../private/52-ITLR
  cp *En ../../private_en/52-ITLR
  cp *Skt ../../private_skt/52-ITLR
fi
