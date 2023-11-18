import Token from "markdown-it/lib/token";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import { Primitive } from "utility-types";
import Extension from "../lib/Extension";
import { getEmojiFromName } from "../lib/emoji";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import emojiRule from "../rules/emoji";

export default class Emoji extends Extension {
  get type() {
    return "node";
  }

  get name() {
    return "emoji";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        style: {
          default: "",
        },
        "data-name": {
          default: undefined,
        },
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      selectable: false,
      parseDOM: [
        {
          tag: "strong.emoji",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLElement) => ({
            "data-name": dom.dataset.name,
          }),
        },
      ],
      toDOM: (node) => {
        if (getEmojiFromName(node.attrs["data-name"])) {
          return [
            "strong",
            {
              class: `emoji ${node.attrs["data-name"]}`,
              "data-name": node.attrs["data-name"],
            },
            getEmojiFromName(node.attrs["data-name"]),
          ];
        }
        return ["strong", { class: "emoji" }, `:${node.attrs["data-name"]}:`];
      },
      toPlainText: (node) => getEmojiFromName(node.attrs["data-name"]),
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, Primitive>): Command =>
      (state, dispatch) => {
        const { selection } = state;
        const position =
          selection instanceof TextSelection
            ? selection.$cursor?.pos
            : selection.$to.pos;
        if (position === undefined) {
          return false;
        }

        const node = type.create(attrs);
        const transaction = state.tr.insert(position, node);
        dispatch?.(transaction);
        return true;
      };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const name = node.attrs["data-name"];
    if (name) {
      state.write(`:${name}:`);
    }
  }

  parseMarkdown() {
    return {
      node: "emoji",
      getAttrs: (tok: Token) => ({ "data-name": tok.markup.trim() }),
    };
  }
}
