import type { Node as ProsemirrorNode, NodeSpec } from "prosemirror-model";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class Text extends Node {
  get name() {
    return "text";
  }

  get schema(): NodeSpec {
    return {
      group: "inline",
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const text = node.text || "";
    if (!state.inAutolink) {
      state.text(text, true);
      return;
    }

    // Autolink text is not escaped, except pipes that would split a table cell.
    state.text(state.inTable ? text.split("|").join("\\|") : text, false);
  }
}
