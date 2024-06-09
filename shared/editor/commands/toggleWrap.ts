import { wrapIn, lift } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import { Primitive } from "utility-types";
import { isNodeActive } from "../queries/isNodeActive";

export default function toggleWrap(
  type: NodeType,
  attrs?: Record<string, Primitive>
): Command {
  return (state, dispatch) => {
    const isActive = isNodeActive(type)(state);

    if (isActive) {
      return lift(state, dispatch);
    }

    return wrapIn(type, attrs)(state, dispatch);
  };
}
