import { Scope } from "@shared/types";
import { buildOAuthAuthentication, buildUser } from "@server/test/factories";

describe("OAuthAuthentication", () => {
  describe("scope", () => {
    it("should reject malformed scopes", async () => {
      const user = await buildUser();

      await expect(
        buildOAuthAuthentication({
          user,
          scope: ["documents:read,documents:write"],
        })
      ).rejects.toThrow("Scope must be a valid API scope");
    });
  });

  describe("canAccess", () => {
    it("should allow MCP access for scoped tokens", async () => {
      const user = await buildUser();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      expect(authentication.canAccess("/mcp")).toBe(true);
      expect(authentication.canAccess("/mcp/")).toBe(true);
    });

    it("should deny MCP access for tokens with empty scope", async () => {
      const user = await buildUser();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [],
      });

      expect(authentication.canAccess("/mcp")).toBe(false);
    });

    it("should deny MCP access when no scope is well-formed", async () => {
      const user = await buildUser();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });
      authentication.scope = ["documents:read,documents:write"];

      expect(authentication.canAccess("/mcp")).toBe(false);
    });

    it("should always allow the revoke endpoint", async () => {
      const user = await buildUser();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      expect(authentication.canAccess("/oauth/revoke")).toBe(true);
    });

    it("should check scopes for API paths", async () => {
      const user = await buildUser();
      const authentication = await buildOAuthAuthentication({
        user,
        scope: [Scope.Read],
      });

      expect(authentication.canAccess("/api/documents.list")).toBe(true);
      expect(authentication.canAccess("/api/documents.update")).toBe(false);
    });
  });
});
