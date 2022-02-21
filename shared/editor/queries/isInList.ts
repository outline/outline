import { EditorState } from "prosemirror-state";

export default function isInList(state: EditorState) {
  const $head = state.selection.$head;
  for (let d = $head.depth; d > 0; d--) {
    if (
      ["ordered_list", "bullet_list", "checkbox_list"].includes(
        $head.node(d).type.name
      )
    ) {
      return true;
    }
  }

  return false;
}
