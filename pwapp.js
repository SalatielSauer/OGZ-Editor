const version = '0.2.1';
const cacheName = `ogzeditor-${version}`;
const assetsToCache = [
	'/OGZ-Editor/index.html',
	'/OGZ-Editor/styles/styles.css',
	'/OGZ-Editor/styles/texteditor.css',
	'/OGZ-Editor/styles/sauerfont.ttf',
	'/OGZ-Editor/scripts/main.js',
	'/OGZ-Editor/scripts/mini-jsocta.js',
	'/OGZ-Editor/scripts/jsocta_helpers.js',
	'/OGZ-Editor/scripts/texteditor.js',
	'/OGZ-Editor/scripts/worker.js',
	'/OGZ-Editor/scripts/external/gifuct.js'
];

console.log('Service Worker initializing with cache:', cacheName);

// install event
self.addEventListener('install', (event) => {
	console.log('[Service Worker] Install Event');
	event.waitUntil(
		caches.open(cacheName)
			.then((cache) => {
				console.log('[Service Worker] Caching all assets');
				return cache.addAll(assetsToCache);
			})
			.then(() => {
				console.log('[Service Worker] Skip waiting on install');
				return self.skipWaiting();
			})
			.catch((error) => {
				console.error('[Service Worker] Failed to cache assets during install:', error);
			})
	);
});

// activate event
self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activate Event');
	event.waitUntil(
		caches.keys()
			.then((keyList) => {
				return Promise.all(
					keyList.map((key) => {
						if (key.startsWith('ogzeditor-') && key !== cacheName) {
							console.log('[Service Worker] Deleting old cache:', key);
							return caches.delete(key);
						}
						return Promise.resolve();
					})
				);
			})
			.then(() => {
				console.log('[Service Worker] Claiming clients for current page');
				return self.clients.claim();
			})
			.then(() => {
				return self.clients.matchAll().then((clients) => {
					clients.forEach((client) => {
						client.postMessage({ type: 'CACHE_UPDATED', version });
						client.postMessage({ type: 1, version }); // trigger update of caches with old format
					});
				});
			})
			.catch((error) => {
				console.error('[Service Worker] Failed to activate:', error);
			})
	);
});

// fetch event
self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches.match(event.request, { ignoreSearch: true })
			.then((response) => {
				if (response) {
					return response;
				}
				// clone the request as fetch consumes the request
				return fetch(event.request).then((fetchResponse) => {
					if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
						const responseClone = fetchResponse.clone();
						caches.open(cacheName).then((cache) => {
							cache.put(event.request, responseClone);
						});
					}
					return fetchResponse;
				});
			})
			.catch((error) => {
				console.error('[Service Worker] Fetch failed:', error);
			})
	);
});
