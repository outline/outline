import AuthenticationHelper from "./AuthenticationHelper";

describe("AuthenticationHelper", () => {
  const canAccess = AuthenticationHelper.canAccess;

  describe("canAccess", () => {
    it("should grant full access with wildcard scope", async () => {
      const scopes = ["*"];

      expect(canAccess("/api/documents.info", scopes)).toBe(true);
      expect(canAccess("/api/documents.create", scopes)).toBe(true);
      expect(canAccess("/api/collections.list", scopes)).toBe(true);
      expect(canAccess("/api/users.update", scopes)).toBe(true);
      expect(canAccess("documents.info", scopes)).toBe(true);
    });

    describe("api scopes", () => {
      it("should account for query string", async () => {
        const scopes = ["/api/documents.info"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
      });

      it("should ignore URL fragment", async () => {
        const scopes = ["/api/documents.info"];

        expect(
          canAccess("/api/documents.create#foo/api/documents.info", scopes)
        ).toBe(false);
        expect(
          canAccess("/api/documents.info#foo/api/documents.create", scopes)
        ).toBe(true);
        expect(
          canAccess("/api/documents.create?x=1#foo/api/documents.info", scopes)
        ).toBe(false);
      });

      it("should return false if no matching scope", async () => {
        const scopes = ["/api/documents.info"];

        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/collections.create", scopes)).toBe(false);
        expect(canAccess("/api/apiKeys.list", scopes)).toBe(false);
      });

      it("should allow wildcard methods", async () => {
        const scopes = ["/api/documents.*"];

        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(true);
        expect(canAccess("/api/collections.create", scopes)).toBe(false);
      });

      it("should allow wildcard namespaces", async () => {
        const scopes = ["/api/*.info"];

        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(false);
        expect(canAccess("/api/collections.create", scopes)).toBe(false);
      });

      it("should allow wildcard namespaces", async () => {
        const scopes = ["/api/*.info"];

        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(false);
      });
    });

    describe("namespaced access scopes", () => {
      it("read", async () => {
        const scopes = ["documents:read"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.list", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(false);
        expect(canAccess("/api/documents.update", scopes)).toBe(false);
        expect(canAccess("/api/users.info", scopes)).toBe(false);
        expect(canAccess("/api/users.create", scopes)).toBe(false);
      });

      it("collections read scope grants access to membership listing", async () => {
        const scopes = ["collections:read"];

        expect(canAccess("/api/collections.list", scopes)).toBe(true);
        expect(canAccess("/api/collections.memberships", scopes)).toBe(true);
        expect(canAccess("/api/collections.group_memberships", scopes)).toBe(
          true
        );
        expect(canAccess("/api/collections.add_user", scopes)).toBe(false);
        expect(canAccess("/api/collections.remove_user", scopes)).toBe(false);
        expect(canAccess("/api/documents.memberships", scopes)).toBe(false);
      });

      it("write", async () => {
        const scopes = ["documents:write"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.list", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(true);
        expect(canAccess("/api/documents.update", scopes)).toBe(true);
        expect(canAccess("/api/users.info", scopes)).toBe(false);
        expect(canAccess("/api/users.create", scopes)).toBe(false);
      });

      it("create", async () => {
        const scopes = ["documents:create"];

        expect(canAccess("/api/documents.create", scopes)).toBe(true);
        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(false);
        expect(canAccess("/api/documents.info", scopes)).toBe(false);
        expect(canAccess("/api/documents.list", scopes)).toBe(false);
        expect(canAccess("/api/documents.update", scopes)).toBe(false);
        expect(canAccess("/api/users.info", scopes)).toBe(false);
        expect(canAccess("/api/users.create", scopes)).toBe(false);
      });
    });

    describe("global access scopes", () => {
      it("read", async () => {
        const scopes = ["read"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.list", scopes)).toBe(true);
        expect(canAccess("/api/users.info", scopes)).toBe(true);
        expect(canAccess("/api/groups.info", scopes)).toBe(true);
        expect(canAccess("/api/collections.list", scopes)).toBe(true);
        expect(canAccess("/api/collections.memberships", scopes)).toBe(true);
        expect(canAccess("/api/collections.group_memberships", scopes)).toBe(
          true
        );
        expect(canAccess("/api/documents.create", scopes)).toBe(false);
        expect(canAccess("/api/documents.update", scopes)).toBe(false);
        expect(canAccess("/api/users.create", scopes)).toBe(false);
      });

      it("write", async () => {
        const scopes = ["write"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
        expect(canAccess("/api/documents.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.list", scopes)).toBe(true);
        expect(canAccess("/api/users.info", scopes)).toBe(true);
        expect(canAccess("/api/groups.info", scopes)).toBe(true);
        expect(canAccess("/api/documents.create", scopes)).toBe(true);
        expect(canAccess("/api/documents.update", scopes)).toBe(true);
        expect(canAccess("/api/users.info", scopes)).toBe(true);
        expect(canAccess("/api/users.create", scopes)).toBe(true);
      });

      it("create", async () => {
        const scopes = ["create"];

        expect(canAccess("/api/documents.create", scopes)).toBe(true);
        expect(canAccess("/api/users.create", scopes)).toBe(true);
        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(false);
        expect(canAccess("/api/documents.info", scopes)).toBe(false);
        expect(canAccess("/api/documents.list", scopes)).toBe(false);
        expect(canAccess("/api/documents.update", scopes)).toBe(false);
        expect(canAccess("/api/users.info", scopes)).toBe(false);
      });
    });

    describe("malformed scopes", () => {
      it("should reject mixed route and namespaced scopes", async () => {
        // Previously these were silently parsed as `/api/*.*` and granted
        // access to every route.
        expect(canAccess("/api/documents.list", ["/api/*.*:read"])).toBe(false);
        expect(canAccess("/api/documents.create", ["/api/*.*:read"])).toBe(
          false
        );
        expect(
          canAccess("/api/documents.list", ["/api/documents.list:read"])
        ).toBe(false);
      });

      it("should reject route scopes missing a method or namespace", async () => {
        expect(canAccess("/api/documents.list", ["/api/documents"])).toBe(
          false
        );
        expect(canAccess("/api/documents.list", ["/api/.list"])).toBe(false);
        expect(canAccess("/api/documents.list", ["/api/documents."])).toBe(
          false
        );
      });

      it("should reject namespaced scopes with unknown access level", async () => {
        expect(canAccess("/api/documents.list", ["documents:foo"])).toBe(false);
        expect(canAccess("/api/documents.list", ["documents:"])).toBe(false);
      });

      it("should reject unprefixed namespace.method scopes", async () => {
        expect(canAccess("/api/documents.list", ["documents.list"])).toBe(
          false
        );
      });

      it("should reject empty scopes", async () => {
        expect(canAccess("/api/documents.list", [""])).toBe(false);
      });

      it("should still grant access via other valid scopes alongside a malformed one", async () => {
        expect(
          canAccess("/api/documents.list", [
            "/api/*.*:read",
            "/api/documents.list",
          ])
        ).toBe(true);
      });
    });
  });

  describe("isValidScope", () => {
    it("accepts the full wildcard", () => {
      expect(AuthenticationHelper.isValidScope("*")).toBe(true);
    });

    it("accepts global access scopes", () => {
      expect(AuthenticationHelper.isValidScope("read")).toBe(true);
      expect(AuthenticationHelper.isValidScope("write")).toBe(true);
      expect(AuthenticationHelper.isValidScope("create")).toBe(true);
    });

    it("accepts namespaced access scopes", () => {
      expect(AuthenticationHelper.isValidScope("documents:read")).toBe(true);
      expect(AuthenticationHelper.isValidScope("documents:write")).toBe(true);
      expect(AuthenticationHelper.isValidScope("documents:create")).toBe(true);
    });

    it("accepts route scopes with wildcards", () => {
      expect(AuthenticationHelper.isValidScope("/api/documents.list")).toBe(
        true
      );
      expect(AuthenticationHelper.isValidScope("/api/documents.*")).toBe(true);
      expect(AuthenticationHelper.isValidScope("/api/*.list")).toBe(true);
      expect(AuthenticationHelper.isValidScope("/api/*.*")).toBe(true);
    });

    it("rejects mixed route and namespaced scopes", () => {
      expect(AuthenticationHelper.isValidScope("/api/*.*:read")).toBe(false);
      expect(
        AuthenticationHelper.isValidScope("/api/documents.list:read")
      ).toBe(false);
    });

    it("rejects malformed scopes", () => {
      expect(AuthenticationHelper.isValidScope("")).toBe(false);
      expect(AuthenticationHelper.isValidScope("documents")).toBe(false);
      expect(AuthenticationHelper.isValidScope("documents.list")).toBe(false);
      expect(AuthenticationHelper.isValidScope("documents:foo")).toBe(false);
      expect(AuthenticationHelper.isValidScope("/api/documents")).toBe(false);
      expect(AuthenticationHelper.isValidScope("/api/documents.")).toBe(false);
      expect(AuthenticationHelper.isValidScope("/api/.list")).toBe(false);
    });

    describe("with allowRootWildcard: false", () => {
      const opts = { allowRootWildcard: false };

      it("rejects scopes that grant access to every route", () => {
        expect(AuthenticationHelper.isValidScope("*", opts)).toBe(false);
        expect(AuthenticationHelper.isValidScope("/api/*.*", opts)).toBe(false);
      });

      it("still accepts wildcards on a single dimension", () => {
        expect(AuthenticationHelper.isValidScope("/api/*.list", opts)).toBe(
          true
        );
        expect(
          AuthenticationHelper.isValidScope("/api/documents.*", opts)
        ).toBe(true);
      });

      it("still accepts other valid scopes", () => {
        expect(AuthenticationHelper.isValidScope("read", opts)).toBe(true);
        expect(AuthenticationHelper.isValidScope("documents:read", opts)).toBe(
          true
        );
        expect(
          AuthenticationHelper.isValidScope("/api/documents.list", opts)
        ).toBe(true);
      });
    });
  });
});
