import env from "../env";
import { parseDomain } from "./domains";

/**
 * Prepends the CDN url to the given path (If a CDN is configured).
 *
 * @param path The path to prepend the CDN url to.
 * @returns The path with the CDN url prepended.
 */
export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}

/**
 * Returns true if the given string is a link to inside the application.
 *
 * Important Note: If this is called server-side, it will always return false.
 * The reason this is in a shared util is because it's used in an editor plugin
 * which is also in the shared code
 *
 * @param url The url to check.
 * @returns True if the url is internal, false otherwise.
 */
export function isInternalUrl(href: string) {
  // empty strings are never internal
  if (href === "") {
    return false;
  }

  // relative paths are always internal
  if (href[0] === "/") {
    return true;
  }

  const outline =
    typeof window !== "undefined"
      ? parseDomain(window.location.href)
      : undefined;

  const domain = parseDomain(href);
  return outline?.host === domain.host;
}

/**
 * Returns true if the given string is a url.
 *
 * @param url The url to check.
 * @returns True if a url, false otherwise.
 */
export function isUrl(text: string) {
  if (text.match(/\n/)) {
    return false;
  }

  try {
    const url = new URL(text);
    return url.hostname !== "";
  } catch (err) {
    return false;
  }
}

/**
 * Returns true if the given string is a link to outside the application.
 *
 * @param url The url to check.
 * @returns True if the url is external, false otherwise.
 */
export function isExternalUrl(url: string) {
  return !isInternalUrl(url);
}

/**
 * For use in the editor, this function will ensure that a link href is
 * potentially valid, and filter out unsupported and malicious protocols.
 *
 * @param href The href to sanitize
 * @returns The sanitized href
 */
export function sanitizeHref(href: string | null | undefined) {
  if (!href) {
    return undefined;
  }

  if (
    !isUrl(href) &&
    !href.startsWith("/") &&
    !href.startsWith("#") &&
    !href.startsWith("mailto:")
  ) {
    return `https://${href}`;
  }
  return href;
}
