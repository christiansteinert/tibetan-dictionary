// ─── InputProcessor type ─────────────────────────────────────────────────────

import { Language } from "@/types";
import { decorateFtsInput, ftsSegmentConvert, ftsUniToWylie } from "../utils/fts/ftsInputDecorator";
import { hkToIast } from "../utils/harvardKyotoConverter";
import { WylieConverter } from "../utils/wylieConverter";

/**
 * An InputProcessor adjusts raw input text while the user is typing, e.g. Wylie -> Tibetan
 *
 * @param query  The normalised input text (spaces as separators)
 * @returns      Display text 
 */
export type InputProcessor = (query: string) => string;

/**
 * A ReverseProcessor performs the opposite of an InputProcessor and converts in the opposite direction
 */
export type ReverseProcessor = (query: string) => string;

// ─── Processor factories ─────────────────────────────────────────────────────
export default function useInputProcessor(
  lang: Language,
  useUnicodeTibetan: boolean,
  isFts: boolean
): {
  inputProcessor?: InputProcessor;
  reverseProcessor?: ReverseProcessor;
} {

  // Tibetan
  if (lang === 'tib') {
    let wylieConverter = new WylieConverter()
    if (isFts) {
      return {
        inputProcessor: makeTibetanFtsInputProcessor(wylieConverter, useUnicodeTibetan),
        reverseProcessor: (text: string) =>
          useUnicodeTibetan ? ftsUniToWylie(text, wylieConverter) : text
      }
    }
    return {
      inputProcessor: makeTibetanInputProcessor(wylieConverter, useUnicodeTibetan),
      reverseProcessor: makeTibetanReverseInputProcessor(wylieConverter, useUnicodeTibetan)
    }
  }

  // Sanskrit
  if (lang === 'skt') {
    if (isFts) {
      return {
        inputProcessor: makeFtsSanskritInputProcessor(),
        reverseProcessor: undefined,
      };
    }
    return {
      inputProcessor: makeSanskritInputProcessor(),
      reverseProcessor: undefined,
    };
  }

  // English
  if (isFts) {
    return {
      inputProcessor: makeEnglishFtsInputProcessor(),
      reverseProcessor: undefined,
    };
  }
  return {
    inputProcessor: makeEnglishInputProcessor(),
    reverseProcessor: undefined,
  }
}


function makeEnglishInputProcessor(
): InputProcessor {
  return (query: string) => query.replace(/[-\s]+/g, ' ');
}

function makeEnglishFtsInputProcessor(): InputProcessor {
  return (query: string) => decorateFtsInput(query);
}

/**
 * Tibetan processor for term-search mode.
 * Converts the full Wylie string to Tibetan Unicode.
 */
function makeTibetanInputProcessor(
  converter: WylieConverter,
  useUnicode: boolean,
): InputProcessor {
  return (wylie: string) =>
    useUnicode ? converter.wylieToUni(wylie) : wylie;
}

/**
 * Tibetan reverse processor for term-search mode.
 * Converts a Wylie string to Tibetan Unicode.
 */
function makeTibetanReverseInputProcessor(
  converter: WylieConverter,
  useUnicode: boolean,
): InputProcessor {
  return (wylie: string) =>
    useUnicode ? converter.uniToWylie(wylie).replace(/_/g, ' ') : wylie.replace(/[-\s/]+/g, ' ');
}


/**
 * FTS processor for Tibetan: splits on operators, converts each text segment individually,
 * then reassembles with operator-spacing rules applied.
 */
function makeTibetanFtsInputProcessor(
  converter: WylieConverter,
  useUnicode: boolean,
): InputProcessor {
  return (wylie: string) => {
    const converted = useUnicode
      ? ftsSegmentConvert(wylie, seg => converter.wylieToUni(seg, true))
      : wylie;
    return decorateFtsInput(converted);
  };
}

// ─── Sanskrit processor factories ────────────────────────────────────────────

/**
 * Default processor for Sanskrit term-search mode.
 * Converts Harvard-Kyoto ASCII to IAST Unicode.
 */
function makeSanskritInputProcessor(): InputProcessor {
  return (text: string) => hkToIast(text).replace(/[-\s]+/g, ' ');
}

/**
 * FTS processor for Sanskrit: splits on operators, converts each HK segment
 * to IAST, then applies operator-spacing rules.
 */
function makeFtsSanskritInputProcessor(): InputProcessor {
  return (text: string) => {
    const converted = ftsSegmentConvert(text, seg => hkToIast(seg));
    return decorateFtsInput(converted);
  };
}
