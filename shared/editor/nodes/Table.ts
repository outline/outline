import { chainCommands } from "prosemirror-commands";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { Command, Plugin, TextSelection } from "prosemirror-state";
import {
  addColumnAfter,
  addColumnBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  tableEditing,
  toggleHeaderCell,
  toggleHeaderColumn,
  toggleHeaderRow,
} from "prosemirror-tables";
import { Decoration, DecorationSet } from "prosemirror-view";
import {
  addRowAfterAndMoveSelection,
  setColumnAttr,
  createTable,
} from "../commands/table";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import tablesRule from "../rules/tables";
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
      addColumnBefore: () => addColumnBefore,
      addColumnAfter: () => addColumnAfter,
      deleteColumn: () => deleteColumn,
      addRowAfter: addRowAfterAndMoveSelection,
      deleteRow: () => deleteRow,
      deleteTable: () => deleteTable,
      toggleHeaderColumn: () => toggleHeaderColumn,
      toggleHeaderRow: () => toggleHeaderRow,
      toggleHeaderCell: () => toggleHeaderCell,
    };
  }

  keys() {
    return {
      Tab: chainCommands(goToNextCell(1), addRowAfterAndMoveSelection()),
      "Shift-Tab": goToNextCell(-1),
      Enter: addRowAfterAndMoveSelection(),
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
