import { decodeURIComponentSafe, isAllowedLoginRedirect } from "./urls";

describe("decodeURIComponentSafe", () => {
  test("to handle % symbols", () => {
    expect(decodeURIComponentSafe("%")).toBe("%");
    expect(decodeURIComponentSafe("%25")).toBe("%");
  });

  test("to correctly account for encoded symbols", () => {
    expect(decodeURIComponentSafe("%7D")).toBe("}");
    expect(decodeURIComponentSafe("%2F")).toBe("/");
  });

  test("to handle malformed percent encoding", () => {
    // Single % at end of string
    expect(decodeURIComponentSafe("test%")).toBe("test%");

    // % followed by single hex digit
    expect(decodeURIComponentSafe("test%A")).toBe("test%A");

    // % followed by non-hex characters
    expect(decodeURIComponentSafe("test%GG")).toBe("test%GG");
    expect(decodeURIComponentSafe("test%XY")).toBe("test%XY");

    // % followed by space
    expect(decodeURIComponentSafe("test% ")).toBe("test% ");

    // Multiple malformed % symbols
    expect(decodeURIComponentSafe("%test%")).toBe("%test%");
    expect(decodeURIComponentSafe("%A%B")).toBe("%A%B");
  });

  test("to handle mixed valid and invalid percent encoding", () => {
    // Valid encoding mixed with invalid
    expect(decodeURIComponentSafe("%20test%")).toBe(" test%");
    expect(decodeURIComponentSafe("%7D%invalid")).toBe("}%invalid");
    expect(decodeURIComponentSafe("valid%20%")).toBe("valid %");

    // Complex mixed case
    expect(decodeURIComponentSafe("%20%A%2F%")).toBe(" %A/%");
  });

  test("to handle edge cases", () => {
    // Empty string
    expect(decodeURIComponentSafe("")).toBe("");

    // Only % symbols
    expect(decodeURIComponentSafe("%%%")).toBe("%%%");

    // Language specific characters
    expect(decodeURIComponentSafe("%E3%81%AB%E3%81%BB%E3%82%93%E3%81%94")).toBe(
      "にほんご"
    );

    // % at various positions
    expect(decodeURIComponentSafe("%start")).toBe("%start");
    expect(decodeURIComponentSafe("mid%dle")).toBe("mid%dle");
    expect(decodeURIComponentSafe("end%")).toBe("end%");

    // Already encoded %25 should decode to %
    expect(decodeURIComponentSafe("%25%25")).toBe("%%");
  });

  describe("isAllowedLoginRedirect", () => {
    test("should block disallowed paths", () => {
      expect(isAllowedLoginRedirect("/")).toBe(false);
      expect(isAllowedLoginRedirect("/create")).toBe(false);
      expect(isAllowedLoginRedirect("/home")).toBe(false);
      expect(isAllowedLoginRedirect("/logout")).toBe(false);
    });

    test("should block paths starting with /auth/", () => {
      expect(isAllowedLoginRedirect("/auth/")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/login")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/signup")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/callback")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/google")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/slack/callback")).toBe(false);
    });

    test("should block paths starting with /s/", () => {
      expect(isAllowedLoginRedirect("/s/")).toBe(false);
      expect(isAllowedLoginRedirect("/s/share")).toBe(false);
      expect(isAllowedLoginRedirect("/s/public")).toBe(false);
      expect(isAllowedLoginRedirect("/s/document/123")).toBe(false);
      expect(isAllowedLoginRedirect("/s/collection/456")).toBe(false);
    });

    test("should allow valid redirect paths", () => {
      expect(isAllowedLoginRedirect("/documents")).toBe(true);
      expect(isAllowedLoginRedirect("/settings")).toBe(true);
      expect(isAllowedLoginRedirect("/team")).toBe(true);
      expect(isAllowedLoginRedirect("/profile")).toBe(true);
      expect(isAllowedLoginRedirect("/document/123")).toBe(true);
      expect(isAllowedLoginRedirect("/collection/456")).toBe(true);
    });

    test("should strip query strings before checking", () => {
      expect(isAllowedLoginRedirect("/?foo=bar")).toBe(false);
      expect(isAllowedLoginRedirect("/create?id=123")).toBe(false);
      expect(isAllowedLoginRedirect("/home?tab=recent")).toBe(false);
      expect(isAllowedLoginRedirect("/logout?redirect=true")).toBe(false);
      expect(isAllowedLoginRedirect("/auth/login?next=/docs")).toBe(false);
      expect(isAllowedLoginRedirect("/s/share?token=abc")).toBe(false);
      expect(isAllowedLoginRedirect("/documents?search=test")).toBe(true);
      expect(isAllowedLoginRedirect("/settings?tab=profile")).toBe(true);
    });

    test("should handle edge cases", () => {
      expect(isAllowedLoginRedirect("")).toBe(true);
      expect(isAllowedLoginRedirect("/authenticate")).toBe(true); // doesn't start with /auth/
      expect(isAllowedLoginRedirect("/authorization")).toBe(true); // doesn't start with /auth/
      expect(isAllowedLoginRedirect("/authtest")).toBe(true); // doesn't start with /auth/
      expect(isAllowedLoginRedirect("/auth")).toBe(true); // doesn't start with /auth/
      expect(isAllowedLoginRedirect("/share")).toBe(true); // doesn't start with /s/
      expect(isAllowedLoginRedirect("/support")).toBe(true); // doesn't start with /s/
      expect(isAllowedLoginRedirect("/s")).toBe(true); // doesn't start with /s/
    });

    test("should handle paths with fragments", () => {
      expect(isAllowedLoginRedirect("/documents#section1")).toBe(true);
      expect(isAllowedLoginRedirect("/auth/login#forgot")).toBe(false);
      expect(isAllowedLoginRedirect("/s/share#public")).toBe(false);
      expect(isAllowedLoginRedirect("/#top")).toBe(false);
    });
  });
});
