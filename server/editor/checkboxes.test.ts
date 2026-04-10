import { parser, serializer } from "@server/editor";

interface ProsemirrorNode {
  type: string;
  content?: ProsemirrorNode[];
  attrs?: Record<string, unknown>;
}

it("preserves mixed checkbox and regular items in a list", () => {
  const markdown = `- [x] Checked item
- Regular item
- [ ] Unchecked item`;

  const ast = parser.parse(markdown);
  const json = ast?.toJSON();

  const checkboxList = json?.content?.find(
    (node: ProsemirrorNode) => node.type === "checkbox_list"
  );

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(3);
  expect(checkboxList?.content[0].type).toBe("checkbox_item");
  expect(checkboxList?.content[1].type).toBe("checkbox_item");
  expect(checkboxList?.content[2].type).toBe("checkbox_item");
});

it("round-trips mixed checkbox lists through serializer", () => {
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

it("does not convert nested bullet list items inside checkbox lists", () => {
  const markdown = `- [x] Parent checkbox
    - Nested bullet item
    - Another nested item
- [ ] Second checkbox`;

  const ast = parser.parse(markdown);
  const json = ast?.toJSON();

  const checkboxList = json?.content?.find(
    (node: ProsemirrorNode) => node.type === "checkbox_list"
  );

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(2);
  expect(checkboxList?.content[0].type).toBe("checkbox_item");
  expect(checkboxList?.content[1].type).toBe("checkbox_item");

  // Nested list should remain a bullet_list, not a checkbox_list
  const nestedContent = checkboxList?.content[0].content;
  const nestedList = nestedContent?.find(
    (node: ProsemirrorNode) => node.type === "bullet_list"
  );
  expect(nestedList).toBeDefined();
  expect(nestedList?.content?.[0].type).toBe("list_item");
});
