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

  describe("lastUsedAt", () => {
    test("should update lastUsedAt", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });
      await apiKey.updateUsedAt();
      expect(apiKey.lastUsedAt).toBeTruthy();
    });

    test("should not update lastUsedAt within 5 minutes", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });
      await apiKey.updateUsedAt();
      expect(apiKey.lastUsedAt).toBeTruthy();

      const lastUsedAt = apiKey.lastUsedAt;
      await apiKey.updateUsedAt();
      expect(apiKey.lastUsedAt).toEqual(lastUsedAt);
    });
  });
});
