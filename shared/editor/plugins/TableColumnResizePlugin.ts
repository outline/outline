import type { Transaction, EditorState } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { columnResizingPluginKey } from "prosemirror-tables";

/**
 * A ProseMirror plugin that cancels an in-progress column resize once the drag
 * handle no longer points at a cell. The handle is invalidated whenever the
 * document is replaced under the pointer, such as by a collaborative edit from
 * another user, and resizing with an invalid handle throws.
 */
export class TableColumnResizePlugin extends Plugin {
  constructor() {
    super({
      appendTransaction: (
        transactions: readonly Transaction[],
        _oldState: EditorState,
        newState: EditorState
      ) => {
        if (!transactions.some((transaction) => transaction.docChanged)) {
          return undefined;
        }

        const resizeState = columnResizingPluginKey.getState(newState);
        if (!resizeState?.dragging || resizeState.activeHandle > -1) {
          return undefined;
        }

        return newState.tr.setMeta(columnResizingPluginKey, {
          setDragging: null,
        });
      },
    });
  }
}
