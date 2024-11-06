import { setBlockType } from "prosemirror-commands";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import deleteEmptyFirstParagraph from "../commands/deleteEmptyFirstParagraph";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class Paragraph extends Node {
  get name() {
    return "paragraph";
  }

  get schema(): NodeSpec {
    return {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", { dir: "auto" }, 0],
    };
  }

  keys({ type }: { type: NodeType }) {
    return {
      "Shift-Ctrl-0": setBlockType(type),
      Backspace: deleteEmptyFirstParagraph,
    };
  }

  commands({ type }: { type: NodeType }) {
    return () => setBlockType(type);
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    // render empty paragraphs as hard breaks to ensure that newlines are
    // persisted between reloads (this breaks from markdown tradition)
    if (
      node.textContent.trim() === "" &&
      node.childCount === 0 &&
      !state.inTable
    ) {
      state.write(state.options.softBreak ? "\n" : "\\\n");
    } else {
      state.renderInline(node);
      state.closeBlock(node);
    }
  }

  parseMarkdown() {
    return { block: "paragraph" };
  }
}
