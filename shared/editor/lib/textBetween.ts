import type { Node as ProseMirrorNode } from "prosemirror-model";

/**
 * Returns the text content between two positions.
 *
 * @param doc The Prosemirror document to use
 * @param from A start point
 * @param to An end point
 * @returns A string of plain text
 */
export default function textBetween(
  doc: ProseMirrorNode,
  from: number,
  to: number
): string {
  let text = "";
  let first = true;
  const blockSeparator = "\n";

  doc.nodesBetween(from, to, (node, pos) => {
    let nodeText = "";

    if (node.type.spec.leafText) {
      nodeText += node.type.spec.leafText(node);
    } else if (node.isText) {
      nodeText += node.textBetween(
        Math.max(from, pos) - pos,
        to - pos,
        blockSeparator
      );
    }

    if (
      node.isBlock &&
      ((node.isLeaf && nodeText) || node.isTextblock) &&
      blockSeparator
    ) {
      if (first) {
        first = false;
      } else {
        text += blockSeparator;
      }
    }

    text += nodeText;
  });

  return text;
}
