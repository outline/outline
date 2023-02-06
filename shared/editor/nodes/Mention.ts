import Token from "markdown-it/lib/token";
import { InputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode, NodeType } from "prosemirror-model";
import { EditorState, TextSelection, Plugin } from "prosemirror-state";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { run } from "../plugins/BlockMenuTrigger";
import isInCode from "../queries/isInCode";
import { Dispatch, EventType } from "../types";
import Node from "./Node";

const OPEN_REGEX = /(?:^|\s)@([a-zA-Z+-]+)?$/;
const CLOSE_REGEX = /(?:^|\s)@(([0-9a-zA-Z_+-]*\s+)|(\s+[0-9a-zA-Z_+-]+)|[^0-9a-zA-Z_+-]+)$/;

export default class Mention extends Node {
  get name() {
    return "mention";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        style: {
          default: "",
        },
        "data-type": {
          default: undefined,
        },
        "data-id": {
          default: undefined,
        },
        label: {
          default: undefined,
        },
      },
      inline: true,
      content: "text*",
      marks: "",
      group: "inline",
      atom: true,
      parseDOM: [
        {
          tag: `span.${this.name}`,
          preserveWhitespace: "full",
          getAttrs: (dom: HTMLElement) => ({
            "data-type": dom.dataset.type,
            "data-id": dom.dataset.id,
            label: dom.innerText,
          }),
        },
      ],
      toDOM: (node) => {
        return [
          "span",
          {
            class: `${this.name}`,
            "data-name": node.attrs["data-name"],
            "data-id": node.attrs["data-id"],
          },
          node.attrs.label,
        ];
      },
      toPlainText: (node) => node.attrs.label,
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleClick: () => {
            this.editor.events.emit(EventType.mentionMenuClose);
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
                    this.editor.events.emit(
                      EventType.mentionMenuOpen,
                      match[1]
                    );
                  } else {
                    this.editor.events.emit(EventType.mentionMenuClose);
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

  inputRules(): InputRule[] {
    return [
      // main regex should match only:
      // @word
      new InputRule(OPEN_REGEX, (state, match) => {
        if (
          match &&
          state.selection.$from.parent.type.name === "paragraph" &&
          !isInCode(state)
        ) {
          this.editor.events.emit(EventType.mentionMenuOpen, match[1]);
        }
        return null;
      }),
      // invert regex should match some of these scenarios:
      // @<space>word
      // @<space>
      // @word<space>
      new InputRule(CLOSE_REGEX, (state, match) => {
        if (match) {
          this.editor.events.emit(EventType.mentionMenuClose);
        }
        return null;
      }),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    const type = node.attrs["data-type"];
    const id = node.attrs["data-id"];
    const label = node.attrs.label;
    if (label) {
      state.write(`@[${label}](mention://${type}/${id})`);
    }
  }

  parseMarkdown() {
    return {
      node: "mention",
      getAttrs: (tok: Token) => ({
        "data-type": tok.attrGet("data-type"),
        "data-id": tok.attrGet("data-id"),
        label: tok.attrGet("label"),
      }),
    };
  }
}
