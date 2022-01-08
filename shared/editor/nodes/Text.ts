import { Node as ProsemirrorNode } from "prosemirror-model";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class Text extends Node {
  get name() {
    return "text";
  }

  get schema() {
    return {
      group: "inline",
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.text(node.text || "");
  }
}
