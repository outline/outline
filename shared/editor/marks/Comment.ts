import { toggleMark } from "prosemirror-commands";
import { MarkSpec, MarkType } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { AddMarkStep } from "prosemirror-transform";
import { v4 as uuidv4 } from "uuid";
import Mark from "./Mark";

export default class Comment extends Mark {
  get name() {
    return "comment";
  }

  get schema(): MarkSpec {
    return {
      attrs: {
        id: {},
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
      }),
    };
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
            const addComment = tr.steps.filter(
              (step) =>
                step instanceof AddMarkStep &&
                (step as any).mark?.type === this.editor.schema.marks.comment
            );

            // transform is adding a comment
            if (addComment.length > 0) {
              this.options?.onDraftComment(
                (addComment[0] as any).mark.attrs.id
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
