// @flow
import { parseDomain, stripSubdomain } from "../../shared/utils/domains";

export function getCookieDomain(domain: string) {
  return process.env.SUBDOMAINS_ENABLED === "true"
    ? stripSubdomain(domain)
    : domain;
}

export function isCustomDomain(hostname: string) {
  const parsed = parseDomain(hostname);
  const main = parseDomain(process.env.URL);
  return (
    parsed && main && (main.domain !== parsed.domain || main.tld !== parsed.tld)
  );
}
