// Minimal PWA service worker for TibetanDictionary
// Caches core assets referenced from index.html, main.css, and main.js (excluding plain hyperlink targets)
// Performs daily updates (checks after 24h) prioritizing HTML/CSS/JS assets.
// Improved for resilience: missing optional assets no longer break install/update.

const CACHE_PREFIX = 'tibdict-static-';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Core asset list for caching (include optional assets; only a subset is REQUIRED)
const ASSETS = [
  './index.html',
  './manifest.json',
  // CSS
  './code/css/main.css',
  './lib/jquery_tooltip/tooltip.css',
  './lib/photoswipe/photoswipe.css',
  // App code
  './code/js/dict/dataAccess.js',
  './code/js/dict/settings.js',
  './code/js/dict/main.js',
  './code/js/dict/lightbox.js',
  './settings/globalsettings.js',
  // JS libs
  './lib/jquery/jquery.js',
  './lib/photoswipe/photoswipe-lightbox.esm.min.js',
  './lib/datatables/media/js/jquery.dataTables.min.js',
  './lib/photoswipe/photoswipe.esm.min.js',
  './lib/jquery_bbq/jquery.ba-hashchange.min.js',
  './lib/jquery_textchange/jquery.textchange.js',
  './lib/tokenizer/tokenizer-1.0.1.js',
  './lib/jquery_tooltip/tooltip.js',
  './lib/sortable_js/sortable.min.js',
  // Data
  './data/syllablelist.js',
  './settings/dictlist.js',
  './settings/abbreviations.js',
  // Cordova-related (optional in web mode)
  './cordova.js',
  './ShareTextPlugin.js',
  // Fonts
  './code/css/DDC_Uchen-webfont.woff',
  // UI images referenced in index.html
  './code/css/clear.png',
  './code/css/tib-en.png',
  './code/css/en-tib.png',
  './code/css/settings.png',
  // Icons (optional)
  './dicticons/icon-flat-cropped-16x16.png',
  './dicticons/icon-flat-cropped-32x32.png',
  './dicticons/icon-flat-180x180.png',
  './dicticons/icon-flat-192x192.png',
  './dicticons/icon-flat-512x512.png'
];

// Only these are strictly required for initial install to succeed
const REQUIRED_ASSETS = [
  './index.html',
  './code/css/main.css',
  './code/js/dict/main.js'
];

let activeCacheName = null;
let updatingPromise = null;

async function listCachesSortedNewestFirst() {
  const keys = await caches.keys();
  return keys
    .filter(k => k.startsWith(CACHE_PREFIX))
    .sort((a,b) => {
      const ta = parseInt(a.substring(CACHE_PREFIX.length),10) || 0;
      const tb = parseInt(b.substring(CACHE_PREFIX.length),10) || 0;
      return tb - ta; // newest first
    });
}

async function getLatestCacheName() {
  const sorted = await listCachesSortedNewestFirst();
  return sorted[0] || null;
}

async function writeInstallTime(cache, ts) {
  try {
    await cache.put('__meta_install_time__', new Response(String(ts), { headers: { 'content-type': 'text/plain' }}));
  } catch(e) {
    console.warn('[SW] Failed to write install time meta', e);
  }
}
async function readInstallTime(cacheName) {
  if(!cacheName) return 0;
  try {
    const cache = await caches.open(cacheName);
    const res = await cache.match('__meta_install_time__');
    if(!res) return 0;
    const text = await res.text();
    const num = parseInt(text, 10);
    return isNaN(num) ? 0 : num;
  } catch(e) {
    console.warn('[SW] Failed to read install time meta', e);
    return 0;
  }
}

async function precacheAsset(cache, url, required) {
  try {
    const req = new Request(url, { cache: 'no-cache' });
    const resp = await fetch(req);
    if(!resp.ok) {
      if(required) throw new Error('Required asset failed ' + url + ' status=' + resp.status);
      console.warn('[SW] Optional asset not cached (status ' + resp.status + '):', url);
      return false;
    }
    await cache.put(req, resp);
    return true;
  } catch(e) {
    if(required) throw e;
    console.warn('[SW] Skipping optional asset due to error:', url, e);
    return false;
  }
}

async function createNewStaticCache() {
  const timestamp = Date.now();
  const newName = CACHE_PREFIX + timestamp;
  const cache = await caches.open(newName);
  // First cache required assets (fail-fast if any missing)
  for (const url of REQUIRED_ASSETS) {
    await precacheAsset(cache, url, true);
  }
  // Then attempt optional assets (non-fatal)
  for (const url of ASSETS) {
    if(REQUIRED_ASSETS.includes(url)) continue; // already cached
    await precacheAsset(cache, url, false);
  }
  await writeInstallTime(cache, timestamp);
  return newName;
}

async function purgeOldCaches(keepName) {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== keepName).map(k => caches.delete(k)));
  } catch(e) {
    console.warn('[SW] Failed purging old caches', e);
  }
}

async function ensureInitialCache() {
  if(!activeCacheName) activeCacheName = await getLatestCacheName();
  if(!activeCacheName) {
    try {
      activeCacheName = await createNewStaticCache();
      await purgeOldCaches(activeCacheName);
    } catch(e) {
      console.error('[SW] Initial cache population failed (continuing with network-only):', e);
    }
  }
}

async function maybeUpdateCache() {
  if(updatingPromise) return updatingPromise;
  const installTime = await readInstallTime(activeCacheName);
  if(Date.now() - installTime < ONE_DAY_MS) return; // still fresh
  updatingPromise = (async () => {
    try {
      const newName = await createNewStaticCache();
      activeCacheName = newName; // atomic switch
      await purgeOldCaches(newName);
      console.log('[SW] Static assets updated');
    } catch(e) {
      console.warn('[SW] Update failed, will retry later:', e);
    } finally {
      updatingPromise = null;
    }
  })();
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      await ensureInitialCache();
    } finally {
      // Always attempt to activate even if caching failed (network fallback only)
      self.skipWaiting();
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await ensureInitialCache();
    await clients.claim();
  })());
});

function normalizePath(pathname) {
  if(pathname === '/' || pathname === '') return './index.html';
  return pathname.startsWith('/') ? '.' + pathname : pathname;
}

function isCoreRequest(request) {
  if(request.method !== 'GET') return false;
  const url = new URL(request.url);
  if(location.origin !== url.origin) return false;
  const path = normalizePath(url.pathname);
  return ASSETS.includes(path);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if(request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(request);
        maybeUpdateCache();
        return net;
      } catch(e) {
        try {
          const cache = activeCacheName ? await caches.open(activeCacheName) : null;
          const cached = cache && await cache.match('./index.html');
          if(cached) return cached;
        } catch(inner) {
          console.warn('[SW] Offline fallback failed', inner);
        }
        return Response.error();
      }
    })());
    return;
  }

  if(isCoreRequest(request)) {
    event.respondWith((async () => {
      try {
        const cache = activeCacheName ? await caches.open(activeCacheName) : null;
        const cached = cache && await cache.match(request, { ignoreVary: true });
        if(cached) {
          maybeUpdateCache();
          return cached;
        }
        const net = await fetch(request, { cache: 'no-cache' });
        // Do not mutate existing version cache (immutability); rely on update cycle
        return net;
      } catch(e) {
        console.warn('[SW] Fetch failed for core asset', request.url, e);
        return Response.error();
      }
    })());
  }
});

self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') {
    self.skipWaiting();
  } else if(event.data === 'checkForUpdate') {
    maybeUpdateCache();
  }
});
