import { parseDomain, stripSubdomain } from "@shared/utils/domains";
import env from "@server/env";

export function getCookieDomain(domain: string) {
  return env.SUBDOMAINS_ENABLED ? stripSubdomain(domain) : domain;
}

export function isCustomDomain(hostname: string) {
  const parsed = parseDomain(hostname);
  const main = parseDomain(env.URL);

  return (
    parsed && main && (main.domain !== parsed.domain || main.tld !== parsed.tld)
  );
}
