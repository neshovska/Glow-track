// GlowTrack Service Worker v3
const CACHE = 'glowtrack-v3';
const STATIC = ['./manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

// ── FIREBASE CLOUD MESSAGING ──
// Compat SDK used here on purpose: service workers can't easily use the
// modular SDK without a bundler, so this stays independent of the
// version used in index.html (10.14.1 there, compat build here — fine,
// they don't need to match).
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAssUyJ9xhc9JfDbuKWjM9GLsqdlnrkFa8",
  authDomain: "after-care-treatment.firebaseapp.com",
  projectId: "after-care-treatment",
  storageBucket: "after-care-treatment.firebasestorage.app",
  messagingSenderId: "771928458805",
  appId: "1:771928458805:web:770106c907426147d1137c"
});

const messaging = firebase.messaging();

// Обработва push съобщения, когато приложението е на заден план/затворено
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'GlowTrack';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: payload.data || {}
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// При клик върху нотификацията — фокусира/отваря приложението
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// ── CACHING (непроменено) ──
self.addEventListener('install', e => {
  // Cache only non-HTML static assets
  // DO NOT cache index.html - let browser handle auth state
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
    // NO clients.claim() - this was breaking Firebase auth sessions
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always skip caching for:
  // - HTML pages (auth state must be fresh)
  // - Firebase/Google APIs
  // - POST/PUT/DELETE requests
  if(
    e.request.headers.get('accept')?.includes('text/html') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('firebaseapp') ||
    e.request.method !== 'GET'
  ) {
    e.respondWith(fetch(e.request).catch(() => {
      // Offline fallback for HTML
      if(e.request.headers.get('accept')?.includes('text/html')) {
        return caches.match('./index.html');
      }
      return new Response('', {status: 503});
    }));
    return;
  }
  // Cache-first for static assets (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        if(response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => new Response('', {status: 503}));
    })
  );
});

self.addEventListener('message', e => {
  if(e.data === 'skipWaiting') self.skipWaiting();
});
