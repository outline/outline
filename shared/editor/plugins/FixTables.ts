import { Node } from "prosemirror-model";
import { EditorState, Plugin, Transaction } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";
import { changedDescendants } from "../lib/changedDescendants";
import { getCellsInColumn } from "../queries/table";

/**
 * A ProseMirror plugin that fixes the last column in a table to ensure it fills the remaining width.
 */
export class FixTablesPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction: (_transactions, oldState, state) => {
        let tr: Transaction | undefined;
        const check = (node: Node) => {
          if (node.type.spec.tableRole === "table") {
            tr = this.fixTable(state, node, tr);
          }
        };
        if (!oldState) {
          state.doc.descendants(check);
        } else if (oldState.doc !== state.doc) {
          changedDescendants(oldState.doc, state.doc, 0, check);
        }
        return tr;
      },
    });
  }

  private fixTable(
    state: EditorState,
    table: Node,
    tr: Transaction | undefined
  ): Transaction | undefined {
    let fixed = false;
    const map = TableMap.get(table);
    if (!tr) {
      tr = state.tr;
    }

    // If the table has only one column, remove the colwidth attribute on all cells
    if (map.width === 1) {
      const cells = getCellsInColumn(0)(state);
      cells.forEach((pos) => {
        const node = state.doc.nodeAt(pos);
        if (node?.attrs.colspan) {
          fixed = true;
          tr = tr!.setNodeMarkup(pos, undefined, {
            ...node?.attrs,
            colwidth: null,
          });
        }
      });
    }

    return fixed ? tr : undefined;
  }
}
