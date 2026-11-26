import type { Node as ProsemirrorNode } from "prosemirror-model";
import { parser, schema, serializer } from "../../test/editor";

const { nodes } = schema;

const wrap = (
  container: "blockquote" | "bullet_list",
  content: ProsemirrorNode[]
) =>
  nodes.doc.create(null, [
    container === "blockquote"
      ? nodes.blockquote.create(null, content)
      : nodes.bullet_list.create(null, [nodes.list_item.create(null, content)]),
  ]);

describe("Attachment node markdown round-trip", () => {
  it.each([
    ["blockquote", false],
    ["blockquote", true],
    ["bullet_list", false],
    ["bullet_list", true],
  ] as const)(
    "keeps the following paragraph in the same %s (leading empty paragraph: %s)",
    (container, leadingEmpty) => {
      const doc = wrap(container, [
        ...(leadingEmpty ? [nodes.paragraph.create()] : []),
        nodes.attachment.create({
          href: "/api/attachments.redirect?id=x",
          title: "file.pdf",
          size: "12345",
        }),
        nodes.paragraph.create(null, schema.text("more")),
      ]);
      const roundTripped = parser.parse(serializer.serialize(doc));
      expect(roundTripped.toJSON()).toEqual(doc.toJSON());
    }
  );
});
