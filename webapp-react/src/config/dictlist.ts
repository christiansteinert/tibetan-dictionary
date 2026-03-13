/**
 * Dictionary list configuration.
 * 
 * Defines available dictionaries and groups them logically.
 * The GROUPED_DICTLIST has dynamic keys (dictionary IDs) and values (dictionary metadata).
 * Groups can contain items, which are flattened into DICTLIST.
 */

/** Common properties for all dictionary entries */
interface BaseDictEntry {
  label: string;
  about?: string;
  abbreviations?: string;
  public: 'true' | 'false';
  listCredits?: 'true' | 'false';
  language: string[];
  highlight?: string;
  mergeLines?: boolean;
  audioId?: string;
  webOnly?: boolean;
  groupId?: string; // Added by build process for flat entries
}

/** A single dictionary entry (non-group) */
export interface DictEntry extends BaseDictEntry {}

/** A group of dictionaries */
interface DictGroup extends BaseDictEntry {
  type: 'group';
  items: {
    [key: string]: DictEntry;
  };
}

/** A dictionary entry that can be either a group or a single entry */
type DictEntryType = DictEntry | DictGroup;

/** Grouped dictionary list with dynamic keys for group/dictionary names */
interface GroupedDictListType {
  [key: string]: DictEntryType;
}

/** Flattened dictionary list (groups removed, items extracted) */
interface DictListType {
  [key: string]: DictEntry & { groupId?: string };
}

export const GROUPED_DICTLIST: GroupedDictListType = {
  "TsepakRigdzin": {
    label: 'Tsepak Rigdzin',
    highlight: '\\[([^\\]]*)\\]',
    about: 'Tibetan-English Dictionary of Buddhist Terms|Revised and Enlarged Edition|Tsepak Rigdzin|Library of Tibetan Works and Archives|ISBN: 81-85102-88-0',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "Gaeng,Wetzel": {
    label: 'Gäng / Wetzel',
    about: 'Buddhist Terms|Multilingual Version|Edited by Peter Gäng and Sylvia Wetzel|Buddhist Academy Berlin Brandenburg|June 2004|Source:  http://www.buddhistische-akademie-bb.de/pdf/BuddhistTerms.pdf',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "_HeartOfTibetanLanguage": {
    type: 'group',
    label: 'Heart of Tibetan Language',
    about: 'Vocabulary from the supplementary Anki learning cards for: The Heart of Tibetan Language|by Franziska Oertle|Dharma Publishing (dharmapublishing.com)|Volume 1: ISBN: 978-0-89800-233-1|Volume 2: ISBN: 978-0-89800-308-6|Volume 3: (forthcoming)',
    public: "true",
    language: ["tib", "<->", "en"],
    items: {
      "hotl1": {
        label: 'Heart of Tibetan Language 1',
        about: 'Vocabulary from the supplementary Anki learning cards for: The Heart of Tibetan Language – Volume 1|by Franziska Oertle|Dharma Publishing (dharmapublishing.com)|Volume 1: ISBN: 978-0-89800-233-1|Volume 2: ISBN: 978-0-89800-308-6|Volume 3: (forthcoming)',
        public: "true",
        listCredits: "true",
        audioId: "hotl1",
        language: ["tib", "<->", "en"]
      },
      "hotl2": {
        label: 'Heart of Tibetan Language 2',
        about: 'Vocabulary from the supplementary Anki learning cards for: The Heart of Tibetan Language – Volume 2|by Franziska Oertle|Dharma Publishing (dharmapublishing.com)||Volume 1: ISBN: 978-0-89800-233-1|Volume 2: ISBN: 978-0-89800-308-6|Volume 3: (forthcoming)',
        public: "true",
        listCredits: "true",
        audioId: "hotl2",
        language: ["tib", "<->", "en"]
      },
      "hotl3": {
        label: 'Heart of Tibetan Language 3',
        about: 'Vocabulary from the supplementary Anki learning cards for: The Heart of Tibetan Language – Volume 3|by Franziska Oertle|Dharma Publishing (dharmapublishing.com)|Volume 1: ISBN: 978-0-89800-233-1|Volume 2: ISBN: 978-0-89800-308-6|Volume 3: (forthcoming)',
        public: "true",
        listCredits: "true",
        audioId: "hotl3",
        language: ["tib", "<->", "en"]
      }
    }
  },
  "Drungtso": {
    label: 'Drungtso - Medical &amp; Astro Terms',
    highlight: '(&lt;[^&]*&gt;)',
    about: 'Tibetan-English Dictionary of Tibetan Medicine and Astrology|First Edition, Drungtso Publications 1999| Dr. Tsering Thakchoe Drungtso | &amp; Mrs. Tsering Dolma Drungtso',
    public: "false",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "Illuminator_x": {
    label: 'Illuminator (please only use this dictionary if you bought the original version from www.pktc.org!)',
    highlight: '(&lt;[^ ]*&gt;)',
    about: 'The Illuminator Tibetan-English Encyclopaedic Dictionary|Version 5.23, January 2014|Tony Duff 2000-2014, All rights reserved|If you use this dictionary, please buy it at: www.pktc.org/pktc',
    abbreviations: 'Illuminator',
    public: "false",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "TibTermProject": {
    label: 'Tibetan Terminology Project: Glossary of Standardised Terms',
    about: 'Tibetan Terminology Project: Glossary of Standardised Terms| Department of Education, Central Tibetan Administation, India, 2013| Chief editor: Acharya Karma Monlam | Assistant editors: Ogyen Tenzin, Yeshi Tenzin, Tsering Dhondup |Database consultant: Pema Zomkyi | Software consultants: ven. Lobsang Monlam, Gedun Dhonyoe | online version: https://tibterminology.net/',
    abbreviations: 'TibTermProject',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "Hopkins2015": {
    label: 'Hopkins 2015',
    about: 'The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
    abbreviations: 'Hopkins',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "Bialek": {
    label: 'Bialek',
    about: 'Glossary entries from Joanna Bialek: A Textbook in Classical Tibetan|Routledge (2022)|Book available at https://www.routledge.com/A-Textbook-in-Classical-Tibetan/Bialek/p/book/9781032123561',
    public: "true",
    listCredits: "true",
    abbreviations: "Bialek",
    language: ["tib", "<->", "en"]
  },
  "CommonTerms-Lin": {
    label: 'Chung-An Lin',
    about: 'Common Chinese-Tibetan-Sanskrit-English Buddhist Terminology|Compiled by Chung-An Lin, assisted by Hou-Wha Wang|2008|www.insights.org.tw',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "_RangjungYeshe": {
    type: 'group',
    label: 'Rangjung Yeshe',
    about: 'Rangjung Yeshe Dictionary|Rangjung Yeshe Tibetan-English Dharma Dictionary 3.0 by Erik Pema Kunsang (2003)|online version: http://rywiki.tsadra.org',
    public: "true",
    language: ["tib", "<->", "en"],
    items: {
      "RangjungYeshe": {
        label: 'Rangjung Yeshe',
        about: 'Rangjung Yeshe Dictionary|Rangjung Yeshe Tibetan-English Dharma Dictionary 3.0 by Erik Pema Kunsang (2003)|online version: http://rywiki.tsadra.org',
        abbreviations: 'RangjungYeshe',
        public: "true",
        listCredits: "true",
        language: ["tib", "<->", "en"]
      },
      "GatewayToKnowledge": {
        label: 'Glossary for Mipham Rinpoche\'s Gateway to Knowledge, Vol. 1 (Rangjung Yeshe)',
        mergeLines: true,
        about: 'Glossary for Mipham Rinpoche\'s Gateway to Knowledge, Vol. 1|Rangjung Yeshe Publications|Source: www.rangjung.com/gateway/KJ-main.htm',
        public: "true",
        listCredits: "true",
        language: ["tib", "<->", "en"]
      }
    }
  },
  "_Berzin": {
    type: 'group',
    label: 'Berzin',
    about: 'Dr. Alexander Berzin\'s English-Tibetan-Sanskrit Glossary|These entries are from the glossary of www.berzinarchives.com',
    public: "true",
    language: ["tib", "<->", "en"],
    items: {
      "Berzin": {
        label: 'Berzin',
        mergeLines: true,
        about: 'Dr. Alexander Berzin\'s English-Tibetan-Sanskrit Glossary|These entries are from the glossary of www.berzinarchives.com',
        public: "true",
        listCredits: "true",
        language: ["tib", "<->", "en"]
      },
      "Berzin-Def": {
        label: 'Berzin Defi&shy;nitions',
        about: 'Source: Alexander Berzin\'s English-Tibetan-Sanskrit Glossary|These entries are from the glossary of www.berzinarchives.com',
        public: "true",
        language: ["tib", "<->", "en"]
      }
    }
  },
  "_Hopkins-Definitions-English": {
    type: 'group',
    label: 'Hopkins and Hackett Defi&shy;nitions 2015',
    about: 'English Definitions by Jeffrey Hopkins and Paul Hackett as well as additional comments, divisions, others\' English|Source: The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
    public: "true",
    language: ["tib", "<->", "en"],
    items: {
      "Hopkins-Def2015": {
        label: 'Hopkins Defi&shy;nitions 2015',
        about: 'Source: The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hackett-Def2015": {
        label: 'Hackett Defi&shy;nitions 2015',
        about: 'Definitions by Paul Hackett|Source: The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hopkins-Comment": {
        label: 'Hopkins Comment 1992',
        about: 'Source: Jeffrey Hopkins\' Tibetan-Sanskrit-English Dictionary|Version 2.0.0, 1992|Formulator and Editor: Jeffrey Hopkins|Contributors: Joe Wilson, Craig Preston, John Powers, Nathaniel Garson, Paul Hackett, Andres Montano',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hopkins-Divisions2015": {
        label: 'Hopkins Divi&shy;sions 2015',
        about: 'Source: The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hopkins-Examples": {
        label: 'Hopkins Examples 1992',
        about: 'Source: Jeffrey Hopkins\' Tibetan-Sanskrit-English Dictionary|Version 2.0.0, 1992|Formulator and Editor: Jeffrey Hopkins|Contributors: Joe Wilson, Craig Preston, John Powers, Nathaniel Garson, Paul Hackett, Andres Montano',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hopkins-others'English2015": {
        label: 'Hopkins others\' English 2015',
        about: 'Source: The Uma Institute for Tibetan Studies Tibetan-Sanskrit-English Dictionary (Version: June 2015)|Jeffrey Hopkins, Editor.|Paul Hackett, Contributor and Technical Editor.| Contributors: Nathaniel Garson, William Magee, Andres Montano, John Powers, Craig Preston, Joe Wilson, Jongbok Yi|A PDF version of this dictionary is available for download at: www.uma-tibet.org',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      },
      "Hopkins-Synonyms1992": {
        label: 'Hopkins Synonyms 1992',
        about: 'Source: Jeffrey Hopkins\' Tibetan-Sanskrit-English Dictionary|Version 2.0.0, 1992|Formulator and Editor: Jeffrey Hopkins|Contributors: Joe Wilson, Craig Preston, John Powers, Nathaniel Garson, Paul Hackett, Andres Montano',
        abbreviations: 'Hopkins',
        public: "true",
        language: ["tib", "<->", "en"]
      }
    }
  },
  "84000Dict": {
    label: '84000 Glossary',
    about: '84000 Glossary|English terms from the Glossary of the 84000 translation project. http://www.84000.co/',
    public: "true",
    abbreviations: '84000',
    highlight: '(&lt;[^ ]*&gt;)',
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "84000Definitions": {
    label: '84000 Glossary-Definitions',
    about: 'English definitions from the Glossary of the 84000 translation project. http://www.84000.co/',
    abbreviations: '84000',
    highlight: '(&lt;[^ ]*&gt;)',
    public: "true",
    language: ["tib", "<->", "en"]
  },
  "ChandraDas_x": {
    label: 'Chandra Das (Please only use this dictionary if you bought the electronic Chandra Das edition from www.pktc.org!)',
    about: 'New Electronic Ediction of Sarat Chandra Das\' Tibetan-English Dictionary|version 1.023, 21st September, 2005|Padma Karpo Translation Committee, 1998-2005|If you use this dictionary, please buy it at: www.pktc.org/pktc',
    abbreviations: 'ChandraDas',
    public: "false",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "ThomasDoctor": {
    label: 'Thomas Doctor',
    about: 'Thomas Doctor\'s Tibetan-English terms|Source: Rangjung Yeshe Tibetan-English Dharma Dictionary 3.0 (2003)|online version: http://rywiki.tsadra.org',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "JimValby": {
    label: 'James Valby',
    about: 'James Valby\'s Tibetan-English Dictionary. © James Valby|Source: Rangjung Yeshe Tibetan-English Dharma Dictionary 3.0 (2003)|online version: http://rywiki.tsadra.org',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  },
  "IvesWaldo": {
    label: 'Ives Waldo',
    about: 'Ives Waldo\'s glossary compilation. © Ives Waldo|Source: Rangjung Yeshe Tibetan-English Dharma Dictionary 3.0 (2003)|online version: http://rywiki.tsadra.org',
    public: "true",
    listCredits: "true",
    language: ["tib", "<->", "en"]
  }
} as const;

// Create a flattened version of the above dictionary list where groups are removed and their items are added directly
export let DICTLIST: DictListType = {};

for (const [groupKey, groupValue] of Object.entries(GROUPED_DICTLIST)) {
  const entry = groupValue as any;
  if (entry.type === 'group') {
    for (const [itemKey, itemValue] of Object.entries(entry.items || {})) {
      DICTLIST[itemKey] = { ...itemValue as DictEntry, groupId: groupKey };
    }
  } else {
    DICTLIST[groupKey] = entry;
  }
}
