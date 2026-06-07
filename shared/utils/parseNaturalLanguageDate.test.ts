import { parseNaturalLanguageDate } from "./parseNaturalLanguageDate";

describe("parseNaturalLanguageDate", () => {
  const reference = new Date(2024, 0, 1); // Mon Jan 1, 2024

  it("returns null for empty input", () => {
    expect(parseNaturalLanguageDate("", reference)).toBeNull();
    expect(parseNaturalLanguageDate("   ", reference)).toBeNull();
  });

  it("returns null for non-date input", () => {
    expect(parseNaturalLanguageDate("hello world", reference)).toBeNull();
  });

  it("parses 'today'", () => {
    const result = parseNaturalLanguageDate("today", reference);
    expect(result).toEqual(new Date(2024, 0, 1));
  });

  it("parses 'tomorrow'", () => {
    const result = parseNaturalLanguageDate("tomorrow", reference);
    expect(result).toEqual(new Date(2024, 0, 2));
  });

  it("parses 'yesterday'", () => {
    const result = parseNaturalLanguageDate("yesterday", reference);
    expect(result).toEqual(new Date(2023, 11, 31));
  });

  it("parses 'in 3 days'", () => {
    const result = parseNaturalLanguageDate("in 3 days", reference);
    expect(result).toEqual(new Date(2024, 0, 4));
  });

  it("parses an explicit month and day", () => {
    const result = parseNaturalLanguageDate("February 3", reference);
    expect(result).toEqual(new Date(2024, 1, 3));
  });

  it("normalizes the time component to local midnight", () => {
    const result = parseNaturalLanguageDate("tomorrow at 5pm", reference);
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });
});
