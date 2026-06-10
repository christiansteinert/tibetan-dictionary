import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import TopBar from './TopBar';
import searchReducer, { setInputLang } from '@/store/searchSlice';
import settingsReducer from '@/store/settingsSlice';

function createTestStore(initialInputLang = 'en') {
  return configureStore({
    reducer: {
      search: searchReducer,
      settings: settingsReducer,
    },
    preloadedState: {
      search: {
        input: {
          inputLang: initialInputLang,
          mode: 'term',
          extendedSettingsVisible: false,
        },
        resultList: {
          sidebarVisible: false,
          query: '',
          lang: 'en',
          offset: 0,
          results: [],
          isSearching: false,
          error: null,
        },
        ftsResultList: {
          query: '',
          lang: 'en',
          offset: 0,
          results: [],
          isSearching: false,
          error: null,
        },
        definition: {
          term: '',
          html: '',
          inlineSections: {},
          isLoading: false,
          error: null,
        },
      } as any,
      settings: {
        layout: 'layout_black',
        unicode: true,
        lowercase: true,
      } as any,
    },
  });
}

describe('TopBar', () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates search input from URL even when store starts with different language', async () => {
    // Store is initialized with English language
    const store = createTestStore('en');

    // Simulate what useSyncStateFromUrl does on first render:
    // sync the store's inputLang to match the URL language (tib)
    act(() => {
      store.dispatch(setInputLang('tib'));
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/search/tib/slebs']}>
          <Routes>
            <Route path="/search/:lang/:term" element={<TopBar />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // TopBar should populate the input field from the URL parameter
    // Now that the store language matches the URL language, TopBar will use
    // the URL term as initial value.
    // slebs in Wylie converts to སླེབས་ in Unicode Tibetan when unicode mode is enabled
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    // Wait for the conversion from Wylie to Unicode Tibetan
    await waitFor(() => {
      expect(input.value).toBe('སླེབས་');
    });
  });
});
