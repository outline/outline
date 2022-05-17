import { trim } from "lodash";
import env from "../env";

type Domain = {
  teamSubdomain: string;
  host: string;
  custom: boolean;
};

// strips protocol and whitespace from input
// then strips the path and query string
function normalizeUrl(url: string) {
  return trim(url.replace(/(https?:)?\/\//, "")).split(/[/:?]/)[0];
}

// we originally used the parse-domain npm module however this includes
// a large list of possible TLD's which increase the size of the bundle
// unnecessarily for our usecase of trusted input.
export function parseDomain(url: string): Domain {
  if (!url) {
    throw new TypeError("a non-empty url is required");
  }

  const normalBaseUrl = normalizeUrl(env.URL);
  const host = normalizeUrl(url);

  console.log({ normalBaseUrl, host });

  // if the url doesn't include the base url, then it must be a custom domain
  const baseUrlStart =
    host === normalBaseUrl ? 0 : host.indexOf(`.${normalBaseUrl}`);

  if (baseUrlStart === -1) {
    return { teamSubdomain: "", host, custom: true };
  }

  // we consider anything in front of the baseUrl to be the subdomain
  const subdomain = host.substring(0, baseUrlStart);
  const isReservedSubdomain = RESERVED_SUBDOMAINS.includes(subdomain);

  return {
    teamSubdomain: isReservedSubdomain ? "" : subdomain,
    host,
    custom: false,
  };
}

// export function isCustomDomain(hostname: string) {
//   return parseDomain(hostname)?.custom ?? false;
// }

export function getCookieDomain(domain: string) {
  // always use the base URL for cookies when in hosted mode
  // and the domain is not custom
  if (env.SUBDOMAINS_ENABLED) {
    const parsed = parseDomain(domain);

    if (!parsed.custom) {
      return normalizeUrl(env.URL);
    }
  }

  return domain;
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
