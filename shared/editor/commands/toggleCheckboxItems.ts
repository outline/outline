import type { Node, NodeType } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { findParentNode } from "../queries/findParentNode";

/**
 * A prosemirror command to toggle the checkboxs at the current selection.
 * When multiple checkbox items are selected, toggles all of them: if any are
 * checked, all become unchecked; otherwise all become checked.
 *
 * @param type The checkbox item node type.
 * @returns A prosemirror command.
 */
export function toggleCheckboxItems(type: NodeType): Command {
  return (state, dispatch) => {
    const { empty, from, to } = state.selection;

    // If selection spans multiple nodes, find all checkbox items in range
    if (!empty) {
      const checkboxes: Array<{ pos: number; node: Node }> = [];

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === type) {
          checkboxes.push({ pos, node });
          return false; // Don't descend into checkbox items
        }
        return true;
      });

      if (checkboxes.length === 0) {
        return false;
      }

      // If any are checked, uncheck all; otherwise check all
      const anyChecked = checkboxes.some((cb) => cb.node.attrs.checked);
      const newCheckedState = !anyChecked;

      if (dispatch) {
        let tr = state.tr;
        // Apply in reverse order to preserve positions
        for (let i = checkboxes.length - 1; i >= 0; i--) {
          const { pos, node } = checkboxes[i];
          tr = tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            checked: newCheckedState,
          });
        }
        dispatch(tr);
      }
      return true;
    }

    // Single cursor: toggle the parent checkbox item
    const listItem = findParentNode((node) => node.type === type)(
      state.selection
    );

    if (!listItem) {
      return false;
    }

    dispatch?.(
      state.tr.setNodeMarkup(listItem.pos, undefined, {
        checked: !listItem.node.attrs.checked,
      })
    );
    return true;
  };
}
