import type { EmbedDescriptor } from "../embeds";

/**
 * Default list of domains known to block iframe embedding via CSP frame-ancestors.
 * Used as initial value when team has no custom blocklist configured.
 */
export const DEFAULT_BLOCKED_EMBED_DOMAINS = [
  "linear.app",
  "github.com",
  "notion.so",
  "slack.com",
  "atlassian.net",
  "asana.com",
];

/**
 * Checks if a URL's domain is in the blocked embed domains list.
 *
 * @param url - The URL to check
 * @param blockedDomains - List of blocked domain strings
 * @returns true if the URL's hostname matches any blocked domain
 */
export function isDomainBlocked(url: string, blockedDomains: string[]): boolean {
  if (!url || !blockedDomains.length) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedDomains.some(
      (domain) => hostname === domain || hostname.endsWith("." + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Checks if an embed descriptor matches any of the blocked domains.
 * Runs each blocked domain through the descriptor's matcher to determine
 * if the embed service is blocked.
 *
 * @param embed - The embed descriptor to check
 * @param blockedDomains - List of blocked domain strings
 * @returns true if the embed matches any blocked domain
 */
export function isEmbedBlockedByDomains(
  embed: EmbedDescriptor,
  blockedDomains: string[]
): boolean {
  if (!blockedDomains.length) {
    return false;
  }

  return blockedDomains.some((domain) => {
    try {
      return !!embed.matcher("https://" + domain);
    } catch {
      return false;
    }
  });
}
