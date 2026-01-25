import { NodeSelection } from "prosemirror-state";
import type { NodeType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { Primitive } from "utility-types";
import { findParentNode } from "./findParentNode";
import { isSelectionInToggleBlockHead } from "./toggleBlock";

type Options = {
  /** Only return match if the range and attrs is exact */
  exact?: boolean;
  /** If true then node must contain entire selection */
  inclusive?: boolean;
};

/**
 * Checks if a node is active in the current selection or not.
 *
 * @param type The node type to check.
 * @param attrs The attributes to check.
 * @param options The options to use.
 * @returns A function that checks if a node is active in the current selection or not.
 */
export const isNodeActive =
  (type: NodeType, attrs?: Record<string, Primitive>, options?: Options) =>
  (state: EditorState): boolean => {
    if (!type) {
      return false;
    }

    if (type === state.schema.nodes.container_toggle) {
      // `container_toggle` is a special case where it's considered active
      // only when the selection lies within its head
      return isSelectionInToggleBlockHead(state);
    }

    let nodeWithPos;
    const { from, to } = state.selection;

    if (
      state.selection instanceof NodeSelection &&
      state.selection.node.type === type &&
      state.selection.node.hasMarkup(type, {
        ...state.selection.node.attrs,
        ...attrs,
      })
    ) {
      nodeWithPos = { pos: from, node: state.selection.node };
    }

    nodeWithPos ??= findParentNode(
      (node) =>
        node.type === type &&
        (!attrs || node.hasMarkup(type, { ...node.attrs, ...attrs }))
    )(state.selection);

    if (!nodeWithPos) {
      return false;
    }

    if (options?.inclusive) {
      // Check if the node's position contains the entire selection
      return (
        nodeWithPos.pos <= from &&
        nodeWithPos.pos + nodeWithPos.node.nodeSize >= to
      );
    }

    if (options?.exact) {
      // Check if node's range exactly matches selection
      return (
        nodeWithPos.pos === from &&
        nodeWithPos.pos + nodeWithPos.node.nodeSize === to
      );
    }

    return true;
  };
