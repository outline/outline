import { schema } from "../../test/editor";

/**
 * Build the layout structure the drop handler creates: two columns, each a
 * paragraph wrapping a single inline image.
 */
function buildLayout() {
  const image = schema.nodes.image.create({ src: "https://example.com/a.png" });
  const section = (node = image) =>
    schema.nodes.layout_section.create(
      null,
      schema.nodes.paragraph.create(null, node)
    );
  return schema.nodes.container_layout.create(null, [section(), section()]);
}

it("constructs a valid two column layout from images", () => {
  const layout = buildLayout();

  // Throws if the content does not satisfy the schema.
  expect(() => layout.check()).not.toThrow();
  expect(layout.childCount).toBe(2);
  expect(layout.child(0).type.name).toBe("layout_section");
  expect(layout.child(0).firstChild?.type.name).toBe("paragraph");
  expect(layout.child(0).firstChild?.firstChild?.type.name).toBe("image");
});

it("rejects a layout with a single column", () => {
  const single = schema.nodes.container_layout.create(null, [
    schema.nodes.layout_section.create(
      null,
      schema.nodes.paragraph.create(null)
    ),
  ]);

  expect(() => single.check()).toThrow();
});

it("stores a resizable width on sections", () => {
  const section = schema.nodes.layout_section.create(
    { width: 70 },
    schema.nodes.paragraph.create(null)
  );

  expect(section.attrs.width).toBe(70);
});
