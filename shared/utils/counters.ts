import { HeadingPrefixStyle } from "../types";

/**
 * Formats a counter value for display at the given depth of a heading
 * prefix style.
 *
 * @param count the value of the counter, starting at 1.
 * @param depth the zero-based depth the counter sits at.
 * @param style the prefix style to format the counter with.
 * @returns the formatted counter, for example "iv".
 */
export function formatCounter(
  count: number,
  depth: number,
  style: HeadingPrefixStyle
): string {
  switch (style) {
    case HeadingPrefixStyle.Alphanumeric:
      switch (depth % 3) {
        case 1:
          return toAlpha(count);
        case 2:
          return toRoman(count);
        default:
          return String(count);
      }
    case HeadingPrefixStyle.Outline:
      switch (depth % 5) {
        case 0:
          return toRoman(count).toUpperCase();
        case 1:
          return toAlpha(count).toUpperCase();
        case 2:
          return String(count);
        case 3:
          return toAlpha(count);
        default:
          return toRoman(count);
      }
    default:
      return String(count);
  }
}

/**
 * Converts a positive number to lowercase base-26 alphabetic numbering, as
 * used by spreadsheet columns.
 *
 * @param num the number to convert, starting at 1.
 * @returns the alphabetic representation, for example "aa" for 27.
 */
export function toAlpha(num: number): string {
  let n = num;
  let result = "";
  while (n > 0) {
    n -= 1;
    result = String.fromCharCode(97 + (n % 26)) + result;
    n = Math.floor(n / 26);
  }
  return result;
}

/**
 * Converts a positive number to lowercase roman numerals.
 *
 * @param num the number to convert, starting at 1.
 * @returns the roman numeral representation, for example "xiv" for 14.
 */
export function toRoman(num: number): string {
  let n = num;
  let result = "";
  for (const [value, symbol] of romanNumerals) {
    while (n >= value) {
      result += symbol;
      n -= value;
    }
  }
  return result;
}

const romanNumerals: [number, string][] = [
  [1000, "m"],
  [900, "cm"],
  [500, "d"],
  [400, "cd"],
  [100, "c"],
  [90, "xc"],
  [50, "l"],
  [40, "xl"],
  [10, "x"],
  [9, "ix"],
  [5, "v"],
  [4, "iv"],
  [1, "i"],
];
