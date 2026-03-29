import markdownit from "markdown-it";
import mentionRule from "./mention";

function findMentionTokens(tokens: ReturnType<markdownit["parse"]>) {
  const mentions: Array<{
    id: string | null;
    type: string | null;
    modelId: string | null;
    label: string;
  }> = [];

  for (const tok of tokens) {
    if (tok.type === "inline" && tok.children) {
      for (const child of tok.children) {
        if (child.type === "mention") {
          mentions.push({
            id: child.attrGet("id"),
            type: child.attrGet("type"),
            modelId: child.attrGet("modelId"),
            label: child.content,
          });
        }
      }
    }
  }

  return mentions;
}

describe("mention rule", () => {
  const md = markdownit().use(mentionRule);

  describe("3-segment format (existing)", () => {
    it("should parse a user mention", () => {
      const result = md.parse(
        "@[John Doe](mention://a1b2c3d4-e5f6-7890-abcd-ef1234567890/user/f0e1d2c3-b4a5-6789-0abc-def123456789)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toEqual({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        type: "user",
        modelId: "f0e1d2c3-b4a5-6789-0abc-def123456789",
        label: "John Doe",
      });
    });

    it("should parse a group mention", () => {
      const result = md.parse(
        "@[Engineering](mention://a1b2c3d4-e5f6-7890-abcd-ef1234567890/group/f0e1d2c3-b4a5-6789-0abc-def123456789)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("group");
      expect(mentions[0].label).toBe("Engineering");
    });
  });

  describe("2-segment format (new)", () => {
    it("should parse a user mention", () => {
      const result = md.parse(
        "@[John Doe](mention://user/f0e1d2c3-b4a5-6789-0abc-def123456789)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("user");
      expect(mentions[0].modelId).toBe("f0e1d2c3-b4a5-6789-0abc-def123456789");
      expect(mentions[0].label).toBe("John Doe");
      // instanceId should be auto-generated
      expect(mentions[0].id).toBeTruthy();
      expect(mentions[0].id).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
      );
    });

    it("should parse a group mention", () => {
      const result = md.parse("@[Engineering](mention://group/abc123)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("group");
      expect(mentions[0].modelId).toBe("abc123");
      expect(mentions[0].label).toBe("Engineering");
    });

    it("should parse mention with single-word name", () => {
      const result = md.parse("@[Alice](mention://user/abc123)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].label).toBe("Alice");
    });
  });

  describe("mixed content", () => {
    it("should parse mention within text", () => {
      const result = md.parse(
        "Hello @[John Doe](mention://user/abc123) please review",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].label).toBe("John Doe");
    });

    it("should parse multiple mentions", () => {
      const result = md.parse(
        "@[Alice](mention://user/id1) and @[Bob](mention://user/id2)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(2);
      expect(mentions[0].label).toBe("Alice");
      expect(mentions[1].label).toBe("Bob");
    });

    it("should parse mix of 2-segment and 3-segment mentions", () => {
      const result = md.parse(
        "@[Alice](mention://user/id1) and @[Bob](mention://inst-id/user/id2)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(2);
      expect(mentions[0].label).toBe("Alice");
      expect(mentions[0].id).toBeTruthy(); // auto-generated
      expect(mentions[1].label).toBe("Bob");
      expect(mentions[1].id).toBe("inst-id");
    });
  });

  describe("non-mentions", () => {
    it("should not parse regular links as mentions", () => {
      const result = md.parse("[John Doe](https://example.com)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(0);
    });

    it("should not parse links without @ prefix as mentions", () => {
      const result = md.parse("[John Doe](mention://user/abc123)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(0);
    });
  });
});
