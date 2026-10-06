import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

/** Notion property names, matched case-insensitively, that map to Outline tags. */
const TAG_PROPERTY_NAMES = new Set(["tags", "labels"]);

/**
 * Extracts tag names from a Notion page's properties. Only `multi_select`
 * and `select` properties named "Tags" or "Labels" (case-insensitive) are
 * read — any other property name or type is ignored, including a property
 * literally named "Tags" of some other type.
 *
 * The raw names returned here are not yet normalized or validated; that
 * happens later in `ImportsProcessor#restoreTags`, the same tag-restoration
 * path the JSON importer uses, which also dedupes names and logs (via
 * `Logger.warn`) any name that fails validation.
 *
 * @param properties a Notion page's properties, keyed by property name.
 * @returns the raw tag names found, in property iteration order.
 */
export function parseNotionTags(
  properties: PageObjectResponse["properties"]
): string[] {
  const tags: string[] = [];

  for (const [name, property] of Object.entries(properties)) {
    if (!TAG_PROPERTY_NAMES.has(name.toLowerCase())) {
      continue;
    }

    if (property.type === "multi_select") {
      tags.push(...property.multi_select.map((option) => option.name));
    } else if (property.type === "select" && property.select) {
      tags.push(property.select.name);
    }
  }

  return tags;
}
