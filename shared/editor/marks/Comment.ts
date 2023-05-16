import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType, Schema } from "prosemirror-model";
import { EditorState, Plugin } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import collapseSelection from "../commands/collapseSelection";
import { Command } from "../lib/Extension";
import chainTransactions from "../lib/chainTransactions";
import isMarkActive from "../queries/isMarkActive";
import { Dispatch } from "../types";
import Mark from "./Mark";

export default class Comment extends Mark {
  get name() {
    return "comment";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        id: {},
        userId: {},
      },
      inclusive: false,
      parseDOM: [{ tag: "span.comment-marker" }],
      toDOM: (node) => [
        "span",
        { class: "comment-marker", id: `comment-${node.attrs.id}` },
      ],
    };
  }

  keys({ type }: { type: MarkType }): Record<string, Command> {
    return this.options.onCreateCommentMark
      ? {
          "Mod-Alt-m": (state: EditorState, dispatch: Dispatch) => {
            if (isMarkActive(state.schema.marks.comment)(state)) {
              return false;
            }

            chainTransactions(
              toggleMark(type, {
                id: uuidv4(),
                userId: this.options.userId,
              }),
              collapseSelection()
            )(state, dispatch);

            return true;
          },
        }
      : {};
  }

  commands({ type }: { type: MarkType; schema: Schema }) {
    return this.options.onCreateCommentMark
      ? () => (state: EditorState, dispatch: Dispatch) => {
          if (isMarkActive(state.schema.marks.comment)(state)) {
            return false;
          }

          chainTransactions(
            toggleMark(type, {
              id: uuidv4(),
              userId: this.options.userId,
            }),
            collapseSelection()
          )(state, dispatch);

          return true;
        }
      : undefined;
  }

  toMarkdown() {
    return {
      open: "",
      close: "",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  get plugins(): Plugin[] {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            mouseup: (view, event: MouseEvent) => {
              if (
                !(event.target instanceof HTMLSpanElement) ||
                !event.target.classList.contains("comment-marker")
              ) {
                return false;
              }

              const commentId = event.target.id.replace("comment-", "");
              if (commentId) {
                this.options?.onClickCommentMark?.(commentId);
              }

              return false;
            },
          },
        },
      }),
    ];
  }
}
