import { wrappingInputRule } from "prosemirror-inputrules";
import {
  Schema,
  NodeType,
  NodeSpec,
  Node as ProsemirrorModel,
} from "prosemirror-model";
import { propertiesToInlineStyle } from "../../utils/dom";
import toggleList from "../commands/toggleList";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";

export default class BulletList extends Node {
  get name() {
    return "bullet_list";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        dir: {
          default: null,
        },
        textAlign: {
          default: null,
        },
      },
      content: "list_item+",
      group: "block list",
      parseDOM: [
        {
          tag: "ul",
          getAttrs: (dom: HTMLLIElement) => ({
            dir: dom.getAttribute("dir"),
            textAlign: dom.style.textAlign,
          }),
        },
      ],
      toDOM: (node) => [
        "ul",
        {
          dir: node.attrs.dir,
          style: propertiesToInlineStyle({
            "text-align": node.attrs.textAlign,
          }),
        },
        0,
      ],
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return () => toggleList(type, schema.nodes.list_item);
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-8": toggleList(type, schema.nodes.list_item),
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^\s*([-+*])\s$/, type)];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorModel) {
    state.renderList(node, "  ", () => (node.attrs.bullet || "*") + " ");
  }

  parseMarkdown() {
    return { block: "bullet_list" };
  }
}
