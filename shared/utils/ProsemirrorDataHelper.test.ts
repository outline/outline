import type { ProsemirrorData } from "../types";
import { ProsemirrorDataHelper } from "./ProsemirrorDataHelper";

describe("ProsemirrorDataHelper", () => {
  describe("getEmpty", () => {
    it("returns a new empty document each call", () => {
      const a = ProsemirrorDataHelper.getEmpty();
      const b = ProsemirrorDataHelper.getEmpty();
      expect(a).toEqual({
        type: "doc",
        content: [{ content: [], type: "paragraph" }],
      });
      expect(a).not.toBe(b);
    });

    it("produces data considered empty", () => {
      expect(
        ProsemirrorDataHelper.isEmpty(ProsemirrorDataHelper.getEmpty())
      ).toBe(true);
    });
  });

  describe("isEmpty", () => {
    it("returns false when the root is not a doc", () => {
      const data: ProsemirrorData = { type: "paragraph" };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });

    it("returns true for a doc with no content", () => {
      expect(ProsemirrorDataHelper.isEmpty({ type: "doc" })).toBe(true);
      expect(ProsemirrorDataHelper.isEmpty({ type: "doc", content: [] })).toBe(
        true
      );
    });

    it("returns true for a doc with a single empty paragraph", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(true);
    });

    it("returns false when the single paragraph has content", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "hi" }] },
        ],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });

    it("returns false when there are multiple nodes", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [] },
          { type: "paragraph", content: [] },
        ],
      };
      expect(ProsemirrorDataHelper.isEmpty(data)).toBe(false);
    });
  });
});
