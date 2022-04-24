import invariant from "invariant";
import { trim } from "lodash";
import env from "../env";

type Domain = {
  subdomain: string;
  domain: string;
  custom?: boolean;
};

// strips protocol and whitespace from input
// then strips the path and query string
function normalizeUrl(url: string) {
  return trim(url.replace(/(https?:)?\/\//, "")).split(/[/:?]/)[0];
}

// we originally used the parse-domain npm module however this includes
// a large list of possible TLD's which increase the size of the bundle
// unnecessarily for our usecase of trusted input.

// TODO: make this private
// this only applies to internal domains (hosted domains)
export function parseDomain(url: string): Domain | null | undefined {
  if (!url) {
    return null;
  }

  invariant(env.URL, "env.URL is not defined");

  const normalBaseUrl = normalizeUrl(env.URL);
  const normalUrl = normalizeUrl(url);

  const baseUrlStart = normalUrl.indexOf(`.${normalBaseUrl}`);
  if (baseUrlStart === -1) {
    return { subdomain: "", domain: normalUrl, custom: true };
  }

  // we consider anything in front of the base url to be the subdomain
  const subdomain = normalUrl.substring(0, baseUrlStart);

  // ... and anything after the subdomain is considered the domain
  const domain = normalUrl.substring(subdomain.length).replace(/^\./, "");

  return { subdomain, domain };
}

export function stripSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);
  if (!parsed) {
    return hostname;
  }
  return parsed.domain;
}

export function isCustomSubdomain(hostname: string) {
  const parsed = parseDomain(hostname);

  if (
    !parsed ||
    !parsed.subdomain ||
    parsed.subdomain === "app" ||
    parsed.subdomain === "www"
  ) {
    return false;
  }

  return true;
}

export function getCookieDomain(domain: string) {
  return env.SUBDOMAINS_ENABLED ? stripSubdomain(domain) : domain;
}

export const RESERVED_SUBDOMAINS = [
  "about",
  "account",
  "admin",
  "advertising",
  "api",
  "app",
  "assets",
  "archive",
  "beta",
  "billing",
  "blog",
  "cache",
  "cdn",
  "code",
  "community",
  "dashboard",
  "developer",
  "developers",
  "forum",
  "help",
  "home",
  "http",
  "https",
  "imap",
  "localhost",
  "mail",
  "marketing",
  "mobile",
  "multiplayer",
  "new",
  "news",
  "newsletter",
  "ns1",
  "ns2",
  "ns3",
  "ns4",
  "password",
  "profile",
  "realtime",
  "sandbox",
  "script",
  "scripts",
  "setup",
  "signin",
  "signup",
  "site",
  "smtp",
  "support",
  "status",
  "static",
  "stats",
  "test",
  "update",
  "updates",
  "ws",
  "wss",
  "web",
  "websockets",
  "www",
  "www1",
  "www2",
  "www3",
  "www4",
];
