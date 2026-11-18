import { t } from "i18next";
import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { findTable, TableMap } from "prosemirror-tables";
import { Decoration, DecorationSet } from "prosemirror-view";
import { isRemoteTransaction } from "../lib/multiplayer";
import { cellWidget } from "../lib/table";
import {
  getHiddenTableRows,
  isEqualTableFilters,
  isTableFilterActive,
  isTableFilterable,
  parseTableFilters,
  remapTableFilters,
} from "../lib/tableFilter";
import { findChildren } from "../queries/findChildren";
import { findParentNodeClosestToPos } from "../queries/findParentNode";
import { isInlineTransaction } from "../queries/isInlineTransaction";
import { hasTableRole } from "../queries/table";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { cn } from "../styles/utils";
import type { TableFilter } from "../types";

/** A summary of the filters on a table that has filters. */
interface TableFilterSummary {
  /** The filters in effect for the current reader. */
  filters: TableFilter[];
  /** Whether the current reader changed the filters from the saved filters. */
  isModified: boolean;
  /** The number of rows shown, not including the header row. */
  visibleRows: number;
  /** The number of rows, not including the header row. */
  totalRows: number;
}

/** A column of a table. */
export interface TableFilterTarget {
  /** The position of the table. */
  pos: number;
  /** The index of the column. */
  column: number;
}

/** The state of the table filter plugin. */
interface TableFilterPluginState {
  /** Filters set by the current reader, by table position. */
  local: ReadonlyMap<number, TableFilter[]>;
  /** Summaries of the tables that have filters, by table position. */
  summaries: ReadonlyMap<number, TableFilterSummary>;
  /** The column whose filter menu is open. */
  open: TableFilterTarget | null;
  /** The position of the table whose filters the reader changed last. */
  changed: number | null;
  /** The decorations that hide rows and show filter controls. */
  decorations: DecorationSet;
}

type TableFilterAction =
  | { type: "set"; pos: number; filters?: TableFilter[] }
  | {
      type: "remap";
      pos: number;
      mapColumn: (column: number) => number | undefined;
    }
  | { type: "open"; target: TableFilterTarget }
  | { type: "close" };

/** The inputs and outputs of a build of table decorations. */
interface BuildContext {
  /** The position of the row that holds the selection. */
  selectionRow: number | null;
  /** The filters of the current reader. */
  local: ReadonlyMap<number, TableFilter[]>;
  /** The column whose filter menu is open. */
  open: TableFilterTarget | null;
  /** The list to add decorations to. */
  decorations: Decoration[];
  /** The map to add summaries to. */
  summaries: Map<number, TableFilterSummary>;
}

/** The key of the table filter plugin. */
export const tableFilterPluginKey = new PluginKey<TableFilterPluginState>(
  "table-filter"
);

/**
 * Set the filters of a table for the current reader only. The document does
 * not change.
 *
 * @param tr the transaction.
 * @param pos the position of the table.
 * @param filters the filters.
 * @returns the transaction.
 */
export function setLocalTableFilters(
  tr: Transaction,
  pos: number,
  filters: TableFilter[]
): Transaction {
  return setAction(tr, { type: "set", pos, filters });
}

/**
 * Change the columns that the filters of a table apply to, in the saved
 * filters and in the filters of the current reader. Use this in a transaction
 * that inserts, removes or moves columns.
 *
 * @param tr the transaction.
 * @param pos the position of the table, after the transaction.
 * @param mapColumn returns the new index of a column, or undefined if removed.
 * @returns the transaction.
 */
export function remapTableColumnFilters(
  tr: Transaction,
  pos: number,
  mapColumn: (column: number) => number | undefined
): Transaction {
  const table = tr.doc.nodeAt(pos);
  if (table?.type.spec.tableRole === "table" && table.attrs.filters) {
    const filters = remapTableFilters(
      parseTableFilters(table.attrs.filters),
      mapColumn
    );
    tr.setNodeAttribute(pos, "filters", filters.length ? filters : null);
  }
  return tr.setMeta(tableFilterPluginKey, { type: "remap", pos, mapColumn });
}

/**
 * Open the filter menu for a column of a table.
 *
 * @param tr the transaction.
 * @param target the column.
 * @returns the transaction.
 */
export function openTableFilterMenu(
  tr: Transaction,
  target: TableFilterTarget
): Transaction {
  return setAction(tr, { type: "open", target });
}

/**
 * Close the open table filter menu.
 *
 * @param tr the transaction.
 * @returns the transaction.
 */
export function closeTableFilterMenu(tr: Transaction): Transaction {
  return setAction(tr, { type: "close" });
}

/**
 * A plugin that hides the rows of tables that do not meet their filters. The
 * filters saved on a table apply for everyone, and each reader can change them
 * for themselves without changing the document.
 */
export class TableFilterPlugin extends Plugin<TableFilterPluginState> {
  constructor() {
    super({
      key: tableFilterPluginKey,
      state: {
        init: (_, state) => {
          const context: BuildContext = {
            selectionRow: getSelectionRow(state),
            local: new Map(),
            open: null,
            decorations: [],
            summaries: new Map(),
          };
          buildTables(state.doc, 0, context);

          return {
            local: context.local,
            summaries: context.summaries,
            open: null,
            changed: null,
            decorations: DecorationSet.create(state.doc, context.decorations),
          };
        },
        apply,
      },
      props: {
        decorations(state) {
          return this.getState(state)?.decorations;
        },
      },
    });
  }
}

function setAction(tr: Transaction, action: TableFilterAction) {
  return tr
    .setMeta(tableFilterPluginKey, action)
    .setMeta("addToHistory", false);
}

function saveTableFilters(state: EditorState, pos: number) {
  const summary = tableFilterPluginKey.getState(state)?.summaries.get(pos);
  if (!summary) {
    return undefined;
  }

  const filters = summary.filters.filter(isTableFilterActive);
  return state.tr
    .setNodeAttribute(pos, "filters", filters.length ? filters : null)
    .setMeta(tableFilterPluginKey, { type: "set", pos });
}

function apply(
  tr: Transaction,
  prev: TableFilterPluginState,
  oldState: EditorState,
  state: EditorState
): TableFilterPluginState {
  const action: TableFilterAction | undefined =
    tr.getMeta(tableFilterPluginKey);
  if (!action && !tr.docChanged && !tr.selectionSet) {
    return prev;
  }

  let { local, summaries, open, changed, decorations } = prev;
  let rebuildAll = false;

  // The positions of the tables to build again.
  const stale = new Set<number>();

  if (tr.docChanged) {
    const isRemote = isRemoteTransaction(tr, state);
    const mapPos = createPositionMapper(tr, isRemote);

    // Undo and remote edits can change the columns without a remap, so the
    // filters of the reader no longer match their columns.
    local = mapKeys(local, mapPos, (pos, next) => {
      const before = tr.before.nodeAt(pos);
      const after = tr.doc.nodeAt(next);
      return (
        action?.type === "remap" ||
        !before ||
        !after ||
        TableMap.get(before).width === TableMap.get(after).width
      );
    });

    const openPos = open ? mapPos(open.pos) : undefined;
    open = open && openPos !== undefined ? { ...open, pos: openPos } : null;
    changed = changed === null ? null : (mapPos(changed) ?? null);

    if (isRemote || !isInlineTransaction(tr, hasTableRole)) {
      rebuildAll = true;
    } else {
      decorations = decorations.map(tr.mapping, tr.doc);
      summaries = mapKeys(summaries, mapPos);

      // Edits to the text of a filtered table can change which rows match.
      prev.summaries.forEach((_, pos) => {
        const next = mapPos(pos);
        if (
          next !== undefined &&
          tr.before.nodeAt(pos) !== tr.doc.nodeAt(next)
        ) {
          stale.add(next);
        }
      });
    }
  }

  if (action) {
    switch (action.type) {
      case "set": {
        const next = new Map(local);
        if (action.filters) {
          next.set(action.pos, action.filters);
        } else {
          next.delete(action.pos);
        }
        local = next;
        changed = action.pos;
        stale.add(action.pos);
        break;
      }
      case "remap": {
        const filters = local.get(action.pos);
        if (filters) {
          local = new Map(local).set(
            action.pos,
            remapTableFilters(filters, action.mapColumn)
          );
        }
        if (open?.pos === action.pos) {
          const column = action.mapColumn(open.column);
          open = column === undefined ? null : { ...open, column };
        }
        stale.add(action.pos);
        break;
      }
      case "open":
      case "close":
        // The button of the open menu stays shown.
        if (open) {
          stale.add(open.pos);
        }
        open = action.type === "open" ? action.target : null;
        if (open) {
          stale.add(open.pos);
        }
        break;
    }
  }

  // The row that holds the selection is never hidden, so that a row does not
  // disappear while it is edited.
  if (!rebuildAll && summaries.size && (tr.selectionSet || tr.docChanged)) {
    const oldRow = getSelectionRow(oldState);
    const newRow = getSelectionRow(state);
    const mappedOldRow = oldRow === null ? null : tr.mapping.map(oldRow);

    if (mappedOldRow !== newRow) {
      for (const row of [mappedOldRow, newRow]) {
        const pos =
          row === null ? undefined : findTable(state.doc.resolve(row))?.pos;
        if (pos !== undefined && summaries.has(pos)) {
          stale.add(pos);
        }
      }
    }
  }

  if (!rebuildAll && !stale.size) {
    return { local, summaries, open, changed, decorations };
  }

  const context: BuildContext = {
    selectionRow: getSelectionRow(state),
    local,
    open,
    decorations: [],
    summaries: new Map(),
  };

  if (rebuildAll || stale.size > 1) {
    buildTables(state.doc, 0, context);
    return {
      local,
      summaries: context.summaries,
      open,
      changed,
      decorations: DecorationSet.create(state.doc, context.decorations),
    };
  }

  // Build a single table, and the tables inside it, in place of their old
  // decorations.
  const [pos] = stale;
  const table = state.doc.nodeAt(pos);
  if (table?.type.spec.tableRole === "table") {
    const end = pos + table.nodeSize;
    summaries.forEach((summary, key) => {
      if (key < pos || key >= end) {
        context.summaries.set(key, summary);
      }
    });
    buildTable(table, pos, context);
    buildTables(table, pos + 1, context);
    decorations = decorations
      .remove(decorations.find(pos + 1, end))
      .add(state.doc, context.decorations);
    summaries = context.summaries;
  }

  return { local, summaries, open, changed, decorations };
}

/**
 * Build the decorations and summaries of the tables inside a node.
 *
 * @param node the node to search.
 * @param start the position of the start of the node content.
 * @param context the build inputs and outputs.
 */
function buildTables(node: Node, start: number, context: BuildContext) {
  node.descendants((child, offset) => {
    if (child.type.spec.tableRole === "table") {
      buildTable(child, start + offset, context);
      return true;
    }
    return child.isBlock && !child.isTextblock;
  });
}

function buildTable(node: Node, pos: number, context: BuildContext) {
  if (!isTableFilterable(node)) {
    return;
  }

  const { selectionRow, local, open, decorations, summaries } = context;
  const map = TableMap.get(node);
  const tableStart = pos + 1;
  const saved = parseTableFilters(node.attrs.filters);
  const localFilters = local.get(pos);
  const filters = (localFilters ?? saved).filter(
    (filter) => filter.column < map.width
  );
  const activeColumns = new Set(
    filters.filter(isTableFilterActive).map((filter) => filter.column)
  );

  // A cell that spans several columns holds the button of the first one.
  for (let column = 0; column < map.width; column++) {
    if (column > 0 && map.map[column - 1] === map.map[column]) {
      continue;
    }
    decorations.push(
      buildFilterButton(
        tableStart + map.map[column],
        column,
        activeColumns.has(column),
        open?.pos === pos && open.column === column
      )
    );
  }

  if (!saved.length && !localFilters) {
    return;
  }

  const hidden = new Set(getHiddenTableRows(node, filters));
  let visibleRows = 0;

  node.forEach((row, offset, index) => {
    const rowPos = tableStart + offset;
    if (index === 0) {
      return;
    }
    if (hidden.has(index) && rowPos !== selectionRow) {
      decorations.push(
        Decoration.node(
          rowPos,
          rowPos + row.nodeSize,
          { class: EditorStyleHelper.tableRowFiltered },
          { filtered: true }
        )
      );
      return;
    }
    visibleRows++;
  });

  const summary: TableFilterSummary = {
    filters,
    isModified:
      localFilters !== undefined && !isEqualTableFilters(localFilters, saved),
    visibleRows,
    totalRows: map.height - 1,
  };
  summaries.set(pos, summary);

  if (activeColumns.size > 0 || summary.isModified) {
    decorations.push(
      buildFilterBar(pos + node.nodeSize, summary, activeColumns.size)
    );
  }
}

function buildFilterButton(
  cellPos: number,
  column: number,
  active: boolean,
  expanded: boolean
) {
  const className = cn(EditorStyleHelper.tableFilterButton, {
    active,
    expanded,
  });

  return cellWidget(
    cellPos,
    (view, getPos) => {
      const button = buildButton(className, () => {
        const widgetPos = getPos();
        const pos =
          widgetPos === undefined
            ? undefined
            : findTable(view.state.doc.resolve(widgetPos))?.pos;
        if (pos === undefined) {
          return;
        }

        const { open } = tableFilterPluginKey.getState(view.state) ?? {};
        view.dispatch(
          open?.pos === pos && open.column === column
            ? closeTableFilterMenu(view.state.tr)
            : openTableFilterMenu(view.state.tr, { pos, column })
        );
      });
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", String(expanded));
      button.setAttribute(
        "aria-label",
        active ? t("Change column filter") : t("Filter column")
      );
      return button;
    },
    {
      key: cn(className, column),
      ignoreSelection: true,
      stopEvent: () => true,
    }
  );
}

function buildFilterBar(
  pos: number,
  summary: TableFilterSummary,
  activeCount: number
) {
  const { visibleRows, totalRows, isModified } = summary;

  return Decoration.widget(
    pos,
    (view, getPos) => {
      const getTablePos = () => {
        const widgetPos = getPos();
        const table =
          widgetPos === undefined
            ? undefined
            : view.state.doc.resolve(widgetPos).nodeBefore;
        return widgetPos !== undefined && table
          ? widgetPos - table.nodeSize
          : undefined;
      };

      const bar = document.createElement("div");
      bar.className = cn(EditorStyleHelper.tableFilterBar, {
        inactive: activeCount === 0,
      });

      const label = document.createElement("span");
      label.textContent = activeCount
        ? `${t("{{ count }} filter applied", { count: activeCount })} · ${t(
            "{{ visible }} of {{ total }} rows",
            { visible: visibleRows, total: totalRows }
          )}`
        : t("Filters cleared for you");
      bar.appendChild(label);

      if (activeCount) {
        const clear = buildButton("clear", () => {
          const tablePos = getTablePos();
          if (tablePos !== undefined) {
            view.dispatch(setLocalTableFilters(view.state.tr, tablePos, []));
          }
        });
        clear.textContent = t("Clear");
        bar.appendChild(clear);
      }

      if (isModified) {
        const save = buildButton("save", () => {
          const tablePos = getTablePos();
          const tr =
            view.editable && tablePos !== undefined
              ? saveTableFilters(view.state, tablePos)
              : undefined;
          if (tr) {
            view.dispatch(tr);
          }
        });
        save.textContent = t("Save for everyone");
        bar.appendChild(save);
      }

      return bar;
    },
    {
      side: -1,
      key: `table-filter-bar-${activeCount}-${visibleRows}-${totalRows}-${isModified}`,
      ignoreSelection: true,
      stopEvent: () => true,
    }
  );
}

/**
 * Build a button that does not take the focus from the editor on press.
 */
function buildButton(className: string, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    onClick();
  });
  return button;
}

function getSelectionRow(state: EditorState): number | null {
  return (
    findParentNodeClosestToPos(
      state.selection.$head,
      (node) => node.type.spec.tableRole === "row"
    )?.pos ?? null
  );
}

/**
 * Create a function that maps the position of a table through a transaction.
 * Remote transactions replace the whole document, so a table is found by its
 * order in the document instead.
 */
function createPositionMapper(
  tr: Transaction,
  isRemote: boolean
): (pos: number) => number | undefined {
  if (isRemote) {
    const isTable = (node: Node) => node.type.spec.tableRole === "table";
    let before: number[] | undefined;
    let after: number[] | undefined;
    return (pos) => {
      before ??= findChildren(tr.before, isTable).map((child) => child.pos);
      after ??= findChildren(tr.doc, isTable).map((child) => child.pos);
      const index = before.indexOf(pos);
      return index === -1 ? undefined : after[index];
    };
  }

  return (pos) => {
    const mapped = tr.mapping.map(pos, 1);
    return tr.doc.nodeAt(mapped)?.type.spec.tableRole === "table"
      ? mapped
      : undefined;
  };
}

function mapKeys<T>(
  map: ReadonlyMap<number, T>,
  mapPos: (pos: number) => number | undefined,
  keep: (pos: number, next: number) => boolean = () => true
): ReadonlyMap<number, T> {
  if (!map.size) {
    return map;
  }

  const next = new Map<number, T>();
  map.forEach((value, pos) => {
    const mapped = mapPos(pos);
    if (mapped !== undefined && keep(pos, mapped)) {
      next.set(mapped, value);
    }
  });
  return next;
}
