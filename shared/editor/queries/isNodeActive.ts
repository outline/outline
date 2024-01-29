import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Primitive } from "utility-types";
import { findParentNode } from "./findParentNode";

const isNodeActive =
  (type: NodeType, attrs: Record<string, Primitive> = {}) =>
  (state: EditorState) => {
    if (!type) {
      return false;
    }

    const nodeAfter = state.selection.$from.nodeAfter;
    let node = nodeAfter?.type === type ? nodeAfter : undefined;

    if (!node) {
      const parent = findParentNode((node) => node.type === type)(
        state.selection
      );
      node = parent?.node;
    }

    if (!Object.keys(attrs).length || !node) {
      return !!node;
    }

    return node.hasMarkup(type, { ...node.attrs, ...attrs });
  };

export default isNodeActive;
