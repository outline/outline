import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import type { DragTargetKind } from "~/editor/plugins/DragTarget";
import { DragTarget } from "~/editor/plugins/DragTarget";

const HANDLE_CLASS = "block-drag-handle";
const HANDLE_SIZE = 24;
// Vertical center of the icon within the handle, including its 2px offset.
const ICON_CENTER_Y = HANDLE_SIZE / 2 + 2;
const META_KEY = "drag-handle";
// Horizontal distance from the block's edge to the handle, per kind of block.
const GUTTER_OFFSET: Record<DragTargetKind, number> = {
  block: 24,
  listItem: 40,
  checkboxItem: 0,
};

const HANDLE_ICON =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iOCIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iOCIgeT0iMTEiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+CjxyZWN0IHg9IjgiIHk9IjE1IiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iNyIgd2lkdGg9IjMiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiM0RTVDNkUiLz4KPHJlY3QgeD0iMTMiIHk9IjExIiB3aWR0aD0iMyIgaGVpZ2h0PSIyIiByeD0iMSIgZmlsbD0iIzRFNUM2RSIvPgo8cmVjdCB4PSIxMyIgeT0iMTUiIHdpZHRoPSIzIiBoZWlnaHQ9IjIiIHJ4PSIxIiBmaWxsPSIjNEU1QzZFIi8+Cjwvc3ZnPgo=";

type PluginState = {
  pos: number;
  size: number;
} | null;

const pluginKey = new PluginKey<PluginState>(META_KEY);
const HOVER_META_KEY = "drag-handle-hover";
const hoverPluginKey = new PluginKey<number | null>(HOVER_META_KEY);

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
      // Marks the heading that owns the handle, so its level label in the
      // gutter can be hidden.
      new Plugin<number | null>({
        key: hoverPluginKey,
        state: {
          init: () => null,
          apply: (tr, value) => {
            const meta = tr.getMeta(HOVER_META_KEY) as
              | { pos: number | null }
              | undefined;
            if (meta) {
              return meta.pos;
            }
            if (value !== null && tr.docChanged) {
              const { pos: newPos, deleted } = tr.mapping.mapResult(value, 1);
              return !deleted && tr.doc.nodeAt(newPos)?.type.name === "heading"
                ? newPos
                : null;
            }
            return value;
          },
        },
        props: {
          decorations: (state) => {
            const pos = hoverPluginKey.getState(state) ?? null;
            const node = pos === null ? null : state.doc.nodeAt(pos);
            if (pos === null || !node) {
              return DecorationSet.empty;
            }
            return DecorationSet.create(state.doc, [
              Decoration.node(pos, pos + node.nodeSize, {
                class: "drag-handle-target",
              }),
            ]);
          },
        },
      }),
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

          let target: DragTarget | null = null;

          const onDragEnd = () => {
            view.dom.classList.remove("dragging");
            // The handle is outside the editor DOM, so ProseMirror's own
            // dragend cleanup does not run for it.
            view.dragging = null;
            if (pluginKey.getState(view.state)) {
              view.dispatch(view.state.tr.setMeta(META_KEY, { pos: null }));
            }
          };

          const position = (next: DragTarget) => {
            const rect = next.element.getBoundingClientRect();
            const offsetX = GUTTER_OFFSET[next.kind];
            const offsetY = 2;
            // Center the icon on the first line of text when the block has
            // one, otherwise align it with the top of the block.
            const lineMiddle =
              next.element === view.nodeDOM(next.pos)
                ? getFirstLineMiddle(view, next.pos, rect)
                : null;
            // RTL blocks lay out their gutter on the right, so mirror the
            // handle to the opposite edge to match the rest of the editor's
            // :dir(rtl) handling.
            const isRTL =
              window.getComputedStyle(next.element).direction === "rtl";
            handle.style.top =
              lineMiddle === null
                ? `${rect.top - offsetY}px`
                : `${lineMiddle - ICON_CENTER_Y}px`;
            handle.style.left = isRTL
              ? `${rect.right + offsetX - HANDLE_SIZE}px`
              : `${rect.left - offsetX}px`;
            handle.style.opacity = "1";
            handle.style.pointerEvents = "auto";
          };

          const show = (next: DragTarget) => {
            target = next;
            position(next);
            setHoveredHeading(
              view.state.doc.nodeAt(next.pos)?.type.name === "heading"
                ? next.pos
                : null
            );
          };

          const hideHandle = () => {
            target = null;
            handle.style.opacity = "0";
            handle.style.pointerEvents = "none";
          };

          const hide = () => {
            hideHandle();
            setHoveredHeading(null);
          };

          const setHoveredHeading = (pos: number | null) => {
            if ((hoverPluginKey.getState(view.state) ?? null) === pos) {
              return;
            }
            view.dispatch(view.state.tr.setMeta(HOVER_META_KEY, { pos }));
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
            if (target && isOverElement(handle, event)) {
              return;
            }
            const next = DragTarget.fromEvent(view, event);
            if (next) {
              // Skip repositioning when still hovering the same block —
              // avoids a getBoundingClientRect and style writes on every
              // mousemove. Scroll repositioning is handled separately.
              if (next.equals(target)) {
                return;
              }
              show(next);
            } else {
              hide();
            }
          };

          const onScroll = () => {
            // While a drag is in progress the handle is intentionally hidden;
            // don't let a scroll (trackpad / auto-scroll) reposition and
            // re-show it mid-drag.
            if (pluginKey.getState(view.state)) {
              return;
            }
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
            // Hide the handle for the duration of the drag — leave
            // pointer-events alone so the in-flight drag isn't cancelled.
            handle.style.opacity = "0";
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
          window.addEventListener("scroll", onScroll, {
            capture: true,
            passive: true,
          });
          handle.addEventListener("dragstart", onDragStart);
          handle.addEventListener("dragend", onDragEnd);
          handle.addEventListener("click", onClick);

          return {
            update: (_view, prevState) => {
              if (!target || view.state.doc === prevState.doc) {
                return;
              }
              // Positions shift when the document changes, e.g. from a
              // collaborator's edit, so resolve the target again from its DOM.
              const next = DragTarget.fromElement(view, target.element);
              if (!next) {
                hideHandle();
                return;
              }
              target = next;
              if (!pluginKey.getState(view.state)) {
                position(target);
              }
            },
            destroy: () => {
              window.removeEventListener("mousemove", onMouseMove);
              window.removeEventListener("scroll", onScroll, { capture: true });
              handle.removeEventListener("dragstart", onDragStart);
              handle.removeEventListener("dragend", onDragEnd);
              handle.removeEventListener("click", onClick);
              handle.remove();
              // Only clean up the DOM class here — the plugin state is
              // discarded on unmount, so avoid dispatching onto a view that
              // is being torn down (e.g. unmounted mid-drag).
              view.dom.classList.remove("dragging");
            },
          };
        },
      }),
    ];
  }
}

function createHandle(): HTMLElement {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = HANDLE_CLASS;
  handle.draggable = true;
  handle.contentEditable = "false";
  handle.setAttribute("aria-label", "Drag to reorder");
  // Reset the native button chrome so only the icon shows. The icon is a
  // mask, so its color comes from the global background-color rule.
  handle.style.appearance = "none";
  handle.style.border = "0";
  handle.style.padding = "0";
  handle.style.position = "fixed";
  handle.style.width = `${HANDLE_SIZE}px`;
  handle.style.height = `${HANDLE_SIZE}px`;
  handle.style.cursor = "grab";
  handle.style.opacity = "0";
  handle.style.pointerEvents = "none";
  handle.style.transition =
    "opacity 150ms ease-in-out, background-color 150ms ease-in-out";
  handle.style.maskImage = `url("${HANDLE_ICON}")`;
  handle.style.maskRepeat = "no-repeat";
  handle.style.maskPosition = "0 2px";
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

function getFirstLineMiddle(
  view: EditorView,
  pos: number,
  rect: DOMRect
): number | null {
  // Descend to the first textblock, and only use it when it begins with
  // text – inline atoms such as images have no meaningful line.
  let node = view.state.doc.nodeAt(pos);
  let nodePos = pos;
  while (node && !node.isTextblock) {
    node = node.firstChild;
    nodePos += 1;
  }
  if (!node?.firstChild?.isText) {
    return null;
  }
  const textPos = nodePos + 1;

  let coords: { top: number; bottom: number };
  try {
    coords = view.coordsAtPos(textPos, 1);
  } catch {
    return null;
  }
  // Ignore text that is hidden or rendered outside the block, such as the
  // source of a rendered math block.
  if (
    coords.bottom <= coords.top ||
    coords.top < rect.top - 1 ||
    coords.bottom > rect.bottom + 1
  ) {
    return null;
  }
  return (coords.top + coords.bottom) / 2;
}
