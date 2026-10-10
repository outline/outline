import { randomUUID } from "node:crypto";
import Redis from "./redis";

describe("RedisAdapter#zaddWithSequence", () => {
  let key: string;

  beforeEach(() => {
    key = `test:sequence:${randomUUID()}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Redis.defaultClient.del(key);
  });

  it("orders concurrent additions and moves repeated members to the end", async () => {
    const sequence = 2 ** 52;
    await Redis.defaultClient.zadd(key, sequence, "previous");

    const scores = await Promise.all([
      Redis.defaultClient.zaddWithSequence(key, "a", 60),
      Redis.defaultClient.zaddWithSequence(key, "b", 60),
      Redis.defaultClient.zaddWithSequence(key, "a", 60),
    ]);

    expect(scores).toEqual([sequence + 1, sequence + 2, sequence + 3]);
    expect(await Redis.defaultClient.zrange(key, 0, -1)).toEqual([
      "previous",
      "b",
      "a",
    ]);
    expect(await Redis.defaultClient.zscore(key, "a")).toBe(
      String(sequence + 3)
    );
  });

  it("creates the set and refreshes its expiry on subsequent edits", async () => {
    const first = await Redis.defaultClient.zaddWithSequence(key, "a", 60);
    await Redis.defaultClient.expire(key, 1);
    const second = await Redis.defaultClient.zaddWithSequence(key, "b", 60);

    expect(second).toBeGreaterThan(first);
    expect(await Redis.defaultClient.ttl(key)).toBeGreaterThan(1);
    expect(await Redis.defaultClient.ttl(key)).toBeLessThanOrEqual(60);
  });

  it("reads the latest member and its sequence", async () => {
    expect(await Redis.defaultClient.zlatestWithSequence(key)).toBeUndefined();

    await Redis.defaultClient.zaddWithSequence(key, "a", 60);
    const sequence = await Redis.defaultClient.zaddWithSequence(key, "b", 60);

    expect(await Redis.defaultClient.zlatestWithSequence(key)).toEqual({
      member: "b",
      sequence,
    });
  });

  it("propagates Redis failures to the caller", async () => {
    vi.spyOn(Redis.defaultClient, "eval").mockRejectedValueOnce(
      new Error("Redis unavailable")
    );

    await expect(
      Redis.defaultClient.zaddWithSequence(key, "a", 60)
    ).rejects.toThrow("Redis unavailable");
  });
});
