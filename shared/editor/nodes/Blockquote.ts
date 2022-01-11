import { InputRule, wrappingInputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import toggleWrap from "../commands/toggleWrap";
import { Command } from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import isNodeActive from "../queries/isNodeActive";
import Node from "./Node";

export default class Blockquote extends Node {
  get name() {
    return "blockquote";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      defining: true,
      parseDOM: [{ tag: "blockquote" }],
      toDOM: () => ["blockquote", 0],
    };
  }

  inputRules({ type }): InputRule[] {
    return [wrappingInputRule(/^\s*>\s$/, type)];
  }

  commands({ type }): Command[] {
    return () => toggleWrap(type);
  }

  keys({ type }) {
    return {
      "Ctrl->": toggleWrap(type),
      "Mod-]": toggleWrap(type),
      "Shift-Enter": (state: EditorState, dispatch) => {
        if (!isNodeActive(type)(state)) {
          return false;
        }

        const { tr, selection } = state;
        dispatch(tr.split(selection.to));
        return true;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.wrapBlock("> ", undefined, node, () => state.renderContent(node));
  }

  parseMarkdown() {
    return { block: "blockquote" };
  }
}
