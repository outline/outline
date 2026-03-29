import { randomUUID } from "node:crypto";
import { Scope } from "@shared/types";
import { OAuthInterface } from "./OAuthInterface";
import {
  buildOAuthAuthentication,
  buildOAuthClient,
  buildUser,
} from "@server/test/factories";

describe("OAuthInterface", () => {
  const user = {
    id: randomUUID(),
  };
  const client = {
    id: randomUUID(),
    grants: ["authorization_code", "refresh_token"],
    redirectUris: ["https://example.com/callback"],
  };

  describe("#getAccessToken", () => {
    it("should return correct token details", async () => {
      const user = await buildUser();
      const scope = [Scope.Read, Scope.Write];
      const oAuthClient = await buildOAuthClient({ teamId: user.teamId });
      const oAuthAuthentication = await buildOAuthAuthentication({
        user,
        oauthClientId: oAuthClient.id,
        scope,
      });

      const result = await OAuthInterface.getAccessToken(
        oAuthAuthentication.accessToken!
      );

      expect(result).toEqual({
        accessToken: oAuthAuthentication.accessToken,
        accessTokenExpiresAt: oAuthAuthentication.accessTokenExpiresAt,
        scope,
        client: {
          id: oAuthClient.clientId,
          grants: OAuthInterface.grants,
        },
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      });
    });

    it("should return false for invalid access token", async () => {
      const result = await OAuthInterface.getAccessToken("invalid_token");
      expect(result).toBe(false);
    });
  });

  describe("#getRefreshToken", () => {
    it("should return correct token details", async () => {
      const user = await buildUser();
      const scope = [Scope.Read, Scope.Write];
      const oAuthClient = await buildOAuthClient({ teamId: user.teamId });
      const oAuthAuthentication = await buildOAuthAuthentication({
        user,
        oauthClientId: oAuthClient.id,
        scope,
      });

      const result = await OAuthInterface.getRefreshToken(
        oAuthAuthentication.refreshToken!
      );

      expect(result).toEqual({
        refreshToken: oAuthAuthentication.refreshToken,
        refreshTokenExpiresAt: oAuthAuthentication.refreshTokenExpiresAt,
        scope,
        client: {
          id: oAuthClient.clientId,
          grants: OAuthInterface.grants,
        },
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      });
    });

    it("should return false for invalid refresh token", async () => {
      const result = await OAuthInterface.getRefreshToken("invalid_token");
      expect(result).toBe(false);
    });
  });

  describe("#validateRedirectUri", () => {
    it("should return true for valid redirect URI", async () => {
      const redirectUri = "https://example.com/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        client
      );
      expect(result).toBe(true);
    });
    it("should return false for invalid redirect URI", async () => {
      const redirectUri = "invalid_uri";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        client
      );
      expect(result).toBe(false);
    });

    it("should return false for URI with fragment", async () => {
      const redirectUri = "https://example.com/callback#fragment";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        client
      );
      expect(result).toBe(false);
    });

    it("should return false for HTTP redirect URI (security requirement)", async () => {
      const httpClient = {
        ...client,
        redirectUris: ["http://example.com/callback"],
      };
      const redirectUri = "http://example.com/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        httpClient
      );
      expect(result).toBe(false);
    });

    it("should allow HTTP loopback redirect URI (127.0.0.1) per RFC 8252", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://127.0.0.1:8080/callback"],
      };
      const redirectUri = "http://127.0.0.1:8080/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(true);
    });

    it("should allow HTTP loopback redirect URI (localhost) per RFC 8252", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://localhost:8080/callback"],
      };
      const redirectUri = "http://localhost:8080/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(true);
    });

    it("should allow HTTP loopback redirect URI (IPv6 [::1]) per RFC 8252", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://[::1]:8080/callback"],
      };
      const redirectUri = "http://[::1]:8080/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(true);
    });

    it("should allow loopback redirect URI with different ports", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://127.0.0.1:3000/callback"],
      };
      const redirectUri = "http://127.0.0.1:3000/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(true);
    });

    it("should allow loopback redirect URI without port", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://localhost/callback"],
      };
      const redirectUri = "http://localhost/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(true);
    });

    it("should reject HTTPS loopback redirect URIs (must be HTTP per RFC 8252)", async () => {
      const httpsLoopbackClient = {
        ...client,
        redirectUris: ["https://localhost:8080/callback"],
      };
      const redirectUri = "https://localhost:8080/callback";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        httpsLoopbackClient
      );
      expect(result).toBe(true); // HTTPS is allowed, just not required for loopback
    });

    it("should reject loopback redirect URI with fragment", async () => {
      const loopbackClient = {
        ...client,
        redirectUris: ["http://127.0.0.1:8080/callback#fragment"],
      };
      const redirectUri = "http://127.0.0.1:8080/callback#fragment";
      const result = await OAuthInterface.validateRedirectUri(
        redirectUri,
        loopbackClient
      );
      expect(result).toBe(false); // Fragment check happens first
    });
  });

  describe("#validateScope", () => {
    it("should return empty array for empty scope", async () => {
      const result = await OAuthInterface.validateScope(user, client, []);
      expect(result).toEqual([]);
    });

    it("should return empty array for empty scope", async () => {
      const result = await OAuthInterface.validateScope(
        user,
        client,
        undefined
      );
      expect(result).toEqual([]);
    });

    it("should allow valid global scopes", async () => {
      const scope = [Scope.Read, Scope.Write];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toEqual(scope);
    });

    it("should allow route scopes", async () => {
      const scope = [
        "/api/documents.info",
        "/api/documents.create",
        "/api/documents.update",
        "/api/documents.delete",
      ];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toEqual(scope);
    });

    it("should allow scopes with colon and valid prefix", async () => {
      const scope = [
        "documents:read",
        "documents:write",
        "collections:read",
        "collections:write",
      ];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toEqual(scope);
    });

    it("should reject invalid route scopes", async () => {
      const scope = ["invalid.scope.periods"];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toBe(false);
    });

    it("should reject invalid access scopes", async () => {
      const scope = ["documents:invalid"];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toBe(false);
    });

    it("should reject malformed access scopes", async () => {
      const scope = ["documents::read"];
      const result = await OAuthInterface.validateScope(user, client, scope);
      expect(result).toBe(false);
    });
  });
});
