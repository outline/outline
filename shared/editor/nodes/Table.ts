import { NodeSpec, Node as ProsemirrorNode, Schema } from "prosemirror-model";
import { EditorState, Plugin, TextSelection } from "prosemirror-state";
import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  isInTable,
  tableEditing,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from "prosemirror-tables";
import {
  addRowAt,
  createTable,
  getCellsInColumn,
  moveRow,
} from "prosemirror-utils";
import { Decoration, DecorationSet } from "prosemirror-view";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import tablesRule from "../rules/tables";
import { Dispatch } from "../types";
import Node from "./Node";

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
          { class: "scrollable-wrapper" },
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

  commands({ schema }: { schema: Schema }) {
    return {
      createTable: ({
        rowsCount,
        colsCount,
      }: {
        rowsCount: number;
        colsCount: number;
      }) => (state: EditorState, dispatch: Dispatch) => {
        const offset = state.tr.selection.anchor + 1;
        const nodes = createTable(schema, rowsCount, colsCount);
        const tr = state.tr.replaceSelectionWith(nodes).scrollIntoView();
        const resolvedPos = tr.doc.resolve(offset);

        tr.setSelection(TextSelection.near(resolvedPos));
        dispatch(tr);
        return true;
      },
      setColumnAttr: ({
        index,
        alignment,
      }: {
        index: number;
        alignment: string;
      }) => (state: EditorState, dispatch: Dispatch) => {
        const cells = getCellsInColumn(index)(state.selection) || [];
        let transaction = state.tr;
        cells.forEach(({ pos }) => {
          transaction = transaction.setNodeMarkup(pos, undefined, {
            alignment,
          });
        });
        dispatch(transaction);
        return true;
      },
      addColumnBefore: () => addColumnBefore,
      addColumnAfter: () => addColumnAfter,
      deleteColumn: () => deleteColumn,
      addRowAfter: ({ index }: { index: number }) => (
        state: EditorState,
        dispatch: Dispatch
      ) => {
        if (index === 0) {
          // A little hack to avoid cloning the heading row by cloning the row
          // beneath and then moving it to the right index.
          const tr = addRowAt(index + 2, true)(state.tr);
          dispatch(moveRow(index + 2, index + 1)(tr));
        } else {
          dispatch(addRowAt(index + 1, true)(state.tr));
        }
        return true;
      },
      deleteRow: () => deleteRow,
      deleteTable: () => deleteTable,
      toggleHeaderColumn: () => toggleHeaderColumn,
      toggleHeaderRow: () => toggleHeaderRow,
      toggleHeaderCell: () => toggleHeaderCell,
    };
  }

  keys() {
    return {
      Tab: goToNextCell(1),
      "Shift-Tab": goToNextCell(-1),
      Enter: (state: EditorState, dispatch: Dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        // TODO: Adding row at the end for now, can we find the current cell
        // row index and add the row below that?
        const cells = getCellsInColumn(0)(state.selection) || [];

        dispatch(addRowAt(cells.length, true)(state.tr));
        return true;
      },
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
                  Decoration.widget(pos + 1, () => {
                    const shadow = document.createElement("div");
                    shadow.className = "scrollable-shadow right";
                    return shadow;
                  })
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
