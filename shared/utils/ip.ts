import ipaddr from "ipaddr.js";

/**
 * Checks if a string is a canonical dotted-quad IPv4 address (e.g. 192.168.1.1).
 * Stricter than ipaddr's `isValid`, which also accepts shorthand and hex forms
 * such as "1.2.3" or "0xC0.0xA8.1.1" that would misclassify ordinary numbers.
 *
 * @param value - the string to check.
 * @returns true if the string is a canonical IPv4 address.
 */
export function isIPv4Address(value: string): boolean {
  return ipaddr.IPv4.isValidFourPartDecimal(value.trim());
}

/**
 * Parses an IPv4 address into a single numeric value that preserves octet-wise
 * ordering, so addresses sort correctly both within and across subnets
 * (e.g. 192.168.69.9 before 192.168.69.10, and 192.168.69.20 before 192.168.150.10).
 *
 * @param value - the IPv4 address string to parse.
 * @returns the numeric value, or null if the string is not a canonical IPv4 address.
 */
export function parseIPv4(value: string): number | null {
  const trimmed = value.trim();
  if (!ipaddr.IPv4.isValidFourPartDecimal(trimmed)) {
    return null;
  }
  return ipaddr.IPv4.parse(trimmed)
    .toByteArray()
    .reduce((acc, octet) => acc * 256 + octet, 0);
}
