import { MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

const isMarkActive =
  (type: MarkType) =>
  (state: EditorState): boolean => {
    if (!type) {
      return false;
    }

    const { from, $from, to, empty } = state.selection;

    return !!(empty
      ? type.isInSet(state.storedMarks || $from.marks())
      : state.doc.rangeHasMark(from, to, type));
  };

export default isMarkActive;
