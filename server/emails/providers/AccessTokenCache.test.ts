import { AccessTokenCache } from "./AccessTokenCache";

describe("AccessTokenCache", () => {
  it("should request a token on first use", async () => {
    const request = vi.fn().mockResolvedValue({
      value: "token",
      expiresAt: Date.now() + 60_000,
    });

    const cache = new AccessTokenCache(request);

    expect(await cache.get("key")).toBe("token");
    expect(request).toHaveBeenCalledWith("key");
  });

  it("should reuse an unexpired token", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ value: "token", expiresAt: Date.now() + 60_000 });

    const cache = new AccessTokenCache(request);
    await cache.get("key");
    await cache.get("key");

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("should request a new token once the cached one expires", async () => {
    let count = 0;
    const request = vi.fn().mockImplementation(() =>
      Promise.resolve({
        value: `token-${++count}`,
        // Already expired, so it is never reused.
        expiresAt: Date.now() - 1,
      })
    );

    const cache = new AccessTokenCache(request);

    expect(await cache.get("key")).toBe("token-1");
    expect(await cache.get("key")).toBe("token-2");
  });

  it("should cache tokens separately per key", async () => {
    const request = vi.fn().mockImplementation((key: string) =>
      Promise.resolve({
        value: `token-${key}`,
        expiresAt: Date.now() + 60_000,
      })
    );

    const cache = new AccessTokenCache(request);

    expect(await cache.get("one")).toBe("token-one");
    expect(await cache.get("two")).toBe("token-two");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("should collapse concurrent requests for the same key", async () => {
    const request = vi
      .fn()
      .mockResolvedValue({ value: "token", expiresAt: Date.now() + 60_000 });

    const cache = new AccessTokenCache(request);
    const results = await Promise.all([
      cache.get("key"),
      cache.get("key"),
      cache.get("key"),
    ]);

    expect(results).toEqual(["token", "token", "token"]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("should collapse concurrent requests when the cached token has expired", async () => {
    let count = 0;
    const request = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          count += 1;
          const value = `token-${count}`;
          // The first token is already expired, so the concurrent callers
          // below all observe a stale cache entry at the same time.
          const expiresAt = count === 1 ? Date.now() - 1 : Date.now() + 60_000;
          setTimeout(() => resolve({ value, expiresAt }), 5);
        })
    );

    const cache = new AccessTokenCache(request);
    await cache.get("key");

    const results = await Promise.all([
      cache.get("key"),
      cache.get("key"),
      cache.get("key"),
    ]);

    expect(results).toEqual(["token-2", "token-2", "token-2"]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("should not cache a failed request", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValueOnce({
        value: "token",
        expiresAt: Date.now() + 60_000,
      });

    const cache = new AccessTokenCache(request);

    await expect(cache.get("key")).rejects.toThrow("nope");
    expect(await cache.get("key")).toBe("token");
    expect(request).toHaveBeenCalledTimes(2);
  });
});
