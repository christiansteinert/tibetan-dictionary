/**
 * SearchLayout – the main search view.
 *
 * Displays a two-pane layout:
 *   Left:  ResultList (sidebar with matching terms)
 *   Right: DefinitionView (formatted dictionary definitions)
 *
 * Reads the search term from the URL via React Router params,
 * triggers the search, and manages pagination.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import ResultList from './ResultList';
import DefinitionView from './DefinitionView';
import { viewScan } from './scannedPageViewer';
import useSearch from '../../hooks/useSearch';
import useDictionaryLookup from '../../hooks/useDictionaryLookup';
import {
  setInputLang,
  setLang,
  setSidebarVisible,
} from '../../store/searchSlice';

export default function SearchLayout() {
  const { lang: urlLangParam, term } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { search } = useSearch();
  const { lookupTerm } = useDictionaryLookup();

  const { listSize } = useSelector((s) => s.settings);
  const { offset, inputLang, results: storeResults } = useSelector((s) => s.search);

  // Parse URL parameters
  const urlLang = urlLangParam || inputLang;
  const urlOffset = parseInt(searchParams.get('offset') || '0', 10);
  const urlSidebar = searchParams.get('sidebar') === 'true';
  const urlSelected = searchParams.get('selected') ? decodeURIComponent(searchParams.get('selected')) : null;

  // Track whether the initial search has been triggered for this term
  const lastSearchedTerm = useRef('');

  // Sync URL params → Redux on mount / URL change
  useEffect(() => {
    dispatch(setInputLang(urlLang));
    dispatch(setLang(urlLang));
    dispatch(setSidebarVisible(urlSidebar));
  }, [dispatch, urlLang, urlSidebar]);

  // Trigger search + definition load when the URL changes.
  useEffect(() => {
    if (!term) return;

    const decodedTerm = decodeURIComponent(term);
    const searchKey = `${decodedTerm}|${urlOffset}|${urlLang}|${urlSidebar}|${urlSelected}`;
    if (searchKey === lastSearchedTerm.current) return;
    lastSearchedTerm.current = searchKey;

    (async () => {
      // Always run the list search so pagination and the result list are correct.
      const { searchTerm, results } = await search(decodedTerm, urlLang, urlOffset);

      // Don't auto-load a definition when the sidebar is open (soft/typing search).
      if (urlSidebar) return;

      const resultList = results.length > 0 ? results : storeResults;
      if (!resultList.length) return;

      // If the user clicked a specific result item, load that definition.
      // Otherwise pick the exact match or the first result.
      if (urlSelected) {
        await lookupTerm(urlSelected, urlLang);
      } else if (searchTerm) {
        const exactMatch = resultList.find(
          (r) =>
            r[0] === searchTerm ||
            (urlLang === 'en' && r[0].toLowerCase() === searchTerm.toLowerCase())
        );
        await lookupTerm(exactMatch ? exactMatch[0] : resultList[0][0], urlLang);
      }
    })();
  }, [term, urlOffset, urlLang, urlSidebar, urlSelected, search, lookupTerm, storeResults]);

  /**
   * Handle clicking a term in the result list.
   * Keep the search :term path unchanged — only update ?selected= so the
   * effect loads that term's definition without re-running the list search.
   * The URL reflects the active selection and works correctly on reload.
   */
  const handleTermSelected = useCallback(
    (wylieTerm) => {
      const params = new URLSearchParams({
        offset: String(urlOffset),
        sidebar: 'false',
        selected: encodeURIComponent(wylieTerm),
      });
      navigate(`/search/${urlLang}/${encodeURIComponent(term)}?${params}`);
    },
    [navigate, urlLang, urlOffset, term]
  );

  /**
   * Navigate to previous page of results.
   */
  const handlePrev = useCallback(() => {
    const newOffset = Math.max(0, offset - listSize);
    const params = new URLSearchParams({
      offset: String(newOffset),
      sidebar: String(urlSidebar),
    });
    navigate(`/search/${urlLang}/${encodeURIComponent(term)}?${params}`, { replace: true });
  }, [navigate, term, offset, listSize, urlLang, urlSidebar]);

  /**
   * Navigate to next page of results.
   */
  const handleNext = useCallback(() => {
    const newOffset = offset + listSize;
    const params = new URLSearchParams({
      offset: String(newOffset),
      sidebar: String(urlSidebar),
    });
    navigate(`/search/${urlLang}/${encodeURIComponent(term)}?${params}`, { replace: true });
  }, [navigate, term, offset, listSize, urlLang, urlSidebar]);

  /**
   * Handle clicking an inline Tibetan term inside a definition.
   */
  const handleInlineTermClick = useCallback(
    (wylie, termLang) => {
      const params = new URLSearchParams({
        offset: '0',
        sidebar: 'false',
      });
      navigate(`/search/${termLang || 'tib'}/${encodeURIComponent(wylie)}?${params}`);
    },
    [navigate]
  );

  /**
   * Handle clicking a "view scan" link.
   */
  const handleScanClick = useCallback((dictId, termId, pageInfo) => {
    viewScan(dictId, termId, pageInfo);
  }, []);

  return (
    <>
      <ResultList
        onTermSelected={handleTermSelected}
        onPrev={handlePrev}
        onNext={handleNext}
        selectedTerm={urlSelected}
      />
      <div className="mainWrap">
        <DefinitionView
          onTermClick={handleInlineTermClick}
          onScanClick={handleScanClick}
        />
      </div>
    </>
  );
}
