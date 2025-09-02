import { Token } from "markdown-it";
import { wrappingInputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import toggleList from "../commands/toggleList";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Node from "./Node";
import { EditorState, Transaction } from "prosemirror-state";

export default class OrderedList extends Node {
  get name() {
    return "ordered_list";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        order: {
          default: 1,
          validate: "number",
        },
        listStyle: {
          default: "number",
          validate: "string",
        },
      },
      content: "list_item+",
      group: "block list",
      parseDOM: [
        {
          tag: "ol",
          getAttrs: (dom: HTMLOListElement) => ({
            order: dom.hasAttribute("start")
              ? parseInt(dom.getAttribute("start") || "1", 10)
              : 1,
            listStyle: getValidListStyle(dom.style.listStyleType),
          }),
        },
      ],
      toDOM: (node) => {
        const attrs: { start?: number; style?: string } = {};

        if (node.attrs.order !== 1) {
          attrs.start = node.attrs.order;
        }

        if (node.attrs.listStyle !== "number") {
          attrs.style = `list-style-type: ${node.attrs.listStyle}`;
        }

        return ["ol", attrs, 0];
      },
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      toggleOrderedList: () => toggleList(type, schema.nodes.list_item),

      toggleLowerLetterList:
        () => (state: EditorState, dispatch?: (tr: Transaction) => void) =>
          this._toggleListStyle(state, type, schema, "lower-alpha", dispatch),

      toggleUpperLetterList:
        () => (state: EditorState, dispatch?: (tr: Transaction) => void) =>
          this._toggleListStyle(state, type, schema, "upper-alpha", dispatch),
    };
  }

  _toggleListStyle(
    state: EditorState,
    type: NodeType,
    schema: Schema,
    listStyle: string,
    dispatch?: (tr: Transaction) => void
  ) {
    const result = toggleList(type, schema.nodes.list_item)(state, dispatch);
    if (!result) {return false;}

    if (dispatch) {
      const { $from } = state.selection;
      let depth = $from.depth;

      while (depth > 0 && $from.node(depth).type !== type) {
        depth--;
      }

      if (depth > 0) {
        const listPos = $from.before(depth);
        const node = state.doc.nodeAt(listPos);

        if (node && node.type === type) {
          const tr = state.tr.setNodeMarkup(listPos, null, {
            ...node.attrs,
            listStyle,
          });
          dispatch(tr);
        }
      }
    }

    return true;
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-9": toggleList(type, schema.nodes.list_item),
      "Alt-Shift-L": this.commands({ type, schema }).toggleLowerLetterList(),
      "Alt-Shift-U": this.commands({ type, schema }).toggleUpperLetterList(),
    };
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      wrappingInputRule(
        /^(\d+)\.\s$/,
        type,
        (match) => ({ order: +match[1], listStyle: "number" }),
        (match, node) => node.childCount + node.attrs.order === +match[1]
      ),

      wrappingInputRule(
        /^([a-z])\.\s$/,
        type,
        (match) => ({
          order: match[1].charCodeAt(0) - 96,
          listStyle: "lower-alpha",
        }),
        (match, node) => {
          const expectedChar = String.fromCharCode(
            96 + node.childCount + node.attrs.order
          );
          return expectedChar === match[1];
        }
      ),

      wrappingInputRule(
        /^([A-Z])\.\s$/,
        type,
        (match) => ({
          order: match[1].charCodeAt(0) - 64,
          listStyle: "upper-alpha",
        }),
        (match, node) => {
          const expectedChar = String.fromCharCode(
            64 + node.childCount + node.attrs.order
          );
          return expectedChar === match[1];
        }
      ),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n");

    const start = node.attrs.order !== undefined ? node.attrs.order : 1;

    if (node.attrs.listStyle && node.attrs.listStyle === "lower-alpha") {
      const space = state.repeat(" ", 4);

      state.renderList(node, space, (index: number) => {
        const charCode = 96 + start + index;
        const letter = String.fromCharCode(charCode);
        return `${letter}. `;
      });
    } else if (node.attrs.listStyle && node.attrs.listStyle === "upper-alpha") {
      const space = state.repeat(" ", 4);

      state.renderList(node, space, (index: number) => {
        const charCode = 64 + start + index;
        const letter = String.fromCharCode(charCode);
        return `${letter}. `;
      });
    } else {
      const maxW = `${start + node.childCount - 1}`.length;
      const space = state.repeat(" ", maxW + 2);

      state.renderList(node, space, (index: number) => {
        const nStr = `${start + index}`;
        return state.repeat(" ", maxW - nStr.length) + nStr + ". ";
      });
    }
  }

  parseMarkdown() {
    return {
      block: "ordered_list",
      getAttrs: (tok: Token) => {
        const start = tok.attrGet("start") || "1";

        let listStyle = "number";
        if (tok.markup && /^[a-z]/.test(tok.markup)) {
          listStyle = "lower-alpha";
        } else if (tok.markup && /^[A-Z]/.test(tok.markup)) {
          listStyle = "upper-alpha";
        }

        return {
          order: parseInt(start, 10),
          listStyle,
        };
      },
    };
  }
}

const getValidListStyle = (listStyle: string) => {
  if (listStyle === "lower-alpha" || listStyle === "upper-alpha") {
    return listStyle;
  }

  return "number";
};
