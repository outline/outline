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
      excludes: "mention placeholder highlight em strong",
      parseDOM: [{ tag: "code.inline", preserveWhitespace: true }],
      toDOM: () => ["code", { class: "inline", spellCheck: "false" }],
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
            const { state } = view;

            // Prevent access out of document bounds
            if (from === 0 || to === state.doc.nodeSize - 1 || text === "`") {
              return false;
            }

            if (
              from === to &&
              state.doc.textBetween(from - 1, from) === "`" &&
              state.doc.textBetween(to, to + 1) === "`"
            ) {
              const start = from - 1;
              const end = to + 1;
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
              return true;
            }

            return false;
          },

          // Pasting a character inside of two backticks will wrap the character
          // in an inline code mark.
          handlePaste: (view: EditorView, _event: Event, slice: Slice) => {
            const { state } = view;
            const { from, to } = state.selection;

            // Prevent access out of document bounds
            if (from === 0 || to === state.doc.nodeSize - 1) {
              return false;
            }

            const start = from - 1;
            const end = to + 1;
            if (
              from === to &&
              state.doc.textBetween(start, from) === "`" &&
              state.doc.textBetween(to, end) === "`"
            ) {
              view.dispatch(
                state.tr
                  .replaceRange(start, end, slice)
                  .addMark(
                    start,
                    start + slice.size,
                    state.schema.marks.code_inline.create()
                  )
              );
              return true;
            }

            return false;
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
