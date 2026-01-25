import type { Attrs, Node } from "prosemirror-model";
import type { MutableAttrs } from "prosemirror-tables";
import { isBrowser } from "../../utils/browser";
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
    marks: dom.getAttribute("data-bgcolor")
      ? [
          {
            type: "background",
            attrs: {
              color: dom.getAttribute("data-bgcolor"),
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
  if (node.attrs.alignment) {
    attrs.style = `text-align: ${node.attrs.alignment};`;
  }
  if (node.attrs.colwidth) {
    if (isBrowser) {
      attrs["data-colwidth"] = node.attrs.colwidth.map(Number).join(",");
    } else {
      attrs.style =
        (attrs.style ?? "") + `min-width: ${Number(node.attrs.colwidth[0])}px;`;
    }
  }
  if (node.attrs.marks) {
    const backgroundMark = node.attrs.marks.find(
      (mark: NodeAttrMark) => mark.type === "background"
    );
    if (backgroundMark) {
      attrs["data-bgcolor"] = backgroundMark.attrs.color;
      attrs.style =
        (attrs.style ?? "") +
        `background-color: ${backgroundMark.attrs.color}; --cell-text-color: ${readableColor(backgroundMark.attrs.color)};`;
    }
  }

  return attrs;
}
