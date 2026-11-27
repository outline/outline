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

describe("Video node markdown round-trip", () => {
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
        nodes.video.create({
          src: "/api/attachments.redirect?id=x",
          title: "video.mp4",
          width: 640,
          height: 480,
        }),
        nodes.paragraph.create(null, schema.text("more")),
      ]);
      const roundTripped = parser.parse(serializer.serialize(doc));
      expect(roundTripped.toJSON()).toEqual(doc.toJSON());
    }
  );
});
