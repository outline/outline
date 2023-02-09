// To active execute the following code in the browser console and refresh:
// localStorage.setItem("installServiceWorker", true)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    if (!localStorage.getItem("installServiceWorker")) {
      return;
    }

    console.log("[ServiceWorker] Executing Service Worker code.");

    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1097616
    // In some rare (<0.1% of cases) this call can return `undefined`
    const maybePromise = navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    if (maybePromise?.then) {
      maybePromise
        .then((registration) => {
          console.log("[ServiceWorker] Registered.", registration);
        })
        .catch((registrationError) => {
          console.log(
            "[ServiceWorker] Registration failed. ",
            registrationError
          );
        });
    }
  });
}

// Add an empty 'export {}' statement to make it a module.
export default {};
