/**
 * ExtendedResultList – renders the table of extended search results
 * with pagination.
 */
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import FtsResultItem from './FtsResultItem';
import Pagination from '@/components/SearchLayout/Pagination';
import styles from './FulltextSearch.module.css';
import type { Language } from '@/types';

interface Props {
  onTermClick: (term: string, lang: Language) => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function FtsResultList({
  onTermClick,
  onPrev,
  onNext,
}: Props) {
  const { results, offset, isSearching, error, lang, query } = useSelector(
    (s: RootState) => s.search.ftsResultList
  );
  const { term: selectedTerm } = useSelector((s: RootState) => s.search.definition);
  const { listSize, unicode } = useSelector((s: RootState) => s.settings);
  const useUnicodeTibetan = unicode === true || unicode === 'output';

  // Only show up to listSize items (we fetched listSize+1 to detect next page)
  const visibleResults = results.slice(0, listSize);

  if (error) {
    return <div className={styles.errorMessage}>Error: {error}</div>;
  }

  if (isSearching) {
    return <div className={styles.statusMessage}>Searching…</div>;
  }

  if (!query) {
    return null; // No search performed yet
  }

  if (results.length === 0) {
    return (
      <div className={styles.statusMessage}>
        No results found.
      </div>
    );
  }

  return (
    <div className="sm:mx-3 sm:my-2 md:my-4">
      <table className={styles.resultTable}>
        <thead>
          <tr>
            <th>Term</th>
            <th>Dictionary</th>
            <th>Definition</th>
          </tr>
        </thead>
        <tbody>
          {visibleResults.map((result, index) => (
            <FtsResultItem
              key={`${result.term}-${result.dictionary}-${index}`}
              result={result}
              isExpanded={selectedTerm === result.term}
              useUnicodeTibetan={useUnicodeTibetan}
              onTermClick={onTermClick}
            />
          ))}
        </tbody>
      </table>

      <Pagination
        offset={offset}
        resultCount={results.length}
        listSize={listSize}
        onPrev={onPrev}
        onNext={onNext}
      />
    </div>
  );
}
