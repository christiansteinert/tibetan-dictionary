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

// Initialization logic: wait for Cordova if flag is set, otherwise start immediately
function initialize() {
  let started = false;

  const run = () => {
    if (started) return;
    started = true;
    startApp();
  };

  if ((window as any).MOBILE_ENABLED) {
    console.log('Waiting for Cordova deviceready event...');
    document.addEventListener("deviceready", run, false);
    // Safety fallback: if deviceready doesn't fire within 5s, start anyway
    setTimeout(function() {
      console.log('Timeout reached, starting app without deviceready event.');
      run();
    }, 5000);
  } else {
    run();
  }
}

initialize();
