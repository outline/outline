import { NodeType } from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import { findParentNode } from "../queries/findParentNode";

/**
 * Selects all the content of the given node type.
 *
 * @param type The node type
 * @returns A prosemirror command.
 */
export function selectAll(type: NodeType): Command {
  return (state, dispatch) => {
    const code = findParentNode((node) => node.type === type)(state.selection);

    if (code) {
      const start = code.pos;
      const end = code.pos + code.node.nodeSize;

      if (
        start === state.selection.from - 1 &&
        end === state.selection.to + 1
      ) {
        return false;
      }

      dispatch?.(
        state.tr.setSelection(
          TextSelection.between(
            state.doc.resolve(start),
            state.doc.resolve(end)
          )
        )
      );
      return true;
    }

    return false;
  };
}
