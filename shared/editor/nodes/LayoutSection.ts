import type { ParseSpec } from "prosemirror-markdown";
import type { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Node from "./Node";

/**
 * A single column within a {@link Layout} block. Holds arbitrary block content
 * and an optional width expressed as a percentage of the layout. When the width
 * is unset the section flexes to share the available space equally with its
 * siblings.
 */
export default class LayoutSection extends Node {
  get name() {
    return "layout_section";
  }

  get markdownToken() {
    return "container_layout_section";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      isolating: true,
      attrs: {
        width: { default: null, validate: "number|null" },
      },
      parseDOM: [
        {
          tag: `div.${EditorStyleHelper.layoutSection}`,
          getAttrs: (dom: HTMLDivElement) => {
            const width = Number(dom.dataset.width);
            return {
              width: Number.isFinite(width) && width > 0 ? width : null,
            };
          },
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: EditorStyleHelper.layoutSection,
          "data-width": node.attrs.width ?? undefined,
          style: node.attrs.width
            ? `flex: 0 0 ${node.attrs.width}%`
            : "flex: 1 1 0",
        },
        0,
      ],
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n" + state.repeat(":", 3) + "layout_section\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(state.repeat(":", 3));
    state.closeBlock(node);
  }

  parseMarkdown(): ParseSpec {
    return { block: "layout_section" };
  }
}
