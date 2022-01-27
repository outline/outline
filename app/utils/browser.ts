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
