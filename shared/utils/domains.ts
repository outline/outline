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
    return {
      teamSubdomain: "",
      host: "",
      custom: false,
    };
  }

  const normalBaseUrl = normalizeUrl(env.URL);
  const host = normalizeUrl(url);

  const baseUrlStart = host.indexOf(`.${normalBaseUrl}`);
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

// export function stripSubdomain(hostname: string) {
//   const parsed = parseDomain(hostname);
//   if (!parsed) {
//     return hostname;
//   }
//   return parsed.domain;
// }

export function isHostedSubdomain(hostname: string) {
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

export function isCustomDomain(hostname: string) {
  return parseDomain(hostname)?.custom ?? false;
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
