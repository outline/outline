import type { EditorState } from "prosemirror-state";
import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { findParentNodeClosestToPos } from "@shared/editor/queries/findParentNode";

const HANDLE_CLASS = "block-drag-handle";
const META_KEY = "drag-handle";
const LIST_ITEM_TYPES = ["list_item", "checkbox_item"];
const LIST_TYPES = ["bullet_list", "ordered_list", "checkbox_list"];

const HANDLE_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=";

type Target = {
  pos: number;
  element: HTMLElement;
  isListItem: boolean;
};

type PluginState = {
  pos: number;
  size: number;
} | null;

const pluginKey = new PluginKey<PluginState>(META_KEY);

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
      new Plugin<PluginState>({
        key: pluginKey,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(META_KEY) as
              | { pos: number | null }
              | undefined;
            if (meta) {
              if (meta.pos === null) {
                return null;
              }
              const node = tr.doc.nodeAt(meta.pos);
              if (!node) {
                return null;
              }
              return { pos: meta.pos, size: node.nodeSize };
            }
            if (value && tr.docChanged) {
              const newPos = tr.mapping.map(value.pos);
              const node = tr.doc.nodeAt(newPos);
              if (!node) {
                return null;
              }
              return { pos: newPos, size: node.nodeSize };
            }
            return value;
          },
        },
        props: {
          decorations: (state) => {
            const dragState = pluginKey.getState(state);
            if (!dragState) {
              return DecorationSet.empty;
            }
            return DecorationSet.create(state.doc, [
              Decoration.node(dragState.pos, dragState.pos + dragState.size, {
                class: "dragging-source",
              }),
            ]);
          },
          handleDOMEvents: {
            dragstart: (view) => {
              view.dom.classList.add("dragging");
              return false;
            },
            drop: (view) => {
              view.dom.classList.remove("dragging");
              if (pluginKey.getState(view.state)) {
                view.dispatch(view.state.tr.setMeta(META_KEY, { pos: null }));
              }
              return false;
            },
            dragend: (view) => {
              view.dom.classList.remove("dragging");
              if (pluginKey.getState(view.state)) {
                view.dispatch(view.state.tr.setMeta(META_KEY, { pos: null }));
              }
              return false;
            },
          },
        },
        view: (view) => {
          const handle = createHandle();
          document.body.appendChild(handle);

          let target: Target | null = null;

          const onDragEnd = () => {
            view.dom.classList.remove("dragging");
            if (pluginKey.getState(view.state)) {
              view.dispatch(view.state.tr.setMeta(META_KEY, { pos: null }));
            }
          };

          const show = (next: Target) => {
            target = next;
            const rect = next.element.getBoundingClientRect();
            // List items render their own marker in the gutter so the
            // handle needs a small extra offset to clear it.
            const offsetX = next.isListItem ? 40 : 29;
            const offsetY = 2;
            handle.style.top = `${rect.top - offsetY}px`;
            handle.style.left = `${rect.left - offsetX}px`;
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
            // When the cursor is over the handle itself, keep the current
            // target. Re-resolving from a cursor in the gutter can land on
            // a different (often parent) block, causing the handle to
            // flicker between the hovered block and its parent.
            if (isOverElement(handle, event)) {
              return;
            }
            const next = findTarget(view, event);
            if (next) {
              show(next);
            } else {
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
            const sourceElement = target.element;
            // Snapshot the drag image of the unmodified element first, so
            // it isn't baked with the dragging-source opacity. Anchor it to
            // its original screen position by offsetting by the cursor's
            // location within the block (negative X — the cursor sits in
            // the gutter to the left of the block).
            const rect = sourceElement.getBoundingClientRect();
            event.dataTransfer.setDragImage(
              sourceElement,
              event.clientX - rect.left,
              event.clientY - rect.top
            );
            event.dataTransfer.clearData();
            event.dataTransfer.effectAllowed = "copyMove";
            const selection = NodeSelection.create(view.state.doc, pos);
            // Use the slice from the original NodeSelection rather than
            // view.state.selection, which prosemirror-tables' tableEditing
            // normalizes from a NodeSelection on a table into a CellSelection
            // covering only the cells.
            const slice = selection.content();
            const { dom, text } = view.serializeForClipboard(slice);
            event.dataTransfer.setData("text/html", dom.innerHTML);
            event.dataTransfer.setData("text/plain", text);
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
            view.dom.classList.add("dragging");
            view.focus();
            // Apply the source decoration via the plugin's state and set
            // the NodeSelection in a single transaction so the
            // dragging-source class survives any DOM re-rendering caused
            // by selection changes (e.g., tableEditing normalizing a table
            // NodeSelection into a CellSelection).
            view.dispatch(
              view.state.tr.setSelection(selection).setMeta(META_KEY, { pos })
            );
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
          handle.addEventListener("dragend", onDragEnd);
          handle.addEventListener("click", onClick);

          return {
            destroy: () => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("scroll", onScroll, true);
              handle.removeEventListener("dragstart", onDragStart);
              handle.removeEventListener("dragend", onDragEnd);
              handle.removeEventListener("click", onClick);
              handle.remove();
              onDragEnd();
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
  const resolved = resolveTargetPos(view.state, coords.pos);
  if (resolved === null) {
    return null;
  }
  const dom = view.nodeDOM(resolved.pos);
  if (!(dom instanceof HTMLElement)) {
    return null;
  }
  return { pos: resolved.pos, element: dom, isListItem: resolved.isListItem };
}

function resolveTargetPos(
  state: EditorState,
  pos: number
): { pos: number; isListItem: boolean } | null {
  const $pos = state.doc.resolve(pos);

  const listItem = findParentNodeClosestToPos($pos, (node) =>
    LIST_ITEM_TYPES.includes(node.type.name)
  );
  if (listItem) {
    return { pos: listItem.pos, isListItem: true };
  }

  if ($pos.depth >= 1) {
    const node = $pos.node(1);
    if (LIST_TYPES.includes(node.type.name)) {
      return null;
    }
    // Skip empty top-level paragraphs — the block menu trigger is shown
    // there instead.
    if (node.type.name === "paragraph" && node.content.size === 0) {
      return null;
    }
    return { pos: $pos.before(1), isListItem: false };
  }

  // Hovering on a top-level atom block (video, etc.) — there are no
  // positions inside an atom, so posAtCoords lands at depth 0 between
  // siblings of the doc. Pick whichever neighbouring atom block the
  // position is adjacent to.
  const after = $pos.nodeAfter;
  if (after?.isBlock && after.isAtom) {
    return { pos: $pos.pos, isListItem: false };
  }
  const before = $pos.nodeBefore;
  if (before?.isBlock && before.isAtom) {
    return { pos: $pos.pos - before.nodeSize, isListItem: false };
  }
  return null;
}
