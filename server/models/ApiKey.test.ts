import randomstring from "randomstring";
import { buildApiKey } from "@server/test/factories";
import ApiKey from "./ApiKey";

describe("#ApiKey", () => {
  describe("match", () => {
    it("should match an API secret", async () => {
      const apiKey = await buildApiKey();
      expect(ApiKey.match(apiKey.value!)).toBe(true);
      expect(ApiKey.match(`${randomstring.generate(38)}`)).toBe(true);
    });

    it("should not match non secrets", async () => {
      expect(ApiKey.match("123")).toBe(false);
      expect(ApiKey.match("1234567890")).toBe(false);
    });
  });

  describe("lastActiveAt", () => {
    it("should update lastActiveAt", async () => {
      const apiKey = await buildApiKey();
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toBeTruthy();
    });

    it("should not update lastActiveAt within 5 minutes", async () => {
      const apiKey = await buildApiKey();
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toBeTruthy();

      const lastActiveAt = apiKey.lastActiveAt;
      await apiKey.updateActiveAt();
      expect(apiKey.lastActiveAt).toEqual(lastActiveAt);
    });
  });

  describe("findByToken", () => {
    it("should find by hash", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });
      const found = await ApiKey.findByToken(apiKey.value!);
      expect(found?.id).toEqual(apiKey.id);
      expect(found?.last4).toEqual(apiKey.value!.slice(-4));
    });
  });

  describe("canAccess", () => {
    it("should return true for all resources if no scope", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
      });

      expect(apiKey.canAccess("documents.info")).toBe(true);
      expect(apiKey.canAccess("collections.create")).toBe(true);
      expect(apiKey.canAccess("apiKeys.list")).toBe(true);
    });

    it("should return false if no matching scope", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
        scope: ["documents.info"],
      });

      expect(apiKey.canAccess("documents.info")).toBe(true);
      expect(apiKey.canAccess("collections.create")).toBe(false);
      expect(apiKey.canAccess("apiKeys.list")).toBe(false);
    });

    it("should allow wildcard methods", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
        scope: ["documents.*"],
      });

      expect(apiKey.canAccess("documents.info")).toBe(true);
      expect(apiKey.canAccess("documents.create")).toBe(true);
      expect(apiKey.canAccess("collections.create")).toBe(false);
    });

    it("should allow wildcard namespaces", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
        scope: ["*.info"],
      });

      expect(apiKey.canAccess("documents.info")).toBe(true);
      expect(apiKey.canAccess("documents.create")).toBe(false);
      expect(apiKey.canAccess("collections.create")).toBe(false);
    });

    it("should allow multiple scopes", async () => {
      const apiKey = await buildApiKey({
        name: "Dev",
        scope: ["*.info", "collections.list"],
      });

      expect(apiKey.canAccess("shares.info")).toBe(true);
      expect(apiKey.canAccess("documents.info")).toBe(true);
      expect(apiKey.canAccess("collections.list")).toBe(true);
      expect(apiKey.canAccess("documents.create")).toBe(false);
      expect(apiKey.canAccess("collections.create")).toBe(false);
    });
  });
});
