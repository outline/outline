import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { findParentNode, findSelectedNodeOfType } from "prosemirror-utils";

const isNodeActive = (type: NodeType, attrs: Record<string, any> = {}) => (
  state: EditorState
) => {
  if (!type) {
    return false;
  }

  const node =
    findSelectedNodeOfType(type)(state.selection) ||
    findParentNode((node) => node.type === type)(state.selection);

  if (!Object.keys(attrs).length || !node) {
    return !!node;
  }

  return node.node.hasMarkup(type, { ...node.node.attrs, ...attrs });
};

export default isNodeActive;
