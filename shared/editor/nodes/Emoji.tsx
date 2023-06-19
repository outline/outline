import nameToEmoji from "gemoji/name-to-emoji.json";
import Token from "markdown-it/lib/token";
import {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import { Command, TextSelection } from "prosemirror-state";
import Suggestion from "../extensions/Suggestion";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { SuggestionsMenuType } from "../plugins/Suggestions";
import emojiRule from "../rules/emoji";

export default class Emoji extends Suggestion {
  get type() {
    return "node";
  }

  get defaultOptions() {
    return {
      type: SuggestionsMenuType.Emoji,
      openRegex: /(?:^|\s):([0-9a-zA-Z_+-]+)?$/,
      closeRegex:
        /(?:^|\s):(([0-9a-zA-Z_+-]*\s+)|(\s+[0-9a-zA-Z_+-]+)|[^0-9a-zA-Z_+-]+)$/,
      enabledInTable: true,
    };
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
        if (nameToEmoji[node.attrs["data-name"]]) {
          return [
            "strong",
            {
              class: `emoji ${node.attrs["data-name"]}`,
              "data-name": node.attrs["data-name"],
            },
            nameToEmoji[node.attrs["data-name"]],
          ];
        }
        return ["strong", { class: "emoji" }, `:${node.attrs["data-name"]}:`];
      },
      toPlainText: (node) => nameToEmoji[node.attrs["data-name"]],
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  commands({ type }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, string>): Command =>
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
