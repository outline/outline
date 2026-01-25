export function isHash(href: string) {
  if (href[0] === "#") {
    return true;
  }

  try {
    const outline = new URL(window.location.href);
    const parsed = new URL(href);

    if (
      outline.hostname === parsed.hostname &&
      outline.pathname === parsed.pathname &&
      !!parsed.hash
    ) {
      return true;
    }
  } catch (_err) {
    // failed to parse as url
  }

  return false;
}

/**
 * Decodes a URI component without throwing an error in case of invalid encoding.
 *
 * @param text The text to decode.
 * @returns The decoded text.
 */
export function decodeURIComponentSafe(text: string) {
  try {
    return text
      ? decodeURIComponent(text.replace(/%(?![0-9a-fA-F]{2})/g, "%25"))
      : text;
  } catch (_) {
    return text;
  }
}

/**
 * Redirects to a new page
 *
 * @param url
 */
export function redirectTo(url: string) {
  window.location.href = url;
}

/**
 * Check if the path is a valid path for redirect after login.
 *
 * @param input A path potentially including query string
 * @returns boolean indicating if the path is a valid redirect
 */
export const isAllowedLoginRedirect = (input: string) => {
  const path = input.split("?")[0].split("#")[0];
  return (
    !["/", "/create", "/home", "/logout", "/desktop-redirect"].includes(path) &&
    !path.startsWith("/auth/") &&
    !path.startsWith("/s/")
  );
};
