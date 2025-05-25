import { v4 } from "uuid";
import { Scope } from "@shared/types";
import { OAuthInterface } from "./OAuthInterface";

describe("OAuthInterface", () => {
  const user = {
    id: v4(),
  };
  const client = {
    id: v4(),
    grants: ["authorization_code", "refresh_token"],
    redirectUris: ["https://example.com/callback"],
  };

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
