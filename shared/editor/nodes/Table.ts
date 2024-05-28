import { chainCommands } from "prosemirror-commands";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import {
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
import {
  addRowAndMoveSelection,
  setColumnAttr,
  createTable,
  sortTable,
  setTableAttr,
} from "../commands/table";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import tablesRule from "../rules/tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { TableLayout } from "../types";
import Node from "./Node";
import { TableView } from "./TableView";

export type TableAttrs = {
  layout: TableLayout | null;
};

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
        // Note: This is overridden by TableView
        return [
          "div",
          { class: EditorStyleHelper.table },
          ["table", {}, ["tbody", 0]],
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
      // Note: Important to register columnResizing before tableEditing
      columnResizing({
        View: TableView,
        lastColumnResizable: false,
      }),
      tableEditing(),
    ];
  }
}
