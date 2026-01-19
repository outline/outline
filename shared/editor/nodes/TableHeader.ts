import type { Token } from "markdown-it";
import type { NodeSpec } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { DecorationSet, Decoration } from "prosemirror-view";
import { moveTableColumn, TableMap } from "prosemirror-tables";
import { addColumnBefore, selectColumn } from "../commands/table";
import { getCellAttrs, setCellAttrs } from "../lib/table";
import {
  getCellsInColumn,
  getCellsInRow,
  isColumnSelected,
  isTableSelected,
} from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import Node from "./Node";
import {
  rowDragPluginKey,
  columnDragPluginKey,
  type ColumnDragState,
} from "../plugins/TableDragState";

/**
 * Sets up drag tracking for column grip interactions.
 *
 * @param view The editor view.
 * @param gripElement The grip element being dragged.
 * @param fromIndex The index of the column being dragged.
 */
function setupColumnDragTracking(
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
    const tr = view.state.tr.setMeta(columnDragPluginKey, {
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
    const tr = view.state.tr.setMeta(columnDragPluginKey, {
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

    const headerRow = table.querySelector("tr");
    if (!headerRow) {
      return;
    }

    const cells = headerRow.querySelectorAll("th, td");
    const cols = getCellsInRow(0)(view.state);
    let targetIndex = fromIndex;

    cells.forEach((cell, index) => {
      const rect = cell.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right) {
        targetIndex = index;
      }
    });

    targetIndex = Math.max(0, Math.min(targetIndex, cols.length - 1));

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
      moveTableColumn({ from: fromIndex, to: currentToIndex })(
        view.state,
        view.dispatch
      );
      // Select the column at its new position
      selectColumn(currentToIndex)(view.state, view.dispatch);
    }
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

/**
 * Builds a widget decoration for the column drag indicator.
 */
function buildColumnDragIndicator(
  pos: number,
  isMovingRight: boolean
): Decoration {
  const className = isMovingRight
    ? EditorStyleHelper.tableDragIndicatorRight
    : EditorStyleHelper.tableDragIndicatorLeft;

  return Decoration.widget(
    pos + 1,
    () => {
      const indicator = document.createElement("div");
      indicator.className = className;
      return indicator;
    },
    {
      key: `column-drag-indicator-${pos}`,
    }
  );
}

/**
 * Creates decorations for the column drag drop indicator.
 */
function createColumnDragDecorations(state: EditorState): DecorationSet {
  const dragState = columnDragPluginKey.getState(state);

  if (!dragState?.isDragging || dragState.toIndex < 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];
  const isMovingRight = dragState.toIndex > dragState.fromIndex;

  // Get first cell in the target column to place the indicator
  const cellsInColumn = getCellsInColumn(dragState.toIndex)(state);
  if (cellsInColumn.length > 0) {
    decorations.push(buildColumnDragIndicator(cellsInColumn[0], isMovingRight));
  }

  return DecorationSet.create(state.doc, decorations);
}

export default class TableHeader extends Node {
  get name() {
    return "th";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "header_cell",
      group: "cell",
      isolating: true,
      parseDOM: [{ tag: "th", getAttrs: getCellAttrs }],
      toDOM(node) {
        return ["th", setCellAttrs(node), 0];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null },
        colwidth: { default: null },
        marks: {
          default: undefined,
        },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "th",
      getAttrs: (tok: Token) => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    function buildAddColumnDecoration(pos: number, index: number) {
      const className = cn(EditorStyleHelper.tableAddColumn, {
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

    // Plugin for column drag and drop indicator
    const columnDragPlugin = new Plugin<ColumnDragState>({
      key: columnDragPluginKey,
      state: {
        init: () => ({ isDragging: false, fromIndex: -1, toIndex: -1 }),
        apply: (tr, state) => {
          const meta = tr.getMeta(columnDragPluginKey);
          if (meta) {
            return meta;
          }
          return state;
        },
      },
      props: {
        decorations: createColumnDragDecorations,
      },
    });

    const createColumnDecorations = (state: EditorState) => {
      if (!this.editor.view?.editable) {
        return DecorationSet.empty;
      }

      // Hide add column buttons when dragging rows or columns
      const columnDragState = columnDragPluginKey.getState(state);
      const rowDragState = rowDragPluginKey.getState(state);
      const isDragging =
        columnDragState?.isDragging || rowDragState?.isDragging;

      const { doc } = state;
      const decorations: Decoration[] = [];
      const cols = getCellsInRow(0)(state);

      if (cols) {
        cols.forEach((pos, index) => {
          const className = cn(EditorStyleHelper.tableGripColumn, {
            selected: isColumnSelected(index)(state) || isTableSelected(state),
            first: index === 0,
            last: index === cols.length - 1,
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
              decorations.push(buildAddColumnDecoration(pos, index));
            }

            decorations.push(buildAddColumnDecoration(pos, index + 1));
          }
        });
      }

      return DecorationSet.create(doc, decorations);
    };

    const createHeaderDecorations = (state: EditorState) => {
      const { doc } = state;
      const decorations: Decoration[] = [];

      // Iterate through all tables in the document
      doc.descendants((node, pos) => {
        if (node.type.spec.tableRole === "table") {
          const map = TableMap.get(node);

          // Mark cells in the first column and last row of this table
          node.descendants((cellNode, cellPos) => {
            if (cellNode.type.spec.tableRole === "header_cell") {
              const cellOffset = cellPos;
              const cellIndex = map.map.indexOf(cellOffset);

              if (cellIndex !== -1) {
                const col = cellIndex % map.width;
                const row = Math.floor(cellIndex / map.width);
                const rowspan = cellNode.attrs.rowspan || 1;
                const colspan = cellNode.attrs.colspan || 1;
                const attrs: Record<string, string> = {};

                if (col === 0) {
                  attrs["data-first-column"] = "true";
                }

                // Mark cells that extend into the last column (accounting for colspan)
                if (col + colspan >= map.width) {
                  attrs["data-last-column"] = "true";
                }

                // Mark cells that extend into the last row (accounting for rowspan)
                if (row + rowspan >= map.height) {
                  attrs["data-last-row"] = "true";
                }

                if (Object.keys(attrs).length > 0) {
                  decorations.push(
                    Decoration.node(
                      pos + cellPos + 1,
                      pos + cellPos + 1 + cellNode.nodeSize,
                      attrs
                    )
                  );
                }
              }
            }
          });
        }
      });

      return DecorationSet.create(doc, decorations);
    };

    return [
      columnDragPlugin,
      new Plugin({
        key: new PluginKey("table-header-first-column"),
        state: {
          init: (_, state) => createHeaderDecorations(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Only recompute if document changed
            if (!tr.docChanged) {
              return pluginState;
            }

            return createHeaderDecorations(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
      new Plugin({
        key: new PluginKey("table-header-decorations"),
        state: {
          init: (_, state) => createColumnDecorations(state),
          apply: (tr, pluginState, oldState, newState) => {
            // Recompute if selection, document, or drag state changed
            if (
              !tr.selectionSet &&
              !tr.docChanged &&
              !tr.getMeta(columnDragPluginKey) &&
              !tr.getMeta(rowDragPluginKey)
            ) {
              return pluginState;
            }

            return createColumnDecorations(newState);
          },
        },
        props: {
          handleDOMEvents: {
            mousedown: (view: EditorView, event: MouseEvent) => {
              if (!(event.target instanceof HTMLElement)) {
                return false;
              }

              const targetAddColumn = event.target.closest(
                `.${EditorStyleHelper.tableAddColumn}`
              );
              if (targetAddColumn) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const index = Number(
                  targetAddColumn.getAttribute("data-index")
                );
                addColumnBefore({ index })(view.state, view.dispatch);
                return true;
              }

              const targetGripColumn = event.target.closest(
                `.${EditorStyleHelper.tableGripColumn}`
              );
              if (targetGripColumn instanceof HTMLElement) {
                event.preventDefault();
                event.stopImmediatePropagation();

                const colIndex = Number(
                  targetGripColumn.getAttribute("data-index")
                );
                selectColumn(colIndex, event.metaKey || event.shiftKey)(
                  view.state,
                  view.dispatch
                );

                // Setup drag tracking for potential drag operation
                setupColumnDragTracking(view, targetGripColumn, colIndex);
                return true;
              }

              return false;
            },
          },
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  }
}
