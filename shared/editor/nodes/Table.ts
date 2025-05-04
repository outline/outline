import { chainCommands } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import {
  addColumnAfter,
  addRowAfter,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  tableEditing,
  toggleHeader,
} from "prosemirror-tables";
import {
  addRowBefore,
  addColumnBefore,
  addRowAndMoveSelection,
  setColumnAttr,
  createTable,
  exportTable,
  sortTable,
  setTableAttr,
  deleteColSelection,
  deleteRowSelection,
  deleteCellSelection,
  moveOutOfTable,
  createTableInner,
  deleteTableIfSelected,
} from "../commands/table";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { FixTablesPlugin } from "../plugins/FixTables";
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
      addColumnBefore,
      addColumnAfter: () => addColumnAfter,
      deleteColumn: () => deleteColumn,
      addRowBefore,
      addRowAfter: () => addRowAfter,
      deleteRow: () => deleteRow,
      deleteTable: () => deleteTable,
      exportTable,
      toggleHeaderColumn: () => toggleHeader("column"),
      toggleHeaderRow: () => toggleHeader("row"),
    };
  }

  keys() {
    return {
      Tab: chainCommands(goToNextCell(1), addRowAndMoveSelection()),
      "Shift-Tab": goToNextCell(-1),
      "Mod-Enter": addRowAndMoveSelection(),
      "Mod-Backspace": chainCommands(
        deleteCellSelection,
        deleteColSelection(),
        deleteRowSelection(),
        deleteTableIfSelected()
      ),
      Backspace: chainCommands(
        deleteCellSelection,
        deleteColSelection(),
        deleteRowSelection(),
        deleteTableIfSelected()
      ),
      ArrowDown: moveOutOfTable(1),
      ArrowUp: moveOutOfTable(-1),
    };
  }

  inputRules() {
    return [
      new InputRule(/^(\|--)$/, (state, _, start, end) => {
        const nodes = createTableInner(state, 2, 2);
        const tr = state.tr.replaceWith(start - 1, end, nodes).scrollIntoView();
        const resolvedPos = tr.doc.resolve(start + 1);
        tr.setSelection(TextSelection.near(resolvedPos));
        return tr;
      }),
    ];
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
      }),
      tableEditing(),
      new FixTablesPlugin(),
    ];
  }
}
