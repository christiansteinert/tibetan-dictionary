#!/bin/bash
echo === deriving English-Tibetan dictionaries ===

DICT_FOLDER=../..

export CSV_INPUT_PRIVATE="$DICT_FOLDER/private"

./create_english_dict.py $DICT_FOLDER/public/01-Hopkins2015 $DICT_FOLDER/public_en/01-Hopkins2015
./create_english_dict.py $DICT_FOLDER/public/21-Mahavyutpatti-Skt $DICT_FOLDER/public_en/21-Mahavyutpatti-Skt
./create_english_dict.py $DICT_FOLDER/public/23-GatewayToKnowledge $DICT_FOLDER/public_en/23-GatewayToKnowledge
./create_english_dict.py $DICT_FOLDER/public/40-CommonTerms-Lin $DICT_FOLDER/public_en/40-CommonTerms-Lin
./create_english_dict.py $DICT_FOLDER/public/15-Hopkins-Skt1992 $DICT_FOLDER/public_en/15-Hopkins-Skt1992
./create_english_dict.py $DICT_FOLDER/public/15-Hopkins-Skt2015 $DICT_FOLDER/public_en/15-Hopkins-Skt2015
./create_english_dict.py $DICT_FOLDER/public/03-Berzin $DICT_FOLDER/public_en/03-Berzin
./create_english_dict.py $DICT_FOLDER/public/05-Hackett-Def2015 $DICT_FOLDER/public_en/05-Hackett-Def2015
./create_english_dict.py $DICT_FOLDER/public/23-GatewayToKnowledge $DICT_FOLDER/public_en/23-GatewayToKnowledge
./create_english_dict.py $DICT_FOLDER/public/35-ThomasDoctor $DICT_FOLDER/public_en/35-ThomasDoctor
./create_english_dict.py $DICT_FOLDER/public/36-ComputerTerms $DICT_FOLDER/public_en/36-ComputerTerms
./create_english_dict.py $DICT_FOLDER/public/43-84000Dict $DICT_FOLDER/public_en/43-84000Dict
./create_english_dict.py $DICT_FOLDER/public/46-84000Skt $DICT_FOLDER/public_en/46-84000Skt
./create_english_dict.py $DICT_FOLDER/en_input/38-Gaeng,Wetzel $DICT_FOLDER/public_en/38-Gaeng,Wetzel

if [ -d $CSV_INPUT_PRIVATE ]
then
./create_english_dict.py $DICT_FOLDER/private/01-Hopkins2015 $DICT_FOLDER/private_en/01-Hopkins2015
./create_english_dict.py $DICT_FOLDER/private/21-Mahavyutpatti-Skt $DICT_FOLDER/private_en/21-Mahavyutpatti-Skt
./create_english_dict.py $DICT_FOLDER/private/23-GatewayToKnowledge $DICT_FOLDER/private_en/23-GatewayToKnowledge
./create_english_dict.py $DICT_FOLDER/private/40-CommonTerms-Lin $DICT_FOLDER/private_en/40-CommonTerms-Lin
./create_english_dict.py $DICT_FOLDER/private/15-Hopkins-Skt1992 $DICT_FOLDER/private_en/15-Hopkins-Skt1992
./create_english_dict.py $DICT_FOLDER/private/15-Hopkins-Skt2015 $DICT_FOLDER/private_en/15-Hopkins-Skt2015
./create_english_dict.py $DICT_FOLDER/private/03-Berzin $DICT_FOLDER/private_en/03-Berzin
./create_english_dict.py $DICT_FOLDER/private/05-Hackett-Def2015 $DICT_FOLDER/private_en/05-Hackett-Def2015
./create_english_dict.py $DICT_FOLDER/private/23-GatewayToKnowledge $DICT_FOLDER/private_en/23-GatewayToKnowledge
./create_english_dict.py $DICT_FOLDER/private/28-FPMT-middling-lamrim $DICT_FOLDER/private_en/28-FPMT-middling-lamrim
./create_english_dict.py $DICT_FOLDER/private/35-ThomasDoctor $DICT_FOLDER/private_en/35-ThomasDoctor
./create_english_dict.py $DICT_FOLDER/private/36-ComputerTerms $DICT_FOLDER/private_en/36-ComputerTerms
./create_english_dict.py $DICT_FOLDER/private/43-84000Dict $DICT_FOLDER/private_en/43-84000Dict
./create_english_dict.py $DICT_FOLDER/private/46-84000Skt $DICT_FOLDER/private_en/46-84000Skt
./create_english_dict.py $DICT_FOLDER/en_input/38-Gaeng,Wetzel $DICT_FOLDER/private_en/38-Gaeng,Wetzel
./create_english_dict.py $DICT_FOLDER/en_input_private/30-Illuminator_x $DICT_FOLDER/private_en/30-Illuminator_x

fi
