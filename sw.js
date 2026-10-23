/* Статистика чата — сервис-воркер: сайт открывается без сети (последняя сохранённая версия страницы)
   и показывает системные уведомления об обгонах. Данные с сервера (/api/) не кэшируются: они всегда свежие. */
const CACHE = "chatstats-shell-v1";
const SHELL = ["./", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  // Страница: сначала сеть (чтобы всегда была свежая версия), без сети — сохранённая копия.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./"))));
    return;
  }
  // Значки и манифест: из кэша, в фоне обновляем.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
// Нажатие на уведомление открывает (или показывает) сайт.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    const w = list.find(c => "focus" in c); if (w) return w.focus();
    return self.clients.openWindow("./");
  }));
});
