import type { Node } from "prosemirror-model";
import { MentionType } from "@shared/types";
import { parser } from "..";

function firstMention(markdown: string): Node | undefined {
  const doc = parser.parse(markdown);
  let mention: Node | undefined;

  doc?.descendants((node: Node) => {
    if (!mention && node.type.name === "mention") {
      mention = node;
    }
  });

  return mention;
}

describe("mention type rule", () => {
  it("should resolve a GitHub issue link", () => {
    const mention = firstMention(
      "@[Fix parser](https://github.com/acme/infra/issues/2)"
    );

    expect(mention?.attrs.type).toBe(MentionType.Issue);
    expect(mention?.attrs.href).toBe("https://github.com/acme/infra/issues/2");
    expect(mention?.attrs.label).toBe("Fix parser");
  });

  it("should resolve a GitHub pull request link", () => {
    const mention = firstMention(
      "@[Add parser](https://github.com/acme/infra/pull/5)"
    );

    expect(mention?.attrs.type).toBe(MentionType.PullRequest);
  });

  it("should resolve a GitHub project link", () => {
    const mention = firstMention(
      "@[Roadmap](https://github.com/orgs/acme/projects/1)"
    );

    expect(mention?.attrs.type).toBe(MentionType.Project);
  });

  it("should leave a GitHub link to an unmentionable resource generic", () => {
    const mention = firstMention("@[Repo](https://github.com/acme/infra)");

    expect(mention?.attrs.type).toBe(MentionType.URL);
  });

  it("should leave a link no plugin recognizes generic", () => {
    const mention = firstMention("@[Example](https://example.com/page)");

    expect(mention?.attrs.type).toBe(MentionType.URL);
    expect(mention?.attrs.href).toBe("https://example.com/page");
  });

  it("should not affect mention:// links", () => {
    const mention = firstMention(
      "@[John Doe](mention://a1b2c3d4-e5f6-7890-abcd-ef1234567890/user/f0e1d2c3-b4a5-6789-0abc-def123456789)"
    );

    expect(mention?.attrs.type).toBe(MentionType.User);
    expect(mention?.attrs.href).toBeUndefined();
  });

  it("should not convert a link without an @ prefix", () => {
    expect(
      firstMention("[Fix parser](https://github.com/acme/infra/issues/2)")
    ).toBeUndefined();
  });
});
