import emojiRegex from "emoji-regex";
import deburr from "lodash/deburr";
import naturalSort from "natural-sort";

type NaturalSortOptions = {
  caseSensitive?: boolean;
  direction?: "asc" | "desc";
};

const sorter = naturalSort();
const regex = emojiRegex();

const stripEmojis = (value: string) => value.replace(regex, "");

const cleanValue = (value: string) => stripEmojis(deburr(value));

function getSortByField<T extends Record<string, any>>(
  item: T,
  keyOrCallback: string | ((item: T) => string)
) {
  const field =
    typeof keyOrCallback === "string"
      ? item[keyOrCallback]
      : keyOrCallback(item);
  return cleanValue(field);
}

function naturalSortBy<T extends Record<string, any>>(
  items: T[],
  key: string | ((item: T) => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) {
    return [];
  }
  const sort = sortOptions
    ? naturalSort({
        caseSensitive: sortOptions.caseSensitive,
        direction: sortOptions.direction === "desc" ? "desc" : undefined,
      })
    : sorter;

  return items.sort((a: T, b: T) =>
    sort(getSortByField(a, key), getSortByField(b, key))
  );
}

export default naturalSortBy;
