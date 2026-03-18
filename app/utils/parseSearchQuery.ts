/**
 * Parses a search query string to extract #tag tokens.
 *
 * @param query - the raw search query string.
 * @returns the cleaned query (without #tag tokens) and the extracted tag names.
 */
export function parseSearchQuery(query: string): {
  cleanQuery: string;
  tagNames: string[];
} {
  const tagNames: string[] = [];
  const cleanQuery = query
    .replace(/#([\w-]+)/g, (_, name: string) => {
      tagNames.push(name.toLowerCase());
      return "";
    })
    .trim()
    .replace(/\s+/g, " ");

  return { cleanQuery, tagNames: [...new Set(tagNames)] };
}
