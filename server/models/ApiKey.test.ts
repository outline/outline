import randomstring from "randomstring";
import { buildApiKey } from "@server/test/factories";
import ApiKey from "./ApiKey";

describe("#ApiKey", () => {
  describe("match", () => {
    test("should match an API secret", async () => {
      const apiKey = await buildApiKey();
      expect(ApiKey.match(apiKey.value!)).toBe(true);
      expect(ApiKey.match(`${randomstring.generate(38)}`)).toBe(true);
    });

    test("should not match non secrets", async () => {
      expect(ApiKey.match("123")).toBe(false);
      expect(ApiKey.match("1234567890")).toBe(false);
    });
  });

  describe("lastActiveAt", () => {
    test("should update lastActiveAt", async () => {
      const apiKey = await buildApiKey();
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toBeTruthy();
    });

    test("should not update lastActiveAt within 5 minutes", async () => {
      const apiKey = await buildApiKey();
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toBeTruthy();

      const lastActiveAt = apiKey.lastActiveAt;
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toEqual(lastActiveAt);
    });
  });

  describe("findByToken", () => {
    test("should find by hash", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });
      const found = await ApiKey.findByToken(apiKey.value!);
      expect(found?.id).toEqual(apiKey.id);
      expect(found?.last4).toEqual(apiKey.value!.slice(-4));
    });
  });
});
