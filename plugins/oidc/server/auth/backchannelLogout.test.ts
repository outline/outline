import crypto from "node:crypto";
import JWT from "jsonwebtoken";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { http, HttpResponse } from "msw";
import { vi } from "vitest";
import { verifyCSRFToken } from "@server/middlewares/csrf";
import { User, UserAuthentication } from "@server/models";
import onerror from "@server/onerror";
import type { AppContext, AppState } from "@server/types";
import { buildTeam, buildUser } from "@server/test/factories";
import { server as mockServer } from "@server/test/msw";
import TestServer from "@server/test/TestServer";
import { JWKSCache } from "../JWKSCache";
import { backchannelLogout } from "./backchannelLogout";

const Issuer = "http://example.com";
const Audience = "client-id";
const JWKSUri = `${Issuer}/jwks`;
const LogoutEvent = "http://schemas.openid.net/event/backchannel-logout";
const Path = "/auth/oidc.backchannel_logout";

// A second endpoint whose key set is never reachable, used to prove that a
// failure to resolve the signing key rejects the token rather than erroring.
const UnreachableJWKSUri = `${Issuer}/unreachable-jwks`;
const UnreachablePath = "/auth/oidc.backchannel_logout_unreachable";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "test-key",
  use: "sig",
  alg: "RS256",
};

// Mirrors how the endpoint is mounted in the auth router, so that body parsing
// and CSRF verification apply as they do in production.
const app = new Koa<AppState, AppContext>();
const router = new Router<AppState, AppContext>();
router.post(
  Path,
  backchannelLogout({
    jwks: new JWKSCache(JWKSUri),
    audience: Audience,
    issuer: Issuer,
  })
);
router.post(
  UnreachablePath,
  backchannelLogout({
    jwks: new JWKSCache(UnreachableJWKSUri),
    audience: Audience,
    issuer: Issuer,
  })
);
app.use(bodyParser());
app.use(verifyCSRFToken());
app.use(router.routes());
onerror(app);

const server = new TestServer(app);

afterAll(() => server.close());

let counter = 0;

function signLogoutToken(
  claims: Record<string, unknown> = {},
  {
    key = privateKey,
    ...options
  }: JWT.SignOptions & { key?: crypto.KeyObject } = {}
) {
  const payload = {
    iss: Issuer,
    aud: Audience,
    jti: `jti-${++counter}`,
    exp: Math.floor(Date.now() / 1000) + 300,
    events: { [LogoutEvent]: {} },
    ...claims,
  };

  return JWT.sign(
    // A claim set to undefined is dropped, so that a test can describe a token
    // that omits it.
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    ),
    key.export({ type: "pkcs8", format: "pem" }),
    { algorithm: "RS256", keyid: jwk.kid, ...options }
  );
}

function postLogoutToken(token: string) {
  return server.post(Path, {
    body: new URLSearchParams({ logout_token: token }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/** Builds a user that authenticated with OIDC under the given subject. */
async function buildOIDCUser(sub: string) {
  const team = await buildTeam({
    authenticationProviders: [{ name: "oidc", providerId: "example.com" }],
  });
  const user = await buildUser({ teamId: team.id });
  await UserAuthentication.update(
    { providerId: sub },
    { where: { userId: user.id } }
  );
  return user;
}

describe("backchannelLogout", () => {
  beforeEach(() => {
    mockServer.use(http.get(JWKSUri, () => HttpResponse.json({ keys: [jwk] })));
  });

  it("should revoke the sessions of the user named in the token", async () => {
    const user = await buildOIDCUser("subject-revoked");
    const { jwtSecret } = user;

    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject-revoked" })
    );

    expect(res.status).toEqual(200);
    expect(res.headers.get("cache-control")).toEqual("no-cache, no-store");

    await user.reload();
    expect(user.jwtSecret).not.toEqual(jwtSecret);
  });

  it("should not require a CSRF token", async () => {
    const res = await postLogoutToken(signLogoutToken({ sub: "unknown" }));
    expect(res.status).toEqual(200);
  });

  it("should leave other users signed in", async () => {
    const user = await buildOIDCUser("subject-untouched");
    const { jwtSecret } = user;

    const res = await postLogoutToken(signLogoutToken({ sub: "other" }));

    expect(res.status).toEqual(200);
    await user.reload();
    expect(user.jwtSecret).toEqual(jwtSecret);
  });

  it("should reject a request without a token", async () => {
    const res = await server.post(Path, {
      body: "",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    expect(res.status).toEqual(400);
    expect((await res.json()).error).toEqual("invalid_request");
  });

  it("should reject a token signed by an unknown key", async () => {
    const { privateKey: otherKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });

    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject" }, { key: otherKey })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject a token naming a key that is not in the key set", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject" }, { keyid: "unknown-key" })
    );

    // A rejected token, not a fault of our own.
    expect(res.status).toEqual(400);
    expect((await res.json()).error).toEqual("invalid_request");
  });

  it("should reject a token when the key set cannot be reached", async () => {
    mockServer.use(
      http.get(
        UnreachableJWKSUri,
        () => new HttpResponse(null, { status: 503 })
      )
    );

    const res = await server.post(UnreachablePath, {
      body: new URLSearchParams({
        logout_token: signLogoutToken({ sub: "subject" }),
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    expect(res.status).toEqual(400);
  });

  it("should reject an unsigned token", async () => {
    const token = JWT.sign(
      {
        iss: Issuer,
        aud: Audience,
        jti: `jti-${++counter}`,
        sub: "subject",
        events: { [LogoutEvent]: {} },
      },
      "",
      { algorithm: "none" }
    );

    const res = await postLogoutToken(token);
    expect(res.status).toEqual(400);
  });

  it("should reject a token from another issuer", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", iss: "http://attacker.example.com" })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject a token issued for another audience", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", aud: "another-client" })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject a token without the logout event claim", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", events: {} })
    );
    expect(res.status).toEqual(400);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "logout"],
  ])("should reject a logout event claim that is %s", async (_name, value) => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", events: { [LogoutEvent]: value } })
    );

    expect(res.status).toEqual(400);
    expect((await res.json()).error_description).toContain(LogoutEvent);
  });

  it("should reject an events claim that is not an object", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", events: null })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject an id_token presented as a logout token", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", nonce: "abc" })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject a token that is no longer fresh", async () => {
    const res = await postLogoutToken(
      signLogoutToken({
        sub: "subject",
        iat: Math.floor(Date.now() / 1000) - 60 * 60,
      })
    );
    expect(res.status).toEqual(400);
  });

  it.each(["jti", "iat", "exp"])(
    "should reject a token without a %s claim",
    async (claim) => {
      const res = await postLogoutToken(
        signLogoutToken(
          { sub: "subject", [claim]: undefined },
          claim === "iat" ? { noTimestamp: true } : {}
        )
      );
      expect(res.status).toEqual(400);
    }
  );

  it("should reject a token issued to more than one audience", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", aud: [Audience, "another-client"] })
    );

    expect(res.status).toEqual(400);
    expect((await res.json()).error_description).toContain("azp");
  });

  it("should accept more than one audience when azp names this client", async () => {
    const res = await postLogoutToken(
      signLogoutToken({
        sub: "subject",
        aud: [Audience, "another-client"],
        azp: Audience,
      })
    );
    expect(res.status).toEqual(200);
  });

  it("should reject a token whose azp claim names another party", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sub: "subject", azp: "another-client" })
    );
    expect(res.status).toEqual(400);
  });

  it("should reject a replayed token", async () => {
    const token = signLogoutToken({ sub: "subject-replayed" });

    expect((await postLogoutToken(token)).status).toEqual(200);
    expect((await postLogoutToken(token)).status).toEqual(400);
  });

  it("should accept the same token again when the logout failed", async () => {
    const user = await buildOIDCUser("subject-retried");
    const { jwtSecret } = user;
    const token = signLogoutToken({ sub: "subject-retried" });

    vi.spyOn(User, "findAll").mockRejectedValueOnce(new Error("database gone"));
    expect((await postLogoutToken(token)).status).toEqual(500);

    // The record was released, so the provider's retry is not refused as a
    // replay and the logout completes.
    vi.restoreAllMocks();
    expect((await postLogoutToken(token)).status).toEqual(200);

    await user.reload();
    expect(user.jwtSecret).not.toEqual(jwtSecret);
  });

  it("should reject a token scoped to a provider session alone", async () => {
    const res = await postLogoutToken(
      signLogoutToken({ sid: "session-id", sub: undefined })
    );

    expect(res.status).toEqual(400);
    expect((await res.json()).error_description).toContain("sub claim");
  });
});
