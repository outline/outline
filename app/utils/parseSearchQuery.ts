import { TagValidation } from "@shared/validations";
import { normalizeTagName } from "@shared/utils/TagHelper";

const tagTokenRegex = new RegExp(
  `(^|\\s)#([${TagValidation.nameCharacters}]+)`,
  "gu"
);

/**
 * Parses a search query string to extract #tag tokens. Tokens that name no
 * known tag, eg. "PR #4521", stay in the text query.
 *
 * @param query - the raw search query string.
 * @param isKnownTag - whether a normalized tag name matches a known tag. When
 * omitted every token is treated as a tag.
 * @returns the cleaned query (without known #tag tokens), the extracted tag
 * names, and the token names that matched no known tag.
 */
export function parseSearchQuery(
  query: string,
  isKnownTag: (name: string) => boolean = () => true
): {
  cleanQuery: string;
  tagNames: string[];
  unresolvedTagNames: string[];
} {
  const tagNames: string[] = [];
  const unresolvedTagNames: string[] = [];
  const cleanQuery = query
    .replace(tagTokenRegex, (token: string, prefix: string, name: string) => {
      const normalized = normalizeTagName(name);
      if (!isKnownTag(normalized)) {
        unresolvedTagNames.push(normalized);
        return token;
      }
      tagNames.push(normalized);
      return prefix;
    })
    .trim()
    .replace(/\s+/g, " ");

  return {
    cleanQuery,
    tagNames: [...new Set(tagNames)],
    unresolvedTagNames: [...new Set(unresolvedTagNames)],
  };
}
