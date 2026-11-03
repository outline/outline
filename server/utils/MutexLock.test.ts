import { sleep } from "@shared/utils/timers";
import Redis from "@server/storage/redis";
import type * as MutexLockModule from "./MutexLock";

const { MutexLock } =
  await vi.importActual<typeof MutexLockModule>("./MutexLock");

const noRetry = { retry: { retryCount: 0 } };

/**
 * Make the next SET apply in Redis and then reject, as when the reply is lost.
 */
function rejectAfterSet() {
  const client = Redis.defaultClient;
  const set = client.set.bind(client);
  return vi
    .spyOn(client, "set")
    .mockImplementationOnce(async (...args: Parameters<typeof set>) => {
      await set(...args);
      throw new Error("Connection lost");
    });
}

/**
 * Make the next SET apply in Redis and then reply after a delay.
 *
 * @param ms The delay in milliseconds.
 */
function delaySetReply(ms: number) {
  const client = Redis.defaultClient;
  const set = client.set.bind(client);
  return vi
    .spyOn(client, "set")
    .mockImplementationOnce(async (...args: Parameters<typeof set>) => {
      const result = await set(...args);
      await sleep(ms);
      return result;
    });
}

describe("MutexLock", () => {
  beforeEach(async () => {
    await Redis.defaultClient.flushdb();
  });

  describe("acquire", () => {
    it("should set the key with an expiry", async () => {
      const lock = await MutexLock.acquire("test:lock", 1000);

      expect(await Redis.defaultClient.get("test:lock")).toEqual(lock.value);
      expect(await Redis.defaultClient.pttl("test:lock")).toBeGreaterThan(0);
      expect(lock.expiration).toBeGreaterThan(Date.now());
    });

    it("should throw when the lock is held elsewhere", async () => {
      await MutexLock.acquire("test:lock", 1000);

      await expect(
        MutexLock.acquire("test:lock", 1000, noRetry)
      ).rejects.toThrow();
    });

    it("should retry until the lock is released", async () => {
      const first = await MutexLock.acquire("test:lock", 1000);
      setTimeout(() => void MutexLock.release(first), 50);

      const second = await MutexLock.acquire("test:lock", 1000, {
        retry: { retryCount: 10, retryDelay: 20, retryJitter: 0 },
      });

      expect(await Redis.defaultClient.get("test:lock")).toEqual(second.value);
    });

    it("should retry after a Redis error", async () => {
      const spy = vi
        .spyOn(Redis.defaultClient, "set")
        .mockRejectedValueOnce(new Error("READONLY"));

      const lock = await MutexLock.acquire("test:lock", 1000, {
        retry: { retryCount: 1, retryDelay: 10, retryJitter: 0 },
      });
      spy.mockRestore();

      expect(await Redis.defaultClient.get("test:lock")).toEqual(lock.value);
    });

    it("should throw the Redis error when all attempts fail", async () => {
      const spy = vi
        .spyOn(Redis.defaultClient, "set")
        .mockRejectedValue(new Error("READONLY"));

      await expect(
        MutexLock.acquire("test:lock", 1000, {
          retry: { retryCount: 1, retryDelay: 10, retryJitter: 0 },
        })
      ).rejects.toThrow("READONLY");
      spy.mockRestore();
    });

    it("should recover its own lock after a SET reply is lost", async () => {
      const spy = rejectAfterSet();

      const lock = await MutexLock.acquire("test:lock", 1000, {
        retry: { retryCount: 1, retryDelay: 10, retryJitter: 0 },
      });
      spy.mockRestore();

      expect(await Redis.defaultClient.get("test:lock")).toEqual(lock.value);
    });

    it("should discard its own lock when giving up after a lost reply", async () => {
      const spy = rejectAfterSet();

      await expect(
        MutexLock.acquire("test:lock", 1000, noRetry)
      ).rejects.toThrow("Connection lost");
      spy.mockRestore();

      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });

    it("should not return a lock that expired before the reply", async () => {
      const spy = delaySetReply(150);

      await expect(
        MutexLock.acquire("test:lock", 100, noRetry)
      ).rejects.toThrow();
      spy.mockRestore();
    });
  });

  describe("release", () => {
    it("should delete the key", async () => {
      const lock = await MutexLock.acquire("test:lock", 1000);

      expect(await MutexLock.release(lock)).toEqual(true);
      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });

    it("should not delete a lock owned by another holder", async () => {
      const lock = await MutexLock.acquire("test:lock", 1000);
      await Redis.defaultClient.set("test:lock", "other");

      expect(await MutexLock.release(lock)).toEqual(false);
      expect(await Redis.defaultClient.get("test:lock")).toEqual("other");
    });
  });

  describe("using", () => {
    it("should hold the lock while the routine runs", async () => {
      const result = await MutexLock.using("test:lock", 1000, async () => {
        await expect(
          MutexLock.acquire("test:lock", 1000, noRetry)
        ).rejects.toThrow();
        return "done";
      });

      expect(result).toEqual("done");
      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });

    it("should release the lock when the routine throws", async () => {
      await expect(
        MutexLock.using("test:lock", 1000, async () => {
          throw new Error("failed");
        })
      ).rejects.toThrow("failed");

      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });

    it("should extend the lock past its initial duration", async () => {
      await MutexLock.using("test:lock", 200, async (signal) => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(signal.aborted).toEqual(false);
        expect(await Redis.defaultClient.get("test:lock")).not.toBeNull();
      });
    });

    it("should extend the lock in time when acquisition is slow", async () => {
      const spy = delaySetReply(600);

      await MutexLock.using("test:lock", 1000, async () => {
        spy.mockRestore();
        await sleep(500);

        await expect(
          MutexLock.acquire("test:lock", 1000, noRetry)
        ).rejects.toThrow();
      });
    });

    it("should abort the signal when an extension stays pending past expiry", async () => {
      const client = Redis.defaultClient;

      await MutexLock.using("test:lock", 200, async (signal) => {
        const spy = vi.spyOn(client, "eval").mockImplementation(async () => {
          await sleep(300);
          return 1;
        });
        await sleep(250);
        spy.mockRestore();

        expect(signal.aborted).toEqual(true);
        expect(() => signal.throwIfAborted()).toThrow("expired");
      });
    });

    it("should abort the signal when the lock is lost", async () => {
      await MutexLock.using("test:lock", 200, async (signal) => {
        await Redis.defaultClient.set("test:lock", "other");
        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(signal.aborted).toEqual(true);
        expect(() => signal.throwIfAborted()).toThrow("was lost");
      });

      expect(await Redis.defaultClient.get("test:lock")).toEqual("other");
    });
  });

  describe("tryUsing", () => {
    it("should run the routine when the lock is free", async () => {
      const result = await MutexLock.tryUsing(
        "test:lock",
        1000,
        async () => "done"
      );

      expect(result).toEqual("done");
      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });

    it("should skip the routine when the lock is held elsewhere", async () => {
      await MutexLock.acquire("test:lock", 1000);
      const routine = vi.fn();

      const result = await MutexLock.tryUsing("test:lock", 1000, routine);

      expect(result).toBeUndefined();
      expect(routine).not.toHaveBeenCalled();
    });

    it("should skip the routine when the reply arrives after expiry", async () => {
      const spy = delaySetReply(150);
      const routine = vi.fn();

      const result = await MutexLock.tryUsing("test:lock", 100, routine);
      spy.mockRestore();

      expect(result).toBeUndefined();
      expect(routine).not.toHaveBeenCalled();
    });

    it("should discard its own lock when the SET reply is lost", async () => {
      const spy = rejectAfterSet();
      const routine = vi.fn();

      await expect(
        MutexLock.tryUsing("test:lock", 1000, routine)
      ).rejects.toThrow("Connection lost");
      spy.mockRestore();

      expect(routine).not.toHaveBeenCalled();
      expect(await Redis.defaultClient.get("test:lock")).toBeNull();
    });
  });
});
