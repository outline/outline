import { selectedRect } from "prosemirror-tables";
import * as React from "react";
import type { EditorView } from "prosemirror-view";
import { ColumnSelection } from "@shared/editor/selection/ColumnSelection";
import { RowSelection } from "@shared/editor/selection/RowSelection";
import { isTableSelected } from "@shared/editor/queries/table";
import { useEditor } from "./EditorContext";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

const DEFAULT_SIDE_OFFSET = 4;

// Column and row menus open next to a grip handle. The grip is modelled as a
// strip just outside the cell edge so the two distances are independent:
// opening to the outside clears the grip (strip thickness + offset), while
// flipping across sits only a small gap (offset) away.
const OUTSIDE_CLEARANCE = 20;
const FLIP_GAP = 0;
const GRIP_INSET = OUTSIDE_CLEARANCE - FLIP_GAP;
const GRIP_SIDE_OFFSET = FLIP_GAP;

type Anchor = {
  /** Viewport rect to anchor the menu to. */
  top: number;
  left: number;
  width: number;
  height: number;
  /** Which side of the anchor the menu opens towards. */
  side: Side;
  /** How the menu aligns along the anchor edge. */
  align: Align;
  /** Distance in pixels between the anchor and the menu. */
  sideOffset: number;
  /** Stable identifier for the anchored target, changes when it moves. */
  key: string;
};

/**
 * Computes the rect and placement to anchor an inline selection menu to, based
 * on the current table/column/row selection. The menu opens to the "outside"
 * of the table (above a column, beside a row) to cover the least content, and
 * is centered on the anchor for minimal pointer movement. Returns null when
 * there is no supported selection.
 *
 * @param view - the editor view.
 * @param rtl - whether the document is right-to-left.
 * @returns the anchor, or null.
 */
function getAnchor(view: EditorView, rtl: boolean): Anchor | null {
  const { state } = view;
  const { selection } = state;

  if (isTableSelected(state)) {
    const rect = selectedRect(state);
    const bounds = (
      view.domAtPos(rect.tableStart).node as HTMLElement
    ).getBoundingClientRect();
    // A horizontal line at the table's top edge so it stays near the top
    // whether the menu opens above or flips below.
    return {
      top: bounds.top,
      left: bounds.left,
      width: bounds.width,
      height: 0,
      side: "top",
      align: "start",
      sideOffset: DEFAULT_SIDE_OFFSET,
      key: `table-${rect.tableStart}`,
    };
  }

  if (selection instanceof ColumnSelection && selection.isColSelection()) {
    const rect = selectedRect(state);
    const cell = (
      view.domAtPos(rect.tableStart).node as HTMLElement
    ).querySelector(`tr > *:nth-child(${rect.left + 1})`);
    if (cell instanceof HTMLElement) {
      const bounds = cell.getBoundingClientRect();
      // A strip just above the column's top edge (the grip), spanning the
      // column width so the menu centers on the column.
      return {
        top: bounds.top - GRIP_INSET,
        left: bounds.left,
        width: bounds.width,
        height: GRIP_INSET,
        side: "top",
        align: "center",
        sideOffset: GRIP_SIDE_OFFSET,
        key: `col-${rect.tableStart}-${rect.left}`,
      };
    }
  }

  if (selection instanceof RowSelection && selection.isRowSelection()) {
    const rect = selectedRect(state);
    const cell = (
      view.domAtPos(rect.tableStart).node as HTMLElement
    ).querySelector(`tr:nth-child(${rect.top + 1}) > *`);
    if (cell instanceof HTMLElement) {
      const bounds = cell.getBoundingClientRect();
      // A strip just outside the row's grip edge (left, or right in RTL),
      // spanning the row height so the menu centers on the row.
      return {
        top: bounds.top,
        left: rtl ? bounds.right : bounds.left - GRIP_INSET,
        width: GRIP_INSET,
        height: bounds.height,
        side: rtl ? "right" : "left",
        align: "center",
        sideOffset: GRIP_SIDE_OFFSET,
        key: `row-${rect.tableStart}-${rect.top}`,
      };
    }
  }

  return null;
}

/**
 * Positions an invisible virtual anchor element over the current table, column,
 * or row selection so a Radix dropdown can anchor an inline menu to it. The
 * returned `key` changes when the anchored target changes; spread it onto the
 * menu root so Radix repositions for a new target.
 *
 * @param rtl - whether the document is right-to-left.
 * @returns the anchor ref to attach to the virtual trigger, the target key, and
 * the side/align the menu should open with.
 */
export function useInlineMenuAnchor(rtl: boolean) {
  const { view } = useEditor();
  const ref = React.useRef<HTMLDivElement>(null);
  const anchor = getAnchor(view, rtl);

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (element && anchor) {
      element.style.top = `${anchor.top}px`;
      element.style.left = `${anchor.left}px`;
      element.style.width = `${anchor.width}px`;
      element.style.height = `${anchor.height}px`;
    }
  });

  return {
    ref,
    key: anchor?.key,
    side: anchor?.side ?? "top",
    align: anchor?.align ?? "start",
    sideOffset: anchor?.sideOffset ?? DEFAULT_SIDE_OFFSET,
  };
}
