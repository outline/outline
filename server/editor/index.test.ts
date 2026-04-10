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
    (node: any) => node.type === "ordered_list"
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

test("preserves mixed checkbox and regular items in a list", () => {
  const markdown = `- [x] Checked item
- Regular item
- [ ] Unchecked item`;

  const ast = parser.parse(markdown);
  const json = ast?.toJSON();

  const checkboxList = json?.content?.find(
    (node: any) => node.type === "checkbox_list"
  );

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(3);
  expect(checkboxList?.content[0].type).toBe("checkbox_item");
  expect(checkboxList?.content[1].type).toBe("checkbox_item");
  expect(checkboxList?.content[2].type).toBe("checkbox_item");
});

test("round-trips mixed checkbox lists through serializer", () => {
  const markdown = `- [x] Checked
- Plain text
- [ ] Unchecked`;

  const ast = parser.parse(markdown);
  const output = serializer.serialize(ast);

  // All items should survive the round-trip
  expect(output).toContain("Checked");
  expect(output).toContain("Plain text");
  expect(output).toContain("Unchecked");
});
