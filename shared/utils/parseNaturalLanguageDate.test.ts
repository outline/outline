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
    expect(result).toEqual({ date: new Date(2024, 0, 1), hasTime: false });
  });

  it("parses 'tomorrow'", async () => {
    const result = await parseNaturalLanguageDate("tomorrow", reference);
    expect(result).toEqual({ date: new Date(2024, 0, 2), hasTime: false });
  });

  it("parses 'yesterday'", async () => {
    const result = await parseNaturalLanguageDate("yesterday", reference);
    expect(result).toEqual({ date: new Date(2023, 11, 31), hasTime: false });
  });

  it("parses 'in 3 days'", async () => {
    const result = await parseNaturalLanguageDate("in 3 days", reference);
    expect(result).toEqual({ date: new Date(2024, 0, 4), hasTime: false });
  });

  it("parses an explicit month and day", async () => {
    const result = await parseNaturalLanguageDate("February 3", reference);
    expect(result).toEqual({ date: new Date(2024, 1, 3), hasTime: false });
  });

  it("normalizes the time component to local midnight when none is given", async () => {
    const result = await parseNaturalLanguageDate("next friday", reference);
    expect(result?.hasTime).toBe(false);
    expect(result?.date.getHours()).toBe(0);
    expect(result?.date.getMinutes()).toBe(0);
  });

  it("keeps the time component when one is given", async () => {
    const result = await parseNaturalLanguageDate("tomorrow at 5pm", reference);
    expect(result).toEqual({
      date: new Date(2024, 0, 2, 17, 0),
      hasTime: true,
    });
  });

  it("parses a time on its own", async () => {
    const result = await parseNaturalLanguageDate("1pm", reference);
    expect(result).toEqual({
      date: new Date(2024, 0, 1, 13, 0),
      hasTime: true,
    });
  });

  it("parses a morning time", async () => {
    const result = await parseNaturalLanguageDate("9am", reference);
    expect(result).toEqual({
      date: new Date(2024, 0, 1, 9, 0),
      hasTime: true,
    });
  });

  it("parses a morning time with minutes", async () => {
    const result = await parseNaturalLanguageDate("8:30am tomorrow", reference);
    expect(result).toEqual({
      date: new Date(2024, 0, 2, 8, 30),
      hasTime: true,
    });
  });

  it("rolls a time that has already passed forward to the next day", async () => {
    const afternoon = new Date(2024, 0, 1, 15, 0); // Mon Jan 1, 2024 at 3pm
    const result = await parseNaturalLanguageDate("9am", afternoon);
    expect(result).toEqual({
      date: new Date(2024, 0, 2, 9, 0),
      hasTime: true,
    });
  });

  it("parses a time on a date in the past", async () => {
    const result = await parseNaturalLanguageDate(
      "yesterday at 7am",
      reference
    );
    expect(result).toEqual({
      date: new Date(2023, 11, 31, 7, 0),
      hasTime: true,
    });
  });
});
