import { deflate } from "pako";

/**
 * Deflate-compresses and base64url-encodes diagram source text for use in
 * Kroki GET request URLs.
 *
 * @param source - the diagram source text to encode.
 * @returns the base64url-encoded compressed string without padding.
 */
export function encode(source: string): string {
  const compressed = deflate(new TextEncoder().encode(source));
  const base64 = btoa(String.fromCharCode(...compressed));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds a Kroki GET URL for the given diagram, applying theme modifications
 * based on the target language and dark mode preference.
 *
 * Theme handling per language:
 * - D2: appends `?theme=200` query param for dark mode.
 * - PlantUML: prepends `!theme cyborg-outline\n` to source for dark mode.
 * - Mermaid: prepends `%%{init: {'theme':'dark'}}%%\n` to source for dark mode.
 *
 * @param serviceUrl - the base URL of the Kroki service (no trailing slash).
 * @param language - the diagram language identifier (e.g. "plantuml", "mermaid", "d2").
 * @param source - the raw diagram source text.
 * @param isDark - whether to apply dark mode theming.
 * @returns the fully constructed Kroki GET URL.
 */
export function buildUrl(
  serviceUrl: string,
  language: string,
  source: string,
  isDark: boolean
): string {
  const themedSource = applyTheme(language, source, isDark);
  const encoded = encode(themedSource);
  const base = `${serviceUrl}/${language}/svg/${encoded}`;

  if (isDark && language === "d2") {
    return `${base}?theme=200`;
  }

  return base;
}

/**
 * Sanitizes an SVG string by removing script elements and event handler
 * attributes to prevent XSS attacks.
 *
 * @param svg - the raw SVG string to sanitize.
 * @returns the sanitized SVG string with scripts and event handlers removed.
 */
export function sanitizeSvg(svg: string): string {
  let sanitized = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
  return sanitized;
}

/**
 * Fetches a rendered SVG diagram from a Kroki service, applying theme
 * modifications and sanitizing the response.
 *
 * @param serviceUrl - the base URL of the Kroki service (no trailing slash).
 * @param language - the diagram language identifier (e.g. "plantuml", "mermaid", "d2").
 * @param source - the raw diagram source text.
 * @param isDark - whether to apply dark mode theming.
 * @param signal - an optional AbortSignal to cancel the request.
 * @returns the sanitized SVG string.
 * @throws Error if the fetch response is not ok, with the response body as the message.
 */
export async function render(
  serviceUrl: string,
  language: string,
  source: string,
  isDark: boolean,
  signal?: AbortSignal
): Promise<string> {
  const url = buildUrl(serviceUrl, language, source, isDark);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body);
  }

  const svg = await response.text();
  if (!svg.trim()) {
    throw new Error("Empty response from diagram service");
  }
  return sanitizeSvg(svg);
}

function applyTheme(language: string, source: string, isDark: boolean): string {
  if (!isDark) {
    return source;
  }

  switch (language) {
    case "plantuml":
      return `!theme cyborg-outline\n${source}`;
    case "mermaid":
      return `%%{init: {'theme':'dark'}}%%\n${source}`;
    default:
      return source;
  }
}
