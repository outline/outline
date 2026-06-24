import { deburr } from "es-toolkit/compat";

/**
 * Build a diacritics-stripped version of a string together with a mapping from
 * each index in the stripped string back to the corresponding index in the
 * original string.
 *
 * `deburr` normalizes to NFD form, which can change the length of the string –
 * most notably it decomposes precomposed CJK/Hangul syllables (e.g. "강" is a
 * single UTF-16 code unit but decomposes into three jamo). Because of this the
 * stripped string cannot be aligned to the original by assuming equal lengths,
 * so we record the source index of every emitted code unit instead.
 *
 * @param text The original text to deburr.
 * @returns the deburred text and an index map of length `deburred.length + 1`,
 * where `map[i]` is the original index of the deburred code unit at `i` and the
 * final entry is the original text length (a sentinel for end positions).
 */
export function deburrWithMap(text: string): {
  deburred: string;
  map: number[];
} {
  let deburred = "";
  const map: number[] = [];
  let originalIndex = 0;

  // Iterate by code point so surrogate pairs are deburred as a unit.
  for (const char of text) {
    const stripped = deburr(char);
    for (let i = 0; i < stripped.length; i++) {
      map.push(originalIndex);
    }
    deburred += stripped;
    originalIndex += char.length;
  }

  map.push(text.length);
  return { deburred, map };
}
