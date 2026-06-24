import { deburrWithMap } from "./deburrWithMap";

describe("deburrWithMap", () => {
  it("leaves plain ASCII text unchanged and maps indices 1:1", () => {
    const { deburred, toOriginalIndex } = deburrWithMap("abc");
    expect(deburred).toBe("abc");
    expect(toOriginalIndex(0)).toBe(0);
    expect(toOriginalIndex(3)).toBe(3);
  });

  it("strips diacritics while keeping the original length (fast path)", () => {
    const { deburred, toOriginalIndex } = deburrWithMap("café");
    expect(deburred).toBe("cafe");
    // Length is preserved, so indices line up one-to-one with the original.
    for (let i = 0; i <= deburred.length; i++) {
      expect(toOriginalIndex(i)).toBe(i);
    }
  });

  it("maps decomposed (longer) output back to original indices for Hangul", () => {
    const text = "강의";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    // NFD decomposition expands each precomposed syllable into jamo, so the
    // deburred string is longer than the original.
    expect(deburred.length).toBeGreaterThan(text.length);

    // The end position must map to the original length, not the deburred length.
    expect(toOriginalIndex(deburred.length)).toBe(text.length);

    // Every deburred code unit maps to a valid original index.
    for (let i = 0; i < deburred.length; i++) {
      expect(toOriginalIndex(i)).toBeGreaterThanOrEqual(0);
      expect(toOriginalIndex(i)).toBeLessThan(text.length);
    }
  });

  it("recovers correct original positions for an ASCII match surrounded by CJK", () => {
    const text = "강의a평가";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    const index = deburred.indexOf("a");
    expect(index).toBeGreaterThanOrEqual(0);

    // The mapped start/end must point at the real "a" in the original text.
    const from = toOriginalIndex(index);
    const to = toOriginalIndex(index + 1);
    expect(text.slice(from, to)).toBe("a");
  });

  it("maps a deburred match for CJK text back to the original code unit", () => {
    const text = "abc평가";
    const { toOriginalIndex } = deburrWithMap(text);

    // "abc" appears at the start of both the original and deburred strings.
    expect(toOriginalIndex(0)).toBe(0);
    expect(toOriginalIndex(3)).toBe(3);
    expect(text.slice(toOriginalIndex(0), toOriginalIndex(3))).toBe("abc");
  });

  it("handles surrogate pairs without splitting them", () => {
    const text = "a😀b";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    // The emoji occupies two UTF-16 code units in the original string.
    expect(toOriginalIndex(deburred.length)).toBe(text.length);
    expect(toOriginalIndex(0)).toBe(0);
    // The index following the emoji should account for both code units.
    const bIndex = deburred.indexOf("b");
    expect(
      text.slice(toOriginalIndex(bIndex), toOriginalIndex(bIndex + 1))
    ).toBe("b");
  });
});
