import {
  mathBackspaceCmd,
  insertMathCmd,
  makeInlineMathInputRule,
  mathSchemaSpec,
} from "@benrbray/prosemirror-math";
import { PluginSimple } from "markdown-it";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import MathPlugin from "../extensions/Math";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import mathRule, { REGEX_INLINE_MATH_DOLLARS } from "../rules/math";
import Node from "./Node";

export default class Math extends Node {
  get name() {
    return "math_inline";
  }

  get schema(): NodeSpec {
    return mathSchemaSpec.nodes.math_inline;
  }

  commands({ type }: { type: NodeType }) {
    return (): Command => (state, dispatch) => {
      dispatch?.(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    };
  }

  inputRules({ schema }: { schema: Schema }) {
    return [
      makeInlineMathInputRule(
        REGEX_INLINE_MATH_DOLLARS,
        schema.nodes.math_inline
      ),
    ];
  }

  keys({ type }: { type: NodeType }) {
    return {
      "Mod-Space": insertMathCmd(type),
      Backspace: mathBackspaceCmd,
    };
  }

  get plugins(): Plugin[] {
    return [MathPlugin];
  }

  get rulePlugins(): PluginSimple[] {
    return [mathRule];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("$");
    state.text(node.textContent, false);
    state.write("$");
  }

  parseMarkdown() {
    return {
      node: "math_inline",
      block: "math_inline",
      noCloseToken: true,
    };
  }
}
