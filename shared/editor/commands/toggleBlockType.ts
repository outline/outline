import { setBlockType } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import isNodeActive from "../queries/isNodeActive";

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
