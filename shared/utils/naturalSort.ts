import emojiRegex from "emoji-regex";
import { deburr } from "lodash";
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
  keyOrCallback: string | (() => string)
) {
  const field =
    typeof keyOrCallback === "string"
      ? item[keyOrCallback]
      : keyOrCallback(item);
  return cleanValue(field);
}

function naturalSortBy<T>(
  items: T[],
  key: string | (() => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) return [];
  const sort = sortOptions ? naturalSort(sortOptions) : sorter;
  return items.sort((a: any, b: any): -1 | 0 | 1 =>
    sort(getSortByField(a, key), getSortByField(b, key))
  );
}

export default naturalSortBy;
