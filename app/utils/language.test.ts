import i18n from "i18next";
import Desktop from "./Desktop";
import { changeLanguage, detectLanguage } from "./language";

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

describe("changeLanguage", () => {
  const setSpellCheckerLanguages = vi.fn();
  const bridge = Desktop.bridge;

  beforeEach(() => {
    setSpellCheckerLanguages.mockClear();
    i18n.addResourceBundle("de-DE", "translation", {});
    Desktop.bridge = {
      setSpellCheckerLanguages,
    } as unknown as typeof Desktop.bridge;
  });

  afterEach(() => {
    Desktop.bridge = bridge;
  });

  it("should set the spellchecker when the language is unchanged", async () => {
    await i18n.changeLanguage("de-DE");
    await changeLanguage("de_DE", i18n);
    expect(setSpellCheckerLanguages).toHaveBeenCalledWith(["en-US", "de-DE"]);
  });

  it("should keep the current language for an unsupported language", async () => {
    await i18n.changeLanguage("de-DE");
    await changeLanguage("ar_EG", i18n);
    expect(i18n.languages).toEqual(["de-DE"]);
    expect(setSpellCheckerLanguages).not.toHaveBeenCalled();
  });
});
