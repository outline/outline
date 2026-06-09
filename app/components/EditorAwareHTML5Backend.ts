import type { BackendFactory } from "dnd-core";
import { HTML5Backend } from "react-dnd-html5-backend";

/**
 * react-dnd's HTML5 backend installs global capture-phase listeners on `window`
 * that call `preventDefault()` on drops whose dataTransfer resembles a native
 * item – including a dragged `<img>`, which is how ProseMirror serializes an
 * image drag. Since the DndProvider was lifted to wrap the whole app, this
 * cancels the editor's own drag-and-drop: ProseMirror bails when the drop event
 * is already default-prevented, so dragging an image (e.g. between table cells)
 * has no effect.
 *
 * These handlers run before ProseMirror's, and they live on `window`, so a
 * propagation-based guard can't stop react-dnd without also starving the editor
 * of the event. Instead we wrap the backend and make its top-level capture
 * handlers no-op for events that occur within the editor surface, leaving editor
 * drag-and-drop to ProseMirror while document list and sidebar dragging continue
 * to work everywhere else.
 */
const captureHandlerNames = [
  "handleTopDragStartCapture",
  "handleTopDragEnterCapture",
  "handleTopDragOverCapture",
  "handleTopDragLeaveCapture",
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

  // The capture handlers are private instance fields on the backend, so reach
  // for them through an index signature view of the instance.
  const handlers = backend as unknown as Record<
    string,
    (event: DragEvent) => void
  >;

  for (const name of captureHandlerNames) {
    const original = handlers[name];
    if (typeof original === "function") {
      handlers[name] = (event: DragEvent) => {
        if (isWithinEditor(event.target)) {
          return;
        }
        original(event);
      };
    }
  }

  return backend;
};
