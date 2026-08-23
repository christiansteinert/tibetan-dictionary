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

// Initialization logic: wait for Cordova if flag is set, otherwise start immediately
function initialize() {
  if ((window as any).CORDOVA_ENABLED) { // Cordova environment
    // Query the share plugin only after deviceready. The plugin's JS module
    // (window.ShareTextPlugin) is created by Cordova's async plugin loader and
    // clobbered onto window only once plugin initialisation finished, which
    // deviceready guarantees. Querying it earlier (e.g. at DOMContentLoaded)
    // races against that loader and silently drops the shared text.
    // deviceready is a sticky event, so registering it here is always safe.
    document.addEventListener("deviceready", () => {
      handleSharedText();
      startApp();
    }, false);

    // If the app was already running in the background, Android delivers a
    // new share intent to the existing WebView instance via onNewIntent()
    // without reloading the page. The ShareTextPlugin captures that intent
    // natively; consume it on every resume. (Cordova only fires the JS
    // resume event after a prior pause, so cold starts are not double-processed.)
    document.addEventListener("resume", handleSharedText, false);
  } else { // web application environment
    redirectLegacyHash(); // Redirect legacy JSON-based URL hashes to new format before React mounts
    startApp();
  }
}

if (document.readyState === 'loading') {
  // DOM is still loading: wait for the event
  document.addEventListener('DOMContentLoaded', initialize, false);
} else {
  // DOMContentLoaded has already fired: execute immediately
  initialize();
}
