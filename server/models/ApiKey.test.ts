import randomstring from "randomstring";
import { buildApiKey } from "@server/test/factories";
import ApiKey from "./ApiKey";

describe("#ApiKey", () => {
  describe("match", () => {
    test("should match an API secret", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });
      expect(ApiKey.match(apiKey?.secret)).toBe(true);
      expect(ApiKey.match(`${randomstring.generate(38)}`)).toBe(true);
    });

    test("should not match non secrets", async () => {
      expect(ApiKey.match("123")).toBe(false);
      expect(ApiKey.match("1234567890")).toBe(false);
    });
  });
});
