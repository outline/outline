import type { Schema, Node as ProsemirrorNode, MarkType } from "prosemirror-model";
import { Transform } from "prosemirror-transform";

interface RemovalRange {
  from: number;
  to: number;
}

/**
 * Normalize hashtag marks by removing leading "#" characters from the marked text.
 *
 * @param doc The Prosemirror document.
 * @param schema The editor schema.
 * @returns The normalized document.
 */
export default function normalizeHashtags(
  doc: ProsemirrorNode,
  schema: Schema
): ProsemirrorNode {
  const hashtagMark = schema.marks.hashtag as MarkType | undefined;
  if (!hashtagMark) {
    return doc;
  }

  const removals: RemovalRange[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) {
      return;
    }

    if (!node.marks.some((mark) => mark.type === hashtagMark)) {
      return;
    }

    const match = /^#+/.exec(node.text);
    if (!match) {
      return;
    }

    const removeCount = match[0].length;
    removals.push({ from: pos, to: pos + removeCount });
  });

  if (!removals.length) {
    return doc;
  }

  const tr = new Transform(doc);
  removals
    .sort((a, b) => b.from - a.from)
    .forEach(({ from, to }) => {
      tr.delete(from, to);
    });

  return tr.doc;
}
