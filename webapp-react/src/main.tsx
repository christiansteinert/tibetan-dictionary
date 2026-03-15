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
import { redirectLegacyHash } from '@/routes/legacyRedirect';
import { handleSharedText } from '@/routes/handleSharedText';
import './index.css';
import { initDB } from '@/services/DictionaryApi';

// Redirect legacy JSON-based URL hashes to new format before React mounts
redirectLegacyHash();

// Handle shared text if running in Cordova environment
handleSharedText();

// Start the React app
async function startApp() {
  try {
    await initDB(); // Initialize the database before rendering the app (important for Cordova)
  } catch (err) {
    alert('Failed to initialize the database. The app may not work correctly. Please make sure that there is enough space available (at least 150MB). Error: ' + err);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </StrictMode>
  );
}

  if ((window as any).cordova) {
    //phonegap-based initialization for mobile app
    document.addEventListener("deviceready", startApp);
  } else {
    //normal initialization for web
    startApp();
  }