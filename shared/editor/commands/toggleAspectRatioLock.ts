import type { NodeType } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection } from "prosemirror-state";
import {
  isAspectRatioLocked,
  isAspectRatioLockedByDefault,
} from "../queries/isAspectRatioLocked";

/**
 * Toggles whether a selected node of the given type keeps its aspect ratio when
 * resized. The attribute is cleared when the new state is the type default.
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

    const isLocked = !isAspectRatioLocked(selection.node);
    const transaction = state.tr
      .setNodeMarkup(selection.from, undefined, {
        ...selection.node.attrs,
        lockAspectRatio:
          isLocked === isAspectRatioLockedByDefault(type) ? null : isLocked,
      })
      .setMeta("addToHistory", true);
    const $pos = transaction.doc.resolve(selection.from);
    dispatch?.(transaction.setSelection(new NodeSelection($pos)));
    return true;
  };
}
