import { setBlockType } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import { isNodeActive } from "../queries/isNodeActive";

/**
 * Toggles the block type of the current selection between the given type and the toggle type.
 *
 * @param type The node type
 * @param toggleType The toggle node type
 * @returns A prosemirror command.
 */
export default function toggleBlockType(
  type: NodeType,
  toggleType: NodeType,
  attrs = {}
): Command {
  return (state, dispatch) => {
    const isActive = isNodeActive(type, attrs)(state);

    if (isActive) {
      return setBlockType(toggleType)(state, dispatch);
    }

    return setBlockType(type, attrs)(state, dispatch);
  };
}
