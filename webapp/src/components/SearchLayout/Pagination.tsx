/**
 * Pagination – prev / next buttons and result-count info.
 */
interface PaginationProps {
  offset: number;
  resultCount: number;
  listSize: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({
  offset,
  resultCount,
  listSize,
  onPrev,
  onNext,
}: PaginationProps) {
  const isFirstPage = offset === 0;
  const isLastPage = resultCount <= listSize;

  // Display range
  const start = offset + 1;
  const end = offset + Math.min(resultCount, listSize);
  const info = resultCount > 0 ? `Showing results ${start} to ${end}.` : '';

  return (
    <div>
      <div className="paginate_info">{info}</div>
      <div className="paginate">
        <button
          id="wordList_prev"
          className={`paginate_button${isFirstPage ? ' disabled' : ''}`}
          disabled={isFirstPage}
          onClick={onPrev}
        >Previous</button>

        <button
          id="wordList_next"
          className={`paginate_button${isLastPage ? ' disabled' : ''}`}
          disabled={isLastPage}
          onClick={onNext}
        >Next</button>
      </div>
    </div>
  );
}
