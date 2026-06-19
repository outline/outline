import type { JSONNode } from "../../test/editor";
import { extensionManager, findNodes, schema } from "../../test/editor";

const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

const parseToJSON = (markdown: string): JSONNode | undefined =>
  parser.parse(markdown)?.toJSON();

describe("math markdown rules", () => {
  it("parses inline math", () => {
    const doc = parseToJSON("before $x + y$ after");
    const nodes = findNodes(doc, "math_inline");

    expect(nodes).toHaveLength(1);
    expect(nodes[0].content?.[0].text).toBe("x + y");
  });

  it("parses block math with closing delimiter on its own line", () => {
    const doc = parseToJSON("$$\na = b\n$$\n\nparagraph after");
    const nodes = findNodes(doc, "math_block");

    expect(nodes).toHaveLength(1);
    expect(nodes[0].content?.[0].text).toContain("a = b");
    expect(findNodes(doc, "paragraph")).toHaveLength(1);
  });

  it("parses block math with closing delimiter at the end of a content line", () => {
    const doc = parseToJSON("$$\na = b\nc = d$$\n\nparagraph after");
    const blocks = findNodes(doc, "math_block");

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content?.[0].text).toContain("a = b");
    expect(blocks[0].content?.[0].text).toContain("c = d");

    // The paragraph following the block must not be swallowed into the math
    const paragraphs = findNodes(doc, "paragraph");
    expect(paragraphs).toHaveLength(1);
    expect(blocks[0].content?.[0].text).not.toContain("paragraph after");
  });

  it("leaves unclosed inline math as plain text", () => {
    const doc = parseToJSON("price is $5 and rising");

    expect(findNodes(doc, "math_inline")).toHaveLength(0);
    expect(findNodes(doc, "math_block")).toHaveLength(0);
  });
});
