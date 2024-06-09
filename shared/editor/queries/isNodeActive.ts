import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Primitive } from "utility-types";
import { findParentNode } from "./findParentNode";

/**
 * Checks if a node is active in the current selection or not.
 *
 * @param type The node type to check.
 * @param attrs The attributes to check.
 * @returns A function that checks if a node is active in the current selection or not.
 */
export const isNodeActive =
  (type: NodeType, attrs: Record<string, Primitive> = {}) =>
  (state: EditorState) => {
    if (!type) {
      return false;
    }

    const nodeAfter = state.selection.$from.nodeAfter;
    let node = nodeAfter?.type === type ? nodeAfter : undefined;

    if (!node) {
      const parent = findParentNode((n) => n.type === type)(state.selection);
      node = parent?.node;
    }

    if (!Object.keys(attrs).length || !node) {
      return !!node;
    }

    return node.hasMarkup(type, { ...node.attrs, ...attrs });
  };
