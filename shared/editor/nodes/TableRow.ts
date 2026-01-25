import type { NodeSpec } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { isInTable, moveTableRow, selectedRect } from "prosemirror-tables";
import Node from "./Node";
import { cn } from "../styles/utils";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorView } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { addRowBefore, selectRow, selectTable } from "../commands/table";
import {
  getCellsInRow,
  getRowsInTable,
  isRowSelected,
  isTableSelected,
} from "../queries/table";
import {
  rowDragPluginKey,
  columnDragPluginKey,
  type RowDragState,
} from "../plugins/TableDragState";

/**
 * Sets up drag tracking for row grip interactions.
 *
 * @param view The editor view.
 * @param gripElement The grip element being dragged.
 * @param fromIndex The index of the row being dragged.
 */
function setupRowDragTracking(
  view: EditorView,
  gripElement: HTMLElement,
  fromIndex: number
): void {
  let isDragging = false;
  let currentToIndex = fromIndex;

  /**
   * Finds the table wrapper element from the current editor DOM.
   */
  const findTableElement = (): HTMLElement | null => {
    const tables = view.dom.querySelectorAll(`.${EditorStyleHelper.table}`);
    if (tables.length === 1) {
      return tables[0] as HTMLElement;
    }
    for (const table of tables) {
      if (
        table.querySelector(".selectedCell") ||
        table.querySelector("[class*='selected']")
      ) {
        return table as HTMLElement;
      }
    }
    return tables.length > 0 ? (tables[0] as HTMLElement) : null;
  };

  /**
   * Updates the drag state in the plugin via a transaction.
   */
  const updateDragState = (toIndex: number) => {
    const tr = view.state.tr.setMeta(rowDragPluginKey, {
      isDragging: true,
      fromIndex,
      toIndex,
    });
    view.dispatch(tr);
  };

  /**
   * Clears the drag state in the plugin.
   */
  const clearDragState = () => {
    const tr = view.state.tr.setMeta(rowDragPluginKey, {
      isDragging: false,
      fromIndex: -1,
      toIndex: -1,
    });
    view.dispatch(tr);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const tableElement = findTableElement();
    if (!tableElement) {
      return;
    }

    if (!isDragging) {
      isDragging = true;
      document.body.classList.add(EditorStyleHelper.tableDragging);
    }

    const table = tableElement.querySelector("table");
    if (!table) {
      return;
    }

    const rows = getRowsInTable(view.state);
    const tableRows = table.querySelectorAll("tr");
    let targetIndex = fromIndex;

    tableRows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetIndex = index;
      }
    });

    targetIndex = Math.max(0, Math.min(targetIndex, rows.length - 1));

    if (targetIndex !== currentToIndex) {
      currentToIndex = targetIndex;
      updateDragState(targetIndex);
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    document.body.classList.remove(EditorStyleHelper.tableDragging);
    clearDragState();

    if (isDragging && currentToIndex !== fromIndex) {
      moveTableRow({ from: fromIndex, to: currentToIndex })(
        view.state,
        view.dispatch
      );
      // Select the row at its new position
      selectRow(currentToIndex)(view.state, view.dispatch);
    }
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

/**
 * Builds a widget decoration for the row drag indicator.
 */
function buildRowDragIndicator(pos: number, isMovingDown: boolean): Decoration {
  const className = isMovingDown
    ? EditorStyleHelper.tableDragIndicatorBottom
    : EditorStyleHelper.tableDragIndicatorTop;

  return Decoration.widget(
    pos + 1,
    () => {
      const indicator = document.createElement("div");
      indicator.className = className;
      return indicator;
    },
    {
      key: `row-drag-indicator-${pos}`,
    }
  );
}

/**
 * Creates decorations for the row drag drop indicator.
 */
function createRowDragDecorations(state: EditorState): DecorationSet {
  const dragState = rowDragPluginKey.getState(state);

  if (!dragState?.isDragging || dragState.toIndex < 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  const isMovingDown = dragState.toIndex > dragState.fromIndex;

  // Get first cell in the target row to place the indicator
  const cellsInRow = getCellsInRow(dragState.toIndex)(state);
  if (cellsInRow.length > 0) {
    decorations.push(buildRowDragIndicator(cellsInRow[0], isMovingDown));
  }

  return DecorationSet.create(state.doc, decorations);
}

export default class TableRow extends Node {
  get name() {
    return "tr";
  }

  get schema(): NodeSpec {
    return {
      content: "(th | td)*",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM() {
        return ["tr", 0];
      },
    };
  }

  get plugins() {
    // Plugin for row drag and drop indicator
    const rowDragPlugin = new Plugin<RowDragState>({
      key: rowDragPluginKey,
      state: {
        init: () => ({ isDragging: false, fromIndex: -1, toIndex: -1 }),
        apply: (tr, state) => {
          const meta = tr.getMeta(rowDragPluginKey);
          if (meta) {
            return meta;
          }
          return state;
        },
      },
      props: {
        decorations: createRowDragDecorations,
      },
    });

    function buildAddRowDecoration(pos: number, index: number) {
      const className = cn(EditorStyleHelper.tableAddRow, {
        first: index === 0,
      });

      return Decoration.widget(
        pos + 1,
        () => {
          const plus = document.createElement("a");
          plus.role = "button";
          plus.className = className;
          plus.dataset.index = index.toString();
          return plus;
        },
        {
          key: cn(className, index),
        }
      );
    }

    return [
      rowDragPlugin,
      new Plugin({
        props: {
          decorations: (state) => {
            if (!this.editor.view?.editable) {
              return;
            }

            // Hide add row buttons when dragging rows or columns
            const rowDragState = rowDragPluginKey.getState(state);
            const columnDragState = columnDragPluginKey.getState(state);
            const isDragging =
              rowDragState?.isDragging || columnDragState?.isDragging;

            const { doc } = state;
            const decorations: Decoration[] = [];
            const rows = getRowsInTable(state);

            if (rows && rows.length > 0 && isInTable(state)) {
              const rect = selectedRect(state);
              const firstColumnCells = new Map<number, number>();

              // Map each visual row index to its first column cell position
              for (let row = 0; row < rect.map.height; row++) {
                const cellPos =
                  rect.tableStart + rect.map.map[row * rect.map.width];
                firstColumnCells.set(row, cellPos);
              }

              rows.forEach((pos, visualIndex) => {
                const index = visualIndex;

                // Check if this row's first column is part of a merged cell from above
                const currentFirstCellPos = firstColumnCells.get(visualIndex);
                let isFirstColumnMerged = false;

                for (let prevRow = 0; prevRow < visualIndex; prevRow++) {
                  if (firstColumnCells.get(prevRow) === currentFirstCellPos) {
                    isFirstColumnMerged = true;
                    break;
                  }
                }

                // Skip decorations for rows where first column is merged from above
                if (isFirstColumnMerged) {
                  return;
                }

                if (index === 0) {
                  const className = cn(EditorStyleHelper.tableGrip, {
                    selected: isTableSelected(state),
                  });

                  decorations.push(
                    Decoration.widget(
                      pos + 1,
                      () => {
                        const grip = document.createElement("a");
                        grip.role = "button";
                        grip.className = className;
                        return grip;
                      },
                      {
                        key: className,
                      }
                    )
                  );
                }

                const className = cn(EditorStyleHelper.tableGripRow, {
                  selected:
                    isRowSelected(index)(state) || isTableSelected(state),
                  first: index === 0,
                  last: visualIndex === rows.length - 1,
                });

                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const grip = document.createElement("a");
                      grip.role = "button";
                      grip.className = className;
                      grip.dataset.index = index.toString();
                      return grip;
                    },
                    {
                      key: cn(className, index),
                    }
                  )
                );

                if (!isDragging) {
                  if (index === 0) {
                    decorations.push(buildAddRowDecoration(pos, index));
                  }

                  // Calculate the rowspan of the first column cell to determine the
                  // correct index for the "add row after" button. When cells are
                  // merged vertically, we need to insert after all merged rows.
                  const firstCellNode =
                    currentFirstCellPos !== undefined
                      ? doc.nodeAt(currentFirstCellPos)
                      : null;
                  const rowspan = firstCellNode?.attrs.rowspan ?? 1;
                  decorations.push(buildAddRowDecoration(pos, index + rowspan));
                }
              });
            }

            return DecorationSet.create(doc, decorations);
          },
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (!(event.target instanceof HTMLElement)) {
                return false;
              }

              const targetAddRow = event.target.closest(
                `.${EditorStyleHelper.tableAddRow}`
              );
              if (targetAddRow) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const index = Number(targetAddRow.getAttribute("data-index"));

                addRowBefore({ index })(view.state, view.dispatch);
                return true;
              }

              const tableGrip = event.target.closest(
                `.${EditorStyleHelper.tableGrip}`
              );
              if (tableGrip) {
                event.preventDefault();
                event.stopImmediatePropagation();
                selectTable()(view.state, view.dispatch);
                return true;
              }

              const targetGripRow = event.target.closest(
                `.${EditorStyleHelper.tableGripRow}`
              );
              if (targetGripRow instanceof HTMLElement) {
                event.preventDefault();
                event.stopImmediatePropagation();

                const rowIndex = Number(
                  targetGripRow.getAttribute("data-index")
                );
                selectRow(rowIndex, event.metaKey || event.shiftKey)(
                  view.state,
                  view.dispatch
                );

                // Setup drag tracking for potential drag operation
                setupRowDragTracking(view, targetGripRow, rowIndex);
                return true;
              }

              return false;
            },
          },
        },
      }),
    ];
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return { block: "tr" };
  }
}
