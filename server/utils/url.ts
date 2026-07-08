import dns from "node:dns";
import net from "node:net";
import ipaddr from "ipaddr.js";
import { randomString } from "@shared/random";
import env from "@server/env";
import { InvalidRequestError } from "@server/errors";

const UrlIdLength = 10;

export const generateUrlId = () => randomString(UrlIdLength);

// Paths probed by vulnerability scanners.
const scannerPathPattern = new RegExp(
  [
    // paths
    "^\\/(?:cgi-bin|wp-admin|wp-content|wp-includes|wp-json|wp-login\\.php|wordpress|xmlrpc\\.php|phpmyadmin|pma|myadmin|owa|autodiscover|actuator|vendor|webdav|cms|drupal|joomla|magento|laravel|adminer|console|server-status|server-info|HNAP1|boaform|hudson|jenkins)(?:\\/|$)",
    // file endings
    "\\.(?:php|asp|aspx|jsp|cgi|env|sql|bak|swp|htaccess|htpasswd)(?:$|[/?])",
    // dotfiles
    "^\\/\\.(?:well-known|env|git|svn|aws|ssh|DS_Store)",
  ].join("|"),
  "i"
);

/**
 * Checks whether a request path looks like an automated scanner probe rather
 * than a legitimate application route, so the server can short-circuit with a
 * 404 instead of rendering the SPA shell.
 *
 * @param path - the request path to check.
 * @returns true if the path matches a known scanner pattern.
 */
export function isInvalidAppPath(path: string): boolean {
  return scannerPathPattern.test(path);
}

/**
 * Checks if an IP address is private, loopback, or link-local.
 *
 * @param ip - The IP address to check.
 * @returns true if the IP is private.
 */
export function isPrivateIP(ip: string): boolean {
  if (!ipaddr.isValid(ip)) {
    return false;
  }

  // Only globally-routable unicast addresses are permitted
  return ipaddr.parse(ip).range() !== "unicast";
}

/**
 * Checks whether an IP address is present in the allowed private IP list,
 * supporting both exact matches and CIDR ranges.
 *
 * @param ip - the IP address to check.
 * @returns true if the IP is explicitly allowed.
 */
function isAllowedPrivateIP(ip: string): boolean {
  const allowList = env.ALLOWED_PRIVATE_IP_ADDRESSES;
  if (!allowList || allowList.length === 0) {
    return false;
  }

  if (!ipaddr.isValid(ip)) {
    return false;
  }

  const addr = ipaddr.parse(ip);

  for (const entry of allowList) {
    if (net.isIP(entry)) {
      if (entry === ip) {
        return true;
      }
    } else if (ipaddr.isValid(entry.split("/")[0])) {
      try {
        if (addr.match(ipaddr.parseCIDR(entry))) {
          return true;
        }
      } catch {
        // Skip invalid CIDR entries
      }
    }
  }

  return false;
}

/**
 * Builds the error thrown when a URL resolves to a disallowed private IP.
 *
 * @param ip - the private IP address that was rejected.
 * @param hostname - the hostname that resolved to the IP, if any.
 * @returns the error to throw.
 */
function privateIpError(ip: string, hostname?: string) {
  return InvalidRequestError(
    `DNS lookup ${ip}${hostname ? ` (${hostname})` : ""} is not allowed.` +
      (env.isCloudHosted
        ? ""
        : " To allow this request, add the IP address or CIDR range to the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.")
  );
}

/**
 * Validates that a URL does not resolve to a private or internal IP address.
 * Respects the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.
 *
 * @param url - the URL to validate.
 * @throws InvalidRequestError if the URL resolves to a private IP that is not
 * allowed, or if the hostname cannot be resolved.
 */
export async function validateUrlNotPrivate(url: string) {
  // URL.hostname keeps the square brackets around IPv6 literals (e.g.
  // "[::1]"), which net.isIP does not accept, so strip them before checking.
  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname) && !isAllowedPrivateIP(hostname)) {
      throw privateIpError(hostname);
    }
    return;
  }

  // Resolve every record for the hostname — with multiple A/AAAA records the
  // connection may use any of them, so a single private record hidden among
  // public ones must still fail validation.
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    throw InvalidRequestError(`DNS lookup for ${hostname} failed.`);
  }

  for (const { address } of addresses) {
    if (isPrivateIP(address) && !isAllowedPrivateIP(address)) {
      throw privateIpError(address, hostname);
    }
  }
}
