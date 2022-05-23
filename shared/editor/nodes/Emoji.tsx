import nameToEmoji from "gemoji/name-to-emoji.json";
import Token from "markdown-it/lib/token";
import { InputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { EditorState, TextSelection, Plugin } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { run } from "../plugins/BlockMenuTrigger";
import isInCode from "../queries/isInCode";
import emojiRule from "../rules/emoji";
import { Dispatch, EventType } from "../types";
import Node from "./Node";

const OPEN_REGEX = /(?:^|\s):([0-9a-zA-Z_+-]+)?$/;
const CLOSE_REGEX = /(?:^|\s):(([0-9a-zA-Z_+-]*\s+)|(\s+[0-9a-zA-Z_+-]+)|[^0-9a-zA-Z_+-]+)$/;

export default class Emoji extends Node {
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
          tag: "span.emoji",
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLDivElement) => ({
            "data-name": dom.dataset.name,
          }),
        },
      ],
      toDOM: (node) => {
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
      toPlainText: (node) => nameToEmoji[node.attrs["data-name"]],
    };
  }

  get rulePlugins() {
    return [emojiRule];
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleClick: () => {
            this.editor.events.emit(EventType.emojiMenuClose);
            return false;
          },
          handleKeyDown: (view, event) => {
            // Prosemirror input rules are not triggered on backspace, however
            // we need them to be evaluted for the filter trigger to work
            // correctly. This additional handler adds inputrules-like handling.
            if (event.key === "Backspace") {
              // timeout ensures that the delete has been handled by prosemirror
              // and any characters removed, before we evaluate the rule.
              setTimeout(() => {
                const { pos } = view.state.selection.$from;
                return run(view, pos, pos, OPEN_REGEX, (state, match) => {
                  if (match) {
                    this.editor.events.emit(EventType.emojiMenuOpen, match[1]);
                  } else {
                    this.editor.events.emit(EventType.emojiMenuClose);
                  }
                  return null;
                });
              });
            }

            // If the query is active and we're navigating the block menu then
            // just ignore the key events in the editor itself until we're done
            if (
              event.key === "Enter" ||
              event.key === "ArrowUp" ||
              event.key === "ArrowDown" ||
              event.key === "Tab"
            ) {
              const { pos } = view.state.selection.$from;

              return run(view, pos, pos, OPEN_REGEX, (state, match) => {
                // just tell Prosemirror we handled it and not to do anything
                return match ? true : null;
              });
            }

            return false;
          },
        },
      }),
    ];
  }

  commands({ type }: { type: NodeType }) {
    return (attrs: Record<string, string>) => (
      state: EditorState,
      dispatch: Dispatch
    ) => {
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
      dispatch(transaction);
      return true;
    };
  }

  inputRules({ type }: { type: NodeType }): InputRule[] {
    return [
      new InputRule(/^:([a-zA-Z0-9_+-]+):$/, (state, match, start, end) => {
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
      // main regex should match only:
      // :word
      new InputRule(OPEN_REGEX, (state, match) => {
        if (
          match &&
          state.selection.$from.parent.type.name === "paragraph" &&
          !isInCode(state)
        ) {
          this.editor.events.emit(EventType.emojiMenuOpen, match[1]);
        }
        return null;
      }),
      // invert regex should match some of these scenarios:
      // :<space>word
      // :<space>
      // :word<space>
      // :)
      new InputRule(CLOSE_REGEX, (state, match) => {
        if (match) {
          this.editor.events.emit(EventType.emojiMenuClose);
        }
        return null;
      }),
    ];
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
      getAttrs: (tok: Token) => {
        return { "data-name": tok.markup.trim() };
      },
    };
  }
}
