import { escape } from "es-toolkit/compat";
import type { Node } from "prosemirror-model";
import slugify from "slugify";

// calculates a unique slug for this heading based on it's text and position
// in the document that is as stable as possible
export default function headingToSlug(node: Node, index = 0) {
  const slugified = safeSlugify(node.textContent);
  if (index === 0) {
    return slugified;
  }
  return `${slugified}-${index}`;
}

/**
 * Assigns unique slugs to the headings of a document. Call `slug` for each
 * heading in document order; repeated headings are given a numeric suffix.
 */
export class HeadingSlugger {
  /**
   * Returns a slug for the heading that is not already in use.
   *
   * @param node the heading node.
   * @returns the unique slug.
   */
  public slug(node: Node): string {
    const base = headingToSlug(node);
    let index = this.counts.get(base) ?? 0;
    let id = headingToSlug(node, index);

    // A heading whose text ends in a number can match a suffixed duplicate.
    while (this.used.has(id)) {
      index += 1;
      id = headingToSlug(node, index);
    }

    this.counts.set(base, index + 1);
    this.used.add(id);
    return id;
  }

  private counts = new Map<string, number>();

  private used = new Set<string>();
}

// Slugify, escape, and remove periods from headings so that they are
// compatible with both url hashes AND dom ID's (querySelector does not like
// ID's that begin with a number or a period, for example).
function safeSlugify(text: string) {
  return `h-${escape(
    slugify(text, {
      remove: /[!"#$%&'.()*+,/:;<=>?@[\]\\^_`{|}~]/g,
      lower: true,
    })
  )}`;
}
