import type { NodeSpec } from "prosemirror-model";
import { isInTable, selectedRect } from "prosemirror-tables";
import Node from "./Node";
import { cn } from "../styles/utils";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";
import { addRowBefore, selectRow, selectTable } from "../commands/table";
import {
  getRowsInTable,
  isRowSelected,
  isTableSelected,
} from "../queries/table";

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
      new Plugin({
        props: {
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
              if (targetGripRow) {
                event.preventDefault();
                event.stopImmediatePropagation();

                selectRow(
                  Number(targetGripRow.getAttribute("data-index")),
                  event.metaKey || event.shiftKey
                )(view.state, view.dispatch);
                return true;
              }

              return false;
            },
          },
          decorations: (state) => {
            if (!this.editor.view?.editable) {
              return;
            }

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

                if (index === 0) {
                  decorations.push(buildAddRowDecoration(pos, index));
                }

                decorations.push(buildAddRowDecoration(pos, index + 1));
              });
            }

            return DecorationSet.create(doc, decorations);
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
