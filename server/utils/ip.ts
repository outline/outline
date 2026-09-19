import net from "node:net";

/**
 * Normalize an IP address string for storage in audit columns.
 *
 * Handles common upstream-proxy artifacts that would otherwise fail
 * Sequelize's `isIP` validation: IPv4-mapped IPv6 prefixes, IPv6 zone
 * identifiers, and `X-Forwarded-For` chains. Returns `null` for any
 * value that is not a valid IPv4 or IPv6 address after normalization.
 *
 * @param value the raw IP string (e.g. from `ctx.request.ip`).
 * @returns a valid IP string, or `null`.
 */
export function normalizeIp(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  let ip = value.split(",")[0]?.trim() ?? "";
  ip = ip.replace(/^::ffff:/i, "");
  const zoneIndex = ip.indexOf("%");
  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  return net.isIP(ip) !== 0 ? ip : null;
}
