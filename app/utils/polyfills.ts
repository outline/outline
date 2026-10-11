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

// Used by slug. Unavailable before Chrome 111, Firefox 119 and Safari 16.4.
if (typeof String.prototype.toWellFormed !== "function") {
  Object.defineProperty(String.prototype, "toWellFormed", {
    value: function toWellFormed(this: string) {
      let result = "";
      for (let i = 0; i < this.length; i++) {
        const code = this.charCodeAt(i);
        const next = this.charCodeAt(i + 1);
        if (
          code >= 0xd800 &&
          code <= 0xdbff &&
          next >= 0xdc00 &&
          next <= 0xdfff
        ) {
          result += this[i] + this[i + 1];
          i++;
        } else if (code >= 0xd800 && code <= 0xdfff) {
          result += String.fromCharCode(0xfffd);
        } else {
          result += this[i];
        }
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

if (typeof String.prototype.isWellFormed !== "function") {
  Object.defineProperty(String.prototype, "isWellFormed", {
    value: function isWellFormed(this: string) {
      return this.toWellFormed() === String(this);
    },
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
 * Detect ResizeObserver compatibility.
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
