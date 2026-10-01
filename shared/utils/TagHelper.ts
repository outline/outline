/**
 * Normalizes a tag name the same way everywhere it's accepted: trims
 * surrounding whitespace, lowercases it, and applies Unicode NFC
 * normalization so equivalent representations of the same characters (e.g.
 * combining marks) compare and store identically.
 *
 * Used by the Tag model's `BeforeValidate` hook, the tags API's request
 * schema, and tag restoration during JSON import — anywhere a raw tag name
 * needs to become the canonical stored form before it's compared or saved.
 *
 * @param name the raw tag name.
 * @returns the normalized tag name.
 */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().normalize("NFC");
}
