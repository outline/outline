import { InputRule } from "prosemirror-inputrules";
import { TokenConfig } from "prosemirror-markdown";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import Extension, { Command, CommandFactory } from "../lib/Extension";
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

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode): void {
    console.error("toMarkdown not implemented", state, node);
  }

  parseMarkdown(): TokenConfig | void {
    return undefined;
  }
}
