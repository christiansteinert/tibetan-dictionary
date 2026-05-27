/**
 * ResultList – the sidebar that shows the list of matching terms.
 *
 * Replaces the old jQuery DataTable with a plain <table>.
 */
import { useSelector } from 'react-redux';
import type { TermListRow } from '@/services/DictionaryApi';
import ResultItem from './ResultItem';
import Pagination from './Pagination';
import styles from './ResultList.module.css';
import { RootState } from '@/store/store';

interface Props {
  onTermSelected: (term: string) => void;
  onPrev: () => void;
  onNext: () => void;
  /**
   * The term currently selected via URL `?selected=` param.
   * Used for immediate visual feedback before Redux `activeTerm` is updated.
   * Falls back to Redux `activeTerm` when null.
   */
  selectedTerm: string | null;
}

export default function ResultList({ onTermSelected, onPrev, onNext, selectedTerm }: Props) {
  const { results, offset, lang: resultsLang, query, isSearching, error } = useSelector((s: RootState) => s.search.resultList);
  const { unicode, listSize } = useSelector((s: RootState) => s.settings);
  const { term: activeTerm } = useSelector((s: RootState) => s.search.definition);
  const useUnicodeTibetan = (unicode !== false);

  if (!query) {
    return null; // No search performed yet
  }

  // The effective selected term: URL param wins for instant feedback,
  // Redux activeTerm is the settled value once the definition has loaded.
  const effectiveSelected = selectedTerm ?? activeTerm;

  // Only show up to listSize items (we fetched listSize+1 to detect next page)
  const visibleResults = results.slice(0, listSize);
  const hasResults = results.length > 0;

  if (error) {
    return (
      <div className="leftSideBar">
        <div className="sideBarInnerWrap">
          <div className="paginate_info text-red-600 font-bold p-4">Network error: {error}</div>
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="leftSideBar">
        <div className="sideBarInnerWrap">
          <div className="paginate_info p-4">Searching...</div>
        </div>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="leftSideBar">
        <div className="sideBarInnerWrap">
          <div className="paginate_info p-4">No results found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="leftSideBar">
      <div className="sideBarInnerWrap">
        <div id="wordListContainer" className="sm:py-2 md:py-3">
          <table
            id="wordList"
            className={[
              styles.wordList,
              useUnicodeTibetan && resultsLang === 'tib' ? styles.tibWordList : '',
            ].join(' ')}
          >
            <tbody>
              {visibleResults.map((row: TermListRow) => {
                const term = row.term;
                const isSelected =
                  term === effectiveSelected ||
                  (resultsLang !== 'tib' &&
                    term.toLowerCase() === effectiveSelected?.toLowerCase());
                return (
                  <ResultItem
                    key={term}
                    term={term}
                    lang={resultsLang}
                    useUnicodeTibetan={useUnicodeTibetan}
                    isSelected={isSelected}
                    onClick={onTermSelected}
                  />
                );
              })}
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
      </div>
    </div>
  );
}
