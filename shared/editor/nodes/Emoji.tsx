import type { Token } from "markdown-it";
import type {
  NodeSpec,
  Node as ProsemirrorNode,
  NodeType,
  Schema,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { Plugin, TextSelection } from "prosemirror-state";
import type { Primitive } from "utility-types";
import Extension from "../lib/Extension";
import { getEmojiFromName } from "../lib/emoji";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import emojiRule from "../rules/emoji";
import { isUUID } from "validator";
import type { ComponentProps } from "../types";
import { CustomEmoji } from "../../components/CustomEmoji";

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
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      selectable: false,
      parseDOM: [
        {
          priority: 100,
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

        return [
          "strong",
          {
            class: `emoji ${name}`,
            "data-name": name,
          },
          getEmojiFromName(name),
        ];
      },
      leafText: (node) => {
        const name = node.attrs["data-name"];
        // Custom emojis are stored as UUIDs, preserve the shortcode format
        // so they can be rendered by EmojiText component
        if (isUUID(name)) {
          return `:${name}:`;
        }
        return getEmojiFromName(name);
      },
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          // Placing the caret infront of an emoji is tricky as click events directly
          // on the emoji will not behave the same way as clicks on text characters, this
          // plugin ensures that clicking on an emoji behaves more naturally.
          handleClickOn: (view, _pos, node, nodePos, event) => {
            if (node.type.name === this.name) {
              const element = event.target as HTMLElement;
              const rect = element.getBoundingClientRect();
              const clickX = event.clientX - rect.left;
              const side = clickX < rect.width / 2 ? -1 : 1;

              // If the click is in the left half of the emoji, place the caret before it
              const tr = view.state.tr.setSelection(
                TextSelection.near(
                  view.state.doc.resolve(
                    side === -1 ? nodePos : nodePos + node.nodeSize
                  ),
                  side
                )
              );
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  }

  component = (props: ComponentProps) => {
    const name = props.node.attrs["data-name"];
    return (
      <strong className="emoji" data-name={name}>
        {isUUID(name) ? (
          <CustomEmoji value={name} size="1em" />
        ) : (
          getEmojiFromName(name)
        )}
      </strong>
    );
  };

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
