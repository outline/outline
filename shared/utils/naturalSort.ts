// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'emoj... Remove this comment to see the full error message
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
      : // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
        keyOrCallback(item);
  return cleanValue(field);
}

function naturalSortBy<T>(
  items: T[],
  key: string | (() => string),
  sortOptions?: NaturalSortOptions
): T[] {
  if (!items) return [];
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'NaturalSortOptions' is not assig... Remove this comment to see the full error message
  const sort = sortOptions ? naturalSort(sortOptions) : sorter;
  return items.sort((a: any, b: any): -1 | 0 | 1 =>
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type '0 | 1 | -... Remove this comment to see the full error message
    sort(getSortByField(a, key), getSortByField(b, key))
  );
}

export default naturalSortBy;
