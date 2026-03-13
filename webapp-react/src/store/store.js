/**
 * Redux store configuration.
 *
 * Combines search + settings slices and adds a middleware that
 * persists settings to localStorage on every change.
 */
import { configureStore } from '@reduxjs/toolkit';
import searchReducer from './searchSlice';
import settingsReducer from './settingsSlice';

/**
 * Middleware that saves the settings slice to localStorage
 * whenever an action in the "settings/" namespace is dispatched.
 */
const localStorageMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (action.type?.startsWith('settings/')) {
    const { settings } = store.getState();
    try {
      localStorage.setItem('settings', JSON.stringify(settings));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }

  return result;
};

const store = configureStore({
  reducer: {
    search: searchReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});

export default store;
