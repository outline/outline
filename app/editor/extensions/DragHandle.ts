import type { EditorState } from "prosemirror-state";
import { NodeSelection, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { findParentNodeClosestToPos } from "@shared/editor/queries/findParentNode";

const HANDLE_CLASS = "block-drag-handle";
const LIST_ITEM_TYPES = ["list_item", "checkbox_item"];
const LIST_TYPES = ["bullet_list", "ordered_list", "checkbox_list"];

const HANDLE_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=";

type Target = {
  pos: number;
  element: HTMLElement;
};

/**
 * Renders a floating drag handle to the left of block-level nodes when the
 * user hovers within the editor, and lets the user drag the block to reorder
 * it. The handle is a real, always-draggable DOM element rather than a CSS
 * pseudo on the block, which keeps drag-and-drop working uniformly across
 * node types regardless of whether the schema declares `draggable: true`.
 */
export default class DragHandle extends Extension {
  get name() {
    return "drag-handle";
  }

  get plugins() {
    return [
      new Plugin({
        view: (view) => {
          const handle = createHandle();
          document.body.appendChild(handle);

          let target: Target | null = null;

          const show = (next: Target) => {
            target = next;
            const rect = next.element.getBoundingClientRect();
            handle.style.top = `${rect.top}px`;
            handle.style.left = `${rect.left - 32}px`;
            handle.style.opacity = "1";
            handle.style.pointerEvents = "auto";
          };

          const hide = () => {
            target = null;
            handle.style.opacity = "0";
            handle.style.pointerEvents = "none";
          };

          const onMouseMove = (event: MouseEvent) => {
            if (!view.editable) {
              hide();
              return;
            }
            const next = findTarget(view, event);
            if (next) {
              show(next);
            } else if (!isOverElement(handle, event)) {
              hide();
            }
          };

          const onScroll = () => {
            if (target?.element.isConnected) {
              show(target);
            } else {
              hide();
            }
          };

          const onDragStart = (event: DragEvent) => {
            if (!target || !event.dataTransfer) {
              return;
            }
            const pos = target.pos;
            if (!view.state.doc.nodeAt(pos)) {
              return;
            }
            view.focus();
            const selection = NodeSelection.create(view.state.doc, pos);
            view.dispatch(view.state.tr.setSelection(selection));
            // Use the slice from the original NodeSelection rather than
            // view.state.selection, which prosemirror-tables' tableEditing
            // normalizes from a NodeSelection on a table into a CellSelection
            // covering only the cells.
            const slice = selection.content();
            const { dom, text } = view.serializeForClipboard(slice);
            event.dataTransfer.clearData();
            event.dataTransfer.effectAllowed = "copyMove";
            event.dataTransfer.setData("text/html", dom.innerHTML);
            event.dataTransfer.setData("text/plain", text);
            event.dataTransfer.setDragImage(target.element, 0, 0);
            // Include the original NodeSelection as `node` so ProseMirror's
            // drop handler removes the source via node.replace(tr) rather
            // than tr.deleteSelection() (which would operate on the
            // normalized CellSelection and leave the table behind).
            const dragging: {
              slice: typeof slice;
              move: boolean;
              node: NodeSelection;
            } = {
              slice,
              move: !event.ctrlKey,
              node: selection,
            };
            view.dragging = dragging;
          };

          const onClick = () => {
            if (!target) {
              return;
            }
            view.focus();
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, target.pos)
              )
            );
          };

          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("scroll", onScroll, true);
          handle.addEventListener("dragstart", onDragStart);
          handle.addEventListener("click", onClick);

          return {
            destroy: () => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("scroll", onScroll, true);
              handle.removeEventListener("dragstart", onDragStart);
              handle.removeEventListener("click", onClick);
              handle.remove();
            },
          };
        },
      }),
    ];
  }
}

function createHandle(): HTMLElement {
  const handle = document.createElement("div");
  handle.className = HANDLE_CLASS;
  handle.draggable = true;
  handle.contentEditable = "false";
  handle.setAttribute("aria-label", "Drag to reorder");
  handle.style.position = "fixed";
  handle.style.width = "24px";
  handle.style.height = "24px";
  handle.style.cursor = "grab";
  handle.style.opacity = "0";
  handle.style.pointerEvents = "none";
  handle.style.transition = "opacity 150ms ease-in-out";
  handle.style.backgroundImage = `url("${HANDLE_ICON}")`;
  handle.style.backgroundRepeat = "no-repeat";
  handle.style.backgroundPosition = "0 2px";
  handle.style.zIndex = "1";
  return handle;
}

function isOverElement(element: HTMLElement, event: MouseEvent): boolean {
  const rect = element.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function findTarget(view: EditorView, event: MouseEvent): Target | null {
  const rect = view.dom.getBoundingClientRect();
  if (event.clientY < rect.top || event.clientY > rect.bottom) {
    return null;
  }
  const style = window.getComputedStyle(view.dom);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const contentLeft = rect.left + paddingLeft + 1;
  const contentRight = rect.right - paddingRight - 1;
  if (event.clientX < contentLeft - 60 || event.clientX > contentRight + 60) {
    return null;
  }
  const projectedX = Math.max(
    contentLeft,
    Math.min(contentRight, event.clientX)
  );
  const coords = view.posAtCoords({
    left: projectedX,
    top: event.clientY,
  });
  if (!coords) {
    return null;
  }
  const target = resolveTargetPos(view.state, coords.pos);
  if (target === null) {
    return null;
  }
  const dom = view.nodeDOM(target);
  if (!(dom instanceof HTMLElement)) {
    return null;
  }
  return { pos: target, element: dom };
}

function resolveTargetPos(state: EditorState, pos: number): number | null {
  const $pos = state.doc.resolve(pos);

  const listItem = findParentNodeClosestToPos($pos, (node) =>
    LIST_ITEM_TYPES.includes(node.type.name)
  );
  if (listItem) {
    return listItem.pos;
  }

  if ($pos.depth >= 1) {
    const node = $pos.node(1);
    if (LIST_TYPES.includes(node.type.name)) {
      return null;
    }
    return $pos.before(1);
  }
  return null;
}
