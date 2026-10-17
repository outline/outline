import type { Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { insertPoint } from "prosemirror-transform";

/**
 * Find the position to insert a node of the given type near a position that can
 * be inside text. Block nodes are inserted before or after the textblock that
 * contains the position, rather than splitting it.
 *
 * @param doc The document to insert into.
 * @param pos The requested position.
 * @param type The type of node to insert.
 * @returns the position to insert the node at.
 */
export function findBlockInsertPos(
  doc: ProsemirrorNode,
  pos: number,
  type: NodeType
): number {
  const $pos = doc.resolve(pos);
  if (type.isInline || !$pos.parent.isTextblock) {
    return pos;
  }

  // At the start or end of a textblock, including an empty one.
  const point = insertPoint(doc, pos, type);
  if (point !== null) {
    return point;
  }

  // In the middle of text, below the textblock.
  const after = $pos.after();
  return insertPoint(doc, after, type) ?? after;
}
