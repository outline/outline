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

  it("leaves Hangul unchanged and maps indices 1:1 (fast path)", () => {
    const text = "강의";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    expect(deburred).toBe(text);
    for (let i = 0; i <= deburred.length; i++) {
      expect(toOriginalIndex(i)).toBe(i);
    }
  });

  it("maps expanded (longer) output back to original indices", () => {
    const text = "ßÆ";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    // Each letter expands to two letters, so the deburred string is longer.
    expect(deburred).toBe("ssAe");

    // The end position must map to the original length, not the deburred length.
    expect(toOriginalIndex(deburred.length)).toBe(text.length);

    // Every deburred code unit maps to a valid original index.
    for (let i = 0; i < deburred.length; i++) {
      expect(toOriginalIndex(i)).toBeGreaterThanOrEqual(0);
      expect(toOriginalIndex(i)).toBeLessThan(text.length);
    }
  });

  it("recovers correct original positions for an ASCII match surrounded by expanded letters", () => {
    const text = "ßÆaßÆ";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    const index = deburred.indexOf("a");
    expect(index).toBeGreaterThanOrEqual(0);

    // The mapped start/end must point at the real "a" in the original text.
    const from = toOriginalIndex(index);
    const to = toOriginalIndex(index + 1);
    expect(text.slice(from, to)).toBe("a");
  });

  it("maps Hangul back to the original code unit when another letter expands", () => {
    const text = "강ß의";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    expect(deburred).toBe("강ss의");

    const index = deburred.indexOf("의");
    expect(text.slice(toOriginalIndex(index), toOriginalIndex(index + 1))).toBe(
      "의"
    );
  });

  it("keeps the map consistent across interleaved ASCII and expanded letters", () => {
    const text = "aßbÆc";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    // Every ASCII character must still resolve to its exact original code unit,
    // even though the letters between them expand.
    for (const ascii of ["a", "b", "c"]) {
      const index = deburred.indexOf(ascii);
      expect(
        text.slice(toOriginalIndex(index), toOriginalIndex(index + 1))
      ).toBe(ascii);
    }

    // Indices are non-decreasing and the end maps to the original length.
    for (let i = 0; i < deburred.length; i++) {
      expect(toOriginalIndex(i + 1)).toBeGreaterThanOrEqual(toOriginalIndex(i));
    }
    expect(toOriginalIndex(deburred.length)).toBe(text.length);
  });

  it("maps a partial expanded sequence to a zero-length original range", () => {
    // An expanded letter emits multiple code units from one original code unit.
    // Matching only part of that sequence therefore collapses to an empty range
    // in the original text, which consumers must detect and skip.
    const text = "ß";
    const { deburred, toOriginalIndex } = deburrWithMap(text);

    expect(deburred).toBe("ss");

    // The first letter alone maps back to a zero-length range (start === end).
    expect(toOriginalIndex(0)).toBe(toOriginalIndex(1));

    // The full sequence still spans the whole original character.
    expect(toOriginalIndex(0)).toBe(0);
    expect(toOriginalIndex(deburred.length)).toBe(text.length);
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
