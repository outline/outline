import { wrappingInputRule } from "prosemirror-inputrules";
import toggleList from "../commands/toggleList";
import Node from "./Node";

export default class CheckboxList extends Node {
  get name() {
    return "checkbox_list";
  }

  get schema() {
    return {
      group: "block",
      content: "checkbox_item+",
      toDOM: () => ["ul", { class: this.name }, 0],
      parseDOM: [
        {
          tag: `[class="${this.name}"]`,
        },
      ],
    };
  }

  keys({ type, schema }) {
    return {
      "Shift-Ctrl-7": toggleList(type, schema.nodes.checkbox_item),
    };
  }

  commands({ type, schema }) {
    return () => toggleList(type, schema.nodes.checkbox_item);
  }

  inputRules({ type }) {
    return [wrappingInputRule(/^-?\s*(\[ \])\s$/i, type)];
  }

  toMarkdown(state, node) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}
