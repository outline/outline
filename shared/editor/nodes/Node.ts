import type { InputRule } from "prosemirror-inputrules";
import type { ParseSpec } from "prosemirror-markdown";
import type {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import type { CommandFactory } from "../lib/Extension";
import Extension from "../lib/Extension";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";

export default abstract class Node extends Extension {
  get type() {
    return "node";
  }

  get schema(): NodeSpec {
    return {};
  }

  get attrs(): NodeSpec["attrs"] {
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
