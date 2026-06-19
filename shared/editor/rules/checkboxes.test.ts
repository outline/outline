import { extensionManager, findNodes, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

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
