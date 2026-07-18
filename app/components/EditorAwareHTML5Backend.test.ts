import type { DragDropManager } from "dnd-core";
import { EditorAwareHTML5Backend } from "./EditorAwareHTML5Backend";

const handleTopDrop = vi.fn();
const handleTopDragOver = vi.fn();
const handleTopDragEnterCapture = vi.fn();

vi.mock("react-dnd-html5-backend", () => ({
  HTML5Backend: () => ({
    handleTopDrop,
    handleTopDragOver,
    handleTopDragEnterCapture,
  }),
}));

describe("EditorAwareHTML5Backend", () => {
  const isDragging = vi.fn();
  const manager = {
    getMonitor: () => ({ isDragging }),
  } as unknown as DragDropManager;

  const createBackend = () =>
    EditorAwareHTML5Backend(manager, undefined, undefined) as unknown as Record<
      string,
      (event: Partial<DragEvent>) => void
    >;

  const editorTarget = () => {
    const editor = document.createElement("div");
    editor.className = "ProseMirror";
    const child = document.createElement("p");
    editor.appendChild(child);
    document.body.appendChild(editor);
    return child;
  };

  const outsideTarget = () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    return el;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("skips events originating within the editor", () => {
    const backend = createBackend();
    isDragging.mockReturnValue(true);

    backend.handleTopDragOver({ target: editorTarget() });
    backend.handleTopDrop({ target: editorTarget() });

    expect(handleTopDragOver).not.toHaveBeenCalled();
    expect(handleTopDrop).not.toHaveBeenCalled();
  });

  it("forwards events outside the editor to the original handlers", () => {
    const backend = createBackend();
    isDragging.mockReturnValue(false);

    backend.handleTopDragOver({ target: outsideTarget() });
    backend.handleTopDragEnterCapture({ target: outsideTarget() });

    expect(handleTopDragOver).toHaveBeenCalledTimes(1);
    expect(handleTopDragEnterCapture).toHaveBeenCalledTimes(1);
  });

  it("skips drops outside the editor when no drag is registered", () => {
    const backend = createBackend();
    isDragging.mockReturnValue(false);

    backend.handleTopDrop({ target: outsideTarget() });

    expect(handleTopDrop).not.toHaveBeenCalled();
  });

  it("forwards drops outside the editor when a drag is registered", () => {
    const backend = createBackend();
    isDragging.mockReturnValue(true);

    backend.handleTopDrop({ target: outsideTarget() });

    expect(handleTopDrop).toHaveBeenCalledTimes(1);
  });
});
