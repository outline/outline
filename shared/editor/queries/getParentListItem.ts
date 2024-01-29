import { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";

export default function getParentListItem(
  state: EditorState
): [Node, number] | void {
  const $head = state.selection.$head;
  for (let d = $head.depth; d > 0; d--) {
    const node = $head.node(d);
    if (["list_item", "checkbox_item"].includes(node.type.name)) {
      return [node, $head.before(d)];
    }
  }
}
