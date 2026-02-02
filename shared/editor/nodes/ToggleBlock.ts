import { chainCommands } from "prosemirror-commands";
import type { Node as ProsemirrorNode, NodeSpec } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { Token } from "markdown-it";
import Node from "./Node";

export default class ToggleBlock extends Node {
  get name() {
    return "toggle_block";
  }

  get schema(): NodeSpec {
    return {
      content: "paragraph block*",
      group: "block",
      defining: true,
      isolating: true,
      attrs: {
        open: {
          default: false,
        },
        title: {
          default: "",
        },
      },
      parseDOM: [
        {
          tag: "details",
          getAttrs: (dom) => {
            if (!(dom instanceof HTMLElement)) return {};
            return {
              open: dom.hasAttribute("open"),
              title: dom.querySelector("summary")?.textContent || "",
            };
          },
        },
      ],
      toDOM(node) {
        const { open, title } = node.attrs;
        return [
          "details",
          open ? { open: true } : {},
          [
            "summary",
            { class: "toggle-summary" },
            title || "Toggle",
          ],
          ["div", { class: "toggle-content" }, 0],
        ];
      },
    };
  }

  commands() {
    return {
      createToggleBlock: (): Command => (state: EditorState, dispatch) => {
        if (dispatch) {
          const { schema, selection } = state;
          const node = schema.nodes.toggle_block.create({
            title: "Toggle Block",
            open: false,
          });
          const tr = state.tr.replaceSelectionWith(node);
          const resolvedPos = tr.doc.resolve(selection.from + 1);
          tr.setSelection(TextSelection.near(resolvedPos));
          dispatch(tr);
        }
        return true;
      },
      toggleBlock: (): Command => (state: EditorState, dispatch) => {
        const { selection } = state;
        const node = selection.$head.node();

        if (node.type.name === "toggle_block") {
          if (dispatch) {
            const pos = selection.$head.before();
            const newAttrs = {
              ...node.attrs,
              open: !node.attrs.open,
            };
            dispatch(state.tr.setNodeMarkup(pos, undefined, newAttrs));
          }
          return true;
        }

        return false;
      },
    };
  }

  keys() {
    return {
      "Mod-Enter": chainCommands(this.commands().toggleBlock()),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(`<details${node.attrs.open ? " open" : ""}>\n`);
    state.write(`<summary>${node.attrs.title || "Toggle"}</summary>\n`);
    state.renderContent(node);
    state.write("</details>\n");
    state.closeBlock(node);
  }

  parseMarkdown() {
    return {
      block: "toggle_block",
      getAttrs: (tok: Token) => ({
        title: tok.content || "Toggle",
        open: tok.attrGet("open") === "true",
      }),
    };
  }
}
