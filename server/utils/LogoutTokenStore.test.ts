import type { Context } from "koa";
import Redis from "@server/storage/redis";
import { LogoutTokenStore } from "./LogoutTokenStore";
import { RedisPrefixHelper } from "./RedisPrefixHelper";

/**
 * Minimal Koa context stub exposing only the cookie jar and hostname the store
 * relies on.
 */
function buildContext(cookies: Record<string, string> = {}) {
  const jar = new Map(Object.entries(cookies));
  return {
    request: { hostname: "localhost" },
    cookies: {
      get: (name: string) => jar.get(name),
      set: (name: string, value: string) => {
        if (value) {
          jar.set(name, value);
        } else {
          jar.delete(name);
        }
      },
    },
  } as unknown as Context;
}

describe("LogoutTokenStore", () => {
  const store = new LogoutTokenStore("oidc");

  it("persists a token behind a session cookie and consumes it once", async () => {
    const signInCtx = buildContext();
    await store.persist(signInCtx, "the-token");

    const sessionId = signInCtx.cookies.get("oidcSession");
    expect(sessionId).toBeTruthy();
    expect(
      await Redis.defaultClient.get(
        RedisPrefixHelper.getLogoutTokenKey("oidc", sessionId!)
      )
    ).toEqual("the-token");

    const logoutCtx = buildContext({ oidcSession: sessionId! });
    expect(await store.consume(logoutCtx)).toEqual("the-token");

    // Consuming clears both the cookie and the server-side token.
    expect(logoutCtx.cookies.get("oidcSession")).toBeUndefined();
    expect(
      await Redis.defaultClient.get(
        RedisPrefixHelper.getLogoutTokenKey("oidc", sessionId!)
      )
    ).toBeNull();
  });

  it("returns null when there is no session cookie", async () => {
    expect(await store.consume(buildContext())).toBeNull();
  });

  it("namespaces the cookie and key by provider", async () => {
    const samlStore = new LogoutTokenStore("saml");
    const ctx = buildContext();
    await samlStore.persist(ctx, "saml-token");

    const sessionId = ctx.cookies.get("samlSession");
    expect(sessionId).toBeTruthy();
    expect(ctx.cookies.get("oidcSession")).toBeUndefined();
    expect(
      await Redis.defaultClient.get(
        RedisPrefixHelper.getLogoutTokenKey("saml", sessionId!)
      )
    ).toEqual("saml-token");
  });
});
