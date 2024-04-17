import { wrappingInputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { Command } from "prosemirror-state";

import { propertiesToInlineStyle } from "../../utils/dom";
import toggleWrap from "../commands/toggleWrap";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import isNodeActive from "../queries/isNodeActive";
import Node from "./Node";

export default class Blockquote extends Node {
  get name() {
    return "blockquote";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      group: "block",
      defining: true,
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
          tag: "blockquote",
          getAttrs: (dom: HTMLLIElement) => ({
            dir: dom.getAttribute("dir"),
            textAlign: dom.style.textAlign,
          }),
        },
        // Dropbox Paper parsing, yes their quotes are actually lists
        { tag: "ul.listtype-quote", contentElement: "li" },
      ],
      toDOM: (node) => [
        "blockquote",
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

  inputRules({ type }: { type: NodeType }) {
    return [wrappingInputRule(/^\s*>\s$/, type)];
  }

  commands({ type }: { type: NodeType }) {
    return () => toggleWrap(type);
  }

  keys({ type }: { type: NodeType }): Record<string, Command> {
    return {
      "Ctrl->": toggleWrap(type),
      "Mod-]": toggleWrap(type),
      "Shift-Enter": (state, dispatch) => {
        if (!isNodeActive(type)(state)) {
          return false;
        }

        const { tr, selection } = state;
        dispatch?.(tr.split(selection.to));
        return true;
      },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.wrapBlock("> ", undefined, node, () => state.renderContent(node));
  }

  parseMarkdown() {
    return { block: "blockquote" };
  }
}
