import JWT from "jsonwebtoken";
import type { Context } from "koa";
import env from "@server/env";
import { ApiKey } from "@server/models";
import RateLimiter from "@server/utils/RateLimiter";
import { defaultRateLimiter, rateLimiter } from "./rateLimiter";

describe("rateLimiter middleware", () => {
  const originalRateLimiterEnabled = env.RATE_LIMITER_ENABLED;

  beforeEach(() => {
    // Enable rate limiter for tests
    env.RATE_LIMITER_ENABLED = true;
    // Clear the rate limiter map before each test
    RateLimiter.rateLimiterMap.clear();
  });

  afterEach(() => {
    // Restore original value
    env.RATE_LIMITER_ENABLED = originalRateLimiterEnabled;
  });

  it("should register and enforce custom rate limiter with matching paths (no mountPath)", async () => {
    const customConfig = { duration: 60, requests: 5 };

    // Simulate the rateLimiter middleware registration
    const registerMiddleware = rateLimiter(customConfig);
    const mockCtx = {
      path: "/documents.export",
      mountPath: undefined, // No mount path
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtx, jest.fn());

    // Check if the rate limiter was registered
    const registeredPath = "/documents.export";
    expect(RateLimiter.hasRateLimiter(registeredPath)).toBe(true);

    // Simulate the defaultRateLimiter middleware lookup
    const limiter = RateLimiter.getRateLimiter(mockCtx.path);

    // Verify that the custom rate limiter is found
    expect(limiter).not.toBe(RateLimiter.defaultRateLimiter);
    expect(limiter.points).toBe(5);
  });

  it("should register and enforce custom rate limiter with matching paths (with mountPath)", async () => {
    const customConfig = { duration: 60, requests: 5 };

    // Simulate the rateLimiter middleware registration with mountPath
    const registerMiddleware = rateLimiter(customConfig);
    const mockCtxRegister = {
      path: "/documents.export",
      mountPath: "/api", // This is set when router is mounted
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtxRegister, jest.fn());

    // The rateLimiter middleware constructs fullPath = mountPath + path
    const registrationPath = "/api/documents.export";
    expect(RateLimiter.hasRateLimiter(registrationPath)).toBe(true);

    // Now check what defaultRateLimiter will use (after fix, should use fullPath)
    const mockCtxEnforce = {
      path: "/documents.export",
      mountPath: "/api",
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    // Construct fullPath the same way as the fixed defaultRateLimiter should
    const fullPath = `${mockCtxEnforce.mountPath ?? ""}${mockCtxEnforce.path}`;
    expect(fullPath).toBe("/api/documents.export");

    // After the fix, hasRateLimiter should find the custom rate limiter
    expect(RateLimiter.hasRateLimiter(fullPath)).toBe(true);

    // And the custom rate limiter should be used
    const limiter = RateLimiter.getRateLimiter(fullPath);
    expect(limiter).not.toBe(RateLimiter.defaultRateLimiter);
    expect(limiter.points).toBe(5);
  });

  it("should use default rate limiter when no custom rate limiter is registered", async () => {
    const mockCtx = {
      path: "/some/random/path",
      mountPath: undefined,
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    const fullPath = `${mockCtx.mountPath ?? ""}${mockCtx.path}`;

    // No custom rate limiter registered
    expect(RateLimiter.hasRateLimiter(fullPath)).toBe(false);

    // Should use default rate limiter
    const limiter = RateLimiter.getRateLimiter(fullPath);
    expect(limiter).toBe(RateLimiter.defaultRateLimiter);
  });

  it("should construct correct consume key with fullPath when custom rate limiter exists", async () => {
    const customConfig = { duration: 60, requests: 5 };

    // Register with mountPath
    const registerMiddleware = rateLimiter(customConfig);
    const mockCtxRegister = {
      path: "/documents.export",
      mountPath: "/api",
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    await registerMiddleware(mockCtxRegister, jest.fn());

    // Check what key defaultRateLimiter will use (after fix)
    const mockCtxEnforce = {
      path: "/documents.export",
      mountPath: "/api",
      ip: "127.0.0.1",
      set: jest.fn(),
      request: {},
    } as unknown as Context;

    const fullPath = `${mockCtxEnforce.mountPath ?? ""}${mockCtxEnforce.path}`;

    // After fix, the key should include the full path
    const key = RateLimiter.hasRateLimiter(fullPath)
      ? `${fullPath}:${mockCtxEnforce.ip}`
      : `${mockCtxEnforce.ip}`;

    // Expected key format: "/api/documents.export:127.0.0.1"
    expect(key).toBe("/api/documents.export:127.0.0.1");
  });

  describe("user-based rate limiting", () => {
    it("should use user ID from JWT when authenticated", async () => {
      const userId = "test-user-id-123";
      const token = JWT.sign({ id: userId, type: "session" }, "secret");

      const middleware = defaultRateLimiter();
      const consumeSpy = jest.spyOn(RateLimiter.defaultRateLimiter, "consume");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: jest.fn(),
        request: {
          get: () => `Bearer ${token}`,
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as Context;

      await middleware(mockCtx, jest.fn());

      expect(consumeSpy).toHaveBeenCalledWith(`user:${userId}`);
      consumeSpy.mockRestore();
    });

    it("should fall back to IP when no token is provided", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = jest.spyOn(RateLimiter.defaultRateLimiter, "consume");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: jest.fn(),
        request: {
          get: () => undefined,
          body: {},
          query: {},
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as Context;

      await middleware(mockCtx, jest.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
      consumeSpy.mockRestore();
    });

    it("should fall back to IP for API key tokens", async () => {
      const apiKeyToken = `${ApiKey.prefix}${"a".repeat(38)}`;

      const middleware = defaultRateLimiter();
      const consumeSpy = jest.spyOn(RateLimiter.defaultRateLimiter, "consume");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: jest.fn(),
        request: {
          get: () => `Bearer ${apiKeyToken}`,
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as Context;

      await middleware(mockCtx, jest.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
      consumeSpy.mockRestore();
    });

    it("should fall back to IP when JWT is malformed", async () => {
      const middleware = defaultRateLimiter();
      const consumeSpy = jest.spyOn(RateLimiter.defaultRateLimiter, "consume");

      const mockCtx = {
        path: "/some/path",
        mountPath: undefined,
        ip: "192.168.1.1",
        set: jest.fn(),
        request: {
          get: () => "Bearer invalid-token",
        },
        cookies: {
          get: () => undefined,
        },
      } as unknown as Context;

      await middleware(mockCtx, jest.fn());

      expect(consumeSpy).toHaveBeenCalledWith("192.168.1.1");
      consumeSpy.mockRestore();
    });
  });
});
