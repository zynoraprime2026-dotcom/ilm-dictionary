// Ilm Dictionary service worker — app shell + API responses cached for offline study
const CACHE = "ilm-dict-v3";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const API = "https://ilm-api.vercel.app";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// App shell: cache-first (update in the background)
function shellFetch(req) {
  return caches.match(req).then(hit => {
    const net = fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return r;
    }).catch(() => hit);
    return hit || net;
  });
}

// API: stale-while-revalidate — everything you have ever looked up works offline
function apiFetch(req) {
  return fetch(req).then(r => {
    if (r.ok) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return r;
  }).catch(() => caches.match(req).then(hit =>
    hit || new Response(JSON.stringify({ error: "You are offline and this page was never loaded before." }), { status: 503, headers: { "Content-Type": "application/json" } })
  ));
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) e.respondWith(shellFetch(e.request));
  else if (url.origin === API) e.respondWith(apiFetch(e.request));
});
