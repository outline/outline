import type { Node } from "prosemirror-model";

export function isCode(node: Node) {
  return node.type.name === "code_block" || node.type.name === "code_fence";
}

/**
 * Returns true if the node is a code block with Mermaid language (supports both "mermaid" and "mermaidjs").
 *
 * @param node The node to check.
 * @returns true if the node is a Mermaid code block.
 */
export function isMermaid(node: Node) {
  return (
    isCode(node) &&
    (node.attrs.language === "mermaid" || node.attrs.language === "mermaidjs")
  );
}
