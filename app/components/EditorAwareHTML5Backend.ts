import type { BackendFactory } from "dnd-core";
import { HTML5Backend } from "react-dnd-html5-backend";

/**
 * react-dnd's HTML5 backend installs global drag listeners on `window` in both
 * the capture and bubble phases. The bubble-phase `dragover` handler runs after
 * ProseMirror's and, when react-dnd isn't tracking a drag, forces
 * `dataTransfer.dropEffect = "none"` – which tells the browser the drop is
 * disallowed and silently rejects images dragged into the editor.
 *
 * These handlers live on `window`, so a propagation-based guard can't stop
 * react-dnd without also starving the editor of the event. Instead we wrap the
 * backend and make all of its top-level handlers no-op for events that occur
 * within the editor surface, leaving ProseMirror to handle them itself.
 */
const topHandlerNames = [
  "handleTopDragStart",
  "handleTopDragStartCapture",
  "handleTopDragEnter",
  "handleTopDragEnterCapture",
  "handleTopDragLeaveCapture",
  "handleTopDragOver",
  "handleTopDragOverCapture",
  "handleTopDrop",
  "handleTopDropCapture",
  "handleTopDragEndCapture",
] as const;

const isWithinEditor = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest(".ProseMirror"));

/**
 * An HTML5 drag-and-drop backend that ignores drag events originating within the
 * rich text editor so that ProseMirror can handle them itself.
 *
 * @param manager The drag-and-drop manager.
 * @param context The global context.
 * @param options Backend options.
 * @returns The wrapped HTML5 backend instance.
 */
export const EditorAwareHTML5Backend: BackendFactory = (
  manager,
  context,
  options
) => {
  const backend = HTML5Backend(manager, context, options);
  const monitor = manager.getMonitor();

  // The top-level handlers are private instance fields on the backend, so reach
  // for them through an index signature view of the instance.
  const handlers = backend as unknown as Record<
    string,
    (event: DragEvent) => void
  >;

  for (const name of topHandlerNames) {
    const original = handlers[name];
    if (typeof original === "function") {
      handlers[name] = (event: DragEvent) => {
        if (isWithinEditor(event.target)) {
          return;
        }
        // A drag that began or entered the page over the editor is never
        // registered with react-dnd because those events are skipped above.
        // The backend's drop handler assumes a registered drag and calls
        // `actions.hover` unconditionally, which throws "Cannot call hover
        // while not dragging" – so drops without a tracked drag must be
        // ignored here.
        if (name === "handleTopDrop" && !monitor.isDragging()) {
          return;
        }
        original.call(backend, event);
      };
    }
  }

  return backend;
};
