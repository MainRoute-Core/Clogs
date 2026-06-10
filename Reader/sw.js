const CACHE_NAME = "clog-reader";

self.addEventListener("install", e => {
    self.skipWaiting();

    e.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll([
                "./",
                "./index.html",
                "./reader.css",
                "./reader.js",
                "./manifest.webmanifest",
                "./icons.svg",
                "./favicon.ico",
                "./libs/marked.min.js",
                "./libs/github-markdown.min.css",
                "./libs/toaster.js"
            ])
        )
    );
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    if (
        url.hostname.includes("github") ||
        url.hostname.includes("imgbb") ||
        e.request.method !== "GET"
    ) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cacheRes => {
            return (
                cacheRes ||
                fetch(e.request).then(networkRes => {
                    const clone = networkRes.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, clone);
                    });

                    return networkRes;
                })
            );
        })
    );
});