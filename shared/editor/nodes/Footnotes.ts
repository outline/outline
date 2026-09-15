import type { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Node from "./Node";

/**
 * The list of footnotes shown at the end of a document.
 */
export default class Footnotes extends Node {
  get name() {
    return "footnotes";
  }

  get markdownToken() {
    return "footnote_block";
  }

  get schema(): NodeSpec {
    return {
      content: "footnote+",
      group: "block",
      defining: true,
      parseDOM: [{ tag: `ol.${EditorStyleHelper.footnotes}`, priority: 100 }],
      toDOM: () => ["ol", { class: EditorStyleHelper.footnotes }, 0],
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderContent(node);
  }

  parseMarkdown() {
    return { block: this.name };
  }
}
