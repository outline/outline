import { parseNaturalLanguageDate } from "./parseNaturalLanguageDate";

describe("parseNaturalLanguageDate", () => {
  const reference = new Date(2024, 0, 1); // Mon Jan 1, 2024

  it("returns null for empty input", async () => {
    expect(await parseNaturalLanguageDate("", reference)).toBeNull();
    expect(await parseNaturalLanguageDate("   ", reference)).toBeNull();
  });

  it("returns null for non-date input", async () => {
    expect(await parseNaturalLanguageDate("hello world", reference)).toBeNull();
  });

  it("parses 'today'", async () => {
    const result = await parseNaturalLanguageDate("today", reference);
    expect(result).toEqual(new Date(2024, 0, 1));
  });

  it("parses 'tomorrow'", async () => {
    const result = await parseNaturalLanguageDate("tomorrow", reference);
    expect(result).toEqual(new Date(2024, 0, 2));
  });

  it("parses 'yesterday'", async () => {
    const result = await parseNaturalLanguageDate("yesterday", reference);
    expect(result).toEqual(new Date(2023, 11, 31));
  });

  it("parses 'in 3 days'", async () => {
    const result = await parseNaturalLanguageDate("in 3 days", reference);
    expect(result).toEqual(new Date(2024, 0, 4));
  });

  it("parses an explicit month and day", async () => {
    const result = await parseNaturalLanguageDate("February 3", reference);
    expect(result).toEqual(new Date(2024, 1, 3));
  });

  it("normalizes the time component to local midnight", async () => {
    const result = await parseNaturalLanguageDate("tomorrow at 5pm", reference);
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });
});
