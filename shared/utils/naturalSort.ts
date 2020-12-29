import { deburr } from "lodash";
import naturalSort from "natural-sort";

type NaturalSortOptions = {
  caseSensitive?: boolean,
  direction?: "asc" | "desc"
};

const sorter = naturalSort();

function getSortByField<T extends Object>(item: T, keyOrCallback: string | ((t: T) => string)) {
  if (typeof keyOrCallback === "string") {
    return deburr(item[keyOrCallback]);
  }

  return keyOrCallback(item);
}

function naturalSortBy<T>(
  items: T[],
  key: string | ((t: T) => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) return [];

  const sort = sortOptions ? naturalSort(sortOptions) : sorter;
  return items.sort((a: any, b: any): -1 | 0 | 1 => sort(getSortByField(a, key), getSortByField(b, key))
  );
}

export default naturalSortBy;
