import {
  dateToReadable,
  dateToRelativeReadable,
  hasTimeComponent,
  parseISODate,
  toISODate,
  toISODateTime,
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

  it("rejects strings carrying seconds or a timezone", () => {
    expect(parseISODate("2024-02-03T10:00:00Z")).toBeNull();
    expect(parseISODate("2024-02-03T10:00:00")).toBeNull();
  });

  it("parses a date-only string to local midnight", () => {
    const date = parseISODate("2024-02-03");
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });
});

describe("toISODateTime / hasTimeComponent", () => {
  it("round-trips a date and time through its ISO representation", () => {
    const date = new Date(2024, 1, 3, 13, 5); // Feb 3, 2024 at 1:05pm
    const iso = toISODateTime(date);
    expect(iso).toBe("2024-02-03T13:05");
    expect(parseISODate(iso)).toEqual(date);
  });

  it("detects whether a value is time-specific", () => {
    expect(hasTimeComponent("2024-02-03T13:05")).toBe(true);
    expect(hasTimeComponent("2024-02-03")).toBe(false);
    expect(hasTimeComponent("nonsense")).toBe(false);
  });
});

// ICU builds differ in where they emit no-break spaces, e.g. before the day
// period or a year suffix, so locale output is compared on regular spaces.
const normalize = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

describe("dateToReadable", () => {
  it("includes the year outside the current year", () => {
    expect(normalize(dateToReadable("2020-02-03"))).toBe("February 3, 2020");
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

  it("appends the time when the value is time-specific", () => {
    expect(normalize(dateToReadable("2020-02-03T13:00"))).toBe(
      "February 3, 2020 at 1:00 PM"
    );
  });

  it("follows the word order of the locale", () => {
    expect(normalize(dateToReadable("2020-02-03", "de_DE"))).toBe(
      "3. Februar 2020"
    );
    expect(normalize(dateToReadable("2020-02-03", "fr_FR"))).toBe(
      "3 février 2020"
    );
    expect(normalize(dateToReadable("2020-02-03", "ja_JP"))).toBe(
      "2020年2月3日"
    );
  });

  it("uses the clock convention of the locale", () => {
    expect(normalize(dateToReadable("2020-02-03T13:00", "de_DE"))).toBe(
      "3. Februar 2020 um 13:00"
    );
  });

  it("separates the time using the locale's own connector", () => {
    expect(dateToReadable("2020-02-03T13:00", "de_DE")).toContain(" um ");
    expect(dateToReadable("2020-02-03T13:00", "ja_JP")).not.toContain(" at ");
  });

  it("keeps the date's own suffix out of the separator", () => {
    // Ukrainian places "р." (an abbreviation of "року") after the year, which
    // must not be mistaken for part of the separator.
    expect(normalize(dateToReadable("2020-02-03T13:00", "uk_UA"))).toBe(
      "3 лютого 2020 р. о 13:00"
    );
    const today = new Date();
    today.setHours(13, 0);
    const t = (key: string) => key;
    expect(
      normalize(dateToRelativeReadable(toISODateTime(today), t, "uk_UA"))
    ).toBe("Today о 13:00");
  });
});

describe("dateToRelativeReadable", () => {
  const t = (key: string) => key;

  it("returns Today for the current date", () => {
    const iso = toISODate(new Date());
    expect(normalize(dateToRelativeReadable(iso, t))).toBe("Today");
  });

  it("returns Tomorrow for the next day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(normalize(dateToRelativeReadable(toISODate(tomorrow), t))).toBe(
      "Tomorrow"
    );
  });

  it("returns Yesterday for the previous day", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(normalize(dateToRelativeReadable(toISODate(yesterday), t))).toBe(
      "Yesterday"
    );
  });

  it("omits the year within the current year", () => {
    const date = new Date();
    date.setMonth(date.getMonth() === 0 ? 6 : 0); // a different month, same year
    date.setDate(15);
    const result = dateToRelativeReadable(toISODate(date), t);
    expect(result).not.toContain(`${date.getFullYear()}`);
  });

  it("includes the year for a date in a different year", () => {
    expect(normalize(dateToRelativeReadable("2020-02-03", t))).toBe(
      "February 3, 2020"
    );
  });

  it("appends the time when the value is time-specific", () => {
    const today = new Date();
    today.setHours(13, 0);
    expect(normalize(dateToRelativeReadable(toISODateTime(today), t))).toBe(
      "Today at 1:00 PM"
    );
    expect(normalize(dateToRelativeReadable("2020-02-03T13:00", t))).toBe(
      "February 3, 2020 at 1:00 PM"
    );
  });

  it("joins the relative label and time with the locale's connector", () => {
    const today = new Date();
    today.setHours(13, 0);
    expect(
      normalize(dateToRelativeReadable(toISODateTime(today), t, "de_DE"))
    ).toBe("Today um 13:00");
  });
});
