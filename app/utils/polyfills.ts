/**
 * Loads required polyfills.
 *
 * @returns A promise that resolves when all required polyfills are loaded
 */
export async function loadPolyfills() {
  const polyfills = [];

  if (!supportsResizeObserver()) {
    polyfills.push(
      import("@juggle/resize-observer").then((module) => {
        window.ResizeObserver = module.ResizeObserver;
      })
    );
  }

  return Promise.all(polyfills);
}

/**
 * Detect ResizeObserver compatability.
 *
 * @returns true if the current browser supports ResizeObserver
 */
function supportsResizeObserver() {
  return (
    "ResizeObserver" in window &&
    "ResizeObserverEntry" in window &&
    "contentRect" in ResizeObserverEntry.prototype
  );
}
