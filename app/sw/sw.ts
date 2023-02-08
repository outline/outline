import { precacheAndRoute } from "workbox-precaching";

/**
 * This will be replaced with the actual list of assets
 * after they have been built.
 */
const prefetchedURLs = ["/#"];

self.addEventListener("install", () => {
  console.log("[ServiceWorker] Service Worker installed.");
  console.log("[ServiceWorker] Preaching URLs …");
  precacheAndRoute(prefetchedURLs);
});
