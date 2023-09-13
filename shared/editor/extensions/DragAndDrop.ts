import { NodeSelection, Plugin } from "prosemirror-state";
import { EditorView, __serializeForClipboard } from "prosemirror-view";
import Extension from "../lib/Extension";
import { absoluteRect, nodeDOMAtCoords, nodePosAtDOM } from "../lib/position";

export type DragHandleOptions = {
  /**
   * The width of the drag handle
   */
  dragHandleWidth: number;
};

function DragHandle(options: DragHandleOptions) {
  let dragHandleElement: HTMLElement | null = null;

  function handleDragStart(event: DragEvent, view: EditorView) {
    view.focus();

    if (!event.dataTransfer) {
      return;
    }

    const node = nodeDOMAtCoords({
      x: event.clientX + 50 + options.dragHandleWidth,
      y: event.clientY,
    });

    if (!(node instanceof Element)) {
      return;
    }

    const nodePos = nodePosAtDOM(node, view);
    if (nodePos === undefined || nodePos < 0) {
      return;
    }

    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos))
    );

    const slice = view.state.selection.content();
    const { dom, text } = __serializeForClipboard(view, slice);

    event.dataTransfer.clearData();
    event.dataTransfer.setData("text/html", dom.innerHTML);
    event.dataTransfer.setData("text/plain", text);
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setDragImage(node, 0, 0);

    view.dragging = { slice, move: event.ctrlKey };
  }

  function handleClick(event: MouseEvent, view: EditorView) {
    view.focus();

    view.dom.classList.remove("dragging");

    const node = nodeDOMAtCoords({
      x: event.clientX + 50 + options.dragHandleWidth,
      y: event.clientY,
    });

    if (!(node instanceof Element)) {
      return;
    }

    const nodePos = nodePosAtDOM(node, view);
    if (!nodePos) {
      return;
    }

    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos))
    );
  }

  function hideDragHandle() {
    if (dragHandleElement) {
      dragHandleElement.classList.add("hidden");
    }
  }

  function showDragHandle() {
    if (dragHandleElement) {
      dragHandleElement.classList.remove("hidden");
    }
  }

  return new Plugin({
    view: (view) => {
      dragHandleElement = document.createElement("div");
      dragHandleElement.draggable = true;
      dragHandleElement.dataset.dragHandle = "";
      dragHandleElement.classList.add("drag-handle");
      dragHandleElement.addEventListener("dragstart", (e) =>
        handleDragStart(e, view)
      );
      dragHandleElement.addEventListener("click", (e) => handleClick(e, view));

      hideDragHandle();

      view.dom.parentElement?.appendChild(dragHandleElement);

      return {
        destroy: () => {
          dragHandleElement?.remove();
          dragHandleElement = null;
        },
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) {
            return;
          }

          const node = nodeDOMAtCoords({
            x: event.clientX + 50 + options.dragHandleWidth,
            y: event.clientY,
          });

          if (!(node instanceof Element)) {
            hideDragHandle();
            return;
          }

          const style = window.getComputedStyle(node);
          const lineHeight = parseInt(style.lineHeight, 10);
          const paddingTop = parseInt(style.paddingTop, 10);
          const rect = absoluteRect(node);

          rect.top += (lineHeight - 24) / 2;
          rect.top += paddingTop;
          if (node.matches("ul:not(.checkbox_list) li, ol li")) {
            rect.left -= options.dragHandleWidth;
          }
          rect.width = options.dragHandleWidth;

          if (!dragHandleElement) {
            return;
          }

          dragHandleElement.style.left = `${rect.left - rect.width}px`;
          dragHandleElement.style.top = `${rect.top}px`;
          showDragHandle();
        },
        keydown: hideDragHandle,
        mousewheel: hideDragHandle,
        dragstart: (view) => {
          view.dom.classList.add("dragging");
        },
        drop: (view) => {
          view.dom.classList.remove("dragging");
        },
        dragend: (view) => {
          view.dom.classList.remove("dragging");
        },
      },
    },
  });
}

export default class DragAndDrop extends Extension {
  get plugins() {
    return [DragHandle({ dragHandleWidth: 24 })];
  }
}
