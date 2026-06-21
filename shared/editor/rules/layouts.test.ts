import { extensionManager, findNodes, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

const layoutMarkdown = `::::layout
:::layout_section
![](https://example.com/left.png)
:::
:::layout_section
![](https://example.com/right.png)
:::
::::`;

it("parses a layout into a container with two sections", () => {
  const ast = parser.parse(layoutMarkdown);
  const [layout] = findNodes(ast?.toJSON(), "container_layout");

  expect(layout).toBeDefined();
  expect(layout?.content).toHaveLength(2);
  expect(layout?.content?.[0].type).toBe("layout_section");
  expect(layout?.content?.[1].type).toBe("layout_section");

  const images = findNodes(layout, "image");
  expect(images).toHaveLength(2);
});

it("round-trips a layout through the serializer", () => {
  const ast = parser.parse(layoutMarkdown);
  const output = serializer.serialize(ast);

  const reparsed = parser.parse(output);
  const [layout] = findNodes(reparsed?.toJSON(), "container_layout");

  expect(layout).toBeDefined();
  expect(layout?.content).toHaveLength(2);
  expect(findNodes(layout, "image")).toHaveLength(2);
  expect(output).toContain("left.png");
  expect(output).toContain("right.png");
});

it("does not let the notice rule swallow layout fences", () => {
  const ast = parser.parse(layoutMarkdown);
  const json = ast?.toJSON();

  expect(findNodes(json, "container_layout")).toHaveLength(1);
  expect(findNodes(json, "container_notice")).toHaveLength(0);
});
