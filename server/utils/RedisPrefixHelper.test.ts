import { RedisPrefixHelper } from "./RedisPrefixHelper";

describe("RedisPrefixHelper", () => {
  describe("getUnfurlKey", () => {
    it("should generate key with teamId, userId and url", () => {
      const result = RedisPrefixHelper.getUnfurlKey(
        "team-123",
        "user-123",
        "https://example.com"
      );
      expect(result).toBe("unfurl:team-123:user-123:https://example.com");
    });

    it("should handle special characters in url", () => {
      const url = "https://example.com/path?query=value&other=123";
      const result = RedisPrefixHelper.getUnfurlKey("team-789", "user-1", url);
      expect(result).toBe(
        "unfurl:team-789:user-1:https://example.com/path?query=value&other=123"
      );
    });

    it("should start with the team prefix", () => {
      const result = RedisPrefixHelper.getUnfurlKey("team-1", "user-1", "url");
      expect(
        result.startsWith(RedisPrefixHelper.getUnfurlPrefix("team-1"))
      ).toBe(true);
      expect(result.startsWith(RedisPrefixHelper.getUnfurlPrefix())).toBe(true);
    });
  });

  describe("getUnfurlPrefix", () => {
    it("should generate prefix with teamId", () => {
      expect(RedisPrefixHelper.getUnfurlPrefix("team-456")).toBe(
        "unfurl:team-456:"
      );
    });

    it("should generate prefix for all teams", () => {
      expect(RedisPrefixHelper.getUnfurlPrefix()).toBe("unfurl:");
    });
  });

  describe("getCollectionDocumentsKey", () => {
    it("should generate key with collectionId", () => {
      const collectionId = "col-abc123";
      const result = RedisPrefixHelper.getCollectionDocumentsKey(collectionId);
      expect(result).toBe("cd:col-abc123");
    });

    it("should handle uuid format", () => {
      const collectionId = "550e8400-e29b-41d4-a716-446655440000";
      const result = RedisPrefixHelper.getCollectionDocumentsKey(collectionId);
      expect(result).toBe("cd:550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("getEmbedCheckKey", () => {
    it("should generate key with url", () => {
      const url = "https://example.com/embed";
      const result = RedisPrefixHelper.getEmbedCheckKey(url);
      expect(result).toBe("embed:https://example.com/embed");
    });

    it("should handle urls with query parameters", () => {
      const url = "https://example.com/video?v=abc123";
      const result = RedisPrefixHelper.getEmbedCheckKey(url);
      expect(result).toBe("embed:https://example.com/video?v=abc123");
    });

    it("should handle urls with fragments", () => {
      const url = "https://example.com/page#section";
      const result = RedisPrefixHelper.getEmbedCheckKey(url);
      expect(result).toBe("embed:https://example.com/page#section");
    });
  });
});
