import { deburrWithMap } from "./FindAndReplace";

describe("deburrWithMap", () => {
  it("leaves plain ASCII text unchanged and maps indices 1:1", () => {
    const { deburred, map } = deburrWithMap("abc");
    expect(deburred).toBe("abc");
    expect(map).toEqual([0, 1, 2, 3]);
  });

  it("strips diacritics while keeping the original length", () => {
    const { deburred, map } = deburrWithMap("café");
    expect(deburred).toBe("cafe");
    // Each deburred code unit maps back to the original index it came from,
    // plus a sentinel for the end position.
    expect(map).toEqual([0, 1, 2, 3, 4]);
  });

  it("maps decomposed (longer) output back to original indices for Hangul", () => {
    const text = "강의";
    const { deburred, map } = deburrWithMap(text);

    // NFD decomposition expands each precomposed syllable into jamo, so the
    // deburred string is longer than the original.
    expect(deburred.length).toBeGreaterThan(text.length);

    // The final sentinel must be the original length, not the deburred length.
    expect(map[map.length - 1]).toBe(text.length);

    // Every deburred code unit maps to a valid original index.
    for (let i = 0; i < deburred.length; i++) {
      expect(map[i]).toBeGreaterThanOrEqual(0);
      expect(map[i]).toBeLessThan(text.length);
    }
  });

  it("recovers correct original positions for an ASCII match surrounded by CJK", () => {
    const text = "강의a평가";
    const { deburred, map } = deburrWithMap(text);

    const index = deburred.indexOf("a");
    expect(index).toBeGreaterThanOrEqual(0);

    // The mapped start/end must point at the real "a" in the original text.
    const from = map[index];
    const to = map[index + 1];
    expect(text.slice(from, to)).toBe("a");
  });

  it("maps a deburred match for CJK text back to the original code unit", () => {
    const text = "abc평가";
    const { deburred, map } = deburrWithMap(text);

    // "abc" appears at the start of both the original and deburred strings.
    expect(map[0]).toBe(0);
    expect(map[3]).toBe(3);
    expect(text.slice(map[0], map[3])).toBe("abc");
  });

  it("handles surrogate pairs without splitting them", () => {
    const text = "a😀b";
    const { deburred, map } = deburrWithMap(text);

    // The emoji occupies two UTF-16 code units in the original string.
    expect(map[map.length - 1]).toBe(text.length);
    expect(map[0]).toBe(0);
    // The index following the emoji should account for both code units.
    const bIndex = deburred.indexOf("b");
    expect(text.slice(map[bIndex], map[bIndex + 1])).toBe("b");
  });
});
