import { MarkSpec } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import { getMarkRange } from "../queries/getMarkRange";
import markRule from "../rules/mark";
import Mark from "./Mark";

export default class Placeholder extends Mark {
  get name() {
    return "placeholder";
  }

  get schema(): MarkSpec {
    return {
      parseDOM: [{ tag: "span.template-placeholder" }],
      toDOM: () => ["span", { class: "template-placeholder" }],
      toPlainText: () => "",
    };
  }

  get rulePlugins() {
    return [markRule({ delim: "!!", mark: "placeholder" })];
  }

  toMarkdown() {
    return {
      open: "!!",
      close: "!!",
      mixable: true,
      expelEnclosingWhitespace: true,
    };
  }

  parseMarkdown() {
    return { mark: "placeholder" };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            paste: (view) => {
              if (this.editor.props.template || !view.editable) {
                return false;
              }
              const { dispatch } = view;
              const { schema, tr, doc, selection } = view.state;

              const range =
                getMarkRange(selection.$to, schema.marks.placeholder) ||
                getMarkRange(
                  doc.resolve(Math.max(0, selection.from - 1)),
                  schema.marks.placeholder
                );
              if (range) {
                dispatch(
                  tr
                    .removeMark(range.from, range.to, schema.marks.placeholder)
                    .insertText("", range.from, range.to)
                );
              }
              return false;
            },
            mousedown: (view, event) => {
              if (this.editor.props.template || !view.editable) {
                return false;
              }
              const { state, dispatch } = view;
              const { schema, doc } = view.state;
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!pos) {
                return false;
              }

              const range =
                getMarkRange(doc.resolve(pos.pos), schema.marks.placeholder) ||
                getMarkRange(
                  doc.resolve(Math.max(0, pos.pos - 1)),
                  schema.marks.placeholder
                );
              if (!range) {
                return false;
              }

              event.stopPropagation();
              event.preventDefault();
              const startOfMark = state.doc.resolve(range.from);
              dispatch(
                state.tr
                  .setSelection(TextSelection.near(startOfMark))
                  .scrollIntoView()
              );

              // Because we're preventing default, we need to focus the editor
              view.focus();

              return true;
            },
          },
          handleTextInput: (view, from, to, text) => {
            if (this.editor.props.template) {
              return false;
            }

            const { state, dispatch } = view;
            const $from = state.doc.resolve(from);

            const range = getMarkRange($from, state.schema.marks.placeholder);
            if (!range) {
              return false;
            }

            const selectionStart = Math.min(from, range.from);
            const selectionEnd = Math.max(to, range.to);

            dispatch(
              state.tr
                .removeMark(
                  range.from,
                  range.to,
                  state.schema.marks.placeholder
                )
                .insertText(text, selectionStart, selectionEnd)
            );

            const $to = view.state.doc.resolve(selectionStart + text.length);
            dispatch(view.state.tr.setSelection(TextSelection.near($to)));

            return true;
          },
          handleKeyDown: (view, event: KeyboardEvent) => {
            if (this.editor.props.template || !view.editable) {
              return false;
            }
            if (
              event.key !== "ArrowLeft" &&
              event.key !== "ArrowRight" &&
              event.key !== "Backspace"
            ) {
              return false;
            }

            const { state, dispatch } = view;

            if (event.key === "Backspace") {
              const range = getMarkRange(
                state.doc.resolve(Math.max(0, state.selection.from - 1)),
                state.schema.marks.placeholder
              );
              if (!range) {
                return false;
              }

              dispatch(
                state.tr
                  .removeMark(
                    range.from,
                    range.to,
                    state.schema.marks.placeholder
                  )
                  .insertText("", range.from, range.to)
              );
              return true;
            }

            if (event.key === "ArrowLeft") {
              const range = getMarkRange(
                state.doc.resolve(Math.max(0, state.selection.from - 1)),
                state.schema.marks.placeholder
              );
              if (!range) {
                return false;
              }

              const startOfMark = state.doc.resolve(range.from);
              dispatch(state.tr.setSelection(TextSelection.near(startOfMark)));
              return true;
            }

            if (event.key === "ArrowRight") {
              const range = getMarkRange(
                state.selection.$from,
                state.schema.marks.placeholder
              );
              if (!range) {
                return false;
              }

              const endOfMark = state.doc.resolve(range.to);
              dispatch(state.tr.setSelection(TextSelection.near(endOfMark)));
              return true;
            }

            return false;
          },
        },
      }),
    ];
  }
}
