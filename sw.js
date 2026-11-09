/* AI Career Agent service worker: shows push alerts and opens the right page when tapped. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'AI Career Agent';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-72.png',
    tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || './' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.focus(); try { await w.navigate(url); } catch (err) { } return; }
    }
    await self.clients.openWindow(url);
  })());
});
