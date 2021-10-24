// @flow
import { compose, deburr, replace } from "lodash/fp";
import naturalSort from "natural-sort";

type NaturalSortOptions = {
  caseSensitive?: boolean,
  direction?: "asc" | "desc",
};

const sorter = naturalSort();

const stripEmojis = replace(
  /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
  ""
);

const cleanValue = compose(stripEmojis, deburr);

function getSortByField<T>(
  item: T,
  keyOrCallback: string | ((obj: T) => string)
) {
  const field =
    typeof keyOrCallback === "string"
      ? item[keyOrCallback]
      : keyOrCallback(item);
  return cleanValue(field);
}

function naturalSortBy<T>(
  items: T[],
  key: string | ((obj: T) => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) return [];

  const sort = sortOptions ? naturalSort(sortOptions) : sorter;
  return items.sort((a: any, b: any): -1 | 0 | 1 =>
    sort(getSortByField(a, key), getSortByField(b, key))
  );
}

export default naturalSortBy;
