import type { Attrs, Node, Schema } from "prosemirror-model";
import type { MutableAttrs } from "prosemirror-tables";
import { isBrowser } from "../../utils/browser";
import { validateColorHex } from "../../utils/color";
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

  const bgColor = dom.getAttribute("data-bgcolor");

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
