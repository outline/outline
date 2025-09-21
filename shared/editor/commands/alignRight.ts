import { Command, NodeSelection } from "prosemirror-state";

export const alignRight = (): Command => (state, dispatch) => {
  if (!(state.selection instanceof NodeSelection)) {
    return false;
  }
  const attrs = {
    ...state.selection.node.attrs,
    title: null,
    layoutClass: "right-50",
  };

  const { selection } = state;
  dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, attrs));
  return true;
};
