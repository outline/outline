import { detectLanguage } from "./language";

describe("detectLanguage", () => {
  const mockLanguage = (language: string) =>
    vi.spyOn(navigator, "language", "get").mockReturnValue(language);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should convert a language with a region to CLDR format", () => {
    mockLanguage("en-GB");
    expect(detectLanguage()).toBe("en_GB");
  });

  it("should resolve a language without a region to its likely region", () => {
    mockLanguage("ja");
    expect(detectLanguage()).toBe("ja_JP");

    mockLanguage("ko");
    expect(detectLanguage()).toBe("ko_KR");

    mockLanguage("en");
    expect(detectLanguage()).toBe("en_US");
  });

  it("should ignore a script subtag", () => {
    mockLanguage("zh-Hant-TW");
    expect(detectLanguage()).toBe("zh_TW");

    mockLanguage("zh-Hant");
    expect(detectLanguage()).toBe("zh_TW");
  });
});
