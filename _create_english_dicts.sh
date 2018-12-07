echo === deriving English-Tibetan dictionaries ===

export CSV_INPUT_PRIVATE=`pwd`/_input/dictionaries/private

./_create_english_dict.py _input/dictionaries/public/01-Hopkins2015 _input/dictionaries/public_en/01-Hopkins2015
./_create_english_dict.py _input/dictionaries/public/21-Mahavyutpatti-Skt _input/dictionaries/public_en/21-Mahavyutpatti-Skt
./_create_english_dict.py _input/dictionaries/public/23-GatewayToKnowledge _input/dictionaries/public_en/23-GatewayToKnowledge
./_create_english_dict.py _input/dictionaries/public/40-CommonTerms-Lin _input/dictionaries/public_en/40-CommonTerms-Lin
./_create_english_dict.py _input/dictionaries/public/15-Hopkins-Skt _input/dictionaries/public_en/15-Hopkins-Skt
./_create_english_dict.py _input/dictionaries/public/15-Hopkins-Skt2015 _input/dictionaries/public_en/15-Hopkins-Skt2015
./_create_english_dict.py _input/dictionaries/public/03-Berzin _input/dictionaries/public_en/03-Berzin
./_create_english_dict.py _input/dictionaries/public/05-Hackett-Def2015 _input/dictionaries/public_en/05-Hackett-Def2015
./_create_english_dict.py _input/dictionaries/public/23-GatewayToKnowledge _input/dictionaries/public_en/23-GatewayToKnowledge
./_create_english_dict.py _input/dictionaries/public/35-ThomasDoctor _input/dictionaries/public_en/35-ThomasDoctor
./_create_english_dict.py _input/dictionaries/public/36-ComputerTerms _input/dictionaries/public_en/36-ComputerTerms
./_create_english_dict.py _input/dictionaries/public/43-84000 _input/dictionaries/public_en/43-84000
./_create_english_dict.py _input/dictionaries/public/46-84000Skt _input/dictionaries/public_en/46-84000Skt
./_create_english_dict.py _input/dictionaries/en_input/38-Gaeng,Wetzel _input/dictionaries/public_en/38-Gaeng,Wetzel

if [ -d $CSV_INPUT_PRIVATE ]
then

./_create_english_dict.py _input/dictionaries/private/01-Hopkins2015 _input/dictionaries/private_en/01-Hopkins2015
./_create_english_dict.py _input/dictionaries/private/21-Mahavyutpatti-Skt _input/dictionaries/private_en/21-Mahavyutpatti-Skt
./_create_english_dict.py _input/dictionaries/private/23-GatewayToKnowledge _input/dictionaries/private_en/23-GatewayToKnowledge
./_create_english_dict.py _input/dictionaries/private/40-CommonTerms-Lin _input/dictionaries/private_en/40-CommonTerms-Lin
./_create_english_dict.py _input/dictionaries/private/15-Hopkins-Skt _input/dictionaries/private_en/15-Hopkins-Skt
./_create_english_dict.py _input/dictionaries/private/15-Hopkins-Skt2015 _input/dictionaries/private_en/15-Hopkins-Skt2015
./_create_english_dict.py _input/dictionaries/private/03-Berzin _input/dictionaries/private_en/03-Berzin
./_create_english_dict.py _input/dictionaries/private/05-Hackett-Def2015 _input/dictionaries/private_en/05-Hackett-Def2015
./_create_english_dict.py _input/dictionaries/private/23-GatewayToKnowledge _input/dictionaries/private_en/23-GatewayToKnowledge
./_create_english_dict.py _input/dictionaries/private/28-FPMT-middling-lamrim _input/dictionaries/private_en/28-FPMT-middling-lamrim
./_create_english_dict.py _input/dictionaries/private/35-ThomasDoctor _input/dictionaries/private_en/35-ThomasDoctor
./_create_english_dict.py _input/dictionaries/private/36-ComputerTerms _input/dictionaries/private_en/36-ComputerTerms
./_create_english_dict.py _input/dictionaries/private/43-84000 _input/dictionaries/private_en/43-84000
./_create_english_dict.py _input/dictionaries/private/46-84000Skt _input/dictionaries/private_en/46-84000Skt
./_create_english_dict.py _input/dictionaries/en_input/38-Gaeng,Wetzel _input/dictionaries/private_en/38-Gaeng,Wetzel
./_create_english_dict.py _input/dictionaries/en_input_private/30-Illuminator_x _input/dictionaries/private_en/30-Illuminator_x

fi
