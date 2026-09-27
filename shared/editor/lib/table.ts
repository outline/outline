import type { Attrs, Node, Schema } from "prosemirror-model";
import { TableMap, type MutableAttrs } from "prosemirror-tables";
import type { EditorView } from "prosemirror-view";
import { isBrowser } from "../../utils/browser";
import { isNearWhite, toHexColor, validateColorHex } from "../../utils/color";
import type { TableLayout, NodeAttrMark } from "../types";
import { readableColor } from "polished";

export interface TableAttrs {
  layout: TableLayout | null;
}

export interface CellAttrs {
  colspan: number;
  rowspan: number;
  colwidth: number[] | null;
  alignment: "center" | "left" | "right" | null;
  marks?: NodeAttrMark[];
}

const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right"]);

/**
 * Validates an alignment attribute value.
 *
 * @param value The value to validate.
 * @returns true if the value is a safe alignment or null.
 */
export const isValidCellAlignment = (
  value: unknown
): value is "left" | "center" | "right" | null =>
  value === null ||
  (typeof value === "string" && ALLOWED_ALIGNMENTS.has(value));

/**
 * Validates a table cell's `marks` attribute against the given schema. Checks
 * that the value is an array of well-formed mark objects whose type exists in
 * the schema, and — for `background` marks — that the color is a valid hex
 * value. `null` and `undefined` are both considered valid (the attribute is
 * optional).
 *
 * @param value The value to validate.
 * @param schema The editor schema, used to check mark types are registered.
 *               Optional — when absent, mark-type registration is not checked.
 * @returns true if the value is a valid marks array, null, or undefined.
 */
export const isValidCellMarks = (
  value: unknown,
  schema?: Schema
): value is NodeAttrMark[] | null | undefined => {
  if (value === undefined || value === null) {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  const marks = schema?.marks;
  return value.every((mark) => {
    if (!mark || typeof mark !== "object") {
      return false;
    }
    const type = (mark as NodeAttrMark).type;
    if (typeof type !== "string") {
      return false;
    }
    if (marks && !Object.prototype.hasOwnProperty.call(marks, type)) {
      return false;
    }
    const attrs = (mark as NodeAttrMark).attrs;
    if (attrs !== undefined && (typeof attrs !== "object" || attrs === null)) {
      return false;
    }
    if (type === "background") {
      return typeof attrs?.color === "string" && validateColorHex(attrs.color);
    }
    return true;
  });
};

/**
 * Reads a background color styled on a cell by an external application, such as
 * a spreadsheet or word processor, so that it is retained when pasting.
 *
 * @param dom DOM node to read the background from
 * @returns The background in hex notation, or null when there is none worth keeping
 */
function getCellBackground(dom: HTMLElement): string | null {
  const background = dom.style.backgroundColor;
  if (!background || isNearWhite(background)) {
    return null;
  }
  return toHexColor(background);
}

/**
 * Helper to get cell attributes from a DOM node, used when pasting table content.
 *
 * @param dom DOM node to get attributes from
 * @returns Cell attributes
 */
export function getCellAttrs(dom: HTMLElement | string): Attrs {
  if (typeof dom === "string") {
    return {};
  }

  const widthAttr = dom.getAttribute("data-colwidth");
  const widths =
    widthAttr && /^\d+(,\d+)*$/.test(widthAttr)
      ? widthAttr.split(",").map(Number)
      : null;
  const colspan = Number(dom.getAttribute("colspan") || 1);

  const bgColor = dom.getAttribute("data-bgcolor") ?? getCellBackground(dom);

  return {
    colspan,
    rowspan: Number(dom.getAttribute("rowspan") || 1),
    colwidth: widths && widths.length === colspan ? widths : null,
    alignment:
      dom.style.textAlign === "center"
        ? "center"
        : dom.style.textAlign === "right"
          ? "right"
          : null,
    marks:
      bgColor && validateColorHex(bgColor)
        ? [
            {
              type: "background",
              attrs: {
                color: bgColor,
              },
            },
          ]
        : undefined,
  } satisfies CellAttrs;
}

/**
 * Helper to serialize cell attributes on a node, used when copying table content.
 *
 * @param node Node to get attributes from
 * @returns Attributes for the cell
 */
export function setCellAttrs(node: Node): Attrs {
  const attrs: MutableAttrs = {};
  if (node.attrs.colspan !== 1) {
    attrs.colspan = node.attrs.colspan;
  }
  if (node.attrs.rowspan !== 1) {
    attrs.rowspan = node.attrs.rowspan;
  }
  if (isValidCellAlignment(node.attrs.alignment) && node.attrs.alignment) {
    attrs.style = `text-align: ${node.attrs.alignment};`;
  }
  if (node.attrs.colwidth) {
    if (isBrowser) {
      attrs["data-colwidth"] = node.attrs.colwidth.map(Number).join(",");
    } else {
      attrs.style =
        ((attrs.style as string) ?? "") +
        `min-width: ${Number(node.attrs.colwidth[0])}px;`;
    }
  }
  if (Array.isArray(node.attrs.marks)) {
    const backgroundMark = node.attrs.marks.find(
      (mark: NodeAttrMark) =>
        mark?.type === "background" &&
        typeof mark.attrs?.color === "string" &&
        validateColorHex(mark.attrs.color)
    );
    if (backgroundMark) {
      const color = backgroundMark.attrs!.color as string;
      attrs["data-bgcolor"] = color;
      attrs.style =
        ((attrs.style as string) ?? "") +
        `--cell-bg-color: ${color}; --cell-text-color: ${readableColor(color)};`;
    }
  }

  return attrs;
}

/**
 * Position a table grip or insert button on one of the rows or columns that a
 * merged cell spans. The position is set with CSS custom properties that are
 * percentages of the cell size.
 *
 * @param element The element to position.
 * @param offset The index of the row or column within the cell.
 * @param sizes The relative size of each row or column that the cell spans.
 */
export function setSpanPosition(
  element: HTMLElement,
  offset: number,
  sizes: number[]
): void {
  if (sizes.length < 2) {
    return;
  }

  const total = sizes.reduce((sum, size) => sum + size, 0);
  const start = sizes.slice(0, offset).reduce((sum, size) => sum + size, 0);
  const end = start + sizes[offset];

  element.style.setProperty("--span-start", `${(start / total) * 100}%`);
  element.style.setProperty("--span-size", `${(sizes[offset] / total) * 100}%`);
  element.style.setProperty("--span-end", `${100 - (end / total) * 100}%`);
}

/**
 * Keep a table grip or insert button positioned on one of the rows or columns
 * that a merged cell spans, by measuring the rendered rows or columns whenever
 * the table or cell is resized.
 *
 * @param element The element to position, placed at the start of the cell.
 * @param view The editor view.
 * @param getPos A function that returns the position of the element.
 * @param axis Whether the cell spans rows or columns.
 * @param offset The index of the row or column within the cell.
 */
export function trackSpanPosition(
  element: HTMLElement,
  view: EditorView,
  getPos: () => number | undefined,
  axis: "row" | "column",
  offset: number
): void {
  if (typeof ResizeObserver === "undefined") {
    return;
  }

  const observer = new ResizeObserver(() => {
    const pos = getPos();
    const sizes =
      pos === undefined ? undefined : measureSpan(view, pos - 1, axis);
    if (sizes) {
      setSpanPosition(element, offset, sizes);
    }
  });

  // The element is not in the document until the widget is mounted.
  const frame = requestAnimationFrame(() => {
    const cell = element.closest("td, th");
    const table = cell?.closest("table");
    if (cell && table) {
      observer.observe(cell);
      observer.observe(table);
    }
  });

  spanTrackers.set(element, () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  });
}

/**
 * Stop keeping an element positioned, see trackSpanPosition.
 *
 * @param element The positioned element.
 */
export function untrackSpanPosition(element: globalThis.Node): void {
  spanTrackers.get(element)?.();
  spanTrackers.delete(element);
}

/**
 * Get the relative width of each column that a cell spans, using the stored
 * column widths when they are available.
 *
 * @param node The cell node.
 * @param colspan The number of columns that the cell spans.
 * @returns The relative width of each spanned column.
 */
export function getColumnSizes(node: Node | null, colspan: number): number[] {
  const colwidth: unknown = node?.attrs.colwidth;
  if (
    Array.isArray(colwidth) &&
    colwidth.length === colspan &&
    colwidth.every((width) => typeof width === "number" && width > 0)
  ) {
    return colwidth;
  }
  return Array.from({ length: colspan }, () => 1);
}

const spanTrackers = new WeakMap<globalThis.Node, () => void>();

/**
 * Measure the rendered size of each row or column that a cell spans.
 *
 * @param view The editor view.
 * @param cellPos The position of the cell.
 * @param axis Whether to measure rows or columns.
 * @returns The size of each spanned row or column, or undefined if one of them
 * cannot be measured.
 */
function measureSpan(
  view: EditorView,
  cellPos: number,
  axis: "row" | "column"
): number[] | undefined {
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  if (table?.type.spec.tableRole !== "table") {
    return undefined;
  }

  const tableStart = $cell.start(-1);
  const map = TableMap.get(table);
  const rect = map.findCell(cellPos - tableStart);
  const sizes: number[] = [];

  if (axis === "row") {
    let rowPos = tableStart;
    for (let row = 0; row < rect.bottom; row++) {
      if (row >= rect.top) {
        const dom = view.nodeDOM(rowPos);
        if (!(dom instanceof HTMLElement)) {
          return undefined;
        }
        sizes.push(dom.getBoundingClientRect().height);
      }
      rowPos += table.child(row).nodeSize;
    }
  } else {
    for (let col = rect.left; col < rect.right; col++) {
      // Measure a cell that only covers this column.
      let width: number | undefined;
      for (let row = 0; row < map.height && width === undefined; row++) {
        const pos = map.map[row * map.width + col];
        const { left, right } = map.findCell(pos);
        const dom =
          left === col && right === col + 1
            ? view.nodeDOM(tableStart + pos)
            : undefined;
        if (dom instanceof HTMLElement) {
          width = dom.getBoundingClientRect().width;
        }
      }
      if (width === undefined) {
        return undefined;
      }
      sizes.push(width);
    }
  }

  return sizes.every((size) => size > 0) ? sizes : undefined;
}
