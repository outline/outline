// @flow
import { parseDomain } from "../../shared/utils/domains";

export function isInternalUrl(href: string) {
  if (href[0] === "/") return true;

  const outline = parseDomain(window.location.href);
  const parsed = parseDomain(href);

  if (
    parsed &&
    outline &&
    parsed.subdomain === outline.subdomain &&
    parsed.domain === outline.domain &&
    parsed.tld === outline.tld
  ) {
    return true;
  }

  return false;
}

export function isHash(href: string) {
  if (href[0] === "#") return true;

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
