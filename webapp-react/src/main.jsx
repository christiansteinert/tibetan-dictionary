/**
 * Application entry point.
 *
 * Sets up:
 *  - Redux store (Provider)
 *  - React Router (HashRouter)
 *  - Legacy URL redirect
 *  - Root render
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import store from './store/store';
import App from './App';
import { redirectLegacyHash } from './routes/legacyRedirect';
import { initializeFormatters } from './utils/definitionFormatter';
import './index.css';

// Redirect legacy JSON-based URL hashes to new format before React mounts
redirectLegacyHash();

// Initialize the definition formatter (loads abbreviation patterns, etc.)
initializeFormatters();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>
);
