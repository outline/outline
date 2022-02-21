/**
 * Returns true if the client is a touch device.
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
}

/**
 * Returns true if the client is running on a Mac.
 */
export function isMac(): boolean {
  const SSR = typeof window === "undefined";
  return !SSR && window.navigator.platform === "MacIntel";
}

let supportsPassive = false;

try {
  const opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    },
  });
  // @ts-expect-error ts-migrate(2769) testPassive is not a real event
  window.addEventListener("testPassive", null, opts);
  // @ts-expect-error ts-migrate(2769) testPassive is not a real event
  window.removeEventListener("testPassive", null, opts);
} catch (e) {
  // No-op
}

/**
 * Returns true if the client supports passive event listeners
 */
export const supportsPassiveListener = supportsPassive;
