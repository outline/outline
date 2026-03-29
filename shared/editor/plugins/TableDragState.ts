import { PluginKey } from "prosemirror-state";

/** State for tracking row drag operations. */
export interface RowDragState {
  isDragging: boolean;
  fromIndex: number;
  toIndex: number;
}

/** State for tracking column drag operations. */
export interface ColumnDragState {
  isDragging: boolean;
  fromIndex: number;
  toIndex: number;
}

/** Plugin key for accessing row drag state. */
export const rowDragPluginKey = new PluginKey<RowDragState>("row-drag");

/** Plugin key for accessing column drag state. */
export const columnDragPluginKey = new PluginKey<ColumnDragState>(
  "column-drag"
);
