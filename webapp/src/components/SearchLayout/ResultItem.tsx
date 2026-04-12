/**
 * ResultItem – a single row in the result list sidebar.
 */
import { memo } from 'react';
import { WylieConverter } from '@/utils/wylieConverter';
import { Language } from '@/types';

const wylieConverter = new WylieConverter();

interface Props {
  term: string;
  lang: Language;
  useUnicodeTibetan: boolean;
  isSelected: boolean;
  onClick: (term: string) => void;
}

const ResultItem = memo(function ResultItem({
  term,
  lang,
  useUnicodeTibetan,
  isSelected,
  onClick,
}: Props) {
  // Build the display text
  const displayText =
    lang === 'tib' && useUnicodeTibetan
      ? wylieConverter.wylieToUni(term)
      : term

  return (
    <tr
      className={isSelected ? 'selected' : ''}
      onClick={(e) => {
        e.preventDefault();
        onClick(term);
      }}
    >
      <td>
        <a href="#" data-term={term}>
          {displayText}
        </a>
      </td>
    </tr>
  );
});

export default ResultItem;
