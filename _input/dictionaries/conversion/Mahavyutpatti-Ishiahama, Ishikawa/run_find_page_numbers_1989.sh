#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

python3 "${SCRIPT_DIR}/find_page_numbers.py" \
  --xml "${SCRIPT_DIR}/ddbc.mahavyutpatti.tei.p5.xml" \
  --pdf "${SCRIPT_DIR}/Ishihama_1989_Bye rtogs chen mo.pdf" \
  --search-pattern '[({][Ss8]\.\s*<key>[)}]' \
  --output "${SCRIPT_DIR}/page_numbers_ishihama_1989.csv" \
  --start-page 43 \
  --end-page 485

python3 "${SCRIPT_DIR}/find_page_numbers.py" \
  --xml "${SCRIPT_DIR}/ddbc.mahavyutpatti.tei.p5.xml" \
  --pdf "${SCRIPT_DIR}/Ishikawa 1990 - sGra sbyor bam gnyis.pdf" \
  --search-pattern '(?:^|;)\s*[Ss8§]\.\s*<key>\s*(?=[;)}]|$)' \
  --output "${SCRIPT_DIR}/page_numbers_ishikawa_1990a.csv" \
  --start-page 11 \
  --end-page 72 \
  --skip-missing \
  --replace 'S.976-1004|; S.976; S.977; S.978; S.979; S.980; S.981; S.982; S.983; S.984; S.985; S.986; S.987; S.988; S.989; S.990; S.991; S.992; S.993; S.994; S.995; S.996; S.997; S.998; S.999; S.1000; S.1001; S.1002; S.1003; S.1004;' \
  --replace 'S.913-923|; S.913; S.914; S.915; S.916; S.917; S.918; S.919; S.920; S.921; S.922; S.923;' \
  --replace 'S.1504-1507|; S.1504; S.1505; S.1506; S.1507;' \
  --replace 'S.1667-1670|; S.1667; S.1668; S.1669; S.1670;' \
  --replace 'S.1671-1675|; S.1671; S.1672; S.1673; S.1674; S.1675;'

python3 "${SCRIPT_DIR}/find_page_numbers.py" \
  --xml "${SCRIPT_DIR}/ddbc.mahavyutpatti.tei.p5.xml" \
  --pdf "${SCRIPT_DIR}/Ishikawa 1990 - sGra sbyor bam gnyis-alternative OCR.pdf" \
  --search-pattern '(?:^|;)\s*[Ss8§]\.\s*<key>\s*(?=[;)}]|$)' \
  --output "${SCRIPT_DIR}/page_numbers_ishikawa_1990b.csv" \
  --start-page 11 \
  --end-page 72 \
  --skip-missing \
  --replace 'S.976-1004|; S.976; S.977; S.978; S.979; S.980; S.981; S.982; S.983; S.984; S.985; S.986; S.987; S.988; S.989; S.990; S.991; S.992; S.993; S.994; S.995; S.996; S.997; S.998; S.999; S.1000; S.1001; S.1002; S.1003; S.1004;' \
  --replace 'S.913-923|; S.913; S.914; S.915; S.916; S.917; S.918; S.919; S.920; S.921; S.922; S.923;' \
  --replace 'S.1504-1507|; S.1504; S.1505; S.1506; S.1507;' \
  --replace 'S.1667-1670|; S.1667; S.1668; S.1669; S.1670;' \
  --replace 'S.1671-1675|; S.1671; S.1672; S.1673; S.1674; S.1675;'

cat page_numbers_ishikawa_1990a.csv page_numbers_ishikawa_1990b.csv | sort -u > page_numbers_ishikawa_1990.csv
rm page_numbers_ishikawa_1990a.csv page_numbers_ishikawa_1990b.csv