import type { NodeType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { findParentNode } from "./findParentNode";
import { isList } from "./isList";

/**
 * Checks whether the list closest to the current selection is of the given
 * type. Unlike isNodeActive, this only matches the innermost list so that a
 * nested list does not also mark an ancestor list of a different type as
 * active in the toolbar.
 *
 * @param type the list node type to check for.
 * @returns a function that returns true when the closest list is of the type.
 */
export const isListActive =
  (type: NodeType) =>
  (state: EditorState): boolean => {
    const closestList = findParentNode((node) => isList(node, state.schema))(
      state.selection
    );
    return closestList?.node.type === type;
  };
