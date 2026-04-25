// Service worker mínimo de nos · negrOS.
// Cachea el app shell para abrir sin red.
// (Las subidas de comprobantes pasan por Server Actions y requieren red online —
//  cuando se agregue offline-queue, va acá.)

const VERSION = "nos-v1";
const SHELL = ["/", "/login", "/admin/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Network-first para HTML; cache fallback offline
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m ?? caches.match("/"))),
    );
    return;
  }
  // Cache-first para assets
  if (req.url.includes("/_next/static")) {
    event.respondWith(
      caches.match(req).then(
        (m) =>
          m ??
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
