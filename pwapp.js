const version = "0.1.2";
const cacheName = `ogzeditor-${version}`;
self.addEventListener("install", (e) => {
	e.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll([
				"/OGZ-Editor/",
				"/OGZ-Editor/index.html",
				"/OGZ-Editor/styles/styles.css",
				"/OGZ-Editor/styles/texteditor.css",
				"/OGZ-Editor/styles/sauerfont.ttf",
				"/OGZ-Editor/scripts/main.js",
				"/OGZ-Editor/scripts/jsocta.js",
				"/OGZ-Editor/scripts/texteditor.js"
			]).then(() => self.skipWaiting());
		})
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keyList) => {
			return Promise.all(keyList.map((key) => {
				if (key !== cacheName) {
					return caches.delete(key); // remove old caches
				}
			}));
		})
	);
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