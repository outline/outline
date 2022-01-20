import { Node as ProsemirrorNode, NodeSpec } from "prosemirror-model";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class Text extends Node {
  get name() {
    return "text";
  }

  get schema(): NodeSpec {
    return {
      group: "inline",
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.text(node.text || "", undefined);
  }
}
