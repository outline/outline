import type { Node } from "prosemirror-model";
import { parser, schema, serializer } from "../../test/editor";

/**
 * Wraps block nodes in a single-cell table so cell serialization/parsing can
 * be exercised in isolation.
 */
function tableWith(...cell: Record<string, unknown>[]) {
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
            content: [{ type: "td", content: cell }],
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

/**
 * Reduces a table node to the text of each cell, row by row, with each cell
 * required to hold exactly one paragraph.
 */
function cellTexts(table: Node) {
  const rows: string[][] = [];
  table.forEach((row) => {
    const cells: string[] = [];
    row.forEach((cell) => {
      expect(cell.childCount).toBe(1);
      expect(cell.firstChild?.type.name).toBe("paragraph");
      cells.push(cell.textContent);
    });
    rows.push(cells);
  });
  return rows;
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

/**
 * Builds a list node of the given type holding one paragraph per item.
 */
function listOf(type: string, itemType: string, items: string[]) {
  return {
    type,
    content: items.map((text) => ({
      type: itemType,
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  };
}

it("round-trips a bullet list inside a table cell", () => {
  const doc = tableWith(listOf("bullet_list", "list_item", ["one", "two"]));

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("round-trips an ordered list inside a table cell", () => {
  const doc = tableWith(listOf("ordered_list", "list_item", ["one", "two"]));

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it.each(["lower-alpha", "upper-alpha"])(
  "round-trips a %s list inside a table cell",
  (listStyle) => {
    const doc = tableWith({
      ...listOf("ordered_list", "list_item", ["one", "two"]),
      attrs: { listStyle },
    });

    const markdown = serializer.serialize(doc, { commonMark: true });
    expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
  }
);

it("round-trips a paragraph followed by a list inside a table cell", () => {
  const doc = tableWith(
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Notes" },
        { type: "br" },
        { type: "text", text: "More" },
      ],
    },
    listOf("bullet_list", "list_item", ["one", "two"])
  );

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("round-trips a checkbox list inside a table cell", () => {
  const doc = tableWith(
    listOf("checkbox_list", "checkbox_item", ["one", "two"])
  );

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("keeps formatting in list items inside a table cell", () => {
  const doc = tableWith({
    type: "bullet_list",
    content: [
      {
        type: "list_item",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "plain " },
              { type: "text", marks: [{ type: "strong" }], text: "bold" },
            ],
          },
        ],
      },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("parses checkbox items without a list marker inside a table cell", () => {
  const doc = tableWith({
    type: "checkbox_list",
    content: [
      {
        type: "checkbox_item",
        attrs: { checked: false },
        content: [
          { type: "paragraph", content: [{ type: "text", text: "First" }] },
        ],
      },
      {
        type: "checkbox_item",
        attrs: { checked: true },
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Second" }] },
        ],
      },
    ],
  });

  const markdown = "| Header |\n|--------|\n| [ ] First<br>[x] Second |";
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("keeps a paragraph that starts with a dash as text inside a table cell", () => {
  const doc = tableWith({
    type: "paragraph",
    content: [{ type: "text", text: "- not a list" }],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("keeps lines that start with list markers as text inside a table cell", () => {
  const doc = tableWith({
    type: "paragraph",
    content: [
      { type: "text", text: "A. Smith" },
      { type: "br" },
      { type: "text", text: "- foo" },
      { type: "br" },
      { type: "text", text: "1. bar" },
      { type: "br" },
      { type: "text", text: "b. baz" },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("keeps a lone dash in a table cell as text", () => {
  const { texts } = parseBreaks("| Header |\n|--------|\n| - |");

  expect(texts).toContain("-");
});

it("keeps the space before inline code after a break in a table cell", () => {
  const doc = tableWith({
    type: "paragraph",
    content: [
      { type: "text", text: "first line" },
      { type: "br" },
      { type: "text", text: "App: " },
      { type: "text", marks: [{ type: "code_inline" }], text: "x" },
    ],
  });

  const markdown = serializer.serialize(doc, { commonMark: true });
  expect(parser.parse(markdown)!.toJSON()).toEqual(doc.toJSON());
});

it("parses multiple tables with content between them", () => {
  const doc = parser.parse(
    [
      "Intro",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "Middle",
      "",
      "| C |",
      "|---|",
      "| 3 |",
      "| 4 |",
      "",
      "Outro",
    ].join("\n")
  )!;

  const children: Node[] = [];
  doc.forEach((child) => children.push(child));

  expect(children.map((child) => child.type.name)).toEqual([
    "paragraph",
    "table",
    "paragraph",
    "table",
    "paragraph",
  ]);
  expect(children.map((child) => child.textContent)[2]).toBe("Middle");
  expect(cellTexts(children[1])).toEqual([
    ["A", "B"],
    ["1", "2"],
  ]);
  expect(cellTexts(children[3])).toEqual([["C"], ["3"], ["4"]]);
});

it("parses column alignment into header and body cells", () => {
  const doc = parser.parse(
    "| L | C | R | N |\n|:--|:-:|--:|---|\n| a | b | c | d |"
  )!;
  const table = doc.firstChild!;

  const alignments: unknown[][] = [];
  table.forEach((row) => {
    const cells: unknown[] = [];
    row.forEach((cell) => cells.push(cell.attrs.alignment));
    alignments.push(cells);
  });

  expect(alignments).toEqual([
    ["left", "center", "right", null],
    ["left", "center", "right", null],
  ]);
  expect(cellTexts(table)).toEqual([
    ["L", "C", "R", "N"],
    ["a", "b", "c", "d"],
  ]);
});

it("parses a table inside a list item", () => {
  const doc = parser.parse(
    "- Item\n\n  | A | B |\n  |---|---|\n  | 1 | 2 |\n- Next"
  )!;
  const list = doc.firstChild!;

  expect(list.type.name).toBe("bullet_list");
  expect(list.childCount).toBe(2);

  const item = list.firstChild!;
  expect(item.childCount).toBe(2);
  expect(item.firstChild?.textContent).toBe("Item");
  expect(item.lastChild?.type.name).toBe("table");
  expect(cellTexts(item.lastChild!)).toEqual([
    ["A", "B"],
    ["1", "2"],
  ]);
  expect(list.lastChild?.textContent).toBe("Next");
});

it("parses a table inside a blockquote", () => {
  const doc = parser.parse(
    "> | A | B |\n> |---|---|\n> | 1 | 2 |\n>\n> After"
  )!;
  const quote = doc.firstChild!;

  expect(quote.type.name).toBe("blockquote");
  expect(quote.childCount).toBe(2);
  expect(quote.firstChild?.type.name).toBe("table");
  expect(cellTexts(quote.firstChild!)).toEqual([
    ["A", "B"],
    ["1", "2"],
  ]);
  expect(quote.lastChild?.textContent).toBe("After");
});
