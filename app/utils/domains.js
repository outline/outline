// @flow
import { parseDomain, stripSubdomain } from "shared/utils/domains";
import env from "env";

export function getCookieDomain(domain: string) {
  return env.SUBDOMAINS_ENABLED ? stripSubdomain(domain) : domain;
}

export function isCustomDomain() {
  const parsed = parseDomain(window.location.origin);
  const main = parseDomain(env.URL);

  return (
    parsed && main && (main.domain !== parsed.domain || main.tld !== parsed.tld)
  );
}
