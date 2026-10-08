import { Node } from "prosemirror-model";
import { parser, schema, serializer } from "../../../test/editor";

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
