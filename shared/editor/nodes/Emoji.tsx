import { InputRule } from "prosemirror-inputrules";
import nameToEmoji from "gemoji/name-to-emoji.json";
import Node from "./Node";
import emojiRule from "../rules/emoji";

export default class Emoji extends Node {
  get name() {
    return "emoji";
  }

  get schema() {
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
          tag: "span.emoji",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            "data-name": dom.dataset.name,
          }),
        },
      ],
      toDOM: node => {
        if (nameToEmoji[node.attrs["data-name"]]) {
          const text = document.createTextNode(
            nameToEmoji[node.attrs["data-name"]]
          );
          return [
            "span",
            {
              class: `emoji ${node.attrs["data-name"]}`,
              "data-name": node.attrs["data-name"],
            },
            text,
          ];
        }
        const text = document.createTextNode(`:${node.attrs["data-name"]}:`);
        return ["span", { class: "emoji" }, text];
      },
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  commands({ type }) {
    return attrs => (state, dispatch) => {
      const { selection } = state;
      const position = selection.$cursor
        ? selection.$cursor.pos
        : selection.$to.pos;
      const node = type.create(attrs);
      const transaction = state.tr.insert(position, node);
      dispatch(transaction);
      return true;
    };
  }

  inputRules({ type }) {
    return [
      new InputRule(/^\:([a-zA-Z0-9_+-]+)\:$/, (state, match, start, end) => {
        const [okay, markup] = match;
        const { tr } = state;
        if (okay) {
          tr.replaceWith(
            start - 1,
            end,
            type.create({
              "data-name": markup,
              markup,
            })
          );
        }

        return tr;
      }),
    ];
  }

  toMarkdown(state, node) {
    const name = node.attrs["data-name"];
    if (name) {
      state.write(`:${name}:`);
    }
  }

  parseMarkdown() {
    return {
      node: "emoji",
      getAttrs: tok => {
        return { "data-name": tok.markup.trim() };
      },
    };
  }
}
