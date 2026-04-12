#!/bin/bash
./LokeshChandra-convert.py

cp 49*Skt ../../public
cp 49*Tib ../../public_skt

if [ -d ../../private ]
then
  cp 49*Skt ../../private
  cp 49*Tib ../../private_skt
fi