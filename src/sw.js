/* Service worker. Built by the journal-sw plugin in vite.config.ts, which fills
 * in the precache list and version. Offline-first app shell; never touches
 * IndexedDB, so an update can never affect your entries. Cross-origin requests
 * (Supabase) always go straight to the network. */

const VERSION = '__VERSION__';
const CACHE = `journal-shell-${VERSION}`;
const PRECACHE = self.__PRECACHE__;
const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE.map(scopeUrl)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('journal-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // App shell: serve cached index instantly (works offline), refresh it in the background.
    event.respondWith(
      caches.open(CACHE).then(async (c) => {
        const cached = await c.match(scopeUrl('./'));
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) c.put(scopeUrl('./'), res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? fresh;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// Web Push (NOTIF-1, P1). Payload: { title, body, url }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Good morning', {
      body: data.body || 'Your prompt is ready.',
      icon: scopeUrl('icons/icon-192.png'),
      tag: 'daily',
      data: { url: data.url || './' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = scopeUrl(event.notification.data?.url || './');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(scopeUrl('./')));
      if (open) return open.focus().then((c) => c?.navigate(target));
      return self.clients.openWindow(target);
    }),
  );
});
