import type Token from "markdown-it/lib/token.mjs";
import type { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { footnoteLabel } from "../rules/footnotes";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Node from "./Node";

/**
 * Returns the DOM id of the footnote with the given label, used as the target
 * of footnote reference links.
 *
 * @param label the footnote label.
 * @returns the element id.
 */
export function footnoteId(label: string): string {
  return `fn-${label}`;
}

/**
 * A single footnote, identified by its label and containing the note's content.
 */
export default class Footnote extends Node {
  get name() {
    return "footnote";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        label: {
          default: "1",
          validate: "string",
        },
      },
      content: "block+",
      defining: true,
      parseDOM: [
        {
          tag: `li.${EditorStyleHelper.footnote}`,
          priority: 100,
          getAttrs: (dom: HTMLElement) =>
            dom.dataset.label ? { label: dom.dataset.label } : false,
        },
      ],
      toDOM: (node) => {
        const label: string = node.attrs.label;
        return [
          "li",
          {
            id: footnoteId(label),
            class: EditorStyleHelper.footnote,
            "data-label": label,
            // Numeric labels are used as the list marker so that it matches
            // the reference, other labels fall back to the position.
            value: /^\d+$/.test(label) ? label : undefined,
          },
          0,
        ];
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.wrapBlock("    ", `[^${node.attrs.label}]: `, node, () =>
      state.renderContent(node)
    );
  }

  parseMarkdown() {
    return {
      block: this.name,
      getAttrs: (token: Token) => ({ label: footnoteLabel(token) }),
    };
  }
}
