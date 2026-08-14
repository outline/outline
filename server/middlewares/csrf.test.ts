import { CSRF } from "@shared/constants";
import { errToString } from "@shared/utils/error";
import env from "@server/env";
import type { AppContext } from "@server/types";
import { bundleToken, generateRawToken } from "@server/utils/csrf";
import { attachCSRFToken, verifyCSRFToken } from "./csrf";

/** Builds a valid token, as `attachCSRFToken` would mint it. */
const buildToken = () => bundleToken(generateRawToken(16), env.SECRET_KEY);

/** A minimal context with the surface the CSRF middlewares touch. */
const buildContext = ({
  method = "POST",
  secure = true,
  originalUrl = "/api/documents.update",
  path = "/documents.update",
  cookies = {},
  headers = {},
  body = {},
}: {
  method?: string;
  secure?: boolean;
  originalUrl?: string;
  path?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
  body?: Record<string, string>;
} = {}) => {
  const setCookies: Record<
    string,
    { value: string; options: Record<string, unknown> }
  > = {};

  const ctx = {
    method,
    originalUrl,
    path,
    request: {
      secure,
      body,
      get: () => "",
      query: {},
    },
    cookies: {
      get: (name: string) => cookies[name],
      set: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies[name] = { value, options };
      },
    },
    get: (name: string) => headers[name.toLowerCase()] ?? "",
  } as unknown as AppContext;

  return { ctx, setCookies };
};

describe("attachCSRFToken", () => {
  it("should set the host-bound cookie on a secure request", async () => {
    const { ctx, setCookies } = buildContext({ method: "GET", secure: true });
    await attachCSRFToken()(ctx, vi.fn());

    expect(setCookies[CSRF.secureCookieName]).toBeDefined();
    expect(setCookies[CSRF.cookieName]).toBeUndefined();
    expect(setCookies[CSRF.secureCookieName].options.secure).toBe(true);
    expect(setCookies[CSRF.secureCookieName].options.httpOnly).toBe(false);
  });

  it("should set the plain cookie on an insecure request", async () => {
    const { ctx, setCookies } = buildContext({ method: "GET", secure: false });
    await attachCSRFToken()(ctx, vi.fn());

    expect(setCookies[CSRF.cookieName]).toBeDefined();
    expect(setCookies[CSRF.secureCookieName]).toBeUndefined();
    expect(setCookies[CSRF.cookieName].options.secure).toBe(false);
  });

  it("should not set a cookie for a mutating request", async () => {
    const { ctx, setCookies } = buildContext({ method: "POST" });
    await attachCSRFToken()(ctx, vi.fn());

    expect(Object.keys(setCookies)).toHaveLength(0);
  });
});

describe("verifyCSRFToken", () => {
  const cookieAuth = { accessToken: "session-token" };

  it("should pass when the host-bound cookie matches the header", async () => {
    const token = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: { ...cookieAuth, [CSRF.secureCookieName]: token },
      headers: { [CSRF.headerName]: token },
    });

    await verifyCSRFToken()(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should pass when the token is submitted as a form field", async () => {
    const token = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: { ...cookieAuth, [CSRF.secureCookieName]: token },
      body: { [CSRF.fieldName]: token },
    });

    await verifyCSRFToken()(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should not accept the plain cookie on a secure request", async () => {
    const token = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      secure: true,
      cookies: { ...cookieAuth, [CSRF.cookieName]: token },
      headers: { [CSRF.headerName]: token },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should ignore a plain cookie planted alongside the host-bound cookie", async () => {
    const victimToken = buildToken();
    const attackerToken = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      secure: true,
      cookies: {
        ...cookieAuth,
        [CSRF.secureCookieName]: victimToken,
        [CSRF.cookieName]: attackerToken,
      },
      headers: { [CSRF.headerName]: attackerToken },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should accept the plain cookie on an insecure request", async () => {
    const token = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      secure: false,
      cookies: { ...cookieAuth, [CSRF.cookieName]: token },
      headers: { [CSRF.headerName]: token },
    });

    await verifyCSRFToken()(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should reject when the cookie is missing", async () => {
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: cookieAuth,
      headers: { [CSRF.headerName]: buildToken() },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject when the token is missing from the request", async () => {
    const token = buildToken();
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: { ...cookieAuth, [CSRF.secureCookieName]: token },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject a token that is not signed by this instance", async () => {
    const token = bundleToken(generateRawToken(16), "another-secret-key");
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: { ...cookieAuth, [CSRF.secureCookieName]: token },
      headers: { [CSRF.headerName]: token },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should reject when two valid but different tokens are submitted", async () => {
    const next = vi.fn();
    const { ctx } = buildContext({
      cookies: { ...cookieAuth, [CSRF.secureCookieName]: buildToken() },
      headers: { [CSRF.headerName]: buildToken() },
    });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });

  it("should skip verification for safe methods", async () => {
    const next = vi.fn();
    const { ctx } = buildContext({ method: "GET", cookies: cookieAuth });

    await verifyCSRFToken()(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should skip verification when auth is not cookie based", async () => {
    const next = vi.fn();
    const { ctx } = buildContext();
    ctx.request.get = () => "Bearer api-key";

    await verifyCSRFToken()(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it("should surface a CSRF error rather than an authentication error", async () => {
    const next = vi.fn();
    const { ctx } = buildContext({ cookies: cookieAuth });

    await expect(verifyCSRFToken()(ctx, next)).rejects.toSatisfy(
      (error: unknown) => errToString(error).includes("CSRF")
    );
  });
});
