import crypto from "node:crypto";
import { Scope } from "@shared/types";
import { OAuthAuthentication, OAuthAuthorizationCode } from "@server/models";
import {
  buildOAuthAuthentication,
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
      expect(body.error).toBeDefined();
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
      expect(body.error).toBeDefined();
      expect(body.error_description).toContain(
        "Missing client_secret for confidential client"
      );
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

      const code = await OAuthAuthorizationCode.create({
        authorizationCodeHash: "hash",
        scope: [Scope.Read],
        redirectUri: client.redirectUris[0],
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
  });
});
