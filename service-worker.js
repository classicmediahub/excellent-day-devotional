// ═══════════════════════════════════════════════════════
//  Excellent Day Devotional — Service Worker
//  Handles offline caching so the app works without internet
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'excellent-day-v1';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts (cached on first load)
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Cinzel:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&display=swap',
  // Supabase CDN
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// ── INSTALL: cache all static assets ──────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Cache each asset individually so one failure doesn't break everything
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] Failed to cache:', url, err);
        }))
      );
    }).then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ── ACTIVATE: clean up old caches ─────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim(); // take control immediately
    })
  );
});

// ── FETCH: serve from cache, fall back to network ─────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Supabase API calls (always need fresh data)
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;

  // Strategy: Cache First for static assets, Network First for HTML
  if (request.mode === 'navigate' || request.destination === 'document') {
    // Network First for HTML pages — always try to get fresh version
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve cached version
          return caches.match(request) || caches.match('/index.html');
        })
    );
  } else {
    // Cache First for everything else (fonts, icons, scripts)
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        // Not in cache — fetch and cache it
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => {
          console.warn('[SW] Fetch failed for:', request.url);
        });
      })
    );
  }
});

// ── BACKGROUND SYNC: retry failed journal saves ───────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal') {
    console.log('[SW] Background sync: journal');
    // Supabase handles retries — this is a hook for future use
  }
});

// ── PUSH NOTIFICATIONS (future feature) ──────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Excellent Day', {
    body: data.body || 'Your daily devotional is ready 🙏',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'daily-devotional',
    renotify: true,
    data: { url: data.url || '/' }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
