import { Node as ProseMirrorNode } from "prosemirror-model";
import { PlainTextSerializer } from "../types";

/**
 * Returns the text content between two positions.
 *
 * @param doc The Prosemirror document to use
 * @param from A start point
 * @param to An end point
 * @param plainTextSerializers A map of node names to PlainTextSerializers which convert a node to plain text
 * @returns A string of plain text
 */
export default function textBetween(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  plainTextSerializers: Record<string, PlainTextSerializer | undefined>
): string {
  const blockSeparator = "\n\n";
  let text = "";
  let separated = true;

  doc.nodesBetween(from, to, (node, pos) => {
    const toPlainText = plainTextSerializers[node.type.name];

    if (toPlainText) {
      if (node.isBlock && !separated) {
        text += blockSeparator;
        separated = true;
      }

      text += toPlainText(node);
    } else if (node.isText) {
      text += node.text?.slice(Math.max(from, pos) - pos, to - pos);
      separated = false;
    } else if (node.isBlock && !separated) {
      text += blockSeparator;
      separated = true;
    }
  });

  return text;
}
