import dns from "node:dns";
import net from "node:net";
import { randomString } from "@shared/random";
import env from "@server/env";
import { InternalError } from "@server/errors";

const UrlIdLength = 10;

export const generateUrlId = () => randomString(UrlIdLength);

/**
 * Checks if an IP address is private, loopback, or link-local.
 *
 * @param ip - The IP address to check.
 * @returns true if the IP is private.
 */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) {
      return true;
    }
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }
    if (parts[0] === 127) {
      return true;
    }
    if (parts[0] === 169 && parts[1] === 254) {
      return true;
    }
    if (parts.every((p) => p === 0)) {
      return true;
    }
  }

  if (
    ip === "::1" ||
    ip.startsWith("fe80:") ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fd")
  ) {
    return true;
  }

  return false;
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

  for (const entry of allowList) {
    if (net.isIP(entry)) {
      if (entry === ip) {
        return true;
      }
    } else {
      // CIDR range check: parse both the target IP and the CIDR, then compare
      // the network prefix bits.
      const parts = entry.split("/");
      if (parts.length === 2 && net.isIP(parts[0])) {
        const prefix = parseInt(parts[1], 10);
        if (ipInCIDR(ip, parts[0], prefix)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks whether an IP address falls within a CIDR range.
 *
 * @param ip - the IP address to test.
 * @param cidrIp - the base IP of the CIDR range.
 * @param prefixLength - the prefix length of the CIDR range.
 * @returns true if the IP is within the CIDR range.
 */
function ipInCIDR(ip: string, cidrIp: string, prefixLength: number): boolean {
  const ipParts = ip.split(".").map(Number);
  const cidrParts = cidrIp.split(".").map(Number);

  if (ipParts.length !== 4 || cidrParts.length !== 4) {
    return false;
  }

  const ipNum =
    ((ipParts[0] << 24) |
      (ipParts[1] << 16) |
      (ipParts[2] << 8) |
      ipParts[3]) >>>
    0;
  const cidrNum =
    ((cidrParts[0] << 24) |
      (cidrParts[1] << 16) |
      (cidrParts[2] << 8) |
      cidrParts[3]) >>>
    0;
  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;

  return (ipNum & mask) === (cidrNum & mask);
}

/**
 * Validates that a URL does not resolve to a private or internal IP address.
 * Respects the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.
 *
 * @param url - the URL to validate.
 * @throws InternalError if the URL resolves to a private IP that is not allowed.
 */
export async function validateUrlNotPrivate(url: string) {
  const { hostname } = new URL(url);

  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname) && !isAllowedPrivateIP(hostname)) {
      throw InternalError(
        `DNS lookup ${hostname} is not allowed. To allow this request, add the IP address or CIDR range to the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.`
      );
    }
    return;
  }

  const { address } = await dns.promises.lookup(hostname);
  if (isPrivateIP(address) && !isAllowedPrivateIP(address)) {
    throw InternalError(
      `DNS lookup ${address} (${hostname}) is not allowed. To allow this request, add the IP address or CIDR range to the ALLOWED_PRIVATE_IP_ADDRESSES environment variable.`
    );
  }
}
