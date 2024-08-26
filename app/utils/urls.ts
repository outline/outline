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
  } catch (e) {
    // failed to parse as url
  }

  return false;
}

export function decodeURIComponentSafe(text: string) {
  return text
    ? decodeURIComponent(text.replace(/%(?![0-9][0-9a-fA-F]+)/g, "%25"))
    : text;
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
 * Check if the path is a valid redirect after login
 *
 * @param path
 * @returns boolean indicating if the path is a valid redirect
 */
export const isValidPostLoginRedirect = (path: string) =>
  !["/", "/create", "/home", "/logout"].includes(path);
