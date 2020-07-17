// @flow
import { stripSubdomain } from "shared/utils/domains";
import env from "env";

export function getCookieDomain(domain: string) {
  return env.SUBDOMAINS_ENABLED ? stripSubdomain(domain) : domain;
}
