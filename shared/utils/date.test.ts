import {
  dateToReadable,
  dateToRelativeReadable,
  parseISODate,
  toISODate,
} from "./date";

describe("toISODate / parseISODate", () => {
  it("round-trips a date through its ISO representation", () => {
    const date = new Date(2024, 1, 3); // Feb 3, 2024
    const iso = toISODate(date);
    expect(iso).toBe("2024-02-03");
    expect(parseISODate(iso)).toEqual(date);
  });

  it("returns null for an invalid ISO string", () => {
    expect(parseISODate("not-a-date")).toBeNull();
  });

  it("rejects strings carrying a time component", () => {
    expect(parseISODate("2024-02-03T10:00:00Z")).toBeNull();
  });

  it("parses a date-only string to local midnight", () => {
    const date = parseISODate("2024-02-03");
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });
});

describe("dateToReadable", () => {
  it("includes the year outside the current year", () => {
    expect(dateToReadable("2020-02-03")).toBe("February 3rd, 2020");
  });

  it("omits the year within the current year", () => {
    const date = new Date();
    date.setMonth(date.getMonth() === 0 ? 6 : 0);
    date.setDate(15);
    const result = dateToReadable(toISODate(date));
    expect(result).not.toContain(`${date.getFullYear()}`);
  });

  it("returns the original string when invalid", () => {
    expect(dateToReadable("nonsense")).toBe("nonsense");
  });
});

describe("dateToRelativeReadable", () => {
  const t = (key: string) => key;

  it("returns Today for the current date", () => {
    const iso = toISODate(new Date());
    expect(dateToRelativeReadable(iso, t)).toBe("Today");
  });

  it("returns Tomorrow for the next day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dateToRelativeReadable(toISODate(tomorrow), t)).toBe("Tomorrow");
  });

  it("returns Yesterday for the previous day", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(dateToRelativeReadable(toISODate(yesterday), t)).toBe("Yesterday");
  });

  it("omits the year within the current year", () => {
    const date = new Date();
    date.setMonth(date.getMonth() === 0 ? 6 : 0); // a different month, same year
    date.setDate(15);
    const result = dateToRelativeReadable(toISODate(date), t);
    expect(result).not.toContain(`${date.getFullYear()}`);
  });

  it("includes the year for a date in a different year", () => {
    expect(dateToRelativeReadable("2020-02-03", t)).toBe("February 3rd, 2020");
  });
});
