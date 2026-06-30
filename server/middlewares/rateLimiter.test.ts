import type { Context } from "koa";
import env from "@server/env";
import { ApiKey } from "@server/models";
import * as jwtUtils from "@server/utils/jwt";
import RateLimiter from "@server/utils/RateLimiter";
import { defaultRateLimiter, rateLimiter } from "./rateLimiter";

describe("rateLimiter middleware", () => {
  const originalRateLimiterEnabled = env.RATE_LIMITER_ENABLED;
  const originalApiMultiplier = env.RATE_LIMITER_MULTIPLIER;

  beforeEach(() => {
    env.RATE_LIMITER_ENABLED = true;
    env.RATE_LIMITER_MULTIPLIER = 1;
    RateLimiter.rateLimiterMap.clear();
  });

  afterEach(() => {
    env.RATE_LIMITER_ENABLED = originalRateLimiterEnabled;
    env.RATE_LIMITER_MULTIPLIER = originalApiMultiplier;
    vi.restoreAllMocks();
  });

  it("should register and enforce custom rate limiter with matching paths (no mountPath)", async () => {
    const customConfig = { duration: 60, requests: 5 };

    const registerMiddleware = rateLimiter(customConfig);
    const mockCtx = {
      path: "/documents.export",
      mountPath: undefined,
      ip: "127.0.0.1",
      set: vi.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtx, vi.fn());

    const registeredPath = "/documents.export";
    expect(RateLimiter.hasRateLimiter(registeredPath)).toBe(true);

    const limiter = RateLimiter.getRateLimiter(mockCtx.path);
    expect(limiter).not.toBe(RateLimiter.defaultRateLimiter);
    expect(limiter.points).toBe(5);
  });

  it("should register and enforce custom rate limiter with matching paths (with mountPath)", async () => {
    const customConfig = { duration: 60, requests: 5 };

    const registerMiddleware = rateLimiter(customConfig);
    const mockCtxRegister = {
      path: "/documents.export",
      mountPath: "/api",
      ip: "127.0.0.1",
      set: vi.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtxRegister, vi.fn());

    const registrationPath = "/api/documents.export";
    expect(RateLimiter.hasRateLimiter(registrationPath)).toBe(true);

    const limiter = RateLimiter.getRateLimiter(registrationPath);
    expect(limiter).not.toBe(RateLimiter.defaultRateLimiter);
    expect(limiter.points).toBe(5);
  });

  it("scales the per-route limit by RATE_LIMITER_MULTIPLIER", async () => {
    env.RATE_LIMITER_MULTIPLIER = 2;

    const registerMiddleware = rateLimiter({ duration: 60, requests: 5 });
    const mockCtx = {
      path: "/documents.export",
      mountPath: undefined,
      ip: "127.0.0.1",
      set: vi.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtx, vi.fn());

    const limiter = RateLimiter.getRateLimiter("/documents.export");
    expect(limiter.points).toBe(10);
  });

  it("rounds fractional multiplier results and never drops below 1", async () => {
    env.RATE_LIMITER_MULTIPLIER = 0.1;

    const registerMiddleware = rateLimiter({ duration: 60, requests: 5 });
    const mockCtx = {
      path: "/shares.subscribe",
      mountPath: undefined,
      ip: "127.0.0.1",
      set: vi.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtx, vi.fn());

    const limiter = RateLimiter.getRateLimiter("/shares.subscribe");
    expect(limiter.points).toBe(1);
  });

  it("should use default rate limiter when no custom rate limiter is registered", async () => {
    const fullPath = "/some/random/path";
    expect(RateLimiter.hasRateLimiter(fullPath)).toBe(false);

    const limiter = RateLimiter.getRateLimiter(fullPath);
    expect(limiter).toBe(RateLimiter.defaultRateLimiter);
  });

  describe("cache-keyed rate limiting", () => {
    it("falls back to IP when no token is present", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      const cacheSpy = vi.spyOn(RateLimiter, "getCachedUserIdForToken");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: {
          get: () => undefined,
          body: {},
          query: {},
        },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(cacheSpy).not.toHaveBeenCalled();
      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("short-circuits to IP for API key tokens without hitting Redis or JWT verify", async () => {
      const apiKeyToken = `${ApiKey.prefix}${"a".repeat(38)}`;
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      const cacheReadSpy = vi.spyOn(RateLimiter, "getCachedUserIdForToken");
      const verifySpy = vi.spyOn(jwtUtils, "getUserForJWT");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: { get: () => `Bearer ${apiKeyToken}` },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(cacheReadSpy).not.toHaveBeenCalled();
      expect(verifySpy).not.toHaveBeenCalled();
      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("falls back to IP when token fails verification (forged or expired)", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockResolvedValue(null);
      const cacheWriteSpy = vi
        .spyOn(RateLimiter, "cacheUserForToken")
        .mockResolvedValue();
      vi.spyOn(jwtUtils, "getUserForJWT").mockRejectedValue(
        new Error("invalid token")
      );

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: { get: () => "Bearer forged-or-unknown-token" },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
      expect(cacheWriteSpy).not.toHaveBeenCalled();
    });

    it("verifies and caches the user on cache miss, then keys by user", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockResolvedValue(null);
      const cacheWriteSpy = vi
        .spyOn(RateLimiter, "cacheUserForToken")
        .mockResolvedValue();
      vi.spyOn(jwtUtils, "getUserForJWT").mockResolvedValue({
        user: { id: "user-abc" },
      } as never);

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: { get: () => "Bearer valid-token" },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(cacheWriteSpy).toHaveBeenCalledWith("valid-token", "user-abc");
      expect(consumeSpy).toHaveBeenCalledWith("user-abc");
    });

    it("keys on user id when token is in cache without re-verifying", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockResolvedValue(
        "user-abc"
      );
      const verifySpy = vi.spyOn(jwtUtils, "getUserForJWT");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: { get: () => "Bearer verified-token" },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(verifySpy).not.toHaveBeenCalled();
      expect(consumeSpy).toHaveBeenCalledWith("user-abc");
    });

    it("falls back to IP when the cache lookup throws", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockRejectedValue(
        new Error("redis down")
      );

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: vi.fn(),
        request: { get: () => "Bearer some-token" },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("prefixes the key with fullPath when a custom limiter is registered", async () => {
      const registerMiddleware = rateLimiter({ duration: 60, requests: 5 });
      const registerCtx = {
        path: "/documents.export",
        mountPath: "/api",
        ip: "127.0.0.1",
        set: vi.fn(),
        request: {},
      } as unknown as Context;
      await registerMiddleware(registerCtx, vi.fn());

      const customLimiter = RateLimiter.getRateLimiter("/api/documents.export");
      const consumeSpy = vi
        .spyOn(customLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockResolvedValue(
        "user-abc"
      );

      const middleware = defaultRateLimiter();
      const mockCtx = {
        path: "/documents.export",
        mountPath: "/api",
        ip: "127.0.0.1",
        set: vi.fn(),
        request: { get: () => "Bearer verified-token" },
        cookies: { get: () => undefined },
      } as unknown as Context;

      await middleware(mockCtx, vi.fn());

      expect(consumeSpy).toHaveBeenCalledWith("/api/documents.export:user-abc");
    });
  });
});
