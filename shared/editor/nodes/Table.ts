import { chainCommands } from "prosemirror-commands";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import {
  Command,
  NodeSelection,
  Plugin,
  Selection,
  TextSelection,
} from "prosemirror-state";
import {
  CellSelection,
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  isInTable,
  selectedRect,
  tableEditing,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from "prosemirror-tables";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  addRowAndMoveSelection,
  setColumnAttr,
  createTable,
} from "../commands/table";
import chainTransactions from "../lib/chainTransactions";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import tablesRule from "../rules/tables";
import Node from "./Node";
import TableHeadCell from "./TableHeadCell";

export default class Table extends Node {
  get name() {
    return "table";
  }

  get schema(): NodeSpec {
    return {
      content: "tr+",
      tableRole: "table",
      isolating: true,
      group: "block",
      parseDOM: [{ tag: "table" }],
      toDOM() {
        return [
          "div",
          { class: "scrollable-wrapper table-wrapper" },
          [
            "div",
            { class: "scrollable" },
            ["table", { class: "rme-table" }, ["tbody", 0]],
          ],
        ];
      },
    };
  }

  get rulePlugins() {
    return [tablesRule];
  }

  commands() {
    return {
      createTable:
        ({
          rowsCount,
          colsCount,
        }: {
          rowsCount: number;
          colsCount: number;
        }): Command =>
        (state, dispatch) => {
          if (dispatch) {
            const offset = state.tr.selection.anchor + 1;
            const nodes = createTable(state, rowsCount, colsCount);
            const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView();
            const resolvedPos = tr.doc.resolve(offset);
            tr.setSelection(TextSelection.near(resolvedPos));
            dispatch(tr);
          }
          return true;
        },
      setColumnAttr,
      sort:
        ({ index, direction }): Command =>
        (state, dispatch) => {
          if (!isInTable(state)) {
            return false;
          }
          if (dispatch) {
            const rect = selectedRect(state);
            const table = [];

            for (let r = 0; r < rect.map.height; r++) {
              const cells = [];
              for (let c = 0; c < rect.map.width; c++) {
                cells.push(
                  state.doc.nodeAt(
                    rect.tableStart + rect.map.map[r * rect.map.width + c]
                  )
                );
              }
              table.push(cells);
            }

            // sort table array based on column at index, if direction is "desc", reverse the array
            table.sort((a, b) => {
              // TODO: Handle header row
              // TODO: Handle numeric values

              if (direction === "asc") {
                return (a[index]?.textContent ?? "").localeCompare(
                  b[index]?.textContent ?? ""
                );
              }
              return (b[index]?.textContent ?? "").localeCompare(
                a[index]?.textContent ?? ""
              );
            });

            // create the new table
            const rows = [];
            for (let i = 0; i < table.length; i += 1) {
              rows.push(
                state.schema.nodes.tr.createChecked(null, table[i] ?? [])
              );
            }

            // replace the original table with this sorted one
            const nodes = state.schema.nodes.table.createChecked(null, rows);
            const tr = state.tr.replaceRangeWith(
              rect.tableStart - 1,
              rect.tableStart - 1 + rect.table.nodeSize,
              nodes
            );

            dispatch(
              tr
                // .setSelection(
                //   CellSelection.colSelection(
                //     tr.doc.resolve(
                //       rect.tableStart +
                //         rect.map.positionAt(0, index, rect.table)
                //     )
                //   )
                // )
                .scrollIntoView()
            );
          }
          return true;
        },
      addColumnBefore: () => addColumnBefore,
      addColumnAfter: () => addColumnAfter,
      deleteColumn: () => deleteColumn,
      addRowAfter: addRowAndMoveSelection,
      deleteRow: () => deleteRow,
      deleteTable: () => deleteTable,
      toggleHeaderColumn: () => toggleHeaderColumn,
      toggleHeaderRow: () => toggleHeaderRow,
      toggleHeaderCell: () => toggleHeaderCell,
    };
  }

  keys() {
    return {
      Tab: chainCommands(goToNextCell(1), addRowAndMoveSelection()),
      "Shift-Tab": goToNextCell(-1),
      Enter: addRowAndMoveSelection(),
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.renderTable(node);
    state.closeBlock(node);
  }

  parseMarkdown() {
    return { block: "table" };
  }

  get plugins() {
    return [
      tableEditing(),
      new Plugin({
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];
            let index = 0;

            doc.descendants((node, pos) => {
              if (node.type.name !== this.name) {
                return;
              }

              const elements = document.getElementsByClassName("rme-table");
              const table = elements[index];
              if (!table) {
                return;
              }

              const element = table.parentElement;
              const shadowRight = !!(
                element && element.scrollWidth > element.clientWidth
              );

              if (shadowRight) {
                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    () => {
                      const shadow = document.createElement("div");
                      shadow.className = "scrollable-shadow right";
                      return shadow;
                    },
                    {
                      key: "table-shadow-right",
                    }
                  )
                );
              }
              index++;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }
}
