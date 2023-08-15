import { EditorState } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import { findBlockNodes, NodeWithPos } from "./findChildren";

export default function findCollapsedNodes(
  state: EditorState,
  decorations: DecorationSet
): NodeWithPos[] {
  const blocks = findBlockNodes(state.doc);
  const nodes: NodeWithPos[] = [];

  let withinCollapsedHeading;

  for (const block of blocks) {
    if (block.node.type.name === "heading") {
      if (
        !withinCollapsedHeading ||
        block.node.attrs.level <= withinCollapsedHeading
      ) {
        if (
          decorations.find(
            block.pos,
            block.pos + block.node.nodeSize,
            (spec) => spec.collapsed
          ).length
        ) {
          if (!withinCollapsedHeading) {
            withinCollapsedHeading = block.node.attrs.level;
          }
        } else {
          withinCollapsedHeading = undefined;
        }
        continue;
      }
    }

    if (withinCollapsedHeading) {
      nodes.push(block);
    }
  }

  return nodes;
}
