import { InputRule } from "prosemirror-inputrules";
import { ParseSpec } from "prosemirror-markdown";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command } from "prosemirror-state";
import Extension, { CommandFactory } from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";

export default abstract class Node extends Extension {
  get type() {
    return "node";
  }

  get schema(): NodeSpec {
    return {};
  }

  get markdownToken(): string {
    return "";
  }

  inputRules(_options: { type: NodeType; schema: Schema }): InputRule[] {
    return [];
  }

  keys(_options: { type: NodeType; schema: Schema }): Record<string, Command> {
    return {};
  }

  commands(_options: {
    type: NodeType;
    schema: Schema;
  }): Record<string, CommandFactory> | CommandFactory {
    return {};
  }

  toMarkdown(_state: MarkdownSerializerState, _node: ProsemirrorNode) {
    throw new Error("toMarkdown not implemented");
  }

  parseMarkdown(): ParseSpec | void {
    return undefined;
  }
}
