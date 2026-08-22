// Service worker mínimo — só cacheia o shell do app (HTML/JS/CSS já
// baixados) pra abrir mais rápido e funcionar como app instalável.
// Não tenta cache offline de dados (pedidos vêm sempre do Supabase, ao vivo).
const CACHE = "schuck-shell-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const resposta = await fetch(e.request);
        if (resposta.ok && new URL(e.request.url).origin === self.location.origin) {
          cache.put(e.request, resposta.clone());
        }
        return resposta;
      } catch {
        const cacheado = await cache.match(e.request);
        return cacheado || Response.error();
      }
    })
  );
});
