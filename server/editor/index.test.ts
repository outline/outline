import { parser, serializer } from ".";

test("renders an empty doc", () => {
  const ast = parser.parse("");

  expect(ast?.toJSON()).toEqual({
    content: [{ type: "paragraph" }],
    type: "doc",
  });
});

test("parses lowercase alpha lists", () => {
  const ast = parser.parse("a. First item\nb. Second item");

  expect(ast?.toJSON()).toEqual({
    content: [
      {
        attrs: { listStyle: "lower-alpha", order: 1 },
        content: [
          {
            content: [
              {
                content: [{ text: "First item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
          {
            content: [
              {
                content: [{ text: "Second item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
        ],
        type: "ordered_list",
      },
    ],
    type: "doc",
  });
});

test("parses uppercase alpha lists", () => {
  const ast = parser.parse("A. First item\nB. Second item");

  expect(ast?.toJSON()).toEqual({
    content: [
      {
        attrs: { listStyle: "upper-alpha", order: 1 },
        content: [
          {
            content: [
              {
                content: [{ text: "First item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
          {
            content: [
              {
                content: [{ text: "Second item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
        ],
        type: "ordered_list",
      },
    ],
    type: "doc",
  });
});

test("parses alpha lists with blank lines (issue example)", () => {
  const markdown = `## 3. Step Three

a. Do this.

b. Do that.`;

  const ast = parser.parse(markdown);
  const json = ast?.toJSON();

  // Find the ordered_list in the result
  const orderedList = json?.content?.find(
    (node: { type: string }) => node.type === "ordered_list"
  );

  expect(orderedList).toBeDefined();
  expect(orderedList?.attrs.listStyle).toBe("lower-alpha");
  expect(orderedList?.attrs.order).toBe(1);
  expect(orderedList?.content).toHaveLength(2);
});

test("preserves numeric lists", () => {
  const ast = parser.parse("1. First item\n2. Second item");

  expect(ast?.toJSON()).toEqual({
    content: [
      {
        attrs: { listStyle: "number", order: 1 },
        content: [
          {
            content: [
              {
                content: [{ text: "First item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
          {
            content: [
              {
                content: [{ text: "Second item", type: "text" }],
                type: "paragraph",
              },
            ],
            type: "list_item",
          },
        ],
        type: "ordered_list",
      },
    ],
    type: "doc",
  });
});

test("serializes lowercase alpha lists back to markdown", () => {
  const ast = parser.parse("a. First item\nb. Second item");
  const output = serializer.serialize(ast);

  expect(output.trim()).toBe("a. First item\nb. Second item");
});

test("serializes uppercase alpha lists back to markdown", () => {
  const ast = parser.parse("A. First item\nB. Second item");
  const output = serializer.serialize(ast);

  expect(output.trim()).toBe("A. First item\nB. Second item");
});

describe("database block", () => {
  const collectionId = "11111111-1111-4111-8111-111111111111";
  const viewId = "22222222-2222-4222-8222-222222222222";

  test("round-trips through markdown", () => {
    const markdown = `Before

[Database](database://${collectionId}/${viewId})

After`;
    const ast = parser.parse(markdown);
    const json = ast?.toJSON();

    const block = json?.content?.find(
      (node: { type: string }) => node.type === "database"
    );
    expect(block).toBeDefined();
    expect(block?.attrs.collectionId).toEqual(collectionId);
    expect(block?.attrs.viewId).toEqual(viewId);

    const serialized = serializer.serialize(ast);
    expect(serialized).toContain(
      `[Database](database://${collectionId}/${viewId})`
    );

    const reparsed = parser.parse(serialized)?.toJSON();
    const reblock = reparsed?.content?.find(
      (node: { type: string }) => node.type === "database"
    );
    expect(reblock?.attrs.collectionId).toEqual(collectionId);
    expect(reblock?.attrs.viewId).toEqual(viewId);
  });

  test("round-trips without a view id", () => {
    const ast = parser.parse(`[Database](database://${collectionId})`);
    const block = ast
      ?.toJSON()
      ?.content?.find((node: { type: string }) => node.type === "database");
    expect(block?.attrs.collectionId).toEqual(collectionId);
    expect(block?.attrs.viewId).toBeNull();

    const output = serializer.serialize(ast);
    expect(output.trim()).toBe(`[Database](database://${collectionId})`);
  });

  test("does not parse regular links as database blocks", () => {
    const ast = parser.parse("[link](https://example.com)");
    const block = ast
      ?.toJSON()
      ?.content?.find((node: { type: string }) => node.type === "database");
    expect(block).toBeUndefined();
  });
});
