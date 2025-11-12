import { Token } from "markdown-it";
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
import { isInternalUrl } from "@shared/utils/urls";

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
        "data-name": {
          default: "grey_question",
          validate: "string",
        },
        "data-url": {
          default: null,
          validate: (url: string) => !url || isInternalUrl(url),
        },
        type: { default: "emoji", validate: "string" },
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
          getAttrs: (dom: HTMLElement) =>
            dom.dataset.name
              ? {
                  "data-name": dom.dataset.name,
                }
              : false,
        },
      ],
      toDOM: (node) => {
        const name = node.attrs["data-name"];
        const url = node.attrs["data-url"];
        const type = node.attrs.type;

        if (type === "custom" && !!url) {
          return [
            "img",
            {
              class: `emoji custom-emoji ${name}`,
              "data-name": name,
              src: url,
              style:
                "width: 1.2em; height: 1.2em; vertical-align: text-bottom; display: inline-block;",
            },
          ];
        } else {
          return [
            "strong",
            {
              class: `emoji ${name}`,
              "data-name": name,
            },
            getEmojiFromName(name),
          ];
        }
      },
      leafText: (node) => getEmojiFromName(node.attrs["data-name"]),
    };
  }

  // to do: custom emoji rules
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
    const url = node.attrs["data-url"];

    if (url) {
      const alt = node.attrs["data-name"] || "";
      const prefix = state.inList ? "" : " ";
      const escapedAlt = state.esc(alt, false);
      const escapedUrl = state.esc(url, false);

      const markdown = `${prefix}![${escapedAlt}](${escapedUrl} "custom-emoji")`;
      state.write(markdown);
    } else if (name) {
      state.write(`:${name}:`);
    }
  }

  // to do: custom emoji conversion
  parseMarkdown() {
    // const url =
    return {
      node: "emoji",
      getAttrs: (tok: Token) => {
        if (tok.attrGet("data-url")) {
          return {
            "data-name": tok.markup.trim(),
            "data-url": tok.attrGet("data-url"),
            type: "custom",
          };
        }
        return { "data-name": tok.markup.trim() };
      },
    };
  }
}
