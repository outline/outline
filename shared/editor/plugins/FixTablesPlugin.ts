import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";
import { changedDescendants } from "../lib/changedDescendants";
import { isValidCellSpan } from "../lib/table";

/**
 * A ProseMirror plugin that fixes various ways that tables can end up in an incorrect state:
 *
 * - The last column in a table should fill the remaining width
 * - Header cells should only exist in the first row or column
 * - Cells should span at least one row and column
 */
export class FixTablesPlugin extends Plugin<boolean> {
  constructor() {
    super({
      state: {
        // Whether any document change has been applied since load
        init: () => false,
        apply: (tr, hasChanged) => hasChanged || tr.docChanged,
      },
      appendTransaction: (_transactions, oldState, state) => {
        if (oldState.doc === state.doc) {
          return undefined;
        }

        const tr = state.tr;
        const check = (node: Node, pos: number) => {
          if (node.type.spec.tableRole === "table") {
            this.fixTable(state, node, pos, tr);
          }
        };

        // Tables loaded in a bad state are repaired on the first edit. After
        // that only changed tables are checked.
        if (!this.getState(oldState)) {
          state.doc.descendants(check);
        } else {
          changedDescendants(oldState.doc, state.doc, 0, check);
        }
        return tr.docChanged ? tr : undefined;
      },
    });
  }

  private fixTable(
    state: EditorState,
    table: Node,
    pos: number,
    tr: Transaction
  ) {
    const map = TableMap.get(table);

    // If the table has only one column, remove the colwidth attribute on all cells
    if (map.width === 1) {
      const cells = map.cellsInRect({
        left: 0,
        top: 0,
        right: 1,
        bottom: map.height,
      });
      cells.forEach((offset) => {
        const cellPos = pos + 1 + offset;
        const node = state.doc.nodeAt(cellPos);
        if (node?.attrs.colwidth) {
          tr.setNodeMarkup(cellPos, undefined, {
            ...node?.attrs,
            colwidth: null,
          });
        }
      });
    }

    // If the table has header cells that are not in the first row or column
    // then convert them to regular cells
    const cellPositions = map.cellsInRect({
      left: 1,
      top: 1,
      right: map.width,
      bottom: map.height,
    });

    for (let i = 0; i < cellPositions.length; i++) {
      const cellPos = cellPositions[i];
      const cell = table.nodeAt(cellPos);
      if (cell && cell.type === state.schema.nodes.th) {
        tr.setNodeMarkup(cellPos + pos + 1, state.schema.nodes.td, cell.attrs);
      }
    }

    // Cells with an invalid span are left out of the table map, so reset them
    // to a single row and column.
    table.forEach((row, rowOffset) => {
      row.forEach((cell, cellOffset) => {
        const cellPos = pos + 1 + rowOffset + 1 + cellOffset;
        for (const name of ["colspan", "rowspan"]) {
          if (!isValidCellSpan(cell.attrs[name])) {
            tr.setNodeAttribute(cellPos, name, 1);
          }
        }
      });
    });
  }
}
