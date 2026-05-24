import { t } from "i18next";
import { chainCommands } from "prosemirror-commands";
import { InputRule } from "prosemirror-inputrules";
import type { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import {
  AlignFullWidthIcon,
  DownloadIcon,
  TableColumnsDistributeIcon,
  TrashIcon,
} from "outline-icons";
import {
  addColumnAfter,
  addRowAfter,
  columnResizing,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  moveTableColumn,
  moveTableRow,
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
  distributeColumns,
  sortTable,
  setTableAttr,
  deleteColSelection,
  deleteRowSelection,
  deleteCellSelection,
  moveOutOfTable,
  createTableInner,
  deleteTableIfSelected,
  splitCellAndCollapse,
  mergeCellsAndCollapse,
  toggleColumnBackground,
  toggleRowBackground,
  toggleCellSelectionBackground,
  toggleCellSelectionBackgroundAndCollapseSelection,
  toggleRowBackgroundAndCollapseSelection,
  toggleColumnBackgroundAndCollapseSelection,
} from "../commands/table";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { FixTablesPlugin } from "../plugins/FixTablesPlugin";
import { TableLayoutPlugin } from "../plugins/TableLayoutPlugin";
import tablesRule from "../rules/tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { isNodeActive } from "../queries/isNodeActive";
import { TableLayout } from "../types";
import type {
  SelectionToolbarMenuDescriptor,
} from "../types";
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

  selectionToolbarMenus(): SelectionToolbarMenuDescriptor[] {
    return [
      {
        id: "table",
        priority: 90,
        matches: (ctx) => ctx.isTableSelected && !ctx.readOnly,
        getItems: (ctx) => {
          const { schema, state } = ctx;
          const isFullWidth = isNodeActive(schema.nodes.table, {
            layout: TableLayout.fullWidth,
          })(state);

          return [
            {
              name: "setTableAttr",
              tooltip: isFullWidth
                ? t("Default width")
                : t("Full width"),
              icon: <AlignFullWidthIcon />,
              attrs: isFullWidth
                ? { layout: null }
                : { layout: TableLayout.fullWidth },
              active: () => isFullWidth,
            },
            {
              name: "distributeColumns",
              tooltip: t("Distribute columns"),
              icon: <TableColumnsDistributeIcon />,
            },
            {
              name: "separator",
            },
            {
              name: "deleteTable",
              tooltip: t("Delete table"),
              icon: <TrashIcon />,
            },
            {
              name: "separator",
            },
            {
              name: "exportTable",
              tooltip: t("Export as CSV"),
              label: "CSV",
              attrs: {
                format: "csv",
                fileName: `${window.document.title}.csv`,
              },
              icon: <DownloadIcon />,
            },
          ];
        },
      },
    ];
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
      moveTableRow,
      moveTableColumn,
      deleteRow: () => deleteRow,
      deleteTable: () => deleteTable,
      exportTable,
      distributeColumns,
      toggleHeaderColumn: () => toggleHeader("column"),
      toggleHeaderRow: () => toggleHeader("row"),
      mergeCells: () => mergeCellsAndCollapse(),
      splitCell: () => splitCellAndCollapse(),
      toggleRowBackground,
      toggleRowBackgroundAndCollapseSelection,
      toggleColumnBackground,
      toggleColumnBackgroundAndCollapseSelection,
      toggleCellSelectionBackground,
      toggleCellSelectionBackgroundAndCollapseSelection,
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
        defaultCellMinWidth: 25,
      }),
      tableEditing(),
      new FixTablesPlugin(),
      new TableLayoutPlugin(),
    ];
  }
}
