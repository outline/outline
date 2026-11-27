import type { Node as ProsemirrorNode } from "prosemirror-model";
import { parser, schema, serializer } from "../../test/editor";

const { nodes } = schema;
const href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const wrap = (
  container: "blockquote" | "bullet_list",
  content: ProsemirrorNode[]
) =>
  nodes.doc.create(null, [
    container === "blockquote"
      ? nodes.blockquote.create(null, content)
      : nodes.bullet_list.create(null, [nodes.list_item.create(null, content)]),
  ]);

describe("Embed node markdown round-trip", () => {
  it.each([
    ["blockquote", false],
    ["blockquote", true],
    ["bullet_list", false],
    ["bullet_list", true],
  ] as const)(
    "keeps the following paragraph in the same %s (leading empty paragraph: %s)",
    (container, leadingEmpty) => {
      const build = (first: ProsemirrorNode) =>
        wrap(container, [
          ...(leadingEmpty ? [nodes.paragraph.create()] : []),
          first,
          nodes.paragraph.create(null, schema.text("more")),
        ]);
      const doc = build(nodes.embed.create({ href }));

      // Embeds parse back from markdown as a paragraph with a link.
      const expected = build(
        nodes.paragraph.create(
          null,
          schema.text(href, [schema.marks.link.create({ href })])
        )
      );
      const roundTripped = parser.parse(serializer.serialize(doc));
      expect(roundTripped.toJSON()).toEqual(expected.toJSON());
    }
  );
});
