import type { Node } from "prosemirror-model";
import { TableMap } from "prosemirror-tables";
import { TableFilterOperator, type TableFilter } from "../types";

const operators = Object.values(TableFilterOperator);

/**
 * Get the filter operator for a value.
 *
 * @param value the value to read.
 * @returns the operator, or undefined if the value is not an operator.
 */
export function parseTableFilterOperator(
  value: unknown
): TableFilterOperator | undefined {
  return operators.find((operator) => operator === value);
}

/**
 * Normalize a value so that values that differ only by case or whitespace are
 * the same.
 *
 * @param value the value.
 * @returns the normalized value.
 */
export function toFilterKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

/**
 * Get the text of a table cell, with whitespace collapsed, for use as a filter
 * value.
 *
 * @param cell the table cell node.
 * @returns the text of the cell.
 */
export function getCellValue(cell: Node): string {
  const parts: string[] = [];
  cell.descendants((node) => {
    if (node.isText) {
      parts.push(node.text ?? "");
      return false;
    }

    // Inline atoms such as emoji can have no text content, so they are read
    // from their leaf text.
    const { leafText } = node.type.spec;
    if (node.isInline && leafText && !node.textContent) {
      parts.push(leafText(node));
      return false;
    }
    if (node.isBlock && parts.length) {
      parts.push(" ");
    }
    return true;
  });
  return parts.join("").replace(/\s+/g, " ").trim();
}

/**
 * Parse the filters stored on a table node. Invalid entries are left out, and
 * each column keeps only its first filter.
 *
 * @param value the stored value.
 * @returns the valid filters.
 */
export function parseTableFilters(value: unknown): TableFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const filters: TableFilter[] = [];
  const columns = new Set<number>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("column" in item) ||
      !("operator" in item)
    ) {
      continue;
    }

    const { column } = item;
    const operator = parseTableFilterOperator(item.operator);
    if (
      typeof column !== "number" ||
      !Number.isInteger(column) ||
      column < 0 ||
      columns.has(column) ||
      !operator
    ) {
      continue;
    }

    const values: unknown[] =
      "values" in item && Array.isArray(item.values) ? item.values : [];

    columns.add(column);
    filters.push({
      column,
      operator,
      values: values.filter((v): v is string => typeof v === "string"),
    });
  }

  return filters;
}

/**
 * Whether a filter hides any rows. A filter that compares with values does
 * nothing until a value is chosen.
 *
 * @param filter the filter.
 * @returns true if the filter is active.
 */
export function isTableFilterActive(filter: TableFilter): boolean {
  if (isTextOperator(filter.operator)) {
    return !!filter.values[0]?.trim();
  }
  if (isListOperator(filter.operator)) {
    return filter.values.length > 0;
  }
  return true;
}

/**
 * Whether an operator compares cells with a list of chosen values.
 *
 * @param operator the operator.
 * @returns true for the "is" and "is not" operators.
 */
export function isListOperator(operator: TableFilterOperator): boolean {
  return (
    operator === TableFilterOperator.Is ||
    operator === TableFilterOperator.IsNot
  );
}

/**
 * Whether an operator compares cells with a text that the reader types.
 *
 * @param operator the operator.
 * @returns true for the "contains" and "does not contain" operators.
 */
export function isTextOperator(operator: TableFilterOperator): boolean {
  return (
    operator === TableFilterOperator.Contains ||
    operator === TableFilterOperator.DoesNotContain
  );
}

/**
 * Whether two lists of filters have the same effect.
 *
 * @param a the first list of filters.
 * @param b the second list of filters.
 * @returns true if the filters are equal.
 */
export function isEqualTableFilters(a: TableFilter[], b: TableFilter[]) {
  const serialize = (filters: TableFilter[]) =>
    JSON.stringify(
      filters
        .filter(isTableFilterActive)
        .map((filter) => ({
          ...filter,
          values: filter.values.map(toFilterKey).sort(),
        }))
        .sort((x, y) => x.column - y.column)
    );

  return serialize(a) === serialize(b);
}

/**
 * Whether a table can be filtered. The table needs a header row with one cell
 * for each column and at least one other row, and cells that span rows cannot
 * be hidden on their own.
 *
 * @param table the table node.
 * @returns true if the table can be filtered.
 */
export function isTableFilterable(table: Node): boolean {
  if (table.childCount < 2) {
    return false;
  }

  for (let row = 0; row < table.childCount; row++) {
    const cells = table.child(row);
    for (let index = 0; index < cells.childCount; index++) {
      const cell = cells.child(index);
      if (cell.attrs.rowspan > 1) {
        return false;
      }
      if (
        row === 0 &&
        (cell.type.spec.tableRole !== "header_cell" || cell.attrs.colspan > 1)
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Get the text of each header cell of a table, by column.
 *
 * @param table the table node.
 * @returns the text of the header of each column.
 */
export function getTableHeaders(table: Node): string[] {
  const map = TableMap.get(table);
  return Array.from({ length: map.width }, (_, column) => {
    const cell = table.nodeAt(map.map[column]);
    return cell ? toFilterKey(getCellValue(cell)) : "";
  });
}

/**
 * Create a function that finds where a column of a table went after a change
 * that may have moved, added or removed columns, by matching header text.
 *
 * @param before the table before the change.
 * @param after the table after the change.
 * @returns returns the new index of a column, or undefined if it is not found.
 */
export function mapTableColumnsByHeader(
  before: Node,
  after: Node
): (column: number) => number | undefined {
  const old = getTableHeaders(before);
  const next = getTableHeaders(after);
  if (old.length === next.length && old.every((key, i) => key === next[i])) {
    return (column) => column;
  }

  return (column) => {
    const key = old[column];
    const matches = next.flatMap((k, i) => (k === key ? [i] : []));
    if (matches.length === 1 && old.filter((k) => k === key).length === 1) {
      return matches[0];
    }

    // A header whose text changed stays at its index, if nothing moved there.
    if (column < next.length && !old.includes(next[column])) {
      return column;
    }
    return undefined;
  };
}

/**
 * Get the rows of a table that the filters hide. The header row is never
 * hidden. The table must be filterable.
 *
 * @param table the table node.
 * @param filters the filters to apply.
 * @returns the indexes of the hidden rows.
 */
export function getHiddenTableRows(
  table: Node,
  filters: TableFilter[]
): number[] {
  const map = TableMap.get(table);
  const matchers = filters
    .filter(
      (filter) => isTableFilterActive(filter) && filter.column < map.width
    )
    .map((filter) => ({
      column: filter.column,
      matches: createMatcher(filter),
    }));
  if (!matchers.length) {
    return [];
  }

  const hidden: number[] = [];
  for (let row = 1; row < map.height; row++) {
    const visible = matchers.every(({ column, matches }) => {
      const cell = table.nodeAt(map.map[row * map.width + column]);
      return matches(cell ? getCellValue(cell) : "");
    });
    if (!visible) {
      hidden.push(row);
    }
  }
  return hidden;
}

/**
 * Get the distinct values in a column of a table, below the header row. Values
 * that differ only by case or whitespace are the same, and the first is kept.
 *
 * @param table the table node.
 * @param column the index of the column.
 * @returns the values, sorted alphabetically.
 */
export function getTableColumnValues(table: Node, column: number): string[] {
  const map = TableMap.get(table);
  if (column < 0 || column >= map.width) {
    return [];
  }

  const values = new Map<string, string>();
  for (let row = 1; row < map.height; row++) {
    const cell = table.nodeAt(map.map[row * map.width + column]);
    const value = cell ? getCellValue(cell) : "";
    if (!value) {
      continue;
    }

    const key = toFilterKey(value);
    if (!values.has(key)) {
      values.set(key, value);
    }
  }

  return [...values.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

/**
 * Change the columns that filters apply to, for example after a column is
 * moved. Filters on a column that is removed are left out.
 *
 * @param filters the filters.
 * @param mapColumn returns the new index of a column, or undefined if removed.
 * @returns the changed filters.
 */
export function remapTableFilters(
  filters: TableFilter[],
  mapColumn: (column: number) => number | undefined
): TableFilter[] {
  return filters.flatMap((filter) => {
    const column = mapColumn(filter.column);
    return column === undefined ? [] : [{ ...filter, column }];
  });
}

/**
 * Create a function that checks whether a cell value meets a filter.
 *
 * @param filter the filter.
 * @returns a function that takes the text of a cell, as returned by
 * getCellValue, and returns true if it meets the filter.
 */
function createMatcher(filter: TableFilter): (value: string) => boolean {
  switch (filter.operator) {
    case TableFilterOperator.Is:
    case TableFilterOperator.IsNot: {
      const keys = new Set(filter.values.map(toFilterKey));
      const is = filter.operator === TableFilterOperator.Is;

      // Cell values have whitespace collapsed, so only the case differs.
      return (value) => keys.has(value.toLocaleLowerCase()) === is;
    }
    case TableFilterOperator.Contains:
    case TableFilterOperator.DoesNotContain: {
      const key = toFilterKey(filter.values[0] ?? "");
      const contains = filter.operator === TableFilterOperator.Contains;
      return (value) => value.toLocaleLowerCase().includes(key) === contains;
    }
    case TableFilterOperator.IsEmpty:
      return (value) => value === "";
    case TableFilterOperator.IsNotEmpty:
      return (value) => value !== "";
    default:
      return () => true;
  }
}
