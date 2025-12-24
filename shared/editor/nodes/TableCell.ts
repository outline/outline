import type { Token } from "markdown-it";
import type { NodeSpec } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { TableMap } from "prosemirror-tables";
import { getCellAttrs, setCellAttrs } from "../lib/table";
import Node from "./Node";

export default class TableCell extends Node {
  get name() {
    return "td";
  }

  get schema(): NodeSpec {
    return {
      content: "block+",
      tableRole: "cell",
      isolating: true,
      parseDOM: [{ tag: "td", getAttrs: getCellAttrs }],
      toDOM(node) {
        return ["td", setCellAttrs(node), 0];
      },
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        alignment: { default: null },
        colwidth: { default: null },
      },
    };
  }

  toMarkdown() {
    // see: renderTable
  }

  parseMarkdown() {
    return {
      block: "td",
      getAttrs: (tok: Token) => ({ alignment: tok.info }),
    };
  }

  get plugins() {
    return [
      new Plugin({
        key: new PluginKey("table-cell-first-column"),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];

            // Iterate through all tables in the document
            doc.descendants((node, pos) => {
              if (node.type.spec.tableRole === "table") {
                try {
                  const map = TableMap.get(node);

                  // Mark cells in the first column and last row of this table
                  node.descendants((cellNode, cellPos) => {
                    if (
                      cellNode.type.spec.tableRole === "cell" ||
                      cellNode.type.spec.tableRole === "header_cell"
                    ) {
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
                } catch (err) {
                  // Skip this table if there's an error
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }

  // get plugins() {
  //   function buildAddRowDecoration(pos: number, index: number) {
  //     const className = cn(EditorStyleHelper.tableAddRow, {
  //       first: index === 0,
  //     });

  //     return Decoration.widget(
  //       pos + 1,
  //       () => {
  //         const plus = document.createElement("a");
  //         plus.role = "button";
  //         plus.className = className;
  //         plus.dataset.index = index.toString();
  //         return plus;
  //       },
  //       {
  //         key: cn(className, index),
  //       }
  //     );
  //   }

  //   return [
  //     new Plugin({
  //       props: {
  //         transformCopied: (slice) => {
  //           // check if the copied selection is a single table, with a single row, with a single cell. If so,
  //           // copy the cell content only – not a table with a single cell. This leads to more predictable pasting
  //           // behavior, both in and outside the app.
  //           if (slice.content.childCount === 1) {
  //             const table = slice.content.firstChild;
  //             if (
  //               table?.type.spec.tableRole === "table" &&
  //               table.childCount === 1
  //             ) {
  //               const row = table.firstChild;
  //               if (
  //                 row?.type.spec.tableRole === "row" &&
  //                 row.childCount === 1
  //               ) {
  //                 const cell = row.firstChild;
  //                 if (cell?.type.spec.tableRole === "cell") {
  //                   return new Slice(
  //                     cell.content,
  //                     slice.openStart,
  //                     slice.openEnd
  //                   );
  //                 }
  //               }
  //             }
  //           }

  //           return slice;
  //         },
  //         handleDOMEvents: {
  //           mousedown: (view, event) => {
  //             if (!(event.target instanceof HTMLElement)) {
  //               return false;
  //             }

  //             const targetAddRow = event.target.closest(
  //               `.${EditorStyleHelper.tableAddRow}`
  //             );
  //             if (targetAddRow) {
  //               event.preventDefault();
  //               event.stopImmediatePropagation();
  //               const index = Number(targetAddRow.getAttribute("data-index"));

  //               addRowBefore({ index })(view.state, view.dispatch);
  //               return true;
  //             }

  //             const targetGrip = event.target.closest(
  //               `.${EditorStyleHelper.tableGrip}`
  //             );
  //             if (targetGrip) {
  //               event.preventDefault();
  //               event.stopImmediatePropagation();
  //               selectTable()(view.state, view.dispatch);
  //               return true;
  //             }

  //             const targetGripRow = event.target.closest(
  //               `.${EditorStyleHelper.tableGripRow}`
  //             );
  //             if (targetGripRow) {
  //               event.preventDefault();
  //               event.stopImmediatePropagation();

  //               selectRow(
  //                 Number(targetGripRow.getAttribute("data-index")),
  //                 event.metaKey || event.shiftKey
  //               )(view.state, view.dispatch);
  //               return true;
  //             }

  //             return false;
  //           },
  //         },
  //         decorations: (state) => {
  //           if (!this.editor.view?.editable) {
  //             return;
  //           }

  //           const { doc } = state;
  //           const decorations: Decoration[] = [];
  //           const rows = getCellsInColumn(0)(state);

  //           if (rows) {
  //             rows.forEach((pos, visualIndex) => {
  //               const actualRowIndex = getRowIndexInMap(visualIndex, state);
  //               const index =
  //                 actualRowIndex !== -1 ? actualRowIndex : visualIndex;
  //               if (index === 0) {
  //                 const className = cn(EditorStyleHelper.tableGrip, {
  //                   selected: isTableSelected(state),
  //                 });

  //                 decorations.push(
  //                   Decoration.widget(
  //                     pos + 1,
  //                     () => {
  //                       const grip = document.createElement("a");
  //                       grip.role = "button";
  //                       grip.className = className;
  //                       return grip;
  //                     },
  //                     {
  //                       key: className,
  //                     }
  //                   )
  //                 );
  //               }

  //               const className = cn(EditorStyleHelper.tableGripRow, {
  //                 selected:
  //                   isRowSelected(index)(state) || isTableSelected(state),
  //                 first: index === 0,
  //                 last: visualIndex === rows.length - 1,
  //               });

  //               decorations.push(
  //                 Decoration.widget(
  //                   pos + 1,
  //                   () => {
  //                     const grip = document.createElement("a");
  //                     grip.role = "button";
  //                     grip.className = className;
  //                     grip.dataset.index = index.toString();
  //                     return grip;
  //                   },
  //                   {
  //                     key: cn(className, index),
  //                   }
  //                 )
  //               );

  //               if (index === 0) {
  //                 decorations.push(buildAddRowDecoration(pos, index));
  //               }

  //               decorations.push(buildAddRowDecoration(pos, index + 1));
  //             });
  //           }

  //           return DecorationSet.create(doc, decorations);
  //         },
  //       },
  //     }),
  //   ];
  // }
}
