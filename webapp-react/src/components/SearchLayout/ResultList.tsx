/**
 * ResultList – the sidebar that shows the list of matching terms.
 *
 * Replaces the old jQuery DataTable with a plain <table>.
 */
import { useSelector } from 'react-redux';
import ResultItem from './ResultItem';
import Pagination from './Pagination';

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
  const { results, activeTerm, offset } = useSelector((s: any) => s.search);
  const inputLang = useSelector((s: any) => s.search.inputLang);
  const { unicode, listSize } = useSelector((s: any) => s.settings);
  const useUnicodeTibetan = unicode === true || unicode === 'output';

  // The effective selected term: URL param wins for instant feedback,
  // Redux activeTerm is the settled value once the definition has loaded.
  const effectiveSelected = selectedTerm ?? activeTerm;

  // Only show up to listSize items (we fetched listSize+1 to detect next page)
  const visibleResults = results.slice(0, listSize);
  const hasResults = results.length > 0;

  if (!hasResults) {
    return (
      <div className="leftSideBar">
        <div className="sideBarInnerWrap">
          <div className="paginate_info">No results found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="leftSideBar">
      <div className="sideBarInnerWrap">
        <div id="wordListContainer">
          <table id="wordList" className="dataTable">
            <tbody>
              {visibleResults.map((row: string[]) => {
                const term = row[0];
                const isSelected =
                  term === effectiveSelected ||
                  (inputLang === 'en' &&
                    term.toLowerCase() === effectiveSelected?.toLowerCase());
                return (
                  <ResultItem
                    key={term}
                    term={term}
                    lang={inputLang}
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
