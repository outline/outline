import type { NodeType } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
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
    const { selection } = state;

    // When the list node itself is selected via a NodeSelection, consider that
    // node directly — findParentNode would otherwise report its parent list.
    if (
      selection instanceof NodeSelection &&
      isList(selection.node, state.schema)
    ) {
      return selection.node.type === type;
    }

    const closestList = findParentNode((node) => isList(node, state.schema))(
      selection
    );
    return closestList?.node.type === type;
  };
