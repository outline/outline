import AuthenticationHelper from "./AuthenticationHelper";

describe("AuthenticationHelper", () => {
  describe("canAccess", () => {
    describe("api scopes", () => {
      it("should account for query string", async () => {
        const scopes = ["/api/documents.info"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info?foo=bar", scopes)
        ).toBe(true);
      });

      it("should return false if no matching scope", async () => {
        const scopes = ["/api/documents.info"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/collections.create", scopes)
        ).toBe(false);
        expect(
          AuthenticationHelper.canAccess("/api/apiKeys.list", scopes)
        ).toBe(false);
      });

      it("should allow wildcard methods", async () => {
        const scopes = ["/api/documents.*"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.create", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/collections.create", scopes)
        ).toBe(false);
      });

      it("should allow wildcard namespaces", async () => {
        const scopes = ["/api/*.info"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.create", scopes)
        ).toBe(false);
        expect(
          AuthenticationHelper.canAccess("/api/collections.create", scopes)
        ).toBe(false);
      });

      it("should allow wildcard namespaces", async () => {
        const scopes = ["/api/*.info"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.create", scopes)
        ).toBe(false);
      });
    });

    describe("access scopes", () => {
      it("should account for query string", async () => {
        const scopes = ["documents:read"];

        expect(
          AuthenticationHelper.canAccess("/api/documents.info?foo=bar", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.info", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.list", scopes)
        ).toBe(true);
        expect(
          AuthenticationHelper.canAccess("/api/documents.create", scopes)
        ).toBe(false);
        expect(
          AuthenticationHelper.canAccess("/api/documents.update", scopes)
        ).toBe(false);
      });
    });
  });
});
