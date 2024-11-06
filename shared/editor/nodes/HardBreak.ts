import { NodeSpec, NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { isInCode } from "../queries/isInCode";
import { isNodeActive } from "../queries/isNodeActive";
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
      toDOM: () => ["br"],
      toPlainText: () => "\n",
    };
  }

  get rulePlugins() {
    return [breakRule];
  }

  commands({ type }: { type: NodeType }) {
    return (): Command => (state, dispatch) => {
      dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    };
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      "Shift-Enter": (state, dispatch) => {
        const isParagraphActive = isNodeActive(state.schema.nodes.paragraph)(
          state
        );
        if (
          (!isInTable(state) && !isParagraphActive) ||
          isInCode(state, { onlyBlock: true })
        ) {
          return false;
        }
        dispatch?.(
          state.tr.replaceSelectionWith(type.create()).scrollIntoView()
        );
        return true;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState) {
    state.write(state.options.softBreak ? "\n" : "\\n");
  }

  parseMarkdown() {
    return { node: "br" };
  }
}
