import { parseDomain, stripSubdomain } from "@shared/utils/domains";

export function getCookieDomain(domain: string) {
  return process.env.SUBDOMAINS_ENABLED === "true"
    ? stripSubdomain(domain)
    : domain;
}

export function isCustomDomain(hostname: string) {
  const parsed = parseDomain(hostname);
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
  const main = parseDomain(process.env.URL);
  return (
    parsed && main && (main.domain !== parsed.domain || main.tld !== parsed.tld)
  );
}
