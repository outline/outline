import { Schema } from "prosemirror-model";
import { requiresTrailingNode, withTrailingNode } from "./trailingNode";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: { group: "block", content: "inline*" },
    code_block: { group: "block", content: "inline*" },
    image: { group: "inline", inline: true },
    text: { group: "inline" },
  },
});

const doc = (...children: object[]) =>
  schema.nodeFromJSON({ type: "doc", content: children });

const paragraph = (text?: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});

describe("requiresTrailingNode", () => {
  it("is false when the document ends in a paragraph", () => {
    expect(requiresTrailingNode(doc(paragraph("hello")))).toBe(false);
  });

  it("is false when the document ends in a heading", () => {
    expect(
      requiresTrailingNode(
        doc({ type: "heading", content: [{ type: "text", text: "title" }] })
      )
    ).toBe(false);
  });

  it("is true when the document ends in another block type", () => {
    expect(
      requiresTrailingNode(
        doc({ type: "code_block", content: [{ type: "text", text: "x" }] })
      )
    ).toBe(true);
  });

  it("is true when the last paragraph contains only non-text content", () => {
    expect(
      requiresTrailingNode(
        doc({ type: "paragraph", content: [{ type: "image" }] })
      )
    ).toBe(true);
  });
});

describe("withTrailingNode", () => {
  it("appends a trailing paragraph when required", () => {
    const result = withTrailingNode(
      doc({ type: "code_block", content: [{ type: "text", text: "x" }] })
    );
    expect(result.childCount).toBe(2);
    expect(result.lastChild?.type.name).toBe("paragraph");
    expect(result.lastChild?.content.size).toBe(0);
  });

  it("is a no-op when a trailing paragraph already exists", () => {
    const input = doc(
      { type: "code_block", content: [{ type: "text", text: "x" }] },
      paragraph()
    );
    expect(withTrailingNode(input).eq(input)).toBe(true);
  });

  it("is idempotent", () => {
    const once = withTrailingNode(
      doc({ type: "code_block", content: [{ type: "text", text: "x" }] })
    );
    expect(withTrailingNode(once).eq(once)).toBe(true);
  });
});
