import { setBlockType } from "prosemirror-commands";
import Node from "./Node";

export default class Paragraph extends Node {
  get name() {
    return "paragraph";
  }

  get schema() {
    return {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0],
    };
  }

  keys({ type }) {
    return {
      "Shift-Ctrl-0": setBlockType(type),
    };
  }

  commands({ type }) {
    return () => setBlockType(type);
  }

  toMarkdown(state, node) {
    // render empty paragraphs as hard breaks to ensure that newlines are
    // persisted between reloads (this breaks from markdown tradition)
    if (
      node.textContent.trim() === "" &&
      node.childCount === 0 &&
      !state.inTable
    ) {
      state.write("\\\n");
    } else {
      state.renderInline(node);
      state.closeBlock(node);
    }
  }

  parseMarkdown() {
    return { block: "paragraph" };
  }
}
