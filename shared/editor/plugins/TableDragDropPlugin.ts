import { Plugin, PluginKey, type EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { moveTableColumn, moveTableRow } from "prosemirror-tables";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { getCellsInRow, getRowsInTable } from "../queries/table";

interface DragState {
  /** The type of drag operation. */
  type: "row" | "column";
  /** The index of the row/column being dragged. */
  fromIndex: number;
  /** The current target index for the drop. */
  toIndex: number;
  /** The grip element being dragged. */
  gripElement: HTMLElement;
  /** The table element containing the drag. */
  tableElement: HTMLElement;
}

const pluginKey = new PluginKey<DragState | null>("table-drag-drop");

/**
 * Creates a drop indicator element for visual feedback during drag operations.
 *
 * @returns the drop indicator element.
 */
function createDropIndicator(): HTMLElement {
  const indicator = document.createElement("div");
  indicator.className = EditorStyleHelper.tableDragDropIndicator;
  return indicator;
}

/**
 * Calculates the target index based on mouse position during drag.
 *
 * @param dragState Current drag state.
 * @param mouseX Current mouse X position.
 * @param mouseY Current mouse Y position.
 * @param state Editor state.
 * @returns The target index for the drop.
 */
function calculateTargetIndex(
  dragState: DragState,
  mouseX: number,
  mouseY: number,
  state: EditorState
): number {
  if (dragState.type === "row") {
    return calculateRowTargetIndex(dragState, mouseY, state);
  } else {
    return calculateColumnTargetIndex(dragState, mouseX, state);
  }
}

/**
 * Calculates the target row index based on mouse Y position.
 *
 * @param dragState Current drag state.
 * @param mouseY Current mouse Y position.
 * @param state Editor state.
 * @returns The target row index.
 */
function calculateRowTargetIndex(
  dragState: DragState,
  mouseY: number,
  state: EditorState
): number {
  const rows = getRowsInTable(state);
  if (rows.length === 0) {
    return dragState.fromIndex;
  }

  const table = dragState.tableElement.querySelector("table");
  if (!table) {
    return dragState.fromIndex;
  }

  const tableRows = table.querySelectorAll("tr");
  let targetIndex = dragState.fromIndex;

  tableRows.forEach((row, index) => {
    const rect = row.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (mouseY < midpoint && index <= dragState.fromIndex) {
      targetIndex = index;
    } else if (mouseY >= midpoint && index >= dragState.fromIndex) {
      targetIndex = index;
    }
  });

  return Math.max(0, Math.min(targetIndex, rows.length - 1));
}

/**
 * Calculates the target column index based on mouse X position.
 *
 * @param dragState Current drag state.
 * @param mouseX Current mouse X position.
 * @param state Editor state.
 * @returns The target column index.
 */
function calculateColumnTargetIndex(
  dragState: DragState,
  mouseX: number,
  state: EditorState
): number {
  const cols = getCellsInRow(0)(state);
  if (cols.length === 0) {
    return dragState.fromIndex;
  }

  const table = dragState.tableElement.querySelector("table");
  if (!table) {
    return dragState.fromIndex;
  }

  const headerRow = table.querySelector("tr");
  if (!headerRow) {
    return dragState.fromIndex;
  }

  const cells = headerRow.querySelectorAll("th, td");
  let targetIndex = dragState.fromIndex;

  cells.forEach((cell, index) => {
    const rect = cell.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;

    if (mouseX < midpoint && index <= dragState.fromIndex) {
      targetIndex = index;
    } else if (mouseX >= midpoint && index >= dragState.fromIndex) {
      targetIndex = index;
    }
  });

  return Math.max(0, Math.min(targetIndex, cols.length - 1));
}

/**
 * Positions the drop indicator based on the current drag state.
 *
 * @param indicator Drop indicator element.
 * @param dragState Current drag state.
 */
function positionDropIndicator(
  indicator: HTMLElement,
  dragState: DragState
): void {
  const table = dragState.tableElement.querySelector("table");
  if (!table) {
    return;
  }

  const tableRect = dragState.tableElement.getBoundingClientRect();

  if (dragState.type === "row") {
    const tableRows = table.querySelectorAll("tr");
    const targetRow = tableRows[dragState.toIndex];

    if (targetRow) {
      const rowRect = targetRow.getBoundingClientRect();
      const isMovingDown = dragState.toIndex > dragState.fromIndex;

      indicator.style.left = `${rowRect.left - tableRect.left}px`;
      indicator.style.width = `${rowRect.width}px`;
      indicator.style.height = "2px";
      indicator.style.top = isMovingDown
        ? `${rowRect.bottom - tableRect.top}px`
        : `${rowRect.top - tableRect.top}px`;
    }
  } else {
    const headerRow = table.querySelector("tr");
    if (!headerRow) {
      return;
    }

    const cells = headerRow.querySelectorAll("th, td");
    const targetCell = cells[dragState.toIndex];

    if (targetCell) {
      const cellRect = targetCell.getBoundingClientRect();
      const isMovingRight = dragState.toIndex > dragState.fromIndex;

      indicator.style.top = `${table.getBoundingClientRect().top - tableRect.top}px`;
      indicator.style.height = `${table.getBoundingClientRect().height}px`;
      indicator.style.width = "2px";
      indicator.style.left = isMovingRight
        ? `${cellRect.right - tableRect.left}px`
        : `${cellRect.left - tableRect.left}px`;
    }
  }
}

/**
 * A ProseMirror plugin that enables drag and drop for table rows and columns
 * using the grip handles.
 */
export class TableDragDropPlugin extends Plugin<DragState | null> {
  private dropIndicator: HTMLElement | null = null;
  private dragState: DragState | null = null;
  private view: EditorView | null = null;

  constructor() {
    super({
      key: pluginKey,
      view: (view: EditorView) => {
        this.view = view;
        return {
          destroy: () => {
            this.cleanup();
            this.view = null;
          },
        };
      },
      props: {
        handleDOMEvents: {
          mousedown: (view: EditorView, event: MouseEvent) =>
            this.handleMouseDown(view, event),
        },
      },
    });
  }

  private handleMouseDown(view: EditorView, event: MouseEvent): boolean {
    if (!(event.target instanceof HTMLElement)) {
      return false;
    }

    // Check if we're clicking on a row grip
    const rowGrip = event.target.closest(`.${EditorStyleHelper.tableGripRow}`);
    if (rowGrip instanceof HTMLElement) {
      return this.startDrag(view, event, rowGrip, "row");
    }

    // Check if we're clicking on a column grip
    const colGrip = event.target.closest(
      `.${EditorStyleHelper.tableGripColumn}`
    );
    if (colGrip instanceof HTMLElement) {
      return this.startDrag(view, event, colGrip, "column");
    }

    return false;
  }

  private startDrag(
    view: EditorView,
    event: MouseEvent,
    gripElement: HTMLElement,
    type: "row" | "column"
  ): boolean {
    const tableElement = gripElement.closest(`.${EditorStyleHelper.table}`);
    if (!(tableElement instanceof HTMLElement)) {
      return false;
    }

    const indexStr = gripElement.dataset.index;
    if (indexStr === undefined) {
      return false;
    }

    const fromIndex = parseInt(indexStr, 10);
    if (isNaN(fromIndex)) {
      return false;
    }

    // Initialize drag state
    this.dragState = {
      type,
      fromIndex,
      toIndex: fromIndex,
      gripElement,
      tableElement,
    };

    // Add dragging class
    gripElement.classList.add(EditorStyleHelper.tableDragging);
    document.body.style.cursor = "grabbing";

    // Create and position drop indicator
    this.dropIndicator = createDropIndicator();
    this.dropIndicator.dataset.type = type;
    tableElement.appendChild(this.dropIndicator);
    positionDropIndicator(this.dropIndicator, this.dragState);

    // Bind event listeners
    const handleMouseMove = (e: MouseEvent) => {
      this.handleMouseMove(view, e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      this.handleMouseUp(view, e);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent default to avoid text selection during drag
    event.preventDefault();
    return false;
  }

  private handleMouseMove(view: EditorView, event: MouseEvent): void {
    if (!this.dragState || !this.dropIndicator) {
      return;
    }

    const targetIndex = calculateTargetIndex(
      this.dragState,
      event.clientX,
      event.clientY,
      view.state
    );

    if (targetIndex !== this.dragState.toIndex) {
      this.dragState.toIndex = targetIndex;
      positionDropIndicator(this.dropIndicator, this.dragState);
    }

    // Show/hide indicator based on whether it's a valid drop target
    if (targetIndex !== this.dragState.fromIndex) {
      this.dropIndicator.classList.add("active");
    } else {
      this.dropIndicator.classList.remove("active");
    }
  }

  private handleMouseUp(view: EditorView, _event: MouseEvent): void {
    if (!this.dragState) {
      this.cleanup();
      return;
    }

    const { type, fromIndex, toIndex } = this.dragState;

    // Only perform move if indices are different
    if (fromIndex !== toIndex) {
      // Execute the appropriate move command
      if (type === "row") {
        this.executeMoveRow(view, fromIndex, toIndex);
      } else {
        this.executeMoveColumn(view, fromIndex, toIndex);
      }
    }

    this.cleanup();
  }

  private executeMoveRow(
    view: EditorView,
    fromIndex: number,
    toIndex: number
  ): void {
    // Use the moveTableRow command from prosemirror-tables
    const { state, dispatch } = view;
    moveTableRow({ from: fromIndex, to: toIndex })(state, dispatch);
  }

  private executeMoveColumn(
    view: EditorView,
    fromIndex: number,
    toIndex: number
  ): void {
    // Use the moveTableColumn command from prosemirror-tables
    const { state, dispatch } = view;
    moveTableColumn({ from: fromIndex, to: toIndex })(state, dispatch);
  }

  private cleanup(): void {
    // Remove dragging class
    if (this.dragState?.gripElement) {
      this.dragState.gripElement.classList.remove("table-dragging");
    }

    // Remove drop indicator
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }

    // Reset cursor
    document.body.style.cursor = "";

    // Clear drag state
    this.dragState = null;
  }
}
