/**
 * Utility functions for working with passkeys and WebAuthn.
 */

interface ParsedUserAgent {
  browser?: string;
  os?: string;
  device?: string;
}

/**
 * Parses a user agent string to extract browser, OS, and device information.
 *
 * @param userAgent the user agent string to parse.
 * @returns parsed information about the browser, OS, and device.
 */
function parseUserAgent(userAgent: string): ParsedUserAgent {
  if (!userAgent) {
    return {};
  }

  const ua = userAgent.toLowerCase();
  const result: ParsedUserAgent = {};

  // Detect browser
  if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) {
    result.browser = "Edge";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    result.browser = "Opera";
  } else if (ua.includes("chrome") && !ua.includes("edg")) {
    result.browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    result.browser = "Safari";
  } else if (ua.includes("firefox")) {
    result.browser = "Firefox";
  }

  // Detect OS (check iPhone/iPad before macOS since they contain "Mac OS X")
  if (ua.includes("windows")) {
    result.os = "Windows";
  } else if (ua.includes("iphone")) {
    result.os = "iOS";
    result.device = "iPhone";
  } else if (ua.includes("ipad")) {
    result.os = "iOS";
    result.device = "iPad";
  } else if (ua.includes("mac os x") || ua.includes("macos")) {
    result.os = "macOS";
  } else if (ua.includes("android")) {
    result.os = "Android";
    if (ua.includes("mobile")) {
      result.device = "Android Phone";
    } else {
      result.device = "Android Tablet";
    }
  } else if (ua.includes("linux")) {
    result.os = "Linux";
  } else if (ua.includes("cros")) {
    result.os = "Chrome OS";
  }

  return result;
}

/**
 * Generates a friendly name for a passkey based on user agent and transport information.
 *
 * @param userAgent the user agent string from the registration request.
 * @param transports optional array of authenticator transports.
 * @returns a human-readable name for the passkey.
 */
export function generatePasskeyName(
  userAgent?: string,
  transports?: string[]
): string {
  if (!userAgent) {
    return generateDefaultName(transports);
  }

  const parsed = parseUserAgent(userAgent);
  const parts: string[] = [];

  // Prioritize device name if available (e.g., "iPhone", "iPad")
  if (parsed.device) {
    parts.push(parsed.device);
  } else {
    // Otherwise use browser and OS
    if (parsed.browser) {
      parts.push(parsed.browser);
    }
    if (parsed.os) {
      parts.push(`on ${parsed.os}`);
    }
  }

  // Add authenticator type hint if available
  const authenticatorType = getAuthenticatorType(transports);
  if (authenticatorType) {
    parts.push(`(${authenticatorType})`);
  }

  if (parts.length === 0) {
    return generateDefaultName(transports);
  }

  return parts.join(" ");
}

/**
 * Determines the type of authenticator based on transports.
 *
 * @param transports array of authenticator transports.
 * @returns a human-readable authenticator type or undefined.
 */
function getAuthenticatorType(transports?: string[]): string | undefined {
  if (!transports || transports.length === 0) {
    return undefined;
  }

  // Platform authenticators typically use "internal"
  if (transports.includes("internal")) {
    return "Biometric";
  }

  // Security keys typically use USB, NFC, or BLE
  if (
    transports.includes("usb") ||
    transports.includes("nfc") ||
    transports.includes("ble")
  ) {
    return "Security Key";
  }

  // Hybrid authenticators use hybrid transport (phone as authenticator)
  if (transports.includes("hybrid")) {
    return "Phone";
  }

  return undefined;
}

/**
 * Generates a default passkey name when user agent parsing fails.
 *
 * @param transports optional array of authenticator transports.
 * @returns a default passkey name.
 */
function generateDefaultName(transports?: string[]): string {
  const authenticatorType = getAuthenticatorType(transports);

  if (authenticatorType) {
    return authenticatorType;
  }

  return "Passkey";
}

/**
 * Formats a passkey name with a creation date for uniqueness.
 *
 * @param baseName the base name for the passkey.
 * @param createdAt the creation date of the passkey.
 * @returns formatted passkey name with date.
 */
export function formatPasskeyNameWithDate(
  baseName: string,
  createdAt: Date
): string {
  const date = createdAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${baseName} - ${date}`;
}
