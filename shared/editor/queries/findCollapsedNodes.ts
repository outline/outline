import { Node } from "prosemirror-model";
import { NodeWithPos } from "../types";
import { findBlockNodes } from "./findChildren";

export function findCollapsedNodes(doc: Node): NodeWithPos[] {
  const blocks = findBlockNodes(doc);
  const nodes: NodeWithPos[] = [];

  const collapsedStack: number[] = [];
  for (const block of blocks) {
    if (collapsedStack.length) {
      const top = collapsedStack[collapsedStack.length - 1];
      // if the block encountered same or higher level heading, pop the stack
      if (block.node.type.name === "heading" && block.node.attrs.level <= top) {
        collapsedStack.pop();

        // if the block is a heading and it is collapsed, push it to the stack
        if (block.node.attrs.collapsed) {
          collapsedStack.push(block.node.attrs.level);
        }
      } else {
        // the deepest level or non-heading block should be added to the nodes
        nodes.push(block);
      }
    } else {
      if (block.node.type.name === "heading" && block.node.attrs.collapsed) {
        collapsedStack.push(block.node.attrs.level);
      }
    }
  }

  return nodes;
}
