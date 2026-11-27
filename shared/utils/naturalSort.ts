import emojiRegex from "emoji-regex";
import { deburr } from "es-toolkit/compat";

type NaturalSortOptions = {
  caseSensitive?: boolean;
  direction?: "asc" | "desc";
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const caseSensitiveCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "case",
});
const regex = emojiRegex();

const stripEmojis = (value: string) => value.replace(regex, "");

const cleanValue = (value: string) => stripEmojis(deburr(value));

function getSortByField<T extends object>(
  item: T,
  keyOrCallback: string | ((item: T) => string)
) {
  const field =
    typeof keyOrCallback === "string"
      ? (item as Record<string, unknown>)[keyOrCallback]
      : keyOrCallback(item);
  return cleanValue(typeof field === "string" ? field : "");
}

function naturalSortBy<T extends object>(
  items: T[],
  key: string | ((item: T) => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) {
    return [];
  }
  const compare = sortOptions?.caseSensitive
    ? caseSensitiveCollator.compare
    : collator.compare;
  const multiplier = sortOptions?.direction === "desc" ? -1 : 1;

  // Sort a copy, `items` may be an observable array which cannot be sorted in place.
  return items.slice().sort((a: T, b: T) => {
    const x = getSortByField(a, key);
    const y = getSortByField(b, key);

    // Empty values sort last.
    if (!x || !y) {
      return (Number(!x) - Number(!y)) * multiplier;
    }
    return compare(x, y) * multiplier;
  });
}

export default naturalSortBy;
