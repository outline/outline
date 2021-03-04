// @flow
import { parseDomain, stripSubdomain } from "shared/utils/domains";

export function getCookieDomain(domain: string) {
  return process.env.GATSBY_SUBDOMAINS_ENABLED ? stripSubdomain(domain) : domain;
}

export function isCustomDomain() {
  const parsed = parseDomain(window.location.origin);
  const main = parseDomain(process.env.GATSBY_URL);

  return (
    parsed && main && (main.domain !== parsed.domain || main.tld !== parsed.tld)
  );
}
