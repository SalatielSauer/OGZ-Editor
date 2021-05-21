const version = "0.1";
const cacheName = `ogzeditor-${version}`;
self.addEventListener("install", (e) => {
	e.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll([
				"/",
				"/index.html",
				"/styles/styles.css",
				"/styles/texteditor.css",
				"/styles/sauerfont.ttf",
				"/scripts/main.js",
				"/scripts/jsocta.js",
				"/scripts/texteditor.js"
			]).then(() => self.skipWaiting());
		})
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	event.respondWith(
		caches.open(cacheName)
			.then(cache => cache.match(event.request, {ignoreSearch: true}))
			.then(response => {
				return response || fetch(event.request);
			})
	);
});