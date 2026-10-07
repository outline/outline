import { parser, schema, serializer } from "../../test/editor";

/**
 * Wraps a block node in a single-cell table so cell serialization/parsing can
 * be exercised in isolation.
 */
function tableWith(cell: Record<string, unknown>) {
  return schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tr",
            content: [
              {
                type: "th",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Header" }],
                  },
                ],
              },
            ],
          },
          {
            type: "tr",
            content: [{ type: "td", content: [cell] }],
          },
        ],
      },
    ],
  });
}

/**
 * Parses markdown and collects the hard breaks and text of the result, so cell
 * break handling can be asserted without depending on the surrounding nodes.
 */
function parseBreaks(markdown: string) {
  const texts: string[] = [];
  let breakCount = 0;

  parser.parse(markdown)?.descendants((node) => {
    if (node.type.name === "br") {
      breakCount++;
    }
    if (node.isText) {
      texts.push(node.text ?? "");
    }
  });

  return { breakCount, texts };
}

it("round-trips a notice inside a table cell", () => {
  const doc = tableWith({
    type: "container_notice",
    attrs: { style: "warning" },
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "First | line" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Second line" }],
      },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("round-trips a code fence inside a table cell", () => {
  // A ``` fence always parses to a code_block node (see CodeFence.parseMarkdown),
  // so the round-trippable shape is code_block regardless of the table.
  const doc = tableWith({
    type: "code_block",
    attrs: { language: "javascript", wrap: false },
    content: [{ type: "text", text: "a | b\nc \\ d" }],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("round-trips a toggle block inside a table cell", () => {
  const doc = tableWith({
    type: "container_toggle",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Toggle | heading" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hidden body" }],
      },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("round-trips a math block inside a table cell", () => {
  const doc = tableWith({
    type: "math_block",
    content: [{ type: "text", text: "a | b\n\\frac{1}{2}" }],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("splits a table cell on an unescaped newline escape", () => {
  const { breakCount, texts } = parseBreaks(
    "| Header |\n|--------|\n| Line one\\nLine two |"
  );

  expect(breakCount).toBe(1);
  expect(texts).toContain("Line one");
  expect(texts).toContain("Line two");
});

it("keeps an escaped backslash in a table cell as text", () => {
  const { breakCount, texts } = parseBreaks(
    "| Header |\n|--------|\n| C:\\\\name |"
  );

  expect(breakCount).toBe(0);
  expect(texts).toContain("C:\\name");
});

it("keeps a multi-line paragraph cell as hard breaks, not a fenced block", () => {
  const doc = tableWith({
    type: "paragraph",
    content: [
      { type: "text", text: "Line one" },
      { type: "br" },
      { type: "text", text: "Line two" },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});
