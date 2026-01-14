import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";
import { changedDescendants } from "../lib/changedDescendants";
import { getCellsInColumn } from "../queries/table";

/**
 * A ProseMirror plugin that fixes various ways that tables can end up in an incorrect state:
 *
 * - The last column in a table should fill the remaining width
 * - Header cells should only exist in the first row or column
 */
export class FixTablesPlugin extends Plugin {
  constructor() {
    super({
      appendTransaction: (_transactions, oldState, state) => {
        let tr: Transaction | undefined;
        const check = (node: Node, pos: number) => {
          if (node.type.spec.tableRole === "table") {
            tr = this.fixTable(state, node, pos, tr);
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
    pos: number,
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
      cells.forEach((cellPos) => {
        const node = state.doc.nodeAt(cellPos);
        if (node?.attrs.colwidth) {
          fixed = true;
          tr = tr!.setNodeMarkup(cellPos, undefined, {
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
        fixed = true;
        tr = tr!.setNodeMarkup(
          cellPos + pos + 1,
          state.schema.nodes.td,
          cell.attrs
        );
      }
    }

    return fixed ? tr : undefined;
  }
}
