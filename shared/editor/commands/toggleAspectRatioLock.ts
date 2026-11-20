import type { NodeType } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";

/**
 * Toggles whether a selected node of the given type keeps its aspect ratio when
 * resized. An unset value means locked, so locking clears the attribute.
 *
 * @param type - the node type that stores the lock.
 * @returns the command.
 */
export function toggleAspectRatioLock(type: NodeType): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!(selection instanceof NodeSelection) || selection.node.type !== type) {
      return false;
    }

    const { attrs } = selection.node;
    const transaction = state.tr
      .setNodeMarkup(selection.from, undefined, {
        ...attrs,
        lockAspectRatio: attrs.lockAspectRatio === false ? null : false,
      })
      .setMeta("addToHistory", true);
    const $pos = transaction.doc.resolve(selection.from);
    dispatch?.(transaction.setSelection(new NodeSelection($pos)));
    return true;
  };
}
