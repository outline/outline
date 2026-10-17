import { createEditorState, doc, p, schema } from "@shared/test/editor";
import uploadPlaceholder, {
  findPlaceholder,
  getDisplayUrl,
  getUrlAttr,
} from "./uploadPlaceholder";

const src = "https://example.com/video.mp4";

function startUpload() {
  const state = createEditorState(doc([p("one"), p("")]), [uploadPlaceholder]);
  return state.apply(
    state.tr.setMeta(uploadPlaceholder, {
      add: { id: "upload", pos: 5, type: "video", src, attrs: { width: 320 } },
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
          type: "image",
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

    function uploadFile(type: string, attrs: Record<string, unknown> = {}) {
      let state = createEditorState(doc([p("one"), p("")]), [
        uploadPlaceholder,
      ]);
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, {
          add: {
            id: "upload",
            pos: 5,
            type,
            attrs,
            file: new File(["data"], "file"),
          },
        })
      );
      const nodeType = schema.nodes[type];
      const node = nodeType.create({ ...attrs, [getUrlAttr(nodeType)]: src });
      return state.apply(
        state.tr
          .replaceWith(5, 5, node)
          .setMeta(uploadPlaceholder, { remove: { id: "upload", node } })
      );
    }

    it("displays an uploaded video from the local file", () => {
      const state = uploadFile("video");
      expect(getDisplayUrl(state, src)).toBe("blob:local");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("displays an uploaded image from the local file", () => {
      const state = uploadFile("image");
      expect(getDisplayUrl(state, src)).toBe("blob:local");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("does not keep the local file of attachments", () => {
      const state = uploadFile("attachment", {
        title: "file.pdf",
        contentType: "application/pdf",
        preview: true,
      });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(getDisplayUrl(state, src)).toBe(src);
    });

    it("displays a video that replaces an attachment from the local file", () => {
      const attachment = schema.nodes.attachment.create({
        href: "https://example.com/old.zip",
        title: "old.zip",
      });
      // The attachment is the only node, so the mapping of the replacement
      // also deletes the placeholder decorations.
      let state = createEditorState(doc([attachment]), [uploadPlaceholder]);
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, {
          add: {
            id: "upload",
            pos: 0,
            type: "video",
            file: new File(["data"], "file"),
            replaceExisting: true,
          },
        })
      );
      const [from, to] = findPlaceholder(state, "upload") ?? [0, 0];
      const node = schema.nodes.video.create({ src });
      state = state.apply(
        state.tr
          .replaceWith(from, to, node)
          .setMeta(uploadPlaceholder, { remove: { id: "upload", node } })
      );

      expect(getDisplayUrl(state, src)).toBe("blob:local");
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("frees the local file when the placeholder is deleted", () => {
      let state = createEditorState(doc([p("one"), p("two")]), [
        uploadPlaceholder,
      ]);
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, {
          add: { id: "upload", pos: 6, type: "image", file: new File([], "f") },
        })
      );
      state = state.apply(state.tr.delete(5, 10));

      expect(findPlaceholder(state, "upload")).toBeNull();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local");
    });

    it("displays other files from storage", () => {
      const state = uploadFile("video");
      expect(getDisplayUrl(state, "https://example.com/other.mp4")).toBe(
        "https://example.com/other.mp4"
      );
    });

    it("frees the local file when the upload fails", () => {
      let state = createEditorState(doc([p("one"), p("")]), [
        uploadPlaceholder,
      ]);
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, {
          add: { id: "upload", pos: 5, type: "image", file: new File([], "f") },
        })
      );
      state = state.apply(
        state.tr.setMeta(uploadPlaceholder, { remove: { id: "upload" } })
      );
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
