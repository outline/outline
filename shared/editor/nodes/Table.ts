import { chainCommands } from "prosemirror-commands";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import {
  TableView,
  addColumnAfter,
  addColumnBefore,
  columnResizing,
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
  addRowAndMoveSelection,
  setColumnAttr,
  createTable,
  sortTable,
  setTableAttr,
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
      attrs: {
        layout: {
          default: null,
        },
      },
      toDOM() {
        return [
          "div",
          { class: "scrollable-wrapper table-wrapper" },
          ["div", { class: "scrollable" }, ["table", {}, ["tbody", 0]]],
        ];
      },
    };
  }

  get rulePlugins() {
    return [tablesRule];
  }

  commands() {
    return {
      createTable,
      setColumnAttr,
      setTableAttr,
      sortTable,
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
      "Mod-Enter": addRowAndMoveSelection(),
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
      columnResizing({ View, lastColumnResizable: false }),
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

class View extends TableView {
  constructor(public node: ProsemirrorNode, public cellMinWidth: number) {
    super(node, cellMinWidth);

    if (node.attrs.layout === "full-width") {
      this.dom.classList.add("table-full-width");
    }
  }

  update(node: ProsemirrorNode) {
    if (node.attrs.layout === "full-width") {
      this.dom.classList.add("table-full-width");
    } else {
      this.dom.classList.remove("table-full-width");
    }

    return super.update(node);
  }
}
