import { Node } from "prosemirror-model";

export function isCode(node: Node) {
  return node.type.name === "code_block" || node.type.name === "code_fence";
}
