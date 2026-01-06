/**
 * Utility functions for working with passkeys and WebAuthn.
 */

interface ParsedUserAgent {
  browser?: string;
  os?: string;
  device?: string;
}

export enum PasskeyBrand {
  AliasVault = "a11a5faa-9f32-4b8c-8c5d-2f7d13e8c942",
  GooglePasswordManager = "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4",
  ChromeOnMac = "adce0002-35bc-c60a-648b-0b25f1f05503",
  WindowsHello1 = "08987058-cadc-4b81-b6e1-30de50dcbe96",
  WindowsHello2 = "9ddd1817-af5a-4672-a2b9-3e3dd95000a9",
  WindowsHello3 = "6028b017-b1d4-4c02-b4b3-afcdafc96bb2",
  ICloudKeychainManaged = "dd4ec289-e01d-41c9-bb89-70fa845d4bf2",
  Dashlane = "531126d6-e717-415c-9320-3d9aa6981239",
  OnePassword = "bada5566-a7aa-401f-bd96-45619a55120d",
  NordPass = "b84e4048-15dc-4dd0-8640-f4f60813c8af",
  Keeper = "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6",
  Sesame = "891494da-2c90-4d31-a9cd-4eab0aed1309",
  Enpass = "f3809540-7f14-49c1-a8b3-8f813b225541",
  ChromiumBrowser = "b5397666-4885-aa6b-cebf-e52262a439a2",
  EdgeOnMac = "771b48fd-d3d4-4f74-9232-fc157ab0507a",
  IDmelon = "39a5647e-1853-446c-a1f6-a79bae9f5bc7",
  Bitwarden = "d548826e-79b4-db40-a3d8-11116f7e8349",
  ApplePasswords = "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
  SamsungPass = "53414d53-554e-4700-0000-000000000000",
  ThalesBioIOS = "66a0ccb3-bd6a-191f-ee06-e375c50b9846",
  ThalesBioAndroid = "8836336a-f590-0921-301d-46427531eee6",
  ThalesPINAndroid = "cd69adb5-3c7a-deb9-3177-6800ea6cb72a",
  ThalesPINIOS = "17290f1e-c212-34d0-1423-365d729f09d9",
  ProtonPass = "50726f74-6f6e-5061-7373-50726f746f6e",
  KeePassXC = "fdb141b2-5d84-443e-8a35-4698c205a502",
  KeePassDX = "eaecdef2-1c31-5634-8639-f1cbd9c00a08",
  ToothPicPasskeyProvider = "cc45f64e-52a2-451b-831a-4edd8022a202",
  IPasswords = "bfc748bb-3429-4faa-b9f9-7cfa9f3b76d0",
  ZohoVault = "b35a26b2-8f6e-4697-ab1d-d44db4da28c6",
  LastPass = "b78a0a55-6ef8-d246-a042-ba0f6d55050c",
  Devolutions = "de503f9c-21a4-4f76-b4b7-558eb55c6f89",
  LogMeOnce = "22248c4c-7a12-46e2-9a41-44291b373a4d",
  KasperskyPasswordManager = "a10c6dd9-465e-4226-8198-c7c44b91c555",
  PwSafe = "d350af52-0351-4ba2-acd3-dfeeadc3f764",
  MicrosoftPasswordManager = "d3452668-01fd-4c12-926c-83a4204853aa",
  Initial = "6d212b28-a2c1-4638-b375-5932070f62e9",
  HeimlaneVault = "d49b2120-b865-4191-8cea-be84a52b0485",
}

export const PasskeyBrandNames: Record<PasskeyBrand, string> = {
  [PasskeyBrand.AliasVault]: "AliasVault",
  [PasskeyBrand.GooglePasswordManager]: "Google Password Manager",
  [PasskeyBrand.ChromeOnMac]: "Chrome on Mac",
  [PasskeyBrand.WindowsHello1]: "Windows Hello",
  [PasskeyBrand.WindowsHello2]: "Windows Hello",
  [PasskeyBrand.WindowsHello3]: "Windows Hello",
  [PasskeyBrand.ICloudKeychainManaged]: "iCloud Keychain (Managed)",
  [PasskeyBrand.Dashlane]: "Dashlane",
  [PasskeyBrand.OnePassword]: "1Password",
  [PasskeyBrand.NordPass]: "NordPass",
  [PasskeyBrand.Keeper]: "Keeper",
  [PasskeyBrand.Sesame]: "Sésame",
  [PasskeyBrand.Enpass]: "Enpass",
  [PasskeyBrand.ChromiumBrowser]: "Chromium Browser",
  [PasskeyBrand.EdgeOnMac]: "Edge on Mac",
  [PasskeyBrand.IDmelon]: "IDmelon",
  [PasskeyBrand.Bitwarden]: "Bitwarden",
  [PasskeyBrand.ApplePasswords]: "Apple Passwords",
  [PasskeyBrand.SamsungPass]: "Samsung Pass",
  [PasskeyBrand.ThalesBioIOS]: "Thales Bio iOS SDK",
  [PasskeyBrand.ThalesBioAndroid]: "Thales Bio Android SDK",
  [PasskeyBrand.ThalesPINAndroid]: "Thales PIN Android SDK",
  [PasskeyBrand.ThalesPINIOS]: "Thales PIN iOS SDK",
  [PasskeyBrand.ProtonPass]: "Proton Pass",
  [PasskeyBrand.KeePassXC]: "KeePassXC",
  [PasskeyBrand.KeePassDX]: "KeePassDX",
  [PasskeyBrand.ToothPicPasskeyProvider]: "ToothPic Passkey Provider",
  [PasskeyBrand.IPasswords]: "iPasswords",
  [PasskeyBrand.ZohoVault]: "Zoho Vault",
  [PasskeyBrand.LastPass]: "LastPass",
  [PasskeyBrand.Devolutions]: "Devolutions",
  [PasskeyBrand.LogMeOnce]: "LogMeOnce",
  [PasskeyBrand.KasperskyPasswordManager]: "Kaspersky Password Manager",
  [PasskeyBrand.PwSafe]: "pwSafe",
  [PasskeyBrand.MicrosoftPasswordManager]: "Microsoft Password Manager",
  [PasskeyBrand.Initial]: "initial",
  [PasskeyBrand.HeimlaneVault]: "Heimlane Vault",
};

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
    return undefined;
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
 * Generates a friendly name for a passkey based on AAGUID, user agent, and transport information.
 *
 * @param aaguid the authenticator AAGUID from the registration response.
 * @param userAgent the user agent string from the registration request.
 * @param transports optional array of authenticator transports.
 * @returns a human-readable name for the passkey.
 */
export function generatePasskeyName(
  aaguid?: string | PasskeyBrand,
  userAgent?: string,
  transports?: string[]
): string {
  // Prefer known brand from AAGUID over user agent sniffing
  if (aaguid && PasskeyBrandNames[aaguid as PasskeyBrand]) {
    return PasskeyBrandNames[aaguid as PasskeyBrand];
  }

  // Fall back to user agent parsing if AAGUID is not recognized
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
