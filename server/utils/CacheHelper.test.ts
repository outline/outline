import type { Lock } from "redlock";
import Redis from "@server/storage/redis";
import { CacheHelper } from "./CacheHelper";
import { MutexLock } from "./MutexLock";

interface FakeLock {
  done: () => void;
}

/**
 * MutexLock is automocked globally and Redlock cannot run against the mocked
 * Redis, so back the mock with a real in-process mutex keyed by resource name.
 * The lock coordination between getDataOrSet and removeDataWithLock is part of
 * the behavior under test.
 */
function useInProcessMutex() {
  const chains = new Map<string, Promise<void>>();

  vi.mocked(MutexLock.acquire).mockImplementation(async (resource: string) => {
    const prev = chains.get(resource) ?? Promise.resolve();
    let done!: () => void;
    const current = new Promise<void>((resolve) => {
      done = resolve;
    });
    chains.set(
      resource,
      prev.then(() => current)
    );
    await prev;
    return { done } as unknown as Lock;
  });

  vi.mocked(MutexLock.release).mockImplementation((lock: Lock) => {
    (lock as unknown as FakeLock).done();
    return false;
  });
}

describe("CacheHelper", () => {
  beforeEach(async () => {
    useInProcessMutex();
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

  describe("removeData", () => {
    it("should remove a single key", async () => {
      await CacheHelper.setData("test:key", "value", 60);
      await CacheHelper.removeData("test:key");
      const result = await CacheHelper.getData("test:key");
      expect(result).toBeUndefined();
    });
  });

  describe("removeDataWithLock", () => {
    it("should remove a single key", async () => {
      await CacheHelper.setData("test:key", "value", 60);
      await CacheHelper.removeDataWithLock("test:key");
      const result = await CacheHelper.getData("test:key");
      expect(result).toBeUndefined();
    });

    it("should not allow an in-flight cache fill to survive the invalidation", async () => {
      const key = "test:race";
      let resolveCallback: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        resolveCallback = resolve;
      });

      // Start a cache fill whose data source was read before the invalidating
      // change committed, and hold it open at the point between the read and
      // the cache write.
      const fill = CacheHelper.getDataOrSet<string[]>(
        key,
        async () => {
          await gate;
          return ["stale"];
        },
        60
      );

      // Give the fill time to acquire the lock.
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Invalidate while the fill is in-flight, then let the fill complete.
      const removal = CacheHelper.removeDataWithLock(key);
      await new Promise((resolve) => setTimeout(resolve, 100));
      resolveCallback?.();

      await Promise.all([fill, removal]);

      // The stale value written by the fill must not outlive the removal.
      expect(await CacheHelper.getData(key)).toBeUndefined();
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
