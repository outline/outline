import { Scope } from "@shared/types";
import { OAuthAuthentication } from "@server/models";
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
  });
});
