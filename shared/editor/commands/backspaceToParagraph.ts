import { NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Dispatch } from "../types";

/**
 * Converts the current node to a paragraph when pressing backspace at the
 * beginning of the node and not already a paragraph.
 *
 * @param type The node type
 * @returns A prosemirror command.
 */
export default function backspaceToParagraph(type: NodeType) {
  return (state: EditorState, dispatch: Dispatch) => {
    const { $from, from, to, empty } = state.selection;

    // if the selection has anything in it then use standard delete behavior
    if (!empty) {
      return null;
    }

    // check we're in a matching node
    if ($from.parent.type !== type) {
      return null;
    }

    // check if we're at the beginning of the heading
    const $pos = state.doc.resolve(from - 1);
    if ($pos.parent === $from.parent) {
      return null;
    }

    // okay, replace it with a paragraph
    dispatch(
      state.tr
        .setBlockType(from, to, type.schema.nodes.paragraph)
        .scrollIntoView()
    );
    return true;
  };
}
