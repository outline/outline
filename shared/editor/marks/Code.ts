import codemark from "prosemirror-codemark";
import { toggleMark } from "prosemirror-commands";
import {
  MarkSpec,
  MarkType,
  Node as ProsemirrorNode,
  Mark as ProsemirrorMark,
  Slice,
} from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { markInputRuleForPattern } from "../lib/markInputRule";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { isInCode } from "../queries/isInCode";
import Mark from "./Mark";

export default class Code extends Mark {
  get name() {
    return "code_inline";
  }

  get schema(): MarkSpec {
    return {
      excludes: "mention placeholder highlight",
      parseDOM: [{ tag: "code", preserveWhitespace: true }],
      toDOM: () => ["code", { class: "inline", spellCheck: "false" }],
      code: true,
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRuleForPattern("`", type)];
  }

  keys({ type }: { type: MarkType }) {
    return {
      // Note: This key binding only works on non-Mac platforms
      // https://github.com/ProseMirror/prosemirror/issues/515
      "Mod`": toggleMark(type),
      "Mod-e": toggleMark(type),
      "Mod-Shift-c": toggleMark(type),
    };
  }

  get plugins() {
    const codeCursorPlugin = codemark({
      markType: this.editor.schema.marks.code_inline,
    })[0];

    /**
     * Helper function to check if cursor is between backticks
     * and handle the code marking appropriately
     */
    const handleTextBetweenBackticks = (
      view: EditorView,
      from: number,
      to: number,
      text: string | Slice
    ) => {
      const { state } = view;

      // Prevent access out of document bounds
      if (from === 0 || to === state.doc.nodeSize - 1) {
        return false;
      }

      // Skip if we're adding a backtick character
      if (typeof text === "string" && text === "`") {
        return false;
      }

      // Check if we're between backticks
      if (
        state.doc.textBetween(from - 1, from) === "`" &&
        state.doc.textBetween(to, to + 1) === "`"
      ) {
        const start = from - 1;
        const end = to + 1;

        if (typeof text === "string") {
          // Handle text input
          view.dispatch(
            state.tr
              .delete(start, end)
              .insertText(text, start)
              .addMark(
                start,
                start + text.length,
                state.schema.marks.code_inline.create()
              )
          );
        } else {
          // Handle paste/slice
          view.dispatch(
            state.tr
              .replaceRange(start, end, text)
              .addMark(
                start,
                start + text.size,
                state.schema.marks.code_inline.create()
              )
          );
        }
        return true;
      }

      return false;
    };

    return [
      codeCursorPlugin,
      new Plugin({
        props: {
          // Typing a character inside of two backticks will wrap the character
          // in an inline code mark.
          handleTextInput: (
            view: EditorView,
            from: number,
            to: number,
            text: string
          ) => {
            // Skip this handler during IME composition or it will prevent the
            if (view.composing) {
              return false;
            }
            return handleTextBetweenBackticks(view, from, to, text);
          },

          // Pasting a character inside of two backticks will wrap the character
          // in an inline code mark.
          handlePaste: (view: EditorView, _event: Event, slice: Slice) => {
            const { state } = view;
            const { from, to } = state.selection;
            return handleTextBetweenBackticks(view, from, to, slice);
          },

          // Triple clicking inside of an inline code mark will select the entire
          // code mark.
          handleTripleClickOn: (view: EditorView, pos: number) => {
            const { state } = view;
            const inCodeMark = isInCode(state, { onlyMark: true });

            if (inCodeMark) {
              const $pos = state.doc.resolve(pos);
              const before = $pos.nodeBefore?.nodeSize ?? 0;
              const after = $pos.nodeAfter?.nodeSize ?? 0;
              const $from = state.doc.resolve(pos - before);
              const $to = state.doc.resolve(pos + after);

              view.dispatch(
                state.tr.setSelection(TextSelection.between($from, $to))
              );
              return true;
            }

            return false;
          },

          // Handle composition end events for IME input
          handleDOMEvents: {
            compositionend: (view: EditorView) => {
              setTimeout(() => {
                const { $cursor } = view.state.selection as TextSelection;
                if (!$cursor) {
                  return;
                }

                const from = $cursor.pos - 1;
                const to = $cursor.pos;

                // Process the composed text after IME composition completes
                handleTextBetweenBackticks(
                  view,
                  from,
                  to,
                  view.state.doc.textBetween(from, to)
                );
              });
            },
          },
        },
      }),
    ];
  }

  toMarkdown() {
    function backticksFor(node: ProsemirrorNode, side: -1 | 1) {
      const ticks = /`+/g;
      let match: RegExpMatchArray | null;
      let len = 0;

      if (node.isText) {
        while ((match = ticks.exec(node.text || ""))) {
          len = Math.max(len, match[0].length);
        }
      }

      let result = len > 0 && side > 0 ? " `" : "`";
      for (let i = 0; i < len; i++) {
        result += "`";
      }
      if (len > 0 && side < 0) {
        result += " ";
      }
      return result;
    }

    return {
      open(
        _state: MarkdownSerializerState,
        _mark: ProsemirrorMark,
        parent: ProsemirrorNode,
        index: number
      ) {
        return backticksFor(parent.child(index), -1);
      },
      close(
        _state: MarkdownSerializerState,
        _mark: ProsemirrorMark,
        parent: ProsemirrorNode,
        index: number
      ) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false,
    };
  }

  parseMarkdown() {
    return { mark: "code_inline" };
  }
}
