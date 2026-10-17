import type { Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { insertPoint } from "prosemirror-transform";

/**
 * Find the position to insert a node of the given type near a position that can
 * be inside text. Block nodes are inserted before or after the textblock that
 * contains the position, whichever side is nearer, rather than splitting it.
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

  const isNearStart = $pos.parentOffset <= $pos.parent.content.size / 2;
  const edge = isNearStart ? $pos.start() : $pos.end();

  return (
    insertPoint(doc, edge, type) ?? (isNearStart ? $pos.before() : $pos.after())
  );
}
