import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import searchReducer from '@/store/searchSlice';
import settingsReducer, { getDefaultSettings } from '@/store/settingsSlice';
import type { Language } from '@/types';
import { useSyncStateFromUrl } from './useSyncStateFromUrl';

function SyncFromUrl() {
  useSyncStateFromUrl();
  return null;
}

/** Open the app at `url` with `lastInputLang` saved, and return the input language it starts with. */
function startAt(url: string, lastInputLang: Language): Language {
  const store = configureStore({
    reducer: { search: searchReducer, settings: settingsReducer },
    preloadedState: { settings: { ...getDefaultSettings(), lastInputLang } },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/" element={<SyncFromUrl />} />
          <Route path="/search/:lang?/:term?" element={<SyncFromUrl />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return store.getState().search.input.inputLang;
}

describe('useSyncStateFromUrl input language', () => {
  it('starts with the language the user last switched to', () => {
    expect(startAt('/', 'en')).toBe('en');
    expect(startAt('/', 'skt')).toBe('skt');
    expect(startAt('/', 'tib')).toBe('tib');
  });

  it('uses the language in the URL when there is one', () => {
    expect(startAt('/search/tib/chos', 'en')).toBe('tib');
    expect(startAt('/search/en/teaching', 'tib')).toBe('en');
  });
});
