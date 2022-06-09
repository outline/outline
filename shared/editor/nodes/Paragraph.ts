import { setBlockType } from "prosemirror-commands";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import isNodeActive from "../queries/isNodeActive";
import { Dispatch } from "../types";
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
      toDOM: () => ["p", 0],
    };
  }

  keys({ type }: { type: NodeType }) {
    return {
      "Shift-Ctrl-0": setBlockType(type),
      "Shift-Enter": (state: EditorState, dispatch: Dispatch) => {
        if (!isNodeActive(type)(state)) {
          return false;
        }

        dispatch(state.tr.insertText("\n"));
        return true;
      },
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
