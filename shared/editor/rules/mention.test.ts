import markdownit from "markdown-it";
import { MentionType } from "../../types";
import mentionRule from "./mention";

function findMentionTokens(tokens: ReturnType<markdownit["parse"]>) {
  const mentions: Array<{
    id: string | null;
    type: string | null;
    modelId: string | null;
    href: string | null;
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
            href: child.attrGet("href"),
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
        href: null,
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

  describe("date format", () => {
    it("should parse a date mention with an ISO date modelId", () => {
      const result = md.parse(
        "@[February 3rd, 2024](mention://a1b2c3d4-e5f6-7890-abcd-ef1234567890/date/2024-02-03)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("date");
      expect(mentions[0].modelId).toBe("2024-02-03");
      expect(mentions[0].label).toBe("February 3rd, 2024");
    });

    it("should parse a date mention with a time-specific modelId", () => {
      const result = md.parse(
        "@[February 3rd, 2024 at 1:00 PM](mention://a1b2c3d4-e5f6-7890-abcd-ef1234567890/date/2024-02-03T13:00)",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe("date");
      expect(mentions[0].modelId).toBe("2024-02-03T13:00");
      expect(mentions[0].label).toBe("February 3rd, 2024 at 1:00 PM");
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

  describe("external links", () => {
    it("should parse an external link as a generic mention carrying the href", () => {
      const result = md.parse("@[Example](https://example.com/page)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].type).toBe(MentionType.URL);
      expect(mentions[0].href).toBe("https://example.com/page");
      expect(mentions[0].label).toBe("Example");
      expect(mentions[0].id).toBeTruthy();
      expect(mentions[0].modelId).toBeTruthy();
    });

    it("should parse an external link within text", () => {
      const result = md.parse(
        "Please review @[Example](https://example.com/page) today",
        {}
      );
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].href).toBe("https://example.com/page");
    });

    it("should not parse a link with an unsupported protocol", () => {
      const result = md.parse("@[Mail](mailto:jane@example.com)", {});
      const mentions = findMentionTokens(result);

      expect(mentions).toHaveLength(0);
    });
  });

  describe("rendering", () => {
    it("should escape markup in the label", () => {
      const html = md.render(
        "@[<img src=x onerror=alert(1)>](mention://user/abc123)"
      );

      expect(html).not.toContain("<img");
      expect(html).toContain("&lt;img");
    });

    it("should not allow an external href to break out of the attribute", () => {
      const html = md.render('@[Example](https://example.com/"onmouseover=1)');

      expect(html).not.toContain('"onmouseover');
      expect(html).toContain('href="https://example.com/%22onmouseover=1"');
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

  describe("documents and collections", () => {
    const docId = "6f4e9a32-5b1c-4d2e-9f3a-8b7c6d5e4f30";

    const firstMention = (markdown: string) => {
      const inline = md.parse(markdown, {}).find((t) => t.type === "inline");
      return inline?.children?.find((t) => t.type === "mention");
    };

    it("should parse a document link with @ prefix as a document mention", () => {
      const mention = firstMention(`@[Roadmap](/doc/${docId})`);
      expect(mention?.attrGet("type")).toEqual(MentionType.Document);
      expect(mention?.attrGet("modelId")).toEqual(docId);
      expect(mention?.attrGet("id")).toBeTruthy();
      expect(mention?.attrGet("display")).toBeNull();
      expect(mention?.content).toEqual("Roadmap");
    });

    it("should keep the anchor of a document link", () => {
      const mention = firstMention(`@[Roadmap](/doc/${docId}#h-goals)`);
      expect(mention?.attrGet("anchorId")).toEqual("h-goals");
    });

    it("should parse a collection link with @ prefix as a collection mention", () => {
      const mention = firstMention(`@[Product](/collection/${docId})`);
      expect(mention?.attrGet("type")).toEqual(MentionType.Collection);
      expect(mention?.attrGet("modelId")).toEqual(docId);
    });

    it("should not parse a document link that uses a slug", () => {
      expect(firstMention("@[Roadmap](/doc/roadmap-abc123)")).toBeUndefined();
    });

    it("should not parse a collection link with an anchor", () => {
      expect(
        firstMention(`@[Product](/collection/${docId}#h-goals)`)
      ).toBeUndefined();
    });

    it("should not parse a document link without @ prefix", () => {
      expect(firstMention(`[Roadmap](/doc/${docId})`)).toBeUndefined();
    });
  });

  describe("card display", () => {
    const displayOf = (markdown: string) => {
      const inline = md.parse(markdown, {}).find((t) => t.type === "inline");
      return inline?.children
        ?.find((t) => t.type === "mention")
        ?.attrGet("display");
    };

    it("should read the card display from the link title", () => {
      expect(displayOf('@[Example](https://example.com/a?b=c "card")')).toEqual(
        "card"
      );
      expect(
        displayOf(
          '@[Roadmap](/doc/6f4e9a32-5b1c-4d2e-9f3a-8b7c6d5e4f30 "card")'
        )
      ).toEqual("card");
    });

    it("should ignore other link titles", () => {
      expect(displayOf('@[Example](https://example.com "other")')).toBeNull();
    });

    it("should render the display in HTML", () => {
      expect(md.render('@[Example](https://example.com "card")')).toContain(
        'data-display="card"'
      );
    });
  });
});
