import type { EmbedDescriptor } from "@shared/editor/embeds";
import { getMatchingEmbed } from "@shared/editor/lib/embeds";
import embeds from "@shared/editor/embeds";
import env from "@server/env";
import fetch, { chromeUserAgent } from "./fetch";
import { Second } from "@shared/utils/time";

/**
 * Result of an embed check operation.
 */
export interface EmbedCheckResult {
  /** Whether the URL can be embedded in an iframe. */
  embeddable: boolean;
  /** The reason why the URL cannot be embedded, if applicable. */
  reason?:
    | "x-frame-options"
    | "csp-frame-ancestors"
    | "no-match"
    | "coep"
    | "http-error"
    | "error"
    | "timeout";
}

/**
 * Parses X-Frame-Options header and determines if embedding is allowed.
 *
 * @param value The X-Frame-Options header value.
 * @returns true if embedding is blocked, false otherwise.
 */
function isBlockedByXFrameOptions(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toUpperCase().trim();

  // DENY - Cannot be embedded anywhere
  // SAMEORIGIN - Can only be embedded on same origin (blocks us)
  // ALLOW-FROM - Deprecated but treat as blocked
  return (
    normalized === "DENY" ||
    normalized === "SAMEORIGIN" ||
    normalized.startsWith("ALLOW-FROM")
  );
}

/**
 * Parses a CSP frame-ancestors source expression (which may include wildcards
 * that aren't valid in the URL API) and checks if it matches the given origin.
 *
 * @param source The source expression (e.g., "https://example.com" or "https://*.example.com")
 * @param embedderUrl Parsed embedder URL to match against
 * @returns true if the source matches the embedder, false otherwise
 */
function matchesFrameAncestorsSource(
  source: string,
  embedderUrl: URL
): boolean {
  if (source === "*") {
    return true;
  }
  if (source === "'none'" || source === "'self'") {
    return false;
  }

  try {
    // Try parsing as URL first (works for concrete origins like https://example.com)
    const allowed = new URL(source);
    return allowed.protocol === embedderUrl.protocol && allowed.origin === embedderUrl.origin;
  } catch {
    // source parsing as URL failed, try parsing as wildcard pattern
    // CSP allows patterns like https://*.example.com or *.example.com
    const match = source.match(/^(https?:\/\/)?(\*\.)?([^:]+)(?::(\d+))?$/);
    if (!match) {
      return false;
    }

    const [, protocol, hasWildcard, host, port] = match;
    const sourceProtocol = protocol ? protocol.slice(0, -3) : "https"; // remove //
    const sourceHost = host.toLowerCase();
    const sourcePort = port ? `:${port}` : "";

    // Check protocol match
    if (sourceProtocol !== embedderUrl.protocol.slice(0, -1)) {
      return false;
    }

    // Check port match (if specified in source, for simplicity compare full authority)
    const embedderAuthority = embedderUrl.host;
    const sourceAuthority = `${sourceHost}${sourcePort}`;

    if (hasWildcard) {
      // Wildcard match: *.example.com matches www.example.com and subdomain.example.com
      return (
        embedderUrl.hostname !== sourceHost &&
        embedderUrl.hostname.toLowerCase().endsWith(`.${sourceHost}`)
      );
    } else {
      // Exact host match
      return embedderAuthority === sourceAuthority;
    }
  }
}

/**
 * Checks if CSP header has a frame-ancestors directive.
 *
 * @param value The Content-Security-Policy header value.
 * @returns true if frame-ancestors directive is present, false otherwise.
 */
function hasFrameAncestorsDirective(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const directives = value.split(";").map((d) => d.trim());
  return directives.some((directive) => {
    const parts = directive.split(/\s+/);
    return parts[0]?.toLowerCase() === "frame-ancestors";
  });
}

/**
 * Parses Content-Security-Policy header and checks if frame-ancestors blocks embedding.
 *
 * @param value The Content-Security-Policy header value.
 * @param embedderOrigin The origin of the embedder (e.g., https://example.com).
 * @returns true if embedding is blocked, false otherwise.
 */
function isBlockedByCSP(value: string | null, embedderOrigin: string): boolean {
  if (!value) {
    return false;
  }

  // Parse the CSP header to find frame-ancestors directive
  const directives = value.split(";").map((d) => d.trim());

  for (const directive of directives) {
    const parts = directive.split(/\s+/);
    if (parts[0]?.toLowerCase() === "frame-ancestors") {
      const sources = parts.slice(1);

      // If frame-ancestors has no sources, treat as non-blocking
      // (matches browser behavior of ignoring invalid/empty directives)
      if (sources.length === 0) {
        return false;
      }

      // Parse embedder origin once (not in loop)
      let embedderUrl: URL;
      try {
        embedderUrl = new URL(embedderOrigin);
      } catch {
        // If embedder origin is malformed, be optimistic and allow
        return false;
      }

      // Check if any source explicitly allows the embedder origin
      for (const source of sources) {
        if (matchesFrameAncestorsSource(source, embedderUrl)) {
          return false;
        }
      }

      return true;
    }
  }

  return false;
}

/**
 * Checks Cross-Origin-Embedder-Policy header for embedding restrictions.
 *
 * @param value The Cross-Origin-Embedder-Policy header value.
 * @returns true if embedding is blocked, false otherwise.
 */
function isBlockedByCOEP(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase().trim();

  // unsafe-none means no restrictions, anything else blocks cross-origin embedding
  return normalized !== "unsafe-none";
}

/**
 * Checks if a URL can be embedded in an iframe by verifying:
 * 1. The URL matches a known embed pattern
 * 2. The URL's response headers don't block iframe embedding
 *
 * @param url The URL to check for embeddability.
 * @returns a promise resolving to the embed check result.
 */
export async function checkEmbeddability(
  url: string
): Promise<EmbedCheckResult> {
  const match = getMatchingEmbed(embeds, url);
  if (!match) {
    return { embeddable: false, reason: "no-match" };
  }

  if (match.embed.title !== "Embed") {
    // Known safe embed type
    return { embeddable: true };
  }

  // Make GET request to check headers (HEAD is unreliable for many servers)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Second.ms * 3);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": chromeUserAgent,
      },
    });

    clearTimeout(timeoutId);

    // Get headers then immediately close the connection - we don't need the body
    const status = response.status;
    const xFrameOptions = response.headers.get("x-frame-options");
    const csp = response.headers.get("content-security-policy");
    const coep = response.headers.get("cross-origin-embedder-policy");
    controller.abort();

    // Check for HTTP errors - if the server rejects the request, embedding won't work
    if (status >= 400) {
      return { embeddable: false, reason: "http-error" };
    }

    // Check X-Frame-Options header.
    // Per spec, X-Frame-Options is ignored when CSP frame-ancestors is present.
    if (!hasFrameAncestorsDirective(csp) && isBlockedByXFrameOptions(xFrameOptions)) {
      return { embeddable: false, reason: "x-frame-options" };
    }

    // Check Content-Security-Policy for frame-ancestors
    if (isBlockedByCSP(csp, env.URL)) {
      return { embeddable: false, reason: "csp-frame-ancestors" };
    }

    // Check Cross-Origin-Embedder-Policy
    if (isBlockedByCOEP(coep)) {
      return { embeddable: false, reason: "coep" };
    }

    return { embeddable: true };
  } catch {
    // On timeout or network error, be optimistic and allow embedding
    return { embeddable: true, reason: "timeout" };
  }
}

/**
 * Checks if a URL matches any of the embed patterns.
 *
 * @param url - The URL to check.
 * @param embedDescriptors - The list of embed descriptors to check against.
 * @returns True if the URL matches an embed pattern with `matchOnInput` enabled.
 */
function isEmbedUrl(url: string, embedDescriptors: EmbedDescriptor[]): boolean {
  for (const embed of embedDescriptors) {
    if (!embed.matchOnInput) {
      continue;
    }
    if (embed.matcher(url)) {
      return true;
    }
  }
  return false;
}

/**
 * A regex pattern that matches URLs at the beginning of a line or as standalone content.
 * Matches http:// and https:// URLs.
 */
const bareUrlPattern = /^(https?:\/\/[^\s]+)$/;

/**
 * Converts bare URLs in markdown text to the embed-friendly link format `[url](url)`.
 * This allows the markdown parser to recognize them as embeds when they match
 * supported embed patterns (YouTube, Vimeo, etc.).
 *
 * Only URLs that match a known embed pattern with `matchOnInput` enabled will be converted.
 *
 * @param text - The markdown text to process.
 * @param embedDescriptors - Optional custom list of embed descriptors. Defaults to built-in embeds.
 * @returns The processed text with bare embed URLs converted to link format.
 *
 * @example
 * // Input:
 * "Check out this video:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nPretty cool!"
 *
 * // Output:
 * "Check out this video:\n\n[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n\nPretty cool!"
 */
export function convertBareUrlsToEmbedMarkdown(
  text: string,
  embedDescriptors: EmbedDescriptor[] = embeds
): string {
  const lines = text.split("\n");

  return lines
    .map((line) => {
      const trimmed = line.trim();

      // Check if the line is a bare URL
      const match = trimmed.match(bareUrlPattern);
      if (!match) {
        return line;
      }

      const url = match[1];

      // Only convert if the URL matches a known embed pattern
      if (isEmbedUrl(url, embedDescriptors)) {
        // Preserve leading whitespace from the original line
        const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? "";
        return `${leadingWhitespace}[${url}](${url})`;
      }

      return line;
    })
    .join("\n");
}
