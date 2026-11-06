import { Node } from "prosemirror-model";
import { parser, schema, serializer } from "../../../test/editor";
import { MarkdownSerializerState } from "./serializer";

describe("tables", () => {
  it("preserves line breaks and empty paragraphs in table cells", () => {
    const doc = Node.fromJSON(schema, {
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
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "next" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Line 1" }],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Line 2" }],
                    },
                    { type: "paragraph" },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Line 4" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const output = serializer.serialize(doc, { commonMark: true });

    expect(output).toContain("| Header<br>next |");
    expect(output).toContain("| Line 1<br>Line 2<br><br>Line 4 |");
  });
});

describe("code fences", () => {
  it("serializes code blocks containing backtick runs with a longer fence", () => {
    const doc = Node.fromJSON(schema, {
      type: "doc",
      content: [
        {
          type: "code_block",
          content: [
            { type: "text", text: "one\n``` not a closing fence\nthree" },
          ],
        },
      ],
    });
    const output = serializer.serialize(doc);

    expect(output.startsWith("````")).toBe(true);
    expect(parser.parse(output)?.toJSON()).toEqual(doc.toJSON());
  });

  it("round trips a code block followed by other content", () => {
    const markdown =
      "````\ntext with a\n``` fenced line\n````\n\nA paragraph after";
    const doc = parser.parse(markdown);
    const output = serializer.serialize(doc);

    expect(parser.parse(output)?.toJSON()).toEqual(doc?.toJSON());
  });

  it("parses only the first token of the fence info string as language", () => {
    const doc = parser.parse("``` • a whole sentence here\ncontent\n```");

    expect(doc?.firstChild?.type.name).toBe("code_block");
    expect(doc?.firstChild?.attrs.language).toBe("•");
  });

  it("serializes an unsafe language attribute as a single safe token", () => {
    const doc = Node.fromJSON(schema, {
      type: "doc",
      content: [
        {
          type: "code_block",
          attrs: { language: " ` not a ` language" },
          content: [{ type: "text", text: "content" }],
        },
      ],
    });
    const output = serializer.serialize(doc);
    const infoLine = output.split("\n")[0];

    expect(infoLine).toBe("```not");
    expect(parser.parse(output)?.firstChild?.type.name).toBe("code_block");
  });
});

describe("escaping", () => {
  const text = (value: string, marks: string[] = []) => ({
    type: "text",
    text: value,
    marks: marks.length ? marks.map((type) => ({ type })) : undefined,
  });
  const paragraph = (...content: (string | object)[]) =>
    Node.fromJSON(schema, {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: content.map((node) =>
            typeof node === "string" ? text(node) : node
          ),
        },
      ],
    });

  it("does not escape a period inside a number at the start of a line", () => {
    const output = serializer.serialize(paragraph("10.15.15.1"));

    expect(output).toBe("10.15.15.1");
    expect(parser.parse(output)?.firstChild?.type.name).toBe("paragraph");
  });

  it("escapes a period that would start an ordered list", () => {
    const output = serializer.serialize(paragraph("1. not a list"));

    expect(output).toBe("1\\. not a list");
    expect(parser.parse(output)?.firstChild?.type.name).toBe("paragraph");
  });

  it("escapes a number followed by a period at the end of a line", () => {
    const output = serializer.serialize(paragraph("1."));

    expect(output).toBe("1\\.");
    expect(parser.parse(output)?.firstChild?.type.name).toBe("paragraph");
  });

  it("does not escape a period inside a number at the start of a table cell", () => {
    const doc = Node.fromJSON(schema, {
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
                      content: [{ type: "text", text: "Address" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "10.12.14.21" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const output = serializer.serialize(doc, { commonMark: true });

    expect(output).toContain("| 10.12.14.21 |");
  });

  const expectRoundTrip = (doc: Node) => {
    const output = serializer.serialize(doc);

    expect(parser.parse(output)?.toJSON()).toEqual(doc.toJSON());
    return output;
  };

  it.each([
    "00:0c:29:de:ad:be",
    "x :ab: y",
    "pvc:3fa85f64-5717-4562-b3fc-2c963f66afa6:tail",
  ])("does not turn %s into an emoji", (value) => {
    expectRoundTrip(paragraph(text(value)));
  });

  it("does not escape colons that cannot form an emoji", () => {
    expect(expectRoundTrip(paragraph(text("10:30 http://x.com a:b")))).toBe(
      "10:30 http://x.com a:b"
    );
  });

  it.each(["__init__", "_private_", "snake_case _x"])(
    "does not turn underscores in %s into marks",
    (value) => {
      expectRoundTrip(paragraph(text(value)));
    }
  );

  it("does not escape underscores inside a word", () => {
    expect(serializer.serialize(paragraph(text("snake_case_name")))).toBe(
      "snake_case_name"
    );
  });

  it("does not decode entities in text", () => {
    expectRoundTrip(paragraph(text("&amp; &#58; & a&b")));
  });

  it("keeps a checkbox label that starts with an escaped character", () => {
    expectRoundTrip(
      Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "checkbox_list",
            content: [
              {
                type: "checkbox_item",
                content: [{ type: "paragraph", content: [text("*literal*")] }],
              },
            ],
          },
        ],
      })
    );
  });

  it("keeps inline code innermost when combined with other marks", () => {
    expect(
      expectRoundTrip(paragraph(text("kubectl get", ["strong", "code_inline"])))
    ).toBe("**`kubectl get`**");
    expectRoundTrip(
      paragraph(text("a", ["em"]), text("b", ["em", "code_inline"]))
    );
  });

  it.each([" padded ", " `a` ", "  ", " a"])(
    "keeps the spaces in inline code %j",
    (value) => {
      expectRoundTrip(paragraph(text(value, ["code_inline"])));
    }
  );

  it.each(["strong", "em", "underline", "strikethrough"])(
    "closes %s that ends in punctuation before a letter",
    (mark) => {
      expectRoundTrip(paragraph(text("done:", [mark]), text("next")));
    }
  );

  it.each(["strong", "em", "underline", "strikethrough"])(
    "opens %s that starts with punctuation after a letter",
    (mark) => {
      expectRoundTrip(paragraph(text("x"), text(":done", [mark])));
    }
  );

  it("marks part of a word", () => {
    expectRoundTrip(paragraph(text("a"), text("b", ["underline"]), text("c")));
    expectRoundTrip(
      paragraph(
        text("x"),
        text("y", ["strong", "em", "strikethrough"]),
        text("z")
      )
    );
    expectRoundTrip(
      paragraph(text("kubectl", ["strong", "code_inline"]), text("s"))
    );
  });

  it("encodes a whole astral character before a delimiter", () => {
    expect(
      expectRoundTrip(paragraph(text("\u{1D41A}"), text(":b", ["strong"])))
    ).toBe("&#119834;**:b**");
  });

  it.each([
    "https://example.com/_file",
    "https://example.com/:smile:/x",
    "https://example.com/?a=1&amp;b",
    "https://example.com/a*b~c",
  ])("does not escape the automatic link %s", (href) => {
    const doc = paragraph({
      type: "text",
      text: href,
      marks: [{ type: "link", attrs: { href } }],
    });

    expect(expectRoundTrip(doc)).toBe(`<${href}>`);
  });

  it("escapes text after an automatic link", () => {
    const href = "https://example.com/_file";

    expect(
      expectRoundTrip(
        paragraph(
          {
            type: "text",
            text: href,
            marks: [{ type: "link", attrs: { href } }],
          },
          text(" _x_")
        )
      )
    ).toBe(`<${href}> \\_x\\_`);
  });

  it("keeps a link target with escaped characters", () => {
    expectRoundTrip(
      paragraph({
        type: "text",
        text: "named",
        marks: [
          {
            type: "link",
            attrs: { href: "https://example.com/_f_:smile:&amp;" },
          },
        ],
      })
    );
  });

  it("does not encode characters when delimiters are already flanking", () => {
    expect(
      serializer.serialize(
        paragraph(text("a "), text("bold", ["strong"]), text("ly done"))
      )
    ).toBe("a **bold**ly done");
  });
});

describe("esc", () => {
  const esc = (text: string) =>
    new MarkdownSerializerState({}, {}, {}).esc(text, false);

  it("escapes an opening bracket before a link target", () => {
    expect(esc("[a](b)")).toBe("\\[a](b)");
  });

  it("does not escape brackets without a link target", () => {
    expect(esc("[a]")).toBe("[a]");
  });

  it("escapes every opening bracket before a link target", () => {
    expect(esc("[ [ x](y)")).toBe("\\[ \\[ x](y)");
  });

  it("does not escape when the link target is on a different line", () => {
    expect(esc("[a\n](b)")).toBe("[a\n](b)");
  });

  it("does not escape an opening bracket after the last link target", () => {
    expect(esc("x](y) [")).toBe("x](y) [");
  });
});

describe("expelEnclosingWhitespace", () => {
  const strong = (text: string) =>
    serializer.serialize(
      Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "x" },
              { type: "text", text, marks: [{ type: "strong" }] },
              { type: "text", text: "y" },
            ],
          },
        ],
      })
    );

  it("moves whitespace on both sides outside of the mark", () => {
    expect(strong(" a ")).toBe("x **a** y");
  });

  it("moves trailing whitespace outside of the mark", () => {
    expect(strong("a  ")).toBe("x**a**  y");
  });

  it("moves leading whitespace outside of the mark", () => {
    expect(strong("  a")).toBe("x  **a**y");
  });

  it("drops the mark when the text is only whitespace", () => {
    expect(strong("   ")).toBe("x   y");
  });

  it("keeps the mark when there is no whitespace", () => {
    expect(strong("a")).toBe("x**a**y");
  });

  it("keeps text after a newline", () => {
    expect(strong("a \nb")).toBe("x**a \nb**y");
  });
});
