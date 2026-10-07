declare global {
  interface ObjectConstructor {
    hasOwn(target: object, property: PropertyKey): boolean;
  }
}

// Applied at module scope so dependencies that call it during evaluation, or on
// first render, are covered. Unavailable before Chrome 93 and Safari 15.4.
if (typeof Object.hasOwn !== "function") {
  Object.defineProperty(Object, "hasOwn", {
    value: (target: object, property: PropertyKey) =>
      Object.prototype.hasOwnProperty.call(target, property),
    writable: true,
    configurable: true,
  });
}

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
