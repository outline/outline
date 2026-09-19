import { deburr } from "es-toolkit/compat";

/**
 * Build a diacritics-stripped version of a string together with a way to map
 * any index in the stripped string back to the corresponding index in the
 * original string.
 *
 * `deburr` normalizes to NFD form, which can change the length of the string –
 * most notably it decomposes precomposed CJK/Hangul syllables (e.g. "강" is a
 * single UTF-16 code unit but decomposes into three jamo). When that happens a
 * naive offset no longer lines up with the original, so the source index of
 * every emitted code unit is recorded instead.
 *
 * When deburring does not change the length – the common case for ASCII and
 * ordinary accented Latin text – indices line up one-to-one and the cheap
 * identity mapping is returned without building any per-character table.
 *
 * @param text The original text to deburr.
 * @returns the deburred text and a `toOriginalIndex` function translating a
 * deburred index (0…deburred.length) into the corresponding original index.
 */
export function deburrWithMap(text: string): {
  deburred: string;
  toOriginalIndex: (index: number) => number;
} {
  const deburred = deburr(text);

  // Fast path: deburring preserved the length, so indices line up one-to-one
  // with the original string and no per-character table is needed.
  if (deburred.length === text.length) {
    return { deburred, toOriginalIndex: (index) => index };
  }

  // Slow path: deburring changed the length (e.g. NFD decomposed a CJK/Hangul
  // syllable or expanded a ligature). Rebuild the deburred string per code
  // point so it stays consistent with the index map, recording the original
  // index of every emitted code unit plus a sentinel for the end position.
  const parts: string[] = [];
  const map: number[] = [];
  let originalIndex = 0;

  // Iterate by code point so surrogate pairs are deburred as a unit.
  for (const char of text) {
    // ASCII characters are never altered or decomposed by deburr, so emit them
    // directly and skip the comparatively expensive normalization.
    if (char.charCodeAt(0) < 0x80) {
      map.push(originalIndex);
      parts.push(char);
      originalIndex += 1;
      continue;
    }

    const stripped = deburr(char);
    for (let i = 0; i < stripped.length; i++) {
      map.push(originalIndex);
    }
    parts.push(stripped);
    originalIndex += char.length;
  }
  map.push(text.length);

  return { deburred: parts.join(""), toOriginalIndex: (index) => map[index] };
}
