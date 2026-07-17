/*
 * Service Worker — FENYXIA Meccafit PWA.
 * Estratégia enxuta: network-first para navegações (conteúdo sempre fresco),
 * com fallback do último HTML em cache quando offline. Não intercepta APIs
 * nem autenticação (deixa passar direto para a rede).
 */

const CACHE_VERSION = "fenyxia-meccafit-v1";
const OFFLINE_URLS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Só cuida de navegações do próprio domínio; API/auth passam direto.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(request, copy))
            .catch(() => undefined);
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? caches.match("/")),
        ),
    );
  }
});
