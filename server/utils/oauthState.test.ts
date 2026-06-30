import { Client } from "@shared/types";
import env from "@server/env";
import {
  hashOAuthStateNonce,
  signOAuthIntent,
  signOAuthState,
  verifyOAuthIntent,
  verifyOAuthState,
} from "./oauthState";

describe("oauthState", () => {
  const originalSecretKey = env.SECRET_KEY;

  afterEach(() => {
    env.SECRET_KEY = originalSecretKey;
  });

  it("round-trips a signed OAuth intent", () => {
    const token = signOAuthIntent({
      host: "docs.example.com",
      actorId: "user-id",
      actorSessionHash: "session-hash",
      client: Client.Web,
    });

    const payload = verifyOAuthIntent(token);

    expect(payload.host).toBe("docs.example.com");
    expect(payload.actorId).toBe("user-id");
    expect(payload.actorSessionHash).toBe("session-hash");
    expect(payload.client).toBe(Client.Web);
    expect(payload.type).toBe("oauth_intent");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("round-trips a signed OAuth state", () => {
    const token = signOAuthState({
      host: "team.outline.dev",
      actorId: "user-id",
      actorSessionHash: "session-hash",
      client: Client.Desktop,
      codeVerifier: "pkce-verifier",
      nonceHash: hashOAuthStateNonce("csrf-nonce"),
    });

    const payload = verifyOAuthState(token);

    expect(payload.host).toBe("team.outline.dev");
    expect(payload.actorId).toBe("user-id");
    expect(payload.actorSessionHash).toBe("session-hash");
    expect(payload.client).toBe(Client.Desktop);
    expect(payload.type).toBe("oauth_state");
    expect(payload.codeVerifier).toBe("pkce-verifier");
    expect(payload.nonceHash).toBe(hashOAuthStateNonce("csrf-nonce"));
  });

  it("rejects a signed OAuth state as an OAuth intent", () => {
    const token = signOAuthState({
      host: "team.outline.dev",
      actorId: "user-id",
      client: Client.Web,
      nonceHash: hashOAuthStateNonce("csrf-nonce"),
    });

    expect(() => verifyOAuthIntent(token)).toThrow("Invalid OAuth intent");
  });

  it("rejects a signed OAuth intent as an OAuth state", () => {
    const token = signOAuthIntent({
      host: "docs.example.com",
      actorId: "user-id",
      client: Client.Web,
    });

    expect(() => verifyOAuthState(token)).toThrow("Invalid OAuth state");
  });

  it("rejects a tampered token", () => {
    const token = signOAuthState({
      host: "team.outline.dev",
      client: Client.Web,
      nonceHash: hashOAuthStateNonce("csrf-nonce"),
    });
    const tamperedToken = `${token}tampered`;

    expect(() => verifyOAuthState(tamperedToken)).toThrow(
      "Invalid OAuth state"
    );
  });

  it("rejects tokens signed with another secret", () => {
    const token = signOAuthIntent({
      host: "docs.example.com",
      client: Client.Web,
    });

    env.SECRET_KEY = "1".repeat(64);

    expect(() => verifyOAuthIntent(token)).toThrow("Invalid OAuth state");
  });
});
