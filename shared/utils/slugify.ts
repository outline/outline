import slug from "slug";

slug.defaults.mode = "rfc3986";

/**
 * Convert a string to a slug that can be used in a URL in kebab-case format,
 * and remove periods.
 *
 * @param text The text to convert
 * @returns The slugified text
 */
export default function slugify(text: string): string {
  // slug throws on malformed strings, so replace unpaired surrogates first.
  return slug(text.toWellFormed(), {
    remove: /[.]/g,
  });
}
