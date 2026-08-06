import type { Context } from "koa";
import { RateLimiterRes } from "rate-limiter-flexible";
import env from "@server/env";
import { ApiKey } from "@server/models";
import * as jwtUtils from "@server/utils/jwt";
import RateLimiter from "@server/utils/RateLimiter";
import { defaultRateLimiter, rateLimiter } from "./rateLimiter";

interface MockContextOptions {
  path?: string;
  mountPath?: string;
  ip?: string;
  /** When set, presented as a bearer token in the authorization header. */
  token?: string;
}

const createContext = ({
  path = "/some/path",
  mountPath,
  ip = "192.168.1.1",
  token,
}: MockContextOptions = {}) =>
  ({
    path,
    mountPath,
    ip,
    set: vi.fn(),
    request: {
      get: () => (token ? `Bearer ${token}` : undefined),
      body: {},
      query: {},
    },
    cookies: { get: () => undefined },
  }) as unknown as Context;

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
    const mockCtx = createContext({
      path: "/documents.export",
      ip: "127.0.0.1",
    });

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
    const mockCtxRegister = createContext({
      path: "/documents.export",
      mountPath: "/api",
      ip: "127.0.0.1",
    });

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
    const mockCtx = createContext({
      path: "/documents.export",
      ip: "127.0.0.1",
    });

    await registerMiddleware(mockCtx, vi.fn());

    const limiter = RateLimiter.getRateLimiter("/documents.export");
    expect(limiter.points).toBe(10);
  });

  it("rounds fractional multiplier results and never drops below 1", async () => {
    env.RATE_LIMITER_MULTIPLIER = 0.1;

    const registerMiddleware = rateLimiter({ duration: 60, requests: 5 });
    const mockCtx = createContext({
      path: "/shares.subscribe",
      ip: "127.0.0.1",
    });

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

      await middleware(createContext(), vi.fn());

      expect(cacheSpy).not.toHaveBeenCalled();
      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("keys API key tokens by credential and address, without Redis or JWT verify", async () => {
      const apiKeyToken = `${ApiKey.prefix}${"a".repeat(38)}`;
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);
      const cacheReadSpy = vi.spyOn(RateLimiter, "getCachedUserIdForToken");
      const verifySpy = vi.spyOn(jwtUtils, "getUserForJWT");

      await middleware(createContext({ token: apiKeyToken }), vi.fn());

      expect(cacheReadSpy).not.toHaveBeenCalled();
      expect(verifySpy).not.toHaveBeenCalled();
      expect(consumeSpy).toHaveBeenCalledWith(
        RateLimiter.identifierForCredential(apiKeyToken)
      );
      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("shares one credential bucket across many addresses", async () => {
      const apiKeyToken = `${ApiKey.prefix}${"b".repeat(38)}`;
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);

      await middleware(
        createContext({ ip: "34.96.44.38", token: apiKeyToken }),
        vi.fn()
      );
      await middleware(
        createContext({ ip: "136.124.35.177", token: apiKeyToken }),
        vi.fn()
      );

      const identifier = RateLimiter.identifierForCredential(apiKeyToken);
      const consumed = consumeSpy.mock.calls.map(([key]) => key);
      expect(consumed.filter((key) => key === identifier)).toHaveLength(2);
    });

    it("gives distinct credentials distinct buckets", async () => {
      const first = `${ApiKey.prefix}${"c".repeat(38)}`;
      const second = `${ApiKey.prefix}${"d".repeat(38)}`;

      expect(RateLimiter.identifierForCredential(first)).not.toBe(
        RateLimiter.identifierForCredential(second)
      );
    });

    it("does not expose the credential in the identifier", () => {
      const apiKeyToken = `${ApiKey.prefix}${"e".repeat(38)}`;
      expect(RateLimiter.identifierForCredential(apiKeyToken)).not.toContain(
        apiKeyToken
      );
    });

    it("still consumes the address bucket for an unverifiable credential", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = vi
        .spyOn(RateLimiter.defaultRateLimiter, "consume")
        .mockResolvedValue({} as never);

      // Forged tokens that look like API keys but do not exist. Keying solely
      // on the credential would hand out a fresh bucket per request.
      await middleware(createContext({ token: "f".repeat(38) }), vi.fn());
      await middleware(createContext({ token: "g".repeat(38) }), vi.fn());

      const consumed = consumeSpy.mock.calls.map(([key]) => key);
      expect(consumed.filter((key) => key === "192.168.1.1")).toHaveLength(2);
    });

    it("rejects when a forged credential exhausts the address bucket", async () => {
      const registerMiddleware = rateLimiter({ duration: 3600, requests: 10 });
      await registerMiddleware(
        createContext({ path: "/auth/email", ip: "127.0.0.1" }),
        vi.fn()
      );

      const customLimiter = RateLimiter.getRateLimiter("/auth/email");
      const consumeSpy = vi
        .spyOn(customLimiter, "consume")
        .mockImplementation((key) =>
          key === "/auth/email:192.168.1.1"
            ? Promise.reject(new RateLimiterRes(0, 1000, 0))
            : Promise.resolve({} as never)
        );

      const middleware = defaultRateLimiter();
      const next = vi.fn();
      const mockCtx = createContext({
        path: "/auth/email",
        token: "h".repeat(38),
      });

      await expect(middleware(mockCtx, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();

      // The exhausted address bucket must prevent the forged credential from
      // allocating a credential bucket.
      expect(consumeSpy).not.toHaveBeenCalledWith(
        `/auth/email:${RateLimiter.identifierForCredential("h".repeat(38))}`
      );
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

      await middleware(
        createContext({ token: "forged-or-unknown-token" }),
        vi.fn()
      );

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

      await middleware(createContext({ token: "valid-token" }), vi.fn());

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

      await middleware(createContext({ token: "verified-token" }), vi.fn());

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

      await middleware(createContext({ token: "some-token" }), vi.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
    });

    it("prefixes the key with fullPath when a custom limiter is registered", async () => {
      const registerMiddleware = rateLimiter({ duration: 60, requests: 5 });
      await registerMiddleware(
        createContext({
          path: "/documents.export",
          mountPath: "/api",
          ip: "127.0.0.1",
        }),
        vi.fn()
      );

      const customLimiter = RateLimiter.getRateLimiter("/api/documents.export");
      const consumeSpy = vi
        .spyOn(customLimiter, "consume")
        .mockResolvedValue({} as never);
      vi.spyOn(RateLimiter, "getCachedUserIdForToken").mockResolvedValue(
        "user-abc"
      );

      const middleware = defaultRateLimiter();
      await middleware(
        createContext({
          path: "/documents.export",
          mountPath: "/api",
          ip: "127.0.0.1",
          token: "verified-token",
        }),
        vi.fn()
      );

      expect(consumeSpy).toHaveBeenCalledWith("/api/documents.export:user-abc");
    });
  });
});
