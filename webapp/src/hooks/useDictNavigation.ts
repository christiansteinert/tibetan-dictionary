/**
 * useNavigation – URL navigation helpers for search routes.
 */
import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Language } from '@/types';
import { encodeQueryParam } from '@/utils/escape';

export function useDictNavigation() {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  /**
   * Enable or disable the extended search options bar by toggling
   * the `ext=true` query parameter in the URL while preserving all other params.
   */
  const setExtSearchEnabled = useCallback(
    (enabled: boolean) => {
      const isOnSearchPath = location.hash.startsWith('#/search') || location.hash.startsWith('#/fts-search');

      if (!isOnSearchPath) { // if we're not on a search path, switch to standard search with the extended search enabled/disabled
        navigate('/search' + (enabled ? '?ext=true' : ''));
        return;
      }

      // append/remove ?ext=true to the current URL
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (enabled) {
          next.set('ext', 'true');
        } else {
          next.delete('ext');
        }
        return next;
      });
    },
    [setSearchParams, location, navigate],
  );

  const termSearch = useCallback(
    (term: string, lang: Language, offset: number, sidebar: boolean, extendedSearch: boolean, definitionTerm?: string) => {

      const params = new URLSearchParams({});

      if (offset > 0) {
        params.set('offset', String(offset));
      }
      if (sidebar) {
        params.set('sidebar', 'true');
      }
      if (extendedSearch) {
        params.set('ext', 'true');
      }
      if (definitionTerm) {
        params.set('activeTerm', encodeQueryParam(definitionTerm));
      }

      if (term) {
        navigate(`/search/${lang}/${encodeQueryParam(term)}?${params}`);
      } else {
        navigate(`/search?${params}`);
      }
    }, [navigate]);


  const fulltextSearch = useCallback(
    (term: string, lang: Language, offset: number, sidebar: boolean, extendedSearch: boolean, definitionTerm?: string) => {

      const params = new URLSearchParams({
        offset: String(offset)
      });

      if (sidebar) {
        params.set('sidebar', 'true');
      }
      if (extendedSearch) {
        params.set('ext', 'true');
      }
      if (definitionTerm) {
        params.set('activeTerm', encodeQueryParam(definitionTerm));
      }

      if (term) {
        navigate(`/fts-search/${lang}/${encodeQueryParam(term)}?${params}`);
      } else {
        navigate(`/fts-search?${params}`);
      }
    }, [navigate]);

  const welcome = useCallback(
    () => {
      navigate('/');
    }, [navigate]);


  return { setExtSearchEnabled, termSearch, fulltextSearch, welcome };
}
