import { GapCursor } from "prosemirror-gapcursor";
import type { EditorState, Command, Transaction } from "prosemirror-state";
import {
  Plugin,
  Selection,
  AllSelection,
  TextSelection,
} from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { getCurrentBlock } from "@shared/editor/queries/getCurrentBlock";
import { isInCode } from "@shared/editor/queries/isInCode";

export default class Keys extends Extension {
  get name() {
    return "keys";
  }

  keys(): Record<string, Command> {
    const onCancel = () => {
      if (this.editor.props.onCancel) {
        this.editor.props.onCancel();
        return true;
      }
      return false;
    };

    const moveBlockUp = (
      state: EditorState,
      dispatch?: (tr: Transaction) => void
    ) => {
      if (!state.selection.empty) {
        return false;
      }

      const result = getCurrentBlock(state);
      if (!result) {
        return false;
      }

      const [currentBlock, currentPos] = result;
      const $pos = state.doc.resolve(currentPos);

      // Check if there's a previous sibling block
      if (!$pos.nodeBefore || !$pos.nodeBefore.isBlock) {
        return false;
      }

      const prevBlock = $pos.nodeBefore;
      const prevBlockPos = currentPos - prevBlock.nodeSize;

      if (!dispatch) {
        return true;
      }

      const { tr } = state;

      // Move current block before the previous block
      dispatch(
        tr
          .delete(currentPos, currentPos + currentBlock.nodeSize)
          .insert(prevBlockPos, currentBlock)
          .setSelection(TextSelection.near(tr.doc.resolve(prevBlockPos + 1)))
      );

      return true;
    };

    const moveBlockDown = (
      state: EditorState,
      dispatch?: (tr: Transaction) => void
    ) => {
      if (!state.selection.empty) {
        return false;
      }

      const result = getCurrentBlock(state);
      if (!result) {
        return false;
      }

      const [currentBlock, currentPos] = result;
      const $pos = state.doc.resolve(currentPos + currentBlock.nodeSize);

      // Check if there's a next sibling block
      if (!$pos.nodeAfter || !$pos.nodeAfter.isBlock) {
        return false;
      }

      const nextBlock = $pos.nodeAfter;
      const nextBlockEndPos =
        currentPos + currentBlock.nodeSize + nextBlock.nodeSize;

      if (!dispatch) {
        return true;
      }

      const { tr } = state;

      // Move current block after the next block
      dispatch(
        tr
          .insert(nextBlockEndPos, currentBlock)
          .delete(currentPos, currentPos + currentBlock.nodeSize)
          .setSelection(
            TextSelection.near(
              tr.doc.resolve(nextBlockEndPos - currentBlock.nodeSize + 1)
            )
          )
      );

      return true;
    };

    return {
      // Shortcuts for when editor has separate edit mode
      "Mod-Escape": onCancel,
      "Shift-Escape": onCancel,
      "Mod-s": () => {
        if (this.editor.props.onSave) {
          this.editor.props.onSave({ done: false });
          return true;
        }
        return false;
      },
      "Mod-Enter": (state: EditorState) => {
        if (!isInCode(state) && this.editor.props.onSave) {
          this.editor.props.onSave({ done: true });
          return true;
        }
        return false;
      },
      Escape: () => {
        (this.editor.view.dom as HTMLElement).blur();
        return true;
      },
      // Block movement shortcuts
      "Mod-Alt-ArrowUp": moveBlockUp,
      "Mod-Alt-ArrowDown": moveBlockDown,
    };
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          // we can't use the keys bindings for this as we want to preventDefault
          // on the original keyboard event when handled
          handleKeyDown: (view, event) => {
            if (view.state.selection instanceof AllSelection) {
              if (event.key === "ArrowUp") {
                const selection = Selection.atStart(view.state.doc);
                view.dispatch(view.state.tr.setSelection(selection));
                return true;
              }
              if (event.key === "ArrowDown") {
                const selection = Selection.atEnd(view.state.doc);
                view.dispatch(view.state.tr.setSelection(selection));
                return true;
              }
            }

            // edge case where horizontal gap cursor does nothing if Enter key
            // is pressed. Insert a newline and then move the cursor into it.
            if (view.state.selection instanceof GapCursor) {
              if (event.key === "Enter") {
                view.dispatch(
                  view.state.tr.insert(
                    view.state.selection.from,
                    view.state.schema.nodes.paragraph.create({})
                  )
                );
                view.dispatch(
                  view.state.tr.setSelection(
                    TextSelection.near(
                      view.state.doc.resolve(view.state.selection.from),
                      -1
                    )
                  )
                );
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  }
}
