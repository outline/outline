import { EditorState, TextSelection } from "prosemirror-state";
import { Dispatch } from "../types";

const collapseSelection = () => (state: EditorState, dispatch?: Dispatch) => {
  dispatch?.(
    state.tr.setSelection(
      TextSelection.create(state.doc, state.tr.selection.from)
    )
  );
  return true;
};

export default collapseSelection;
