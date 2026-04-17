/**
 * useDictionaryLookup – fetches and formats definitions for a single term.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setActiveTerm,
  setDefinitionHtml,
  setInlineSections,
  setIsLoadingDefinition,
  setDefinitionError,
  type InlineSection,
} from '@/store/searchSlice';
import { readTerm, checkTibetanSectionsForLinks } from '@/services/DictionaryApi';
import { formatDefinitionList } from '@/utils/definitionFormatter';
import { DICTLIST } from '@/config/dictlist';
import type { DictEntry } from '@/config/dictlist';
import { ABBREVIATIONS } from '@/config/abbreviations';
import { WylieConverter } from '@/utils/wylieConverter';
import type { Language } from '@/types';
import { RootState } from '@/store/store';

const wylieConverter = new WylieConverter();

interface LookupResult {
  html: string;
  inlineSections: Record<string, InlineSection>;
}

interface UseDictionaryLookupReturn {
  lookupTerm: (term: string, termLang?: Language) => Promise<LookupResult | null>;
}

export default function useDictionaryLookup(): UseDictionaryLookupReturn {
  const dispatch = useDispatch();
  const { unicode, activeDictionaries } = useSelector((s: RootState) => s.settings);
  const lang = useSelector((s: RootState) => s.search.input.inputLang);

  /**
   * Look up a term's definitions and produce formatted HTML.
   *
   * @param term – the term in Wylie (for Tibetan) or plain text (English)
   * @param termLang – 'tib' or 'en'
   */
  const lookupTerm = useCallback(
    async (term: string, termLang?: Language): Promise<LookupResult | null> => {
      if (!term) return null;

      const normalized = wylieConverter.normalizeWylieWhitespace(term);
      const decoded = decodeURIComponent(normalized).replace(/^\s+|\s+$/g, '');

      dispatch(setActiveTerm(decoded));
      dispatch(setIsLoadingDefinition(true));
      dispatch(setDefinitionError(''));

      try {
        const { definitions } = await readTerm(
          decoded,
          termLang || lang,
          activeDictionaries
        );

        // Build ordered dictionary map based on the user's active order
        const orderedDicts: Record<string, DictEntry> = {};
        for (const id of activeDictionaries) {
          if (DICTLIST[id]) {
            orderedDicts[id] = DICTLIST[id];
          }
        }

        const result = formatDefinitionList(
          orderedDicts,
          definitions,
          decoded,
          termLang || lang,
          unicode !== false,
          ABBREVIATIONS
        );

        dispatch(setDefinitionHtml(result.tableHtml));
        dispatch(setIsLoadingDefinition(false));

        // Check for inline Tibetan sections that might be clickable
        if (Object.keys(result.allInlineSections).length > 0) {
          const available = await checkTibetanSectionsForLinks(
            result.allInlineSections
          );
          // Dispatch available sections so DefinitionView can activate links
          dispatch(setInlineSections(available));
          return {
            html: result.tableHtml,
            inlineSections: available,
          };
        }

        dispatch(setInlineSections({}));
        return { html: result.tableHtml, inlineSections: {} };
      } catch (err) {
        console.error('Lookup error:', err);
        dispatch(setDefinitionError(err instanceof Error ? err.message : String(err)));
        dispatch(setIsLoadingDefinition(false));
        return null;
      }
    },
    [dispatch, activeDictionaries, lang, unicode]
  );

  return { lookupTerm };
}
