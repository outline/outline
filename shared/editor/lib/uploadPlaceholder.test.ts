import { createEditorState, doc, p, schema } from "@shared/test/editor";
import uploadPlaceholder, { findPlaceholder } from "./uploadPlaceholder";

const src = "https://example.com/video.mp4";

function startUpload() {
  const state = createEditorState(doc([p("one"), p("")]), [uploadPlaceholder]);
  return state.apply(
    state.tr.setMeta(uploadPlaceholder, {
      add: { id: "upload", pos: 5, isVideo: true, src, attrs: { width: 320 } },
    })
  );
}

describe("uploadPlaceholder", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a placeholder at the position", () => {
    const state = startUpload();
    expect(findPlaceholder(state, "upload")).toEqual([5, 5]);
  });

  it("marks the uploaded node when the placeholder is removed", () => {
    let state = startUpload();
    const node = schema.nodes.video.create({ src, width: 320 });
    state = state.apply(
      state.tr
        .replaceWith(5, 5, node)
        .setMeta(uploadPlaceholder, { remove: { id: "upload", node } })
    );

    expect(findPlaceholder(state, "upload")).toBeNull();
    const decorations = uploadPlaceholder.getState(state)?.find() ?? [];
    expect(decorations).toHaveLength(1);
    expect(decorations[0].from).toBe(5);
    expect(decorations[0].to).toBe(5 + node.nodeSize);
  });

  it("removes the uploaded mark after it expires", () => {
    vi.useFakeTimers();
    let state = startUpload();
    const node = schema.nodes.video.create({ src, width: 320 });
    state = state.apply(
      state.tr
        .replaceWith(5, 5, node)
        .setMeta(uploadPlaceholder, { remove: { id: "upload", node } })
    );

    vi.advanceTimersByTime(1001);
    state = state.apply(state.tr.insertText("!", 4));
    expect(uploadPlaceholder.getState(state)?.find()).toHaveLength(0);
  });

  it("does not mark a node when the upload fails", () => {
    let state = startUpload();
    state = state.apply(
      state.tr.setMeta(uploadPlaceholder, { remove: { id: "upload" } })
    );
    expect(uploadPlaceholder.getState(state)?.find()).toHaveLength(0);
  });
});
