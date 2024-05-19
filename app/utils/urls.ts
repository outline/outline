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

export function redirectTo(url: string) {
  window.location.href = url;
}
