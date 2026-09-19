import { formatNumber, getLangFor, getSupportedLanguage } from "./language";

describe("formatNumber", () => {
  it("formats a number with the specified locale", () => {
    expect(formatNumber(1234, "en-US")).toEqual("1,234");
  });

  it("returns the unformatted number for an invalid locale", () => {
    expect(formatNumber(1234, "invalid_locale")).toEqual("1234");
  });
});

describe("getSupportedLanguage", () => {
  it("converts a supported BCP 47 locale", () => {
    expect(getSupportedLanguage("pt-BR")).toEqual("pt_BR");
  });

  it("accepts a supported CLDR locale", () => {
    expect(getSupportedLanguage("pt_BR")).toEqual("pt_BR");
  });

  it("returns the first supported locale", () => {
    expect(getSupportedLanguage(undefined, "en-US")).toEqual("en_US");
  });

  it("ignores unsupported and malformed locales", () => {
    expect(getSupportedLanguage("invalid_locale", "en-US")).toEqual("en_US");
    expect(getSupportedLanguage("en-CA")).toBeUndefined();
  });
});

describe("getLangFor", () => {
  it("returns languages that need special text styling", () => {
    expect(getLangFor("fa")).toEqual("fa");
  });

  it("ignores other or empty languages", () => {
    expect(getLangFor("en")).toBeUndefined();
    expect(getLangFor(null)).toBeUndefined();
  });
});
