// Keeps the lock screen and its icons on the device so the app opens without internet.
// The app itself is not cached here: the lock screen stores it, decrypted, in the device database.
const AD = 'kabuk-20261005-151835';      // stamped at every publish: a new stamp makes devices take the new lock screen
const DOSYALAR = ['./', 'index.html', 'manifest.webmanifest', 'ikon-192.png', 'ikon-512.png'];

self.addEventListener('install', e => {
  // 'reload' skips the browser's own 10-minute copy, so the saved lock screen is really the published one
  e.waitUntil(caches.open(AD).then(c => c.addAll(DOSYALAR.map(d => new Request(d, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  // another site shares this web origin: clear only this site's own old caches (they all start with 'kabuk-')
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kabuk-') && k !== AD).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;          // Claude API calls and the like go straight out
  if (/(uygulama\.bin|surum\.json)$/.test(u.pathname)) return;                     // always fresh from the network
  if (e.request.mode === 'navigate') {                                             // the page: newest when online, the saved copy when not
    e.respondWith(fetch(u.origin + u.pathname, { cache: 'no-store' }).then(r => {
      if (r.ok) { const k = r.clone(); caches.open(AD).then(c => c.put('index.html', k)); }
      return r;
    }).catch(() => caches.open(AD).then(c => c.match('index.html'))));
    return;
  }
  e.respondWith(caches.open(AD).then(c => c.match(e.request, { ignoreSearch: true })).then(r => r || fetch(e.request)));
});
