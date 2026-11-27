import type { JSONNode } from "../../test/editor";
import { findNodes, parser, serializer } from "../../test/editor";

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

  it("does not open block math when text follows the opening delimiter", () => {
    const doc = parseToJSON("$$ signs mean money\n\n## Next\n\nmore");

    expect(findNodes(doc, "math_block")).toHaveLength(0);
    expect(findNodes(doc, "heading")).toHaveLength(1);
    expect(findNodes(doc, "paragraph")).toHaveLength(2);
  });

  it("does not open block math for inline math at the start of a line", () => {
    const doc = parseToJSON("$$a+b$$ is the formula\n\n## Next\n\nmore");

    expect(findNodes(doc, "math_block")).toHaveLength(0);
    expect(findNodes(doc, "heading")).toHaveLength(1);
    expect(findNodes(doc, "paragraph")).toHaveLength(2);
  });

  it("round-trips serialized block math", () => {
    const markdown = "$$\na = b\nc = d\n$$\n\n## Next\n\nmore";
    const parsed = parser.parse(markdown);
    const blocks = findNodes(parsed?.toJSON(), "math_block");

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content?.[0].text).toBe("a = b\nc = d");
    expect(serializer.serialize(parsed)).toBe(markdown);
  });
});
