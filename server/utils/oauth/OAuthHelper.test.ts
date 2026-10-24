import { OAuthHelper } from "./OAuthHelper";

describe("OAuthHelper", () => {
  describe("isValidRedirectUri", () => {
    it.each([
      "https://example.com/callback",
      "https://example.com:8443/callback?state=1",
      "https://localhost/callback",
      "http://localhost/callback",
      "http://localhost:54321/callback",
      "http://127.0.0.1:8080/callback",
      "http://[::1]:8080/callback",
      "com.example.app:/oauth2redirect",
      "myapp://callback",
    ])("should accept %s", (uri) => {
      expect(OAuthHelper.isValidRedirectUri(uri)).toBe(true);
    });

    it.each([
      "not-a-url",
      "",
      "http://evil.com/callback",
      "https://example.com/callback#fragment",
      "https://*.example.com/callback",
      "*",
      "ftp://example.com/callback",
      "ws://example.com/callback",
      "wss://example.com/callback",
      "blob:https://example.com/550e8400-e29b-41d4-a716-446655440000",
      "javascript:alert(1)",
      "data:text/html,hello",
      "file:///etc/passwd",
      "https://example.com/call\nback",
      "https://example.com/call back",
      "https:/example.com/callback",
      "https:example.com/callback",
    ])("should reject %j", (uri) => {
      expect(OAuthHelper.isValidRedirectUri(uri)).toBe(false);
    });
  });
});
