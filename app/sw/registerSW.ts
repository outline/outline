import Logger from "~/utils/Logger";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // see: https://bugs.chromium.org/p/chromium/issues/detail?id=1097616
    // In some rare (<0.1% of cases) this call can return `undefined`
    const maybePromise = navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    if (maybePromise?.then) {
      maybePromise
        .then((registration) => {
          Logger.debug("lifecycle", "SW registered: ", registration);
        })
        .catch((registrationError) => {
          Logger.debug(
            "lifecycle",
            "SW registration failed: ",
            registrationError
          );
        });
    }
  });
}
