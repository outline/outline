import { wrappingInputRule } from "prosemirror-inputrules";
import toggleList from "../commands/toggleList";
import Node from "./Node";

export default class BulletList extends Node {
  get name() {
    return "bullet_list";
  }

  get schema() {
    return {
      content: "list_item+",
      group: "block",
      parseDOM: [{ tag: "ul" }],
      toDOM: () => ["ul", 0],
    };
  }

  commands({ type, schema }) {
    return () => toggleList(type, schema.nodes.list_item);
  }

  keys({ type, schema }) {
    return {
      "Shift-Ctrl-8": toggleList(type, schema.nodes.list_item),
    };
  }

  inputRules({ type }) {
    return [wrappingInputRule(/^\s*([-+*])\s$/, type)];
  }

  toMarkdown(state, node) {
    state.renderList(node, "  ", () => (node.attrs.bullet || "*") + " ");
  }

  parseMarkdown() {
    return { block: "bullet_list" };
  }
}
