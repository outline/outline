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

  describe("getFirstText", () => {
    it("returns the text of the first block with text", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          { type: "paragraph", content: [] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world", marks: [{ type: "strong" }] },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second" }],
          },
        ],
      };
      expect(ProsemirrorDataHelper.getFirstText(data)).toBe("Hello world");
    });

    it("reads text nested in other blocks", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Quote" }] },
            ],
          },
        ],
      };
      expect(ProsemirrorDataHelper.getFirstText(data)).toBe("Quote");
    });

    it("stops at a hard break", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "First line" },
              { type: "br" },
              { type: "text", text: "Second line" },
            ],
          },
        ],
      };
      expect(ProsemirrorDataHelper.getFirstText(data)).toBe("First line");
    });

    it("stops at the end of a nested block", () => {
      const data: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "First" }] },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Second" }],
              },
            ],
          },
        ],
      };
      expect(ProsemirrorDataHelper.getFirstText(data)).toBe("First");
    });

    it("returns undefined for an empty document", () => {
      expect(
        ProsemirrorDataHelper.getFirstText(ProsemirrorDataHelper.getEmpty())
      ).toBeUndefined();
    });
  });
});
