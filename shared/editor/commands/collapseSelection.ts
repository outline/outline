import { Command, TextSelection } from "prosemirror-state";

const collapseSelection = (): Command => (state, dispatch) => {
  dispatch?.(
    state.tr.setSelection(
      TextSelection.create(state.doc, state.tr.selection.from)
    )
  );
  return true;
};

export default collapseSelection;
