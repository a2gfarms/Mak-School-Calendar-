const CACHE = 'moss-and-ember-shell-v1';
const FILES = ['./','./index.html','./styles.css','./app.mjs','./core.mjs','./grove.svg','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
// A new worker activates after existing app tabs close, avoiding mixed app versions.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('moss-and-ember-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // App-shell cache keeps a coherent version. Bump CACHE when changing source files.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {
    const client=list.find(c=>c.url.startsWith(self.registration.scope));
    return client ? client.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
