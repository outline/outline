const cacheName = "prefetch-cache-1";
const prefetchedURLs: string[] = ["/#"];

self.addEventListener("install", function (event) {
  console.log("[SW] Service Worker installed.");

  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        return Promise.all(
          prefetchedURLs.map((url) => {
            return fetch(url).then((res) => {
              if (res.status >= 400) {
                throw Error("request failed");
              }

              return cache.put(url, res);
            });
          })
        );
      })
      .catch((err) => {
        console.log(err);
      })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (res) {
      if (res) {
        console.log("[SW] Resource found in Cache Storage.");

        return res;
      }

      return fetch(event.request)
        .then(function (res) {
          return res;
        })
        .catch(function (err) {
          console.log(err);
        });
    })
  );
});

// Add an empty 'export {}' statement to make it a module.
export default {};
