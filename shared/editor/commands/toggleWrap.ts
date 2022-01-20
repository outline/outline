import { wrapIn, lift } from "prosemirror-commands";
import { NodeType } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import isNodeActive from "../queries/isNodeActive";

export default function toggleWrap(
  type: NodeType,
  attrs?: Record<string, any>
) {
  return (state: EditorState, dispatch: (tr: Transaction) => void) => {
    const isActive = isNodeActive(type)(state);

    if (isActive) {
      return lift(state, dispatch);
    }

    return wrapIn(type, attrs)(state, dispatch);
  };
}
