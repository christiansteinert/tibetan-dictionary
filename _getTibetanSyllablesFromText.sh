#!/bin/bash
currPath="`pwd`"


#extract all syllables from a tibetan text and then generate a list that also contains their Unicode equivalent
# this script requires unix tools like perl, sed, grep, and cat and the variable $CSV_INPUT must be set 
# to the folder that contains the CSV files
echo "-building and converting list of syllables"

cat $CSV_INPUT/* | grep -v "^#" | sed -e "s/[|].*$//g" > /tmp/syllables.1
cat $CSV_INPUT/*Tib*  | grep -v "^#"| sed -e "s/^.*[|]//g" > /tmp/syllables.2
cat $CSV_INPUT/* | grep -v "^#"|grep '[{].*[}]' | sed "s/[{]/\n{/g" | sed "s/[}]/}\n/g" |grep '[{].*[}]' |sed 's/[{}]//g' |grep "[aeiou]" > /tmp/syllables.3
cat /tmp/syllables.* |sed -e 's#[]["—… \#/(){}<>:,;!?‘’`《》（）０１２３４５６７８９_*=]#\n#g' |sed 's#[0-9]\.*#\n#g' |sed 's#\.\.\.*#\n#g'| sed 's#^\.*##g'|sed 's#\.*$##g'|grep "[aeiouAEIOU]"|sed "s/\([aeiou]'\)\([bcdfghjklmnpqrstvwxyz]\)/\1a\2/ig" |sort >/tmp/syllable_list
cat /tmp/syllable_list |uniq >/tmp/syllables 
cat /tmp/syllables.1|sort|uniq --repeated >/tmp/syllables.multiple


echo building unicode mapping table
cd _build/util/Lingua-BO-Wylie/bin/
./wylie.pl /tmp/syllables /tmp/syllables-unicode

cd "$currPath"

echo assembling the result files
paste -d "|" /tmp/syllables /tmp/syllables-unicode | grep -v "|$" | grep -v "|.*[a-zA-Z\.]"  > _input/tibetan-syllables


#echo building pronunciation table
#./bin/pronounce.pl ../tibetan-sample-texts/wordlist-from-dictionaries.txt /tmp/prounounce
#paste -d "|" ./tibetan-sample-texts/wordlist-from-dictionaries.txt /tmp/prounounce | grep -v "|$" > ../tibetan_text_translator/data/tibetan-pronunciation