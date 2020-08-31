// @flow
import { stripSubdomain } from "../../shared/utils/domains";

export function getCookieDomain(domain: string) {
  return process.env.SUBDOMAINS_ENABLED === "true"
    ? stripSubdomain(domain)
    : domain;
}
