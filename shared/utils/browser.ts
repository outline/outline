/**
 * Is true if we're running in the browser. Note that this will return true when rendering on the server
 * with a tool like JSDOM as we patch the global window object.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Is true when running on the server, always.
 */
export const isNode =
  typeof process !== "undefined" &&
  process.versions !== null &&
  process.versions.node !== null;

/**
 * Is true if the browser is running as an installed PWA on mobile or desktop
 */
export const isPWA =
  typeof window !== "undefined" &&
  window.matchMedia?.("(display-mode: standalone)").matches;

/**
 * Returns true if the client is a touch device. Note that laptops with touch screens are
 * considered touch devices, this does not neccessarily map to a small screen.
 */
export function isTouchDevice(): boolean {
  if (!isBrowser) {
    return false;
  }
  return window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
}

/**
 * Returns true if the client is the size of a mobile device.
 */
export function isMobile(): boolean {
  if (!isBrowser) {
    return false;
  }

  // Matches breakpoints.tablet - 1 but not imported to avoid circular dependency
  return window.matchMedia?.(`(max-width: ${736}px)`)?.matches;
}

/**
 * Returns the safe area insets for the current device.
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  // Check if CSS environment variables are supported
  const style = getComputedStyle(document.documentElement);
  const supportsEnv = window.CSS?.supports?.("top", "env(safe-area-inset-top)");

  if (supportsEnv) {
    return {
      top: parseFloat(style.getPropertyValue("--sat") || "0"),
      right: parseFloat(style.getPropertyValue("--sar") || "0"),
      bottom: parseFloat(style.getPropertyValue("--sab") || "0"),
      left: parseFloat(style.getPropertyValue("--sal") || "0"),
    };
  }

  // Fallback to zero if not supported
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Is true if the client is running on a Mac.
 */
export const isMac = isBrowser && window.navigator.platform === "MacIntel";

/**
 * Is true if the client is running on Windows.
 */
export const isWindows = isBrowser && window.navigator.platform === "Win32";

/**
 * Is true if the client is running Safari.
 */
export const isSafari =
  isBrowser &&
  window.navigator.userAgent.includes("Safari") &&
  !window.navigator.userAgent.includes("Chrome") &&
  !window.navigator.userAgent.includes("Chromium");

/**
 * Is true if the client is running Firefox.
 */
export const isFirefox =
  isBrowser && window.navigator.userAgent.includes("Firefox");

let supportsPassive = false;

try {
  const opts = Object.defineProperty({}, "passive", {
    get() {
      supportsPassive = true;
    },
  });
  // @ts-expect-error ts-migrate(2769) testPassive is not a real event
  window.addEventListener("testPassive", null, opts);
  // @ts-expect-error ts-migrate(2769) testPassive is not a real event
  window.removeEventListener("testPassive", null, opts);
} catch (_err) {
  // Ignore
}

/**
 * Returns true if the client supports passive event listeners
 */
export const supportsPassiveListener = supportsPassive;
