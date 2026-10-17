import { createEditorState, doc, p, schema } from "@shared/test/editor";
import uploadPlaceholder, {
  findPlaceholder,
  getLocalSrc,
} from "./uploadPlaceholder";

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
    const decorations =
      uploadPlaceholder.getState(state)?.decorations.find() ?? [];
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
    expect(uploadPlaceholder.getState(state)?.decorations.find()).toHaveLength(
      0
    );
  });

  it("uses the range of the replaced node as the placeholder position", () => {
    const image = schema.nodes.image.create({
      src: "https://example.com/a.png",
    });
    let state = createEditorState(
      doc([schema.nodes.paragraph.create(null, image)]),
      [uploadPlaceholder]
    );
    state = state.apply(
      state.tr.setMeta(uploadPlaceholder, {
        add: {
          id: "upload",
          pos: 1,
          isImage: true,
          replaceExisting: true,
          src: "https://example.com/b.png",
        },
      })
    );

    expect(uploadPlaceholder.getState(state)?.decorations.find()).toHaveLength(
      2
    );
    expect(findPlaceholder(state, "upload")).toEqual([1, 1 + image.nodeSize]);
  });

  describe("local sources", () => {
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:local");
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
    });

    function uploadFile(isVideo: boolean) {
      let state = createEditorState(doc([p("one"), p("")]), [
        uploadPlaceholder,
      ]);
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, {
          add: {
            id: "upload",
            pos: 5,
            isVideo,
            isImage: !isVideo,
            file: new File(["data"], "file"),
          },
        })
      );
      const node = isVideo
        ? schema.nodes.video.create({ src })
        : schema.nodes.image.create({ src });
      return state.apply(
        state.tr
          .replaceWith(5, 5, node)
          .setMeta(uploadPlaceholder, { remove: { id: "upload", node } })
      );
    }

    it("keeps the local file of an uploaded video", () => {
      const state = uploadFile(true);
      expect(getLocalSrc(state, src)).toBe("blob:local");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("frees the local file of an uploaded image", () => {
      const state = uploadFile(false);
      expect(getLocalSrc(state, src)).toBeUndefined();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
    });
  });

  it("does not mark a node when the upload fails", () => {
    let state = startUpload();
    state = state.apply(
      state.tr.setMeta(uploadPlaceholder, { remove: { id: "upload" } })
    );
    expect(uploadPlaceholder.getState(state)?.decorations.find()).toHaveLength(
      0
    );
  });
});
