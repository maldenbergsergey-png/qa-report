// Bump this version whenever a shell asset changes. A new worker waits until
// all old app windows close, so an editing session never mixes shell versions.
const CACHE_NAME = "qa-report-shell-v27";
const SHELL = [
  "/attachment-import.js?v=1", "/local-import-client.js?v=1",
  "/checklist-table.js?v=2",
  "/icons/icon-192.png?v=2", "/icons/icon-512.png?v=2",
  "/icons/brand-light.png?v=2", "/icons/brand-dark.png",
  "/", "/styles.css?v=90", "/app.js?v=96", "/pwa.js?v=2",
  "/jira-markup-import.js?v=3", "/checklist-selection.js?v=2",
  "/checklist-numbering.js?v=2", "/release-notes.js?v=4",
  "/favicon.svg?v=2", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  // Installation only succeeds when the complete editor has been downloaded.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith("qa-report-shell-") && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Never cache API responses, credentials, downloads or external attachments.
  const editorRoute = event.request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/index.html" || /^\/report\/[a-f0-9]{7,8}$/i.test(url.pathname));
  const key = editorRoute ? "/" : url.pathname + url.search;
  if (!editorRoute && !SHELL.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(key)) || fetch(event.request);
  })());
});

// Only the requesting window may trigger activation. Other open windows must
// close normally first, preserving their own edits and in-flight operations.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'APPLY_UPDATE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const appWindows = windows.filter(client => client.url.startsWith(self.registration.scope));
    if (appWindows.some(client => client.id !== event.source?.id)) {
      event.ports[0].postMessage({ ok: false, message: 'Закройте другие окна и вкладки QA Report, затем нажмите «Обновить» снова.' });
      return;
    }
    event.ports[0].postMessage({ ok: true });
    await self.skipWaiting();
  })());
});
