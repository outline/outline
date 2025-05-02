/**
 * Returns true if we're running in the browser.
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Returns true if the client is a touch device.
 */
export function isTouchDevice(): boolean {
  if (!isBrowser) {
    return false;
  }
  return window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
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
 * Returns true if the client is running on a Mac.
 */
export function isMac(): boolean {
  if (!isBrowser) {
    return false;
  }
  return window.navigator.platform === "MacIntel";
}

/**
 * Returns true if the client is running on Windows.
 */
export function isWindows(): boolean {
  if (!isBrowser) {
    return false;
  }
  return window.navigator.platform === "Win32";
}

export function isSafari(): boolean {
  if (!isBrowser) {
    return false;
  }
  const userAgent = window.navigator.userAgent;
  return (
    userAgent.includes("Safari") &&
    !userAgent.includes("Chrome") &&
    !userAgent.includes("Chromium")
  );
}

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
} catch (e) {
  // No-op
}

/**
 * Returns true if the client supports passive event listeners
 */
export const supportsPassiveListener = supportsPassive;
