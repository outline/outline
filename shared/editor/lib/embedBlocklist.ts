/**
 * Default list of domains where embedding is typically not useful or desired.
 * These may block iframe embedding via CSP or are better referenced as links.
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
