import {
  makeBlockMathInputRule,
  mathSchemaSpec,
} from "@benrbray/prosemirror-math";
import { PluginSimple } from "markdown-it";
import { NodeSpec, NodeType, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import mathRule, { REGEX_BLOCK_MATH_DOLLARS } from "../rules/math";
import Node from "./Node";

export default class MathBlock extends Node {
  get name() {
    return "math_block";
  }

  get schema(): NodeSpec {
    return mathSchemaSpec.nodes.math_display;
  }

  get rulePlugins(): PluginSimple[] {
    return [mathRule];
  }

  commands({ type }: { type: NodeType }) {
    return (): Command => (state, dispatch) => {
      const tr = state.tr.replaceSelectionWith(type.create());
      dispatch?.(
        tr
          .setSelection(
            TextSelection.near(tr.doc.resolve(state.selection.from - 1))
          )
          .scrollIntoView()
      );
      return true;
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [makeBlockMathInputRule(REGEX_BLOCK_MATH_DOLLARS, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("$$\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("$$");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      node: "math_block",
      block: "math_block",
      noCloseToken: true,
    };
  }
}
