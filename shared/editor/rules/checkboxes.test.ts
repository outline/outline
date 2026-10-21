import { findNodes, parser, serializer } from "../../test/editor";

it("preserves mixed checkbox and regular items in a list", () => {
  const markdown = `- [x] Checked item
- Regular item
- [ ] Unchecked item`;

  const ast = parser.parse(markdown);
  const [checkboxList] = findNodes(ast?.toJSON(), "checkbox_list");

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(3);
  expect(checkboxList?.content?.[0].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[2].type).toBe("checkbox_item");
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
  const [checkboxList] = findNodes(ast?.toJSON(), "checkbox_list");

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(2);
  expect(checkboxList?.content?.[0].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].type).toBe("checkbox_item");

  // Nested list should remain a bullet_list, not a checkbox_list
  const [nestedList] = findNodes(checkboxList?.content?.[0], "bullet_list");
  expect(nestedList).toBeDefined();
  expect(nestedList?.content?.[0].type).toBe("list_item");
});

it("converts a list where a plain item precedes a checkbox item", () => {
  const markdown = `- Item one
- [ ] Item two`;

  const ast = parser.parse(markdown);
  const [checkboxList] = findNodes(ast?.toJSON(), "checkbox_list");

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(2);
  expect(checkboxList?.content?.[0].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].type).toBe("checkbox_item");
  expect(serializer.serialize(ast)).toBe(`- [ ] Item one
- [ ] Item two`);
});

it("converts a nested list where a plain item precedes a checkbox item", () => {
  const markdown = `- Parent
    - Nested plain
    - [x] Nested checkbox
- Sibling`;

  const ast = parser.parse(markdown);
  const [bulletList] = findNodes(ast?.toJSON(), "bullet_list");
  const [checkboxList] = findNodes(ast?.toJSON(), "checkbox_list");

  expect(bulletList?.content).toHaveLength(2);
  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(2);
  expect(checkboxList?.content?.[0].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].attrs?.checked).toBe(true);
});

it("converts an ordered list containing a checkbox item", () => {
  const markdown = `1. Item one
2. [ ] Item two`;

  const ast = parser.parse(markdown);
  const [checkboxList] = findNodes(ast?.toJSON(), "checkbox_list");

  expect(checkboxList).toBeDefined();
  expect(checkboxList?.content).toHaveLength(2);
  expect(checkboxList?.content?.[0].type).toBe("checkbox_item");
  expect(checkboxList?.content?.[1].type).toBe("checkbox_item");
});

it("leaves neighbouring lists untouched when a checklist has multiple items", () => {
  const markdown = `## Before 1
- B1 a
- B1 b

## Before 2
- B2 a
- B2 b

## Tasks
- [ ] task one
- [ ] task two

## After 1
- A1 a
- A1 b

## After 2
- A2 a`;

  const ast = parser.parse(markdown);
  const json = ast?.toJSON();

  const checkboxLists = findNodes(json, "checkbox_list");
  expect(checkboxLists).toHaveLength(1);
  expect(checkboxLists[0]?.content).toHaveLength(2);

  const bulletLists = findNodes(json, "bullet_list");
  expect(bulletLists).toHaveLength(4);
  for (const list of bulletLists) {
    for (const item of list?.content ?? []) {
      expect(item.type).toBe("list_item");
    }
  }

  const output = serializer.serialize(ast);
  expect(output).toContain("B2 a");
  expect(output).toContain("A1 a");
  expect(output).toContain("A1 b");
  expect(output).not.toContain("[ ] B2 a");
});
