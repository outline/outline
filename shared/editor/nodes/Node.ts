import {
  Node as ProsemirrorNode,
  NodeSpec,
  NodeType,
  Schema,
} from "prosemirror-model";
import Extension, { ExtensionInterface, Command } from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";

export interface NodeInterface extends ExtensionInterface {
  schema: NodeSpec;

  markdownToken?: string;

  keys: (options: {
    type: NodeType;
    schema: Schema;
  }) => { [key: string]: Command };

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode): void;

  parseMarkdown(): any;
}

export default abstract class Node extends Extension implements NodeInterface {
  get type() {
    return "node";
  }

  get schema(): NodeSpec {
    return {};
  }

  get markdownToken(): string {
    return "";
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    console.error("toMarkdown not implemented", state, node);
  }

  parseMarkdown() {
    return;
  }
}
