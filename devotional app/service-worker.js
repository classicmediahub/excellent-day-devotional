// ═══════════════════════════════════════════════════════
//  Excellent Day Devotional — Service Worker v3
//  Full offline support with background sync
// ═══════════════════════════════════════════════════════

const CACHE_NAME    = 'excellent-day-v26';
const APP_SHELL     = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── INSTALL: cache app shell immediately ──────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing v4 — multilingual update...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(e => console.warn('[SW] Failed to cache:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean up old caches ─────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for app shell, network-first for data ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network-first for Supabase API calls
  if (url.hostname.includes('supabase.co') || url.hostname.includes('bible-api.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Cache-first for same-origin assets (HTML, icons, fonts)
  if (url.hostname === self.location.hostname || url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // If offline and not cached, return the cached index.html for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-devotionals') {
    console.log('[SW] Background sync triggered');
  }
});
