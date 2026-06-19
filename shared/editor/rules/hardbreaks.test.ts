import { extensionManager, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

const docWithHardBreak = schema.nodeFromJSON({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Line one" },
        { type: "br" },
        { type: "text", text: "Line two" },
      ],
    },
  ],
});

it("parses two trailing spaces as a hard break", () => {
  const ast = parser.parse("Line one  \nLine two");

  expect(ast?.toJSON()).toEqual(docWithHardBreak.toJSON());
});

it("parses a backslash line ending as a hard break", () => {
  const ast = parser.parse("Line one\\\nLine two");

  expect(ast?.toJSON()).toEqual(docWithHardBreak.toJSON());
});

it("serializes hard breaks as a CommonMark break when commonMark is set", () => {
  // The commonMark option is used when copying to the clipboard and exporting
  // documents – two trailing spaces are a standard Markdown hard break that
  // renders in external viewers and parses back into a `br`, unlike a bare
  // newline.
  expect(serializer.serialize(docWithHardBreak, { commonMark: true })).toBe(
    "Line one  \nLine two"
  );
});

it("round-trips hard breaks through the copy/export serializer", () => {
  let node = docWithHardBreak;

  for (let i = 0; i < 3; i++) {
    const markdown = serializer.serialize(node, { commonMark: true });
    node = parser.parse(markdown)!;
    expect(node.toJSON()).toEqual(docWithHardBreak.toJSON());
  }
});

it("serializes hard breaks inside tables as a literal break tag", () => {
  const docWithTable = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tr",
            content: [
              {
                type: "td",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      { type: "text", text: "Line one" },
                      { type: "br" },
                      { type: "text", text: "Line two" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(serializer.serialize(docWithTable, { commonMark: true })).toContain(
    "Line one<br>Line two"
  );
});
