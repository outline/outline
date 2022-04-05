import { parseDomain } from "./domains";

const env = typeof window !== "undefined" ? window.env : process.env;

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}

export function isInternalUrl(href: string) {
  if (href[0] === "/") {
    return true;
  }
  const outline =
    typeof window !== "undefined"
      ? parseDomain(window.location.href)
      : undefined;
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

export function isExternalUrl(href: string) {
  return !isInternalUrl(href);
}
