#!/bin/bash

pip install --no-build-isolation pyewts

./update_vocabulary.py
cp terms.csv ../../public/68-tibetanlanguage-school