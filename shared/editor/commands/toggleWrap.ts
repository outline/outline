import { wrapIn, lift } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import isNodeActive from "../queries/isNodeActive";
import { Dispatch } from "../types";

export default function toggleWrap(
  type: NodeType,
  attrs?: Record<string, any>
) {
  return (state: EditorState, dispatch?: Dispatch) => {
    const isActive = isNodeActive(type)(state);

    if (isActive) {
      return lift(state, dispatch);
    }

    return wrapIn(type, attrs)(state, dispatch);
  };
}
