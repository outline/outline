import parseMentionUrl from "./parseMentionUrl";

describe("parseMentionUrl", () => {
  it("should parse 3-segment mention URL", () => {
    expect(
      parseMentionUrl(
        "mention://9a17c1c8-d178-4350-9001-203a73070fcb/user/abc123def456"
      )
    ).toEqual({
      id: "9a17c1c8-d178-4350-9001-203a73070fcb",
      mentionType: "user",
      modelId: "abc123def456",
    });
  });

  it("should parse 2-segment mention URL", () => {
    expect(parseMentionUrl("mention://user/abc123def456")).toEqual({
      mentionType: "user",
      modelId: "abc123def456",
    });
  });

  it("should parse 2-segment mention URL with UUID modelId", () => {
    expect(
      parseMentionUrl("mention://user/9a17c1c8-d178-4350-9001-203a73070fcb")
    ).toEqual({
      mentionType: "user",
      modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
    });
  });

  it("should parse group mention type", () => {
    expect(parseMentionUrl("mention://group/abc123")).toEqual({
      mentionType: "group",
      modelId: "abc123",
    });
  });

  it("should parse pull_request mention type with underscore", () => {
    expect(
      parseMentionUrl(
        "mention://9a17c1c8-d178-4350-9001-203a73070fcb/pull_request/abc123"
      )
    ).toEqual({
      id: "9a17c1c8-d178-4350-9001-203a73070fcb",
      mentionType: "pull_request",
      modelId: "abc123",
    });
  });

  it("should return empty object for invalid URL", () => {
    expect(parseMentionUrl("https://example.com")).toEqual({});
  });

  it("should return empty object for empty string", () => {
    expect(parseMentionUrl("")).toEqual({});
  });
});
