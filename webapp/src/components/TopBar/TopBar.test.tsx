import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TopBar from './TopBar';
import searchReducer from '@/store/searchSlice';
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
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('populates search input from URL when Redux syncs to the URL language', async () => {
    // Initial store language is 'en', but we open a URL for 'tib' with search term 'slebs'
    const store = createTestStore('en');

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/search/tib/slebs']}>
          <Routes>
            <Route path="/search/:lang/:term" element={<TopBar />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Initially, it might be empty if inputLang doesn't match urlLang
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    // Simulate useSyncStateFromUrl updating the store
    store.dispatch({ type: 'search/setInputLang', payload: 'tib' });

    // The component should update and the input should now reflect 'slebs'
    // Since useUnicodeTibetan defaults to true in our test store, 'slebs' Wylie
    // gets converted to Tibetan Unicode 'སླེབས'.
    expect(input.value).toBe('སླེབས');
  });
});
