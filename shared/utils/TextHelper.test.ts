import { TextHelper } from "./TextHelper";

describe("TextHelper", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse("2021-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
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
});
