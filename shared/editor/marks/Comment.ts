import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType, Schema } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { AddMarkStep, RemoveMarkStep } from "prosemirror-transform";
import { v4 as uuidv4 } from "uuid";
import { CommandFactory } from "../lib/Extension";
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
      parseDOM: [{ tag: "span.comment" }],
      toDOM: (node) => [
        "span",
        { class: "comment", id: `comment-${node.attrs.id}` },
      ],
    };
  }

  keys({ type }: { type: MarkType }) {
    return {
      // TODO: Only create, don't toggle
      "Mod-Alt-m": toggleMark(type, {
        id: uuidv4(),
        userId: this.options.userId,
      }),
    };
  }

  commands({ type }: { type: MarkType; schema: Schema }): CommandFactory {
    return () =>
      toggleMark(type, {
        id: uuidv4(),
        userId: this.options.userId,
      });
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
        filterTransaction: (tr) => {
          if (tr.docChanged) {
            const localCommentSteps = tr.steps.filter(
              (step) =>
                (step as any).mark?.type === this.editor.schema.marks.comment &&
                (step as any).mark?.attrs.userId === this.options.userId
            );

            // transform is adding or removing comments trigger callbacks
            const addCommentSteps = localCommentSteps.filter(
              (step) => step instanceof AddMarkStep
            );
            const removeCommentSteps = localCommentSteps.filter(
              (step) => step instanceof RemoveMarkStep
            );

            if (addCommentSteps.length > 0) {
              this.options?.onDraftComment(
                (addCommentSteps[0] as any).mark.attrs.id
              );
            }
            if (removeCommentSteps.length > 0) {
              this.options?.onRemoveComment(
                (removeCommentSteps[0] as any).mark.attrs.id
              );
            }
          }
          return true;
        },
        props: {
          handleDOMEvents: {
            mousedown: (view, event: MouseEvent) => {
              if (
                !(event.target instanceof HTMLSpanElement) ||
                !event.target.classList.contains("comment")
              ) {
                return false;
              }

              const commentId = event.target.id.replace("comment-", "");
              this.options?.onClickComment(commentId);

              return false;
            },
          },
        },
      }),
    ];
  }
}
