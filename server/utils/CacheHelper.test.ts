import Redis from "@server/storage/redis";
import { CacheHelper } from "./CacheHelper";

describe("CacheHelper", () => {
  beforeEach(async () => {
    await Redis.defaultClient.flushdb();
  });

  describe("setData and getData", () => {
    it("should round-trip a value", async () => {
      await CacheHelper.setData("test:key", { foo: "bar" }, 60);
      const result = await CacheHelper.getData<{ foo: string }>("test:key");
      expect(result).toEqual({ foo: "bar" });
    });

    it("should return undefined for a missing key", async () => {
      const result = await CacheHelper.getData("test:missing");
      expect(result).toBeUndefined();
    });
  });

  describe("getDataOrSet", () => {
    it("should coalesce concurrent same-key misses into one callback", async () => {
      let calls = 0;
      const callback = async () => {
        calls++;
        return "value";
      };

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          CacheHelper.getDataOrSet("test:dedupe", callback, 60)
        )
      );

      expect(calls).toEqual(1);
      expect(results).toEqual(Array.from({ length: 10 }, () => "value"));
      expect(await CacheHelper.getData("test:dedupe")).toEqual("value");
    });

    it("should return a cached falsy value without invoking the callback", async () => {
      await CacheHelper.setData("test:falsy", null, 60);

      let calls = 0;
      const callback = async () => {
        calls++;
        return ["value"];
      };

      expect(
        await CacheHelper.getDataOrSet("test:falsy", callback, 60)
      ).toBeNull();
      expect(calls).toEqual(0);
    });

    it("should cache a falsy callback result and not re-invoke on the next miss", async () => {
      let calls = 0;
      const callback = async () => {
        calls++;
        return null;
      };

      expect(
        await CacheHelper.getDataOrSet<string[] | null>(
          "test:null",
          callback,
          60
        )
      ).toBeNull();
      expect(await CacheHelper.getData("test:null")).toBeNull();

      expect(
        await CacheHelper.getDataOrSet<string[] | null>(
          "test:null",
          callback,
          60
        )
      ).toBeNull();
      expect(calls).toEqual(1);
    });

    it("should not cache an undefined callback result", async () => {
      let calls = 0;
      const callback = async () => {
        calls++;
        return undefined;
      };

      expect(
        await CacheHelper.getDataOrSet("test:undef", callback, 60)
      ).toBeUndefined();
      expect(
        await CacheHelper.getDataOrSet("test:undef", callback, 60)
      ).toBeUndefined();
      expect(calls).toEqual(2);
    });

    it("should call the callback again after the in-flight promise settles", async () => {
      let calls = 0;
      const callback = async () => {
        calls++;
        return calls === 1 ? undefined : "value";
      };

      expect(
        await CacheHelper.getDataOrSet("test:retry", callback, 60)
      ).toBeUndefined();
      expect(
        await CacheHelper.getDataOrSet("test:retry", callback, 60)
      ).toEqual("value");
      expect(calls).toEqual(2);
    });
  });

  describe("removeData", () => {
    it("should remove a single key", async () => {
      await CacheHelper.setData("test:key", "value", 60);
      await CacheHelper.removeData("test:key");
      const result = await CacheHelper.getData("test:key");
      expect(result).toBeUndefined();
    });
  });

  describe("clearData", () => {
    it("should remove all keys matching the prefix", async () => {
      await CacheHelper.setData("unfurl:team-1:https://a.com", "a", 60);
      await CacheHelper.setData("unfurl:team-1:https://b.com", "b", 60);
      await CacheHelper.setData("unfurl:team-2:https://c.com", "c", 60);

      await CacheHelper.clearData("unfurl:team-1");

      expect(
        await CacheHelper.getData("unfurl:team-1:https://a.com")
      ).toBeUndefined();
      expect(
        await CacheHelper.getData("unfurl:team-1:https://b.com")
      ).toBeUndefined();
      expect(await CacheHelper.getData("unfurl:team-2:https://c.com")).toEqual(
        "c"
      );
    });

    it("should resolve when no keys match the prefix", async () => {
      await expect(CacheHelper.clearData("test:nothing")).resolves.toBe(
        undefined
      );
    });

    it("should remove more keys than a single scan page", async () => {
      const count = 2500;
      const pipeline = Redis.defaultClient.pipeline();
      for (let i = 0; i < count; i++) {
        pipeline.set(`test:bulk:${i}`, "value");
      }
      await pipeline.exec();

      await CacheHelper.clearData("test:bulk:");

      const remaining = await Redis.defaultClient.keys("test:bulk:*");
      expect(remaining.length).toEqual(0);
    });
  });
});
