import { NodeSpec, NodeType } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import breakRule from "../rules/breaks";
import Node from "./Node";

export default class HardBreak extends Node {
  get name() {
    return "br";
  }

  get schema(): NodeSpec {
    return {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM() {
        return ["br"];
      },
    };
  }

  get rulePlugins() {
    return [breakRule];
  }

  commands({ type }: { type: NodeType }) {
    return () => (state: EditorState, dispatch: (tr: Transaction) => void) => {
      dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    };
  }

  keys({ type }: { type: NodeType }) {
    return {
      "Shift-Enter": (
        state: EditorState,
        dispatch: (tr: Transaction) => void
      ) => {
        if (!isInTable(state)) {
          return false;
        }
        dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
        return true;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState) {
    state.write(" \\n ");
  }

  parseMarkdown() {
    return { node: "br" };
  }
}
