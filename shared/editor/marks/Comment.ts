import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType, Schema, Mark as PMMark } from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import collapseSelection from "../commands/collapseSelection";
import { chainTransactions } from "../lib/chainTransactions";
import { isMarkActive } from "../queries/isMarkActive";
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
      parseDOM: [
        {
          tag: "span.comment-marker",
          getAttrs: (dom: HTMLSpanElement) => {
            // Ignore comment markers from other documents
            const documentId = dom.getAttribute("data-document-id");
            if (documentId && documentId !== this.editor?.props.id) {
              return false;
            }

            return {
              id: dom.getAttribute("id")?.replace("comment-", ""),
              userId: dom.getAttribute("data-user-id"),
            };
          },
        },
      ],
      toDOM: (node) => [
        "span",
        {
          class: "comment-marker",
          id: `comment-${node.attrs.id}`,
          "data-user-id": node.attrs.userId,
          "data-document-id": this.editor?.props.id,
        },
      ],
    };
  }

  get allowInReadOnly() {
    return true;
  }

  keys({ type }: { type: MarkType }): Record<string, Command> {
    return this.options.onCreateCommentMark
      ? {
          "Mod-Alt-m": (state, dispatch) => {
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
      ? (): Command => (state, dispatch) => {
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
        appendTransaction(transactions, oldState, newState) {
          if (
            !transactions.some(
              (transaction) => transaction.getMeta("uiEvent") === "paste"
            )
          ) {
            return;
          }

          // Record existing comment marks
          const existingComments: PMMark[] = [];
          oldState.doc.descendants((node) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === "comment") {
                existingComments.push(mark);
              }
            });
            return true;
          });

          // Remove comment marks that are new duplicates of existing ones. This allows us to cut
          // and paste a comment mark, but not copy and paste.
          let tr = newState.tr;
          newState.doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (
                mark.type.name === "comment" &&
                existingComments.find((m) => m.attrs.id === mark.attrs.id) &&
                !existingComments.find((m) => m === mark)
              ) {
                tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
              }
            });

            return true;
          });

          return tr;
        },
        props: {
          handleDOMEvents: {
            mouseup: (_view, event: MouseEvent) => {
              if (!(event.target instanceof HTMLElement)) {
                return false;
              }

              const comment = event.target.closest(".comment-marker");
              if (!comment) {
                return false;
              }

              const commentId = comment.id.replace("comment-", "");
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
