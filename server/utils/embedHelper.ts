import type { EmbedDescriptor } from "@shared/editor/embeds";
import embeds from "@shared/editor/embeds";

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
