import { Node } from "prosemirror-model";
import { findTextNodes, NodeWithPos } from "prosemirror-utils";

export default function findLinkNodes(doc: Node): NodeWithPos[] {
  const textNodes = findTextNodes(doc);
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
