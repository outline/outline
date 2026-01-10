import { setBlockType } from "prosemirror-commands";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import deleteEmptyFirstParagraph from "../commands/deleteEmptyFirstParagraph";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

export default class Paragraph extends Node {
  get name() {
    return "paragraph";
  }

  get schema(): NodeSpec {
    return {
      content: "inline*",
      group: "block",
      parseDOM: [
        {
          tag: "p",
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) {
              return false;
            }

            // We must suppress image captions from being parsed as a separate paragraph.
            if (dom.classList.contains(EditorStyleHelper.imageCaption)) {
              return false;
            }

            return {};
          },
        },
      ],
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
