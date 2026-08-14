import { Node } from "prosemirror-model";
import { parser, schema, serializer } from "../../../test/editor";

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
