import { wrappingInputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";

import { propertiesToInlineStyle } from "../../utils/dom";
import toggleList from "../commands/toggleList";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class CheckboxList extends Node {
  get name() {
    return "checkbox_list";
  }

  get schema(): NodeSpec {
    return {
      group: "block list",
      content: "checkbox_item+",
      toDOM: (node) => [
        "ul",
        {
          class: this.name,
          dir: node.attrs.dir,
          style: propertiesToInlineStyle({
            "text-align": node.attrs.textAlign,
          }),
        },
        0,
      ],
      attrs: {
        dir: {
          default: null,
        },
        textAlign: {
          default: null,
        },
      },
      parseDOM: [
        {
          tag: `[class="${this.name}"]`,
          getAttrs: (dom: HTMLLIElement) => ({
            dir: dom.getAttribute("dir"),
            textAlign: dom.style.textAlign,
          }),
        },
      ],
    };
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-7": toggleList(type, schema.nodes.checkbox_item),
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.checkbox_item);
  }

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^-?\s*(\[ \])\s$/i, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderList(node, "  ", () => "- ");
  }

  parseMarkdown() {
    return { block: "checkbox_list" };
  }
}
