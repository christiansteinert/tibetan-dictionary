import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ResultList from './ResultList';
import searchReducer, { setResultListState } from '@/store/searchSlice';
import settingsReducer from '@/store/settingsSlice';

function renderResultList(initialSearchState: any = {}) {
  const store = configureStore({
    reducer: {
      search: searchReducer,
      settings: settingsReducer,
    },
    preloadedState: {
      search: {
        input: { mode: 'term', extendedSettingsVisible: false, inputLang: 'tib' },
        resultList: {
          sidebarVisible: true,
          query: 'test',
          lang: 'tib',
          offset: 0,
          results: [],
          isSearching: false,
          error: null,
          ...initialSearchState
        },
        ftsResultList: { query: '', lang: 'tib', offset: 0, results: [], isSearching: false, error: null },
        definition: { term: '', html: '', inlineSections: {}, isLoading: false, isDefinitionOnly: false, error: null }
      },
      settings: {
        unicode: false,
        lowercase: true,
        listSize: 10,
        layout: 'layout_white',
        activeDictionaries: [],
        inactiveDictionaries: [],
      }
    }
  });

  return render(
    <Provider store={store}>
      <ResultList
        onTermSelected={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        selectedTerm={null}
      />
    </Provider>
  );
}

describe('ResultList Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders "Searching..." when isSearching is true', () => {
    renderResultList({ isSearching: true, results: [] });
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('renders network error message when error is present', () => {
    renderResultList({ error: 'Failed to fetch', isSearching: false });
    expect(screen.getByText('Network error: Failed to fetch')).toBeInTheDocument();
  });

  it('renders "No results found." when not loading, no error, and results are empty', () => {
    renderResultList({ isSearching: false, error: null, results: [] });
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders results correctly when results are present', () => {
    renderResultList({
      isSearching: false,
      error: null,
      results: [{ term: 'sangs rgyas' }, { term: 'chos' }]
    });
    
    // ResultItem components render their content
    expect(screen.getByText('sangs rgyas')).toBeInTheDocument();
    expect(screen.getByText('chos')).toBeInTheDocument();
    
    // "No results found." should not be in document
    expect(screen.queryByText('No results found.')).not.toBeInTheDocument();
  });
});
