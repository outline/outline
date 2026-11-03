import crypto from "node:crypto";
import { Scope } from "@shared/types";
import { OAuthAuthentication, OAuthAuthorizationCode } from "@server/models";
import {
  buildOAuthAuthentication,
  buildOAuthAuthorizationCode,
  buildOAuthClient,
  buildUser,
} from "@server/test/factories";
import { getTestServer, toFormData } from "@server/test/support";

const server = getTestServer();

describe("#oauth.revoke", () => {
  it("should revoke access token", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({ user, scope: [Scope.Read] });

    const res = await server.post("/oauth/revoke", {
      body: {
        token: auth.accessToken,
      },
    });
    expect(res.status).toEqual(200);

    const found = await OAuthAuthentication.findByPk(auth.id);
    expect(found).toBeNull();
  });

  it("should revoke refresh token", async () => {
    const user = await buildUser();
    const auth = await buildOAuthAuthentication({ user, scope: [Scope.Read] });

    const res = await server.post("/oauth/revoke", {
      body: {
        token: auth.refreshToken,
      },
    });
    expect(res.status).toEqual(200);

    const found = await OAuthAuthentication.findByPk(auth.id);
    expect(found).toBeNull();
  });

  it("should not error with invalid token", async () => {
    const res = await server.post("/oauth/revoke", {
      body: {
        token: "invalid-token",
      },
    });
    expect(res.status).toEqual(200);
  });
});

describe("#oauth.token", () => {
  describe("refresh_token grant", () => {
    it("should successfully refresh token for confidential client with client_secret", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "confidential",
      });
      const auth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
      });
      const refreshToken = auth.refreshToken;

      // Reload with oauthClient included
      await auth.reload({ include: ["oauthClient"] });

      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: auth.oauthClient.clientId,
          client_secret: auth.oauthClient.clientSecret,
        }),
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.access_token).toBeTruthy();
      expect(body.refresh_token).toBeTruthy();
      expect(body.token_type).toBe("Bearer");
      expect(body.expires_in).toBeGreaterThan(0);
    });

    it("should successfully refresh token for public client without client_secret", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "public",
      });
      const auth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
      });
      const refreshToken = auth.refreshToken;

      // Reload with oauthClient included
      await auth.reload({ include: ["oauthClient"] });

      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: auth.oauthClient.clientId,
        }),
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.access_token).toBeTruthy();
      expect(body.refresh_token).toBeTruthy();
      expect(body.token_type).toBe("Bearer");
      expect(body.expires_in).toBeGreaterThan(0);
    });

    it("should successfully refresh token for public client with client_secret", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "public",
      });
      const auth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
      });
      const refreshToken = auth.refreshToken;

      // Reload with oauthClient included
      await auth.reload({ include: ["oauthClient"] });

      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: auth.oauthClient.clientId,
          client_secret: auth.oauthClient.clientSecret,
        }),
      });

      expect(res.status).toEqual(200);
      const body = await res.json();
      expect(body.access_token).toBeTruthy();
      expect(body.refresh_token).toBeTruthy();
      expect(body.token_type).toBe("Bearer");
      expect(body.expires_in).toBeGreaterThan(0);
    });

    it("should error when refresh_token is missing for refresh_token grant", async () => {
      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          client_id: "test-client-id",
        }),
      });

      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error_description).toContain(
        "Missing refresh_token for refresh_token grant type"
      );
    });

    it("should error when client_id is invalid", async () => {
      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: "invalid-refresh-token",
          client_id: "test-client-id",
        }),
      });

      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toEqual("invalid_client");
      expect(body.error_description).toContain("Invalid client_id");
    });

    it("should error when confidential client tries to refresh without client_secret", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "confidential",
      });
      const auth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
      });
      const refreshToken = auth.refreshToken;

      // Reload with oauthClient included
      await auth.reload({ include: ["oauthClient"] });

      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: auth.oauthClient.clientId,
        }),
      });

      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toEqual("invalid_client");
      expect(body.error_description).toContain(
        "Missing client_secret for confidential client"
      );
    });

    it("should return invalid_grant for an unknown refresh token", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "public",
      });

      const res = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: "invalid-refresh-token",
          client_id: client.clientId,
        }),
      });

      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toEqual("invalid_grant");
      expect(body.error_description).toContain("refresh token is invalid");
    });

    it("should revoke all tokens in a grant when a refresh token is reused", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "confidential",
      });
      const grantId = crypto.randomUUID();

      // Create initial authentication
      const auth1 = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
        grantId,
      });

      // Use the refresh token once (rotation)
      const res1 = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth1.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });
      expect(res1.status).toEqual(200);
      const body1 = await res1.json();
      const auth2RefreshToken = body1.refresh_token;

      // Simulate the rotation having happened outside the reuse interval, so the
      // replay below is treated as genuine reuse rather than a concurrent refresh.
      await OAuthAuthentication.update(
        { deletedAt: new Date(Date.now() - 60 * 1000) },
        { where: { id: auth1.id }, paranoid: false, silent: true }
      );

      // Create an unrelated authentication
      const otherAuth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      // Use the OLD refresh token again (reuse detection)
      const res2 = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth1.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });

      // The request should fail
      expect(res2.status).toEqual(400);

      // All tokens in the grant should be revoked
      const foundAuth1 = await OAuthAuthentication.findByPk(auth1.id, {
        paranoid: false,
      });
      const foundAuth2 =
        await OAuthAuthentication.findByRefreshToken(auth2RefreshToken);
      const foundOtherAuth = await OAuthAuthentication.findByPk(otherAuth.id);

      expect(foundAuth1?.deletedAt).toBeTruthy();
      expect(foundAuth2).toBeNull();
      expect(foundOtherAuth).not.toBeNull();
    });

    it("should revoke associated authorization codes when reuse is detected", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({ teamId: user.teamId });
      const grantId = crypto.randomUUID();

      const auth = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
        grantId,
      });

      const code = await buildOAuthAuthorizationCode({
        oauthClientId: client.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 10000),
        grantId,
      });

      // Use the refresh token once (rotation)
      await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });

      // Simulate the rotation having happened outside the reuse interval, so the
      // replay below is treated as genuine reuse rather than a concurrent refresh.
      await OAuthAuthentication.update(
        { deletedAt: new Date(Date.now() - 60 * 1000) },
        { where: { id: auth.id }, paranoid: false, silent: true }
      );

      // Use the OLD refresh token again (reuse detection)
      await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });

      // The authorization code should be gone
      const foundCode = await OAuthAuthorizationCode.findByPk(code.id);
      expect(foundCode).toBeNull();
    });

    it("should not revoke the grant when a rotated refresh token is replayed within the reuse interval", async () => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType: "confidential",
      });
      const grantId = crypto.randomUUID();

      const auth1 = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
        oauthClientId: client.id,
        grantId,
      });

      // Use the refresh token once (rotation)
      const res1 = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth1.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });
      expect(res1.status).toEqual(200);
      const body1 = await res1.json();
      const auth2RefreshToken = body1.refresh_token;

      // Immediately replay the OLD refresh token, as a client issuing concurrent
      // refresh requests would. This is within the reuse interval.
      const res2 = await server.post("/oauth/token", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: toFormData({
          grant_type: "refresh_token",
          refresh_token: auth1.refreshToken,
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      });

      // The replay fails, but the grant won by the first request survives.
      expect(res2.status).toEqual(400);
      const foundAuth2 =
        await OAuthAuthentication.findByRefreshToken(auth2RefreshToken);
      expect(foundAuth2).not.toBeNull();
    });
  });

  describe("authorization_code grant", () => {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const buildCodeGrant = async ({
      clientType = "confidential",
      pkce = false,
    }: {
      clientType?: "confidential" | "public";
      pkce?: boolean;
    } = {}) => {
      const user = await buildUser();
      const client = await buildOAuthClient({
        teamId: user.teamId,
        clientType,
      });
      const grantId = crypto.randomUUID();
      const code = crypto.randomBytes(32).toString("hex");

      await buildOAuthAuthorizationCode({
        code,
        oauthClientId: client.id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 10000),
        grantId,
        ...(pkce ? { codeChallenge, codeChallengeMethod: "S256" } : {}),
      });

      const exchange = (
        overrides: Record<string, string | undefined> = {},
        headers: Record<string, string> = {}
      ) =>
        server.post("/oauth/token", {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers,
          },
          body: toFormData({
            grant_type: "authorization_code",
            code,
            redirect_uri: client.redirectUris[0],
            client_id: client.clientId,
            client_secret: client.clientSecret,
            ...(pkce ? { code_verifier: codeVerifier } : {}),
            ...overrides,
          }),
        });

      return { user, client, grantId, exchange };
    };

    it("should exchange an authorization code for a token", async () => {
      const { exchange } = await buildCodeGrant();

      const res = await exchange();
      expect(res.status).toEqual(200);

      const body = await res.json();
      expect(body.access_token).toBeTruthy();
      expect(body.refresh_token).toBeTruthy();
    });

    it("should issue a token to a single request when a code is exchanged concurrently", async () => {
      const { grantId, exchange } = await buildCodeGrant();

      const results = await Promise.all([exchange(), exchange()]);
      const statuses = results.map((res) => res.status).sort((a, b) => a - b);
      expect(statuses).toEqual([200, 400]);

      const count = await OAuthAuthentication.count({
        where: {
          grantId,
        },
      });
      expect(count).toEqual(1);
    });

    it("should exchange a PKCE code with client_secret for a confidential client", async () => {
      const { exchange } = await buildCodeGrant({ pkce: true });

      const res = await exchange();
      expect(res.status).toEqual(200);
    });

    it("should exchange a PKCE code without client_secret for a public client", async () => {
      const { exchange } = await buildCodeGrant({
        clientType: "public",
        pkce: true,
      });

      const res = await exchange({ client_secret: undefined });
      expect(res.status).toEqual(200);
    });

    it("should error when a confidential client exchanges a PKCE code without client_secret", async () => {
      const { grantId, exchange } = await buildCodeGrant({ pkce: true });

      const res = await exchange({ client_secret: undefined });
      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error_description).toContain(
        "Missing client_secret for confidential client"
      );

      const count = await OAuthAuthentication.count({
        where: {
          grantId,
        },
      });
      expect(count).toEqual(0);
    });

    it("should error when client credentials are sent with basic auth", async () => {
      const { client, grantId, exchange } = await buildCodeGrant({
        pkce: true,
      });
      const credentials = Buffer.from(`${client.clientId}:`).toString("base64");

      const res = await exchange(
        { client_id: undefined, client_secret: undefined },
        { Authorization: `Basic ${credentials}` }
      );
      expect(res.status).toEqual(400);
      const body = await res.json();
      expect(body.error).toEqual("invalid_client");
      expect(body.error_description).toContain(
        "Unsupported client authentication method"
      );

      const count = await OAuthAuthentication.count({
        where: {
          grantId,
        },
      });
      expect(count).toEqual(0);
    });

    it("should reject a replayed authorization code", async () => {
      const { grantId, exchange } = await buildCodeGrant();

      const res1 = await exchange();
      expect(res1.status).toEqual(200);

      const res2 = await exchange();
      expect(res2.status).toEqual(400);

      const count = await OAuthAuthentication.count({
        where: {
          grantId,
        },
      });
      expect(count).toEqual(1);
    });
  });
});
