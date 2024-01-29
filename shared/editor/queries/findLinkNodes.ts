import { Node } from "prosemirror-model";
import { findChildren, NodeWithPos } from "./findChildren";

export default function findLinkNodes(doc: Node): NodeWithPos[] {
  const textNodes = findChildren(doc, (child) => child.isText);
  const nodes: NodeWithPos[] = [];

  for (const nodeWithPos of textNodes) {
    const hasLinkMark = nodeWithPos.node.marks.find(
      (mark) => mark.type.name === "link"
    );

    if (hasLinkMark) {
      nodes.push(nodeWithPos);
    }
  }

  return nodes;
}
