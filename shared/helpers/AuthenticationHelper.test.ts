import AuthenticationHelper from "./AuthenticationHelper";

describe("AuthenticationHelper", () => {
  const canAccess = AuthenticationHelper.canAccess;

  describe("canAccess", () => {
    describe("api scopes", () => {
      it("should account for query string", async () => {
        const scopes = ["/api/documents.info"];

        expect(canAccess("/api/documents.info?foo=bar", scopes)).toBe(true);
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
  });
});
