import { NodeSpec } from "prosemirror-model";
import { wrapInList } from "prosemirror-schema-list";
import { EditorState, Transaction } from "prosemirror-state";
import Node from "./Node";

export class NumberedOutline extends Node {
  get name() {
    return "numbered_outline";
  }

  get schema(): NodeSpec {
    return {
      content: "list_item+",
      group: "block",
      parseDOM: [{ tag: "ol.numbered-outline" }],
      toDOM: () => ["ol", { class: "numbered-outline" }, 0],
    };
  }

  commands() {
    return {
      toggleNumberedOutline:
        () =>
        (
          state: EditorState,
          dispatch: ((tr: Transaction) => void) | undefined
        ) =>
          wrapInList(state.schema.nodes.numbered_outline)(state, dispatch),
    };
  }
}

// Export both the class and a default instance
export default new NumberedOutline();
