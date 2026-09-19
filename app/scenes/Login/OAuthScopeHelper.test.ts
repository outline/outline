import type { TFunction } from "i18next";
import { OAuthScopeHelper } from "./OAuthScopeHelper";

const t = ((key: string) => key) as unknown as TFunction;

describe("OAuthScopeHelper", () => {
  describe("normalizeScopes", () => {
    it("renders the full wildcard as Full access", () => {
      expect(OAuthScopeHelper.normalizeScopes(["*"], t)).toEqual([
        "Full access",
      ]);
    });

    it("renders the equivalent /api/*.* route scope as Full access", () => {
      expect(OAuthScopeHelper.normalizeScopes(["/api/*.*"], t)).toEqual([
        "Full access",
      ]);
    });

    it("renders global access scopes", () => {
      expect(OAuthScopeHelper.normalizeScopes(["read"], t)).toEqual([
        "Read all data",
      ]);
      expect(OAuthScopeHelper.normalizeScopes(["write"], t)).toEqual([
        "Write all data",
      ]);
      expect(OAuthScopeHelper.normalizeScopes(["create"], t)).toEqual([
        "Create all data",
      ]);
    });

    it("renders route scopes with both namespace and method", () => {
      expect(
        OAuthScopeHelper.normalizeScopes(["/api/documents.list"], t)
      ).toEqual(["Read documents"]);
      expect(
        OAuthScopeHelper.normalizeScopes(["/api/documents.create"], t)
      ).toEqual(["Create documents"]);
      expect(
        OAuthScopeHelper.normalizeScopes(["/api/collections.update"], t)
      ).toEqual(["Write collections"]);
    });

    it("renders wildcard methods", () => {
      expect(OAuthScopeHelper.normalizeScopes(["/api/documents.*"], t)).toEqual(
        ["Read and write documents"]
      );
    });

    it("renders wildcard namespaces", () => {
      expect(OAuthScopeHelper.normalizeScopes(["/api/*.list"], t)).toEqual([
        "Read workspace",
      ]);
    });

    it("renders namespaced access scopes", () => {
      expect(OAuthScopeHelper.normalizeScopes(["documents:read"], t)).toEqual([
        "Read documents",
      ]);
      expect(OAuthScopeHelper.normalizeScopes(["documents:write"], t)).toEqual([
        "Write documents",
      ]);
    });

    it("translates known namespaces", () => {
      // `capitalize` lowercases the rest of the string, so "API keys" becomes
      // "api keys" after composition with the verb. This matches what users
      // see today.
      expect(
        OAuthScopeHelper.normalizeScopes(["/api/apiKeys.list"], t)
      ).toEqual(["Read api keys"]);
    });

    it("falls back to the raw namespace when unknown", () => {
      expect(
        OAuthScopeHelper.normalizeScopes(["/api/widgets.list"], t)
      ).toEqual(["Read widgets"]);
    });

    it("deduplicates equivalent scopes", () => {
      expect(
        OAuthScopeHelper.normalizeScopes(
          ["/api/documents.list", "/api/documents.info", "documents:read"],
          t
        )
      ).toEqual(["Read documents"]);
    });

    it("renders legacy malformed mixed scopes by their wildcard prefix", () => {
      // These scopes can no longer be saved but may exist in older rows.
      // The trailing access level is dropped and the result reflects the
      // effective `*.*` access that enforcement granted.
      expect(OAuthScopeHelper.normalizeScopes(["/api/*.*:read"], t)).toEqual([
        "Read and write workspace",
      ]);
    });
  });
});
