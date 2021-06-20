// @flow
import { parseDomain } from "../../shared/utils/domains";
import env from "env";

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

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}

export function imagePath(path: string): string {
  return cdnPath(`/images/${path}`);
}

export function decodeURIComponentSafe(text: string) {
  return text
    ? decodeURIComponent(text.replace(/%(?![0-9][0-9a-fA-F]+)/g, "%25"))
    : text;
}
