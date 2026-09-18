import { TextHelper } from "./TextHelper";

describe("TextHelper", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2021-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe("replaceTemplateVariables", () => {
    const user = {
      name: "John Doe",
      language: "en",
    };

    it("should replace {time} with current time", async () => {
      const result = TextHelper.replaceTemplateVariables("Hello {time}", user);

      expect(result).toBe("Hello 12:00 AM");
    });

    it("should replace {date} with current date", async () => {
      const result = TextHelper.replaceTemplateVariables("Hello {date}", user);

      expect(result).toBe("Hello January 1, 2021");
    });
  });

  describe("codePointLength", () => {
    it("should count code points rather than UTF-16 units", () => {
      expect(TextHelper.codePointLength("abc")).toBe(3);
      expect(TextHelper.codePointLength("😀")).toBe(1);
      expect(TextHelper.codePointLength("a😀b")).toBe(3);
      expect(TextHelper.codePointLength("")).toBe(0);
    });
  });

  describe("truncate", () => {
    it("should not split surrogate pairs", () => {
      expect(TextHelper.truncate("😀", 1)).toBe("😀");
      expect(TextHelper.truncate("a😀b", 2)).toBe("a😀");
      expect(TextHelper.truncate("abc", 2)).toBe("ab");
    });

    it("should return the text unchanged when within the limit", () => {
      expect(TextHelper.truncate("abc", 5)).toBe("abc");
    });

    it("should return an empty string for a non-positive limit", () => {
      expect(TextHelper.truncate("abc", 0)).toBe("");
      expect(TextHelper.truncate("abc", -1)).toBe("");
    });
  });
});
