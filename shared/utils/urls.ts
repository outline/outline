import env from "../env";
import { parseDomain } from "./domains";

export function cdnPath(path: string): string {
  return `${env.CDN_URL}${path}`;
}

// Note: if this is called server-side, it will always return false.
// This is acceptable misbehavior, but a fully correct version of this
// function should take the team's full domain as an input.
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
    parsed.domain === outline.domain
  ) {
    return true;
  }

  return false;
}

export function isExternalUrl(href: string) {
  return !isInternalUrl(href);
}
