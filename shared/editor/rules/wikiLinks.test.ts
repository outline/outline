import MarkdownIt from "markdown-it";
import { MentionType } from "../../types";
import wikiLinks from "./wikiLinks";

const md = new MarkdownIt().use(wikiLinks);

function inlineChildren(src: string) {
  const token = md.parse(src, {}).find((t) => t.type === "inline");
  return token?.children ?? [];
}

describe("wikiLinks", () => {
  it("converts a wikilink to a document mention carrying the raw target", () => {
    const [token, ...rest] = inlineChildren("[[Target Note]]");
    expect(rest).toHaveLength(0);
    expect(token.type).toBe("mention");
    expect(token.attrGet("type")).toBe(MentionType.Document);
    expect(token.attrGet("modelId")).toBe("Target Note");
    expect(token.content).toBe("Target Note");
    expect(token.attrGet("id")).toBeTruthy();
  });

  it("uses the alias as the mention label", () => {
    const [token] = inlineChildren("[[Target Note|the target]]");
    expect(token.attrGet("modelId")).toBe("Target Note");
    expect(token.content).toBe("the target");
  });

  it("strips heading and block anchors from the target", () => {
    expect(inlineChildren("[[Note#Section]]")[0].attrGet("modelId")).toBe(
      "Note"
    );
    expect(inlineChildren("[[Note#^block|label]]")[0].attrGet("modelId")).toBe(
      "Note"
    );
  });

  it("converts an image embed to an image token", () => {
    const [token, ...rest] = inlineChildren("![[image.png]]");
    expect(rest).toHaveLength(0);
    expect(token.type).toBe("image");
    expect(token.attrGet("src")).toBe("image.png");
    expect(token.content).toBe("image.png");
  });

  it("converts a file wikilink to a link token", () => {
    const tokens = inlineChildren("[[report.pdf]]");
    expect(tokens.map((t) => t.type)).toEqual([
      "link_open",
      "text",
      "link_close",
    ]);
    expect(tokens[0].attrGet("href")).toBe("report.pdf");
  });

  it("treats a note embed (transclusion) as a document mention", () => {
    const [token] = inlineChildren("![[Target Note]]");
    expect(token.type).toBe("mention");
    expect(token.attrGet("modelId")).toBe("Target Note");
  });

  it("ignores wikilink syntax inside inline code", () => {
    const tokens = inlineChildren("`[[Target Note]]`");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("code_inline");
    expect(tokens[0].content).toBe("[[Target Note]]");
  });

  it("ignores wikilink syntax inside fenced code blocks", () => {
    const tokens = md.parse("```\n[[Target Note]]\n```\n", {});
    expect(tokens.some((t) => t.type === "inline")).toBe(false);
    expect(tokens.find((t) => t.type === "fence")?.content).toContain(
      "[[Target Note]]"
    );
  });

  it("leaves ordinary markdown links untouched", () => {
    const tokens = inlineChildren("[label](https://example.com)");
    expect(tokens.map((t) => t.type)).toEqual([
      "link_open",
      "text",
      "link_close",
    ]);
    expect(tokens[0].attrGet("href")).toBe("https://example.com");
  });
});
